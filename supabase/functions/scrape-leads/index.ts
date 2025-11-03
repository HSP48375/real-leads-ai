import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const GOOGLE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") || "{}");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const GOOGLE_SHEETS_FOLDER_ID = Deno.env.get("GOOGLE_SHEETS_FOLDER_ID") || "";

// Feature flags for data sources (defaults to FALSE, enable via secrets)
const CRAIGSLIST_ENABLED = Deno.env.get("CRAIGSLIST_ENABLED") === "true";
const PREFORECLOSURE_ENABLED = Deno.env.get("PREFORECLOSURE_ENABLED") === "true";
const TAX_DELINQUENT_ENABLED = Deno.env.get("TAX_DELINQUENT_ENABLED") === "true";
const FRBO_ENABLED = Deno.env.get("FRBO_ENABLED") === "true";
const PAID_DATA_API_ENABLED = Deno.env.get("PAID_DATA_API_ENABLED") === "true";

// Cost control limits
const MAX_ITEMS_PER_SCRAPER = 150;
const MAX_API_CALLS_PER_ORDER = 500;
const SCRAPING_BUDGET_LIMIT = parseFloat(Deno.env.get("SCRAPING_BUDGET_LIMIT") || "5");

// Apify Actor IDs - Active sources
const SCRAPERS = {
  zillow: "maxcopell~zillow-scraper",
  realtor: "epctex~realtor-scraper",
  fsbo: "dainty_screw~real-estate-fsbo-com-data-scraper",
  // Placeholder for future sources
  craigslist: "PLACEHOLDER_CRAIGSLIST_ACTOR", // Enable when actor <$15/mo
};

const logStep = (step: string, details?: any) => {
  console.log(`[SCRAPE-LEADS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

interface Lead {
  seller_name?: string;
  contact?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: string;
  url?: string;
  source: string;
  source_type: 'fsbo' | 'preforeclosure' | 'auction' | 'tax_delinquent' | 'frbo';
  date_listed?: string;
}

interface ScrapingMetrics {
  itemsRequested: number;
  itemsDelivered: number;
  estimatedCost: number;
  apiCalls: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");
    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    logStep("Order retrieved", { tier: order.tier, primary_city: order.primary_city });

    // Determine lead quotas based on tier with strict caps (max = top of range + 1-2 extra)
    const quotas = {
      starter: { min: 20, max: 26 },     // 20-25 range → max 26 (allow 1 extra)
      growth: { min: 40, max: 51 },      // 40-50 range → max 51 (allow 1 extra)
      pro: { min: 75, max: 101 },        // 75-100 range → max 101 (allow 1 extra)
      enterprise: { min: 120, max: 151 }, // 120-150 range → max 151 (allow 1 extra)
    };
    
    const tierQuota = quotas[order.tier as keyof typeof quotas] || quotas.starter;
    const minimumQuota = tierQuota.min;
    const maximumQuota = tierQuota.max;
    logStep("Lead quota", { minimum: minimumQuota, maximum: maximumQuota, strictCap: true });

    // Initialize scraping metrics for cost tracking
    const metrics: ScrapingMetrics = {
      itemsRequested: 0,
      itemsDelivered: 0,
      estimatedCost: 0,
      apiCalls: 0,
    };

    // RADIUS-BASED SEARCH with auto-expansion
    const radiusOptions = [25, 35, 45, 60]; // Miles from city center
    let currentRadiusIndex = 0;
    let finalRadius = order.search_radius || radiusOptions[0];
    let allLeads: Lead[] = [];
    const sourceBreakdown: Record<string, number> = {};

    // Try increasing radius until we meet minimum quota or hit max radius
    while (currentRadiusIndex < radiusOptions.length && allLeads.length < minimumQuota) {
      finalRadius = radiusOptions[currentRadiusIndex];
      logStep(`Attempting scraping with radius: ${finalRadius} miles from ${order.primary_city}`);

      // Reset leads for this radius attempt
      allLeads = [];

      // Run all active scrapers with incremental saves
      const scrapingResults = await runAllScrapers(
        order.primary_city,
        finalRadius,
        minimumQuota,
        maximumQuota,
        metrics,
        orderId
      );

      allLeads = scrapingResults.leads;
      Object.assign(sourceBreakdown, scrapingResults.breakdown);

      // STRICT CAP: Trim leads if we exceeded maximum (allow max 1-2 extra)
      if (allLeads.length > maximumQuota) {
        logStep("Trimming excess leads", { 
          collected: allLeads.length, 
          maximum: maximumQuota, 
          trimming: allLeads.length - maximumQuota 
        });
        allLeads = allLeads.slice(0, maximumQuota);
      }

      // Check budget limits
      if (metrics.estimatedCost > SCRAPING_BUDGET_LIMIT) {
        logStep("BUDGET LIMIT EXCEEDED", { cost: metrics.estimatedCost, limit: SCRAPING_BUDGET_LIMIT });
        
        // Send admin alert
        await sendAdminAlert(order, metrics);
        
        break;
      }

      // If we met quota, great! Otherwise try next radius
      if (allLeads.length >= minimumQuota) {
        logStep("Minimum quota met", { leads: allLeads.length, radius: finalRadius });
        break;
      }

      currentRadiusIndex++;
    }

    logStep("Scraping completed", { 
      totalLeads: allLeads.length, 
      finalRadius, 
      cost: metrics.estimatedCost,
      apiCalls: metrics.apiCalls 
    });

    // Trigger finalize-order in background to create Google Sheet and send email
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      await fetch(`${supabaseUrl}/functions/v1/finalize-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ orderId })
      });
      logStep("Finalize-order trigger sent");
    } catch (e) {
      logStep("Finalize-order trigger failed", { error: e instanceof Error ? e.message : String(e) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scraping finished. Leads are being saved incrementally and finalization is queued.',
        radiusUsed: finalRadius,
        sourceBreakdown,
        estimatedCost: metrics.estimatedCost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============= SCRAPING FUNCTIONS =============

async function runAllScrapers(
  city: string,
  radius: number,
  targetLeads: number,
  maxLeads: number,
  metrics: ScrapingMetrics,
  orderId: string
): Promise<{ leads: Lead[], breakdown: Record<string, number> }> {
  const allLeads: Lead[] = [];
  const breakdown: Record<string, number> = {};

  // Create local Supabase client for incremental saves
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Zillow Scraper
  try {
    // Stop if we've already hit the max cap
    if (allLeads.length >= maxLeads) {
      logStep(`Skipping Zillow - max leads reached`, { current: allLeads.length, max: maxLeads });
      return { leads: allLeads, breakdown };
    }
    
    if (metrics.apiCalls >= MAX_API_CALLS_PER_ORDER) throw new Error("Max API calls reached");
    
    logStep(`Zillow scraper for ${city} (${radius}mi radius)`);
    // Build Zillow search URL with required searchQueryState and FSBO filter
    const zillowQueryState = {
      usersSearchTerm: `${city}, MI`,
      filterState: {
        isForSaleByOwner: { value: true },
        isForSaleByAgent: { value: false },
        isAuction: { value: false },
        isNewConstruction: { value: false },
        isComingSoon: { value: false },
        isForSaleForeclosure: { value: false },
      },
      isMapVisible: true,
      isListVisible: true,
    } as Record<string, any>;

    const zillowUrl = `https://www.zillow.com/homes/for_sale/?searchQueryState=${encodeURIComponent(JSON.stringify(zillowQueryState))}`;
    const zillowResults = await runApifyScraper(SCRAPERS.zillow, {
      searchUrls: [{ url: zillowUrl }],
      maxItems: Math.min(targetLeads * 3, MAX_ITEMS_PER_SCRAPER),
    });
    
    metrics.apiCalls++;
    metrics.itemsRequested += targetLeads * 3;
    metrics.estimatedCost += 0.5; // Estimate $0.50 per run
    
    const zLeads = parseZillowResults(zillowResults);
    allLeads.push(...zLeads);
    breakdown["Zillow FSBO"] = zLeads.length;
    logStep(`Zillow completed`, { count: zLeads.length });

    // Incremental save for Zillow leads
    if (zLeads.length > 0) {
      const leadsToInsert = zLeads.map(lead => ({
        order_id: orderId,
        seller_name: lead.seller_name || "Unknown",
        contact: lead.contact || null,
        address: lead.address,
        city: lead.city || city,
        state: lead.state || "MI",
        zip: lead.zip || null,
        price: lead.price || null,
        url: lead.url || null,
        source: lead.source,
        source_type: lead.source_type,
        date_listed: (() => { const d = lead.date_listed ? new Date(lead.date_listed) : new Date(); return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); })(),
      }));

      const { error: insertErr, data: inserted } = await supabase.from("leads").insert(leadsToInsert).select("id");
      if (insertErr) {
        logStep("ERROR", { message: `Failed to insert Zillow leads: ${insertErr.message}` });
      } else {
        // Update order progress and mark as completed per instruction
        const { data: ord } = await supabase
          .from("orders")
          .select("total_leads_delivered, leads_count, source_breakdown")
          .eq("id", orderId)
          .single();

        const currentBreakdown = (ord?.source_breakdown as Record<string, number>) || {};
        const newBreakdown = { ...currentBreakdown, ["Zillow FSBO"]: (currentBreakdown["Zillow FSBO"] || 0) + zLeads.length };
        const newTotal = (ord?.total_leads_delivered || 0) + zLeads.length;

        await supabase
          .from("orders")
          .update({
            total_leads_delivered: newTotal,
            leads_count: newTotal,
            source_breakdown: newBreakdown,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }
    }
  } catch (e) {
    logStep(`Zillow error`, { error: e instanceof Error ? e.message : String(e) });
  }

  // Realtor.com Scraper (epctex/realtor-scraper)
  try {
    // Stop if we've already hit the max cap
    if (allLeads.length >= maxLeads) {
      logStep(`Skipping Realtor - max leads reached`, { current: allLeads.length, max: maxLeads });
      return { leads: allLeads, breakdown };
    }
    
    if (metrics.apiCalls >= MAX_API_CALLS_PER_ORDER) throw new Error("Max API calls reached");
    
    logStep(`Realtor scraper for ${city} (${radius}mi radius)`);
    // Using correct format for epctex/realtor-scraper: startUrls as array of strings
    // FSBO filter: /fsbo/ in URL path filters for "For Sale By Owner" listings only
    const realtorResults = await runApifyScraper(SCRAPERS.realtor, {
      startUrls: [`https://www.realtor.com/realestateandhomes-search/${city.replace(/\s+/g, '_')}_MI/type-single-family-home/fsbo`],
      maxItems: Math.min(targetLeads * 2, MAX_ITEMS_PER_SCRAPER),
      proxy: { useApifyProxy: true }
    });
    
    metrics.apiCalls++;
    metrics.itemsRequested += targetLeads * 2;
    metrics.estimatedCost += 0.004; // $0.004 per run based on user testing
    
    const rLeads = parseRealtorResults(realtorResults);
    allLeads.push(...rLeads);
    breakdown["Realtor.com FSBO"] = rLeads.length;
    logStep(`Realtor completed`, { count: rLeads.length });

    // Incremental save for Realtor leads
    if (rLeads.length > 0) {
      const leadsToInsert = rLeads.map(lead => ({
        order_id: orderId,
        seller_name: lead.seller_name || "Unknown",
        contact: lead.contact || null,
        address: lead.address,
        city: lead.city || city,
        state: lead.state || "MI",
        zip: lead.zip || null,
        price: lead.price || null,
        url: lead.url || null,
        source: lead.source,
        source_type: lead.source_type,
        date_listed: lead.date_listed || new Date().toISOString(),
      }));

      const { error: insertErr, data: inserted } = await supabase.from("leads").insert(leadsToInsert).select("id");
      if (insertErr) {
        logStep("ERROR", { message: `Failed to insert Realtor leads: ${insertErr.message}` });
      } else {
        const { data: ord } = await supabase
          .from("orders")
          .select("total_leads_delivered, leads_count, source_breakdown")
          .eq("id", orderId)
          .single();

        const currentBreakdown = (ord?.source_breakdown as Record<string, number>) || {};
        const newBreakdown = { ...currentBreakdown, ["Realtor.com FSBO"]: (currentBreakdown["Realtor.com FSBO"] || 0) + rLeads.length };
        const newTotal = (ord?.total_leads_delivered || 0) + rLeads.length;

        await supabase
          .from("orders")
          .update({
            total_leads_delivered: newTotal,
            leads_count: newTotal,
            source_breakdown: newBreakdown,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }
    }
  } catch (e) {
    logStep(`Realtor error`, { error: e instanceof Error ? e.message : String(e) });
  }

  // FSBO.com Scraper
  try {
    // Stop if we've already hit the max cap
    if (allLeads.length >= maxLeads) {
      logStep(`Skipping FSBO - max leads reached`, { current: allLeads.length, max: maxLeads });
      return { leads: allLeads, breakdown };
    }
    
    if (metrics.apiCalls >= MAX_API_CALLS_PER_ORDER) throw new Error("Max API calls reached");
    
    logStep(`FSBO scraper for ${city} (${radius}mi radius)`);
    const fsboResults = await runApifyScraper(SCRAPERS.fsbo, {
      searchQueries: [`${city}, MI`],
      maxItems: Math.min(targetLeads * 2, MAX_ITEMS_PER_SCRAPER),
      proxy: { useApifyProxy: true }
    });
    
    metrics.apiCalls++;
    metrics.itemsRequested += targetLeads * 2;
    metrics.estimatedCost += 0.4; // Estimate $0.40 per run
    
    const fLeads = parseFSBOResults(fsboResults);
    allLeads.push(...fLeads);
    breakdown["FSBO.com"] = fLeads.length;
    logStep(`FSBO completed`, { count: fLeads.length });

    // Incremental save for FSBO.com leads
    if (fLeads.length > 0) {
      const leadsToInsert = fLeads.map(lead => ({
        order_id: orderId,
        seller_name: lead.seller_name || "Unknown",
        contact: lead.contact || null,
        address: lead.address,
        city: lead.city || city,
        state: lead.state || "MI",
        zip: lead.zip || null,
        price: lead.price || null,
        url: lead.url || null,
        source: lead.source,
        source_type: lead.source_type,
        date_listed: lead.date_listed || new Date().toISOString(),
      }));

      const { error: insertErr, data: inserted } = await supabase.from("leads").insert(leadsToInsert).select("id");
      if (insertErr) {
        logStep("ERROR", { message: `Failed to insert FSBO.com leads: ${insertErr.message}` });
      } else {
        const { data: ord } = await supabase
          .from("orders")
          .select("total_leads_delivered, leads_count, source_breakdown")
          .eq("id", orderId)
          .single();

        const currentBreakdown = (ord?.source_breakdown as Record<string, number>) || {};
        const newBreakdown = { ...currentBreakdown, ["FSBO.com"]: (currentBreakdown["FSBO.com"] || 0) + fLeads.length };
        const newTotal = (ord?.total_leads_delivered || 0) + fLeads.length;

        await supabase
          .from("orders")
          .update({
            total_leads_delivered: newTotal,
            leads_count: newTotal,
            source_breakdown: newBreakdown,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
      }
    }
  } catch (e) {
    logStep(`FSBO error`, { error: e instanceof Error ? e.message : String(e) });
  }

  // FEATURE-FLAGGED SOURCES

  if (CRAIGSLIST_ENABLED) {
    logStep("Craigslist scraper DISABLED - enable CRAIGSLIST_ENABLED flag");
    // Placeholder for future Craigslist integration
  }

  if (PREFORECLOSURE_ENABLED) {
    logStep("Pre-foreclosure data DISABLED - enable PREFORECLOSURE_ENABLED flag");
    // Placeholder for distressed property API
  }

  if (TAX_DELINQUENT_ENABLED) {
    logStep("Tax-delinquent data DISABLED - enable TAX_DELINQUENT_ENABLED flag");
    // Placeholder for tax delinquent property API
  }

  if (FRBO_ENABLED) {
    logStep("FRBO (landlord) data DISABLED - enable FRBO_ENABLED flag");
    // Placeholder for "For Rent By Owner" scraping
  }

  if (PAID_DATA_API_ENABLED) {
    logStep("Paid data APIs DISABLED - enable PAID_DATA_API_ENABLED flag");
    // Placeholder for ATTOM/Estated/PropStream integration
  }

  metrics.itemsDelivered = allLeads.length;

  return { leads: allLeads, breakdown };
}

async function runApifyScraper(actorId: string, input: any): Promise<any[]> {
  logStep(`Running Apify actor: ${actorId}`);
  
  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    logStep(`Apify error`, { status: response.status, error: errorText });
    throw new Error(`Apify error (${response.status}): ${errorText}`);
  }

  const results = await response.json();
  logStep(`Apify completed`, { count: results.length });
  return results;
}

// ============= PARSING FUNCTIONS =============

function parseZillowResults(results: any[]): Lead[] {
  logStep(`Parsing Zillow results`, { rawCount: results.length, sample: results[0] ? JSON.stringify(results[0]).substring(0, 200) : 'none' });
  
  const parsed = results
    .filter(item => {
      // Accept if has basic address info
      const hasAddress = item.address || item.addressStreet || item.addressCity;
      if (!hasAddress) {
        logStep(`Zillow item filtered: no address`, { item: JSON.stringify(item).substring(0, 150) });
        return false;
      }
      return true;
    })
    .map(item => ({
      seller_name: item.brokerName || item.agent || "Owner",
      contact: item.phone || item.email || undefined,
      address: item.address || item.addressStreet || `${item.addressCity}, ${item.addressState}`,
      city: item.addressCity,
      state: item.addressState || "MI",
      zip: item.addressZipcode,
      price: item.unformattedPrice?.toString() || item.price?.replace(/[^0-9]/g, ''),
      url: item.detailUrl || `https://www.zillow.com/homedetails/${item.zpid}_zpid/`,
      source: "Zillow FSBO",
      source_type: "fsbo" as const,
      date_listed: undefined,
    }));
  
  logStep(`Zillow parsing complete`, { parsed: parsed.length });
  return parsed;
}

function parseRealtorResults(results: any[]): Lead[] {
  logStep(`Parsing Realtor results`, { rawCount: results.length });
  
  const parsed = results
    .filter(item => {
      // Accept if has address
      const hasAddress = item.location?.address?.line || item.address;
      return hasAddress;
    })
    .map(item => ({
      seller_name: item.owner?.name || item.seller?.name || "Owner",
      contact: item.owner?.phone || item.seller?.phone || item.phone || undefined,
      address: item.location?.address?.line || item.address,
      city: item.location?.address?.city || item.city,
      state: item.location?.address?.state_code || "MI",
      zip: item.location?.address?.postal_code || item.zip,
      price: item.list_price?.toString() || item.price?.toString(),
      url: item.rdc_web_url || item.href || item.url,
      source: "Realtor.com FSBO",
      source_type: "fsbo" as const,
      date_listed: item.list_date,
    }));
  
  logStep(`Realtor parsing complete`, { parsed: parsed.length });
  return parsed;
}

function parseFSBOResults(results: any[]): Lead[] {
  logStep(`Parsing FSBO results`, { rawCount: results.length });
  
  const parsed = results
    .filter(item => {
      const hasAddress = item.address || item.propertyAddress || item.location;
      return hasAddress;
    })
    .map(item => ({
      seller_name: item.ownerName || item.sellerName || item.seller || "Owner",
      contact: item.phone || item.email || item.contactPhone || item.contactEmail || undefined,
      address: item.address || item.propertyAddress || item.location,
      city: item.city,
      state: item.state || "MI",
      zip: item.zipCode || item.zip || item.postalCode,
      price: item.askingPrice?.toString() || item.price?.toString() || item.listPrice?.toString(),
      url: item.listingUrl || item.url || item.link,
      source: "FSBO.com",
      source_type: "fsbo" as const,
      date_listed: item.listingDate || item.datePosted || item.date,
    }));
  
  logStep(`FSBO parsing complete`, { parsed: parsed.length });
  return parsed;
}

// ============= UTILITY FUNCTIONS =============

function removeDuplicates(leads: Lead[]): Lead[] {
  const seen = new Set<string>();
  return leads.filter(lead => {
    const key = normalizeAddress(lead.address);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function enrichContacts(leads: Lead[]): Promise<Lead[]> {
  const needsEnrichment = leads.filter(lead => !lead.contact);
  
  if (needsEnrichment.length === 0) return leads;

  try {
    const enrichResults = await runApifyScraper("dainty_screw~reverse-contact-enricher", {
      addresses: needsEnrichment.map(l => l.address),
    });

    const enrichMap = new Map(
      enrichResults.map((r: any) => [normalizeAddress(r.address), r])
    );

    return leads.map(lead => {
      if (lead.contact) return lead;
      const enriched = enrichMap.get(normalizeAddress(lead.address));
      if (enriched) {
        return {
          ...lead,
          contact: enriched.phone || enriched.email || lead.contact,
          seller_name: enriched.name || lead.seller_name,
        };
      }
      return lead;
    });
  } catch (e) {
    console.error("Contact enrichment failed:", e);
    return leads;
  }
}

// ============= GOOGLE SHEETS & NOTIFICATIONS =============

async function createGoogleSheet(order: any, leads: Lead[], radius: number): Promise<string> {
  const jwt = await createJWT(GOOGLE_SERVICE_ACCOUNT);

  if (!GOOGLE_SHEETS_FOLDER_ID) {
    throw new Error("Missing GOOGLE_SHEETS_FOLDER_ID");
  }

  const createDriveFile = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `RealtyLeadsAI - ${order.customer_name} - ${new Date().toLocaleDateString()}`,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [GOOGLE_SHEETS_FOLDER_ID],
    }),
  });
 
  if (!createDriveFile.ok) {
    const error = await createDriveFile.text();
    // Fallback: retry without parent folder if insufficient permissions
    if (error.includes("insufficientParentPermissions") || error.includes("Insufficient permissions for the specified parent")) {
      const retry = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `RealtyLeadsAI - ${order.customer_name} - ${new Date().toLocaleDateString()}`,
          mimeType: "application/vnd.google-apps.spreadsheet",
        }),
      });
      if (!retry.ok) {
        const retryErr = await retry.text();
        throw new Error(`Failed to create Google Sheet (fallback): ${retryErr}`);
      }
      const retryFile = await retry.json();
      const spreadsheetId = retryFile.id;
      // continue to write values below using spreadsheetId
      const values = [
        ["Name", "Phone/Email", "Address", "City", "State", "Zip", "Price", "Source", "Type", "Listing URL", "Date Listed"],
        ...leads.map(lead => [
          lead.seller_name || "",
          lead.contact || "",
          lead.address,
          lead.city || "",
          lead.state || "",
          lead.zip || "",
          lead.price || "",
          lead.source,
          lead.source_type,
          lead.url || "",
          lead.date_listed || "",
        ]),
      ];
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      });
      return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    }
    throw new Error(`Failed to create Google Sheet: ${error}`);
  }

  const driveFile = await createDriveFile.json();
  const spreadsheetId = driveFile.id;

  const values = [
    ["Name", "Phone/Email", "Address", "City", "State", "Zip", "Price", "Source", "Type", "Listing URL", "Date Listed"],
    ...leads.map(lead => [
      lead.seller_name || "",
      lead.contact || "",
      lead.address,
      lead.city || "",
      lead.state || "",
      lead.zip || "",
      lead.price || "",
      lead.source,
      lead.source_type,
      lead.url || "",
      lead.date_listed || "",
    ]),
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}

async function sendLeadsReadyEmail(
  order: any,
  leads: Lead[],
  sheetUrl: string,
  radius: number,
  creditAmount: number
): Promise<void> {
  const creditMessage = creditAmount > 0 
    ? `<div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
         <strong>⚠️ Partial Delivery:</strong> We found ${leads.length} leads in your area. 
         <strong>$${creditAmount} credit has been applied</strong> to your account for future orders.
       </div>`
    : "";

  const emailBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 30px;
          }
          h1 {
            color: #1a3a2e;
            font-size: 22px;
            margin: 0 0 20px 0;
          }
          .lead-details {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .detail-line {
            margin: 8px 0;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #1a3a2e;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Hi ${order.customer_name},</h1>
          
          <p><strong>Your leads are ready to download! 🎉</strong></p>

          ${creditMessage}

          <div class="lead-details">
            <div class="detail-line">✓ ${leads.length} verified owner-listing leads</div>
            <div class="detail-line">✓ Plan: ${order.tier.charAt(0).toUpperCase() + order.tier.slice(1)}</div>
            <div class="detail-line">✓ Location: ${order.primary_city}, MI (${radius}-mile radius)</div>
          </div>

          <div style="text-align: center;">
            <a href="${sheetUrl}" class="cta-button">Download Your Leads</a>
          </div>

          <p>Your leads cover up to a ${radius}-mile radius from ${order.primary_city} and include verified contact information for homeowners selling their properties directly.</p>
          
          <div class="footer">
            Questions? Just reply to this email.
          </div>
        </div>
      </body>
    </html>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "RealtyLeadsAI <onboarding@resend.dev>",
      to: [order.customer_email],
      subject: "Your Leads Are Ready to Download! 🎉",
      html: emailBody,
    }),
  });

  logStep("Email sent successfully");
}

async function sendAdminAlert(order: any, metrics: ScrapingMetrics): Promise<void> {
  const adminEmail = Deno.env.get("ADMIN_EMAIL");
  if (!adminEmail) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "RealtyLeadsAI Alerts <onboarding@resend.dev>",
      to: [adminEmail],
      subject: `⚠️ High Scraping Costs - Order ${order.id}`,
      html: `
        <h2>Scraping Cost Alert</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Customer:</strong> ${order.customer_email}</p>
        <p><strong>Estimated Cost:</strong> $${metrics.estimatedCost.toFixed(2)}</p>
        <p><strong>Budget Limit:</strong> $${SCRAPING_BUDGET_LIMIT}</p>
        <p><strong>API Calls:</strong> ${metrics.apiCalls}</p>
      `,
    }),
  });
}

async function createJWT(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (str: string) => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;

  const privateKeyPem = serviceAccount.private_key;
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  const encodedSignature = signatureBase64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const signedJwt = `${unsignedToken}.${encodedSignature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}