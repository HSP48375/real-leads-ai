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

    // Determine lead quotas based on tier
    const quotas = {
      starter: { min: 15, max: 20 },
      growth: { min: 25, max: 40 },
      pro: { min: 50, max: 75 },
      enterprise: { min: 80, max: 120 },
    };
    
    const tierQuota = quotas[order.tier as keyof typeof quotas] || quotas.starter;
    const minimumQuota = tierQuota.min;
    const maximumQuota = tierQuota.max;
    logStep("Lead quota", { minimum: minimumQuota, maximum: maximumQuota });

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

      // Run all active scrapers
      const scrapingResults = await runAllScrapers(
        order.primary_city,
        finalRadius,
        minimumQuota,
        metrics
      );

      allLeads = scrapingResults.leads;
      Object.assign(sourceBreakdown, scrapingResults.breakdown);

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

    // Filter out agent-listed properties - FSBO/owner-listing ONLY
    const ownerListingsOnly = allLeads.filter(lead => {
      const sellerNameLower = lead.seller_name?.toLowerCase() || '';
      
      const agentKeywords = [
        'agent', 'broker', 'realty', 'realtor', 'real estate group', 'mls', 
        'listing agent', 'sellers agent', 'brokerage', 're/max', 'remax', 
        'coldwell', 'keller williams', 'century 21', 'century21', 'sotheby', 
        'compass', 'exp realty', 'berkshire hathaway', 'weichert', 'baird & warner',
        'engel & völkers', 'better homes', 'homesmart', 'real living'
      ];
      
      const hasAgentIndicators = agentKeywords.some(keyword => 
        sellerNameLower.includes(keyword)
      );
      
      return !hasAgentIndicators;
    });

    logStep("Filtered agent listings", { count: ownerListingsOnly.length });

    // Remove duplicates
    const uniqueLeads = removeDuplicates(ownerListingsOnly);
    logStep("Removed duplicates", { count: uniqueLeads.length });

    // Check against existing database leads
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("address");

    const existingAddresses = new Set(existingLeads?.map(l => normalizeAddress(l.address)) || []);
    const newLeads = uniqueLeads.filter(
      lead => !existingAddresses.has(normalizeAddress(lead.address))
    );

    logStep("Filtered existing leads", { newCount: newLeads.length });

    // Limit to maximum quota
    const finalLeads = newLeads.slice(0, maximumQuota);
    logStep("Applied tier quota", { finalCount: finalLeads.length });

    // PARTIAL DELIVERY & CREDIT LOGIC
    let orderStatus = "completed";
    let needsAdditionalScraping = false;
    let nextScrapeDate = null;
    let creditAmount = 0;

    if (finalLeads.length < minimumQuota) {
      // Calculate credit for unmet quota
      const deliveredPercent = finalLeads.length / minimumQuota;
      const unmetPercent = 1 - deliveredPercent;
      creditAmount = Math.round(order.price_paid * unmetPercent);

      // Update customer's account credit
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_credit")
        .eq("id", order.user_id)
        .single();

      const currentCredit = profile?.account_credit || 0;
      await supabase
        .from("profiles")
        .update({ account_credit: currentCredit + creditAmount })
        .eq("id", order.user_id);

      orderStatus = "partial_delivery";
      needsAdditionalScraping = true;
      nextScrapeDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      logStep("Partial delivery - credit applied", { 
        delivered: finalLeads.length,
        promised: minimumQuota,
        creditAmount,
        nextScrape: nextScrapeDate
      });
    }

    // Enrich contacts
    const enrichedLeads = await enrichContacts(finalLeads);
    logStep("Contact enrichment completed");

    // Store leads in database with source_type
    const leadsToInsert = enrichedLeads.map(lead => ({
      order_id: orderId,
      seller_name: lead.seller_name || "Unknown",
      contact: lead.contact || null,
      address: lead.address,
      city: lead.city || order.primary_city,
      state: lead.state || "MI",
      zip: lead.zip || null,
      price: lead.price || null,
      url: lead.url || null,
      source: lead.source,
      source_type: lead.source_type,
      date_listed: lead.date_listed || new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("leads")
      .insert(leadsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert leads: ${insertError.message}`);
    }

    logStep("Leads stored in database", { count: leadsToInsert.length });

    // Create Google Sheet
    const sheetUrl = await createGoogleSheet(order, enrichedLeads, finalRadius);
    logStep("Google Sheet created", { url: sheetUrl });

    // Update order with comprehensive tracking
    await supabase
      .from("orders")
      .update({
        sheet_url: sheetUrl,
        status: orderStatus,
        delivered_at: new Date().toISOString(),
        leads_count: enrichedLeads.length,
        total_leads_delivered: enrichedLeads.length,
        cities_searched: [order.primary_city],
        radius_used: finalRadius,
        scraping_cost: metrics.estimatedCost,
        source_breakdown: sourceBreakdown,
        needs_additional_scraping: needsAdditionalScraping,
        next_scrape_date: nextScrapeDate?.toISOString(),
      })
      .eq("id", orderId);

    // Send email notification
    if (enrichedLeads.length > 0) {
      await sendLeadsReadyEmail(order, enrichedLeads, sheetUrl, finalRadius, creditAmount);
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadsDelivered: enrichedLeads.length,
        radiusUsed: finalRadius,
        creditApplied: creditAmount,
        sourceBreakdown,
        sheetUrl,
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
  metrics: ScrapingMetrics
): Promise<{ leads: Lead[], breakdown: Record<string, number> }> {
  const allLeads: Lead[] = [];
  const breakdown: Record<string, number> = {};

  // Zillow Scraper
  try {
    if (metrics.apiCalls >= MAX_API_CALLS_PER_ORDER) throw new Error("Max API calls reached");
    
    logStep(`Zillow scraper for ${city} (${radius}mi radius)`);
    const zillowResults = await runApifyScraper(SCRAPERS.zillow, {
      searchUrls: [`https://www.zillow.com/${city.toLowerCase().replace(/\s+/g, '-')}-mi/fsbo/`],
      maxItems: Math.min(targetLeads * 3, MAX_ITEMS_PER_SCRAPER),
    });
    
    metrics.apiCalls++;
    metrics.itemsRequested += targetLeads * 3;
    metrics.estimatedCost += 0.5; // Estimate $0.50 per run
    
    const leads = parseZillowResults(zillowResults);
    allLeads.push(...leads);
    breakdown["Zillow FSBO"] = leads.length;
    logStep(`Zillow completed`, { count: leads.length });
  } catch (e) {
    logStep(`Zillow error`, { error: e instanceof Error ? e.message : String(e) });
  }

  // Realtor.com Scraper
  try {
    if (metrics.apiCalls >= MAX_API_CALLS_PER_ORDER) throw new Error("Max API calls reached");
    
    logStep(`Realtor scraper for ${city} (${radius}mi radius)`);
    const realtorResults = await runApifyScraper(SCRAPERS.realtor, {
      startUrls: [`https://www.realtor.com/realestateandhomes-search/${city.replace(/\s+/g, '_')}_MI/type-single-family-home/fsbo/sby-1`],
      maxItems: Math.min(targetLeads * 2, MAX_ITEMS_PER_SCRAPER),
    });
    
    metrics.apiCalls++;
    metrics.itemsRequested += targetLeads * 2;
    metrics.estimatedCost += 1.0; // Estimate $1.00 per run
    
    const leads = parseRealtorResults(realtorResults);
    allLeads.push(...leads);
    breakdown["Realtor.com FSBO"] = leads.length;
    logStep(`Realtor completed`, { count: leads.length });
  } catch (e) {
    logStep(`Realtor error`, { error: e instanceof Error ? e.message : String(e) });
  }

  // FSBO.com Scraper
  try {
    if (metrics.apiCalls >= MAX_API_CALLS_PER_ORDER) throw new Error("Max API calls reached");
    
    logStep(`FSBO scraper for ${city} (${radius}mi radius)`);
    const fsboResults = await runApifyScraper(SCRAPERS.fsbo, {
      startUrls: [`https://www.fsbo.com/search?location=${encodeURIComponent(city + ', MI')}`],
      maxItems: Math.min(targetLeads * 2, MAX_ITEMS_PER_SCRAPER),
    });
    
    metrics.apiCalls++;
    metrics.itemsRequested += targetLeads * 2;
    metrics.estimatedCost += 0.4; // Estimate $0.40 per run
    
    const leads = parseFSBOResults(fsboResults);
    allLeads.push(...leads);
    breakdown["FSBO.com"] = leads.length;
    logStep(`FSBO completed`, { count: leads.length });
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
  return results
    .filter(item => {
      const isFSBO = item.hdpData?.homeInfo?.listing_sub_type?.is_FSBA === true ||
                     item.statusText?.toLowerCase().includes('fsbo') ||
                     item.brokerName?.toLowerCase().includes('owner');
      return isFSBO && item.address;
    })
    .map(item => ({
      seller_name: item.brokerName || undefined,
      contact: undefined,
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
}

function parseRealtorResults(results: any[]): Lead[] {
  return results
    .filter(item => {
      const listingType = item.listing_type?.toLowerCase() || '';
      const brokerName = item.broker?.name?.toLowerCase() || '';
      const statusText = item.status_text?.toLowerCase() || '';
      
      const isExplicitlyFSBO = 
        listingType.includes('fsbo') ||
        listingType.includes('for sale by owner') ||
        statusText.includes('fsbo') ||
        statusText.includes('for sale by owner');
      
      const hasBrokerInfo = 
        (item.broker && item.broker.name && !brokerName.includes('owner')) ||
        (item.agent && item.agent.name) ||
        item.office?.name ||
        item.listing_agent ||
        item.showing_agent;
      
      return isExplicitlyFSBO && !hasBrokerInfo && item.location?.address?.line;
    })
    .map(item => ({
      seller_name: item.owner?.name || item.seller?.name || undefined,
      contact: item.owner?.phone || item.seller?.phone || undefined,
      address: item.location?.address?.line,
      city: item.location?.address?.city,
      state: item.location?.address?.state_code || "MI",
      zip: item.location?.address?.postal_code,
      price: item.list_price?.toString() || item.price?.toString(),
      url: item.rdc_web_url || item.href,
      source: "Realtor.com FSBO",
      source_type: "fsbo" as const,
      date_listed: item.list_date,
    }));
}

function parseFSBOResults(results: any[]): Lead[] {
  return results
    .filter(item => item.address || item.propertyAddress)
    .map(item => ({
      seller_name: item.ownerName || item.sellerName || undefined,
      contact: item.phone || item.email || undefined,
      address: item.address || item.propertyAddress,
      city: item.city,
      state: item.state || "MI",
      zip: item.zipCode || item.zip,
      price: item.askingPrice?.toString() || item.price?.toString(),
      url: item.listingUrl || item.url,
      source: "FSBO.com",
      source_type: "fsbo" as const,
      date_listed: item.listingDate || item.datePosted,
    }));
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