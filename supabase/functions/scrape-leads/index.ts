import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const OLOSTEP_API_KEY = Deno.env.get("OLOSTEP_API_KEY");

// FSBO scraper only for Apify - correct actor ID with 108 successful runs
const FSBO_ACTOR_ID = "dainty_screw/real-estate-fsbo-com-data-scraper";

// Tier quota definitions - lowered minimum to 10
const TIER_QUOTAS = {
  starter: { min: 10, max: 25 },
  growth: { min: 10, max: 50 },
  scale: { min: 10, max: 100 },
};

const MAX_SCRAPE_ATTEMPTS = 3;

const logStep = (step: string, details?: any) => {
  console.log(`[SCRAPE-LEADS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

interface Lead {
  order_id: string;
  seller_name: string;
  contact: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: string;
  url?: string;
  source: string;
  source_type: string;
  date_listed?: string;
  listing_title?: string;
  address_line_1?: string;
  address_line_2?: string;
  zipcode?: string;
}

// Enhanced LLM extraction prompt for Olostep - simplified for better JSON extraction
const OLOSTEP_EXTRACTION_PROMPT = `You are extracting real estate listings. Return ONLY a valid JSON object with this exact structure:
{
  "leads": [
    {
      "owner_name": "string",
      "owner_phone": "string", 
      "owner_email": "string",
      "property_address": "string",
      "city": "string",
      "state": "string",
      "zip": "string",
      "price": "string"
    }
  ]
}
Extract ALL visible property listings. If no listings found, return {"leads": []}.`;


async function scrapeWithOlostep(url: string, source: string, maxRetries = 3): Promise<Lead[]> {
  const RETRY_DELAY_MS = 30000; // 30 seconds between retries
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logStep(`Scraping ${source}`, { url, attempt, maxRetries });

    if (!OLOSTEP_API_KEY) {
      logStep(`Olostep API key missing for ${source}`);
      return [];
    }

    try {
      const payload = {
        url_to_scrape: url,
        formats: ["json"],
        wait_before_scraping: 3000,
        llm_extract: {
          prompt: OLOSTEP_EXTRACTION_PROMPT
        }
      };

      logStep(`Olostep payload for ${source}`, payload);

      const response = await fetch("https://api.olostep.com/v1/scrapes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OLOSTEP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isTimeout = response.status === 504;
        
        logStep(`Olostep error for ${source}`, { 
          status: response.status, 
          error: errorText,
          isTimeout,
          attempt,
          willRetry: isTimeout && attempt < maxRetries
        });
        
        // If timeout and we have retries left, wait and try again
        if (isTimeout && attempt < maxRetries) {
          logStep(`Waiting ${RETRY_DELAY_MS/1000}s before retry ${attempt + 1}/${maxRetries} for ${source}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue; // Try next attempt
        }
        
        return []; // Give up after retries exhausted or non-timeout error
      }

      const data = await response.json();
      logStep(`Olostep raw response for ${source}`, { 
        status: response.status,
        dataKeys: Object.keys(data || {}),
        hasResult: !!data?.result,
        hasJsonContent: !!data?.result?.json_content,
        attempt 
      });

      const leads: Lead[] = [];
      
      // Try to parse JSON content from Olostep response
      let extractedLeads: any[] = [];
      
      // First try: direct leads array
      if (data?.leads && Array.isArray(data.leads)) {
        extractedLeads = data.leads;
      }
      // Second try: nested in result.json_content
      else if (data?.result?.json_content) {
        try {
          const jsonContent = typeof data.result.json_content === 'string' 
            ? JSON.parse(data.result.json_content)
            : data.result.json_content;
          
          extractedLeads = jsonContent?.leads || [];
        } catch (e) {
          logStep(`${source} JSON parsing error`, { 
            error: e instanceof Error ? e.message : String(e),
            attempt 
          });
        }
      }

      if (!Array.isArray(extractedLeads) || extractedLeads.length === 0) {
        logStep(`${source} returned no leads array`, { 
          dataStructure: typeof data,
          keys: Object.keys(data || {}),
          attempt 
        });
        
        // If this was a timeout and we have retries left, continue to next attempt
        if (attempt < maxRetries) {
          logStep(`Waiting ${RETRY_DELAY_MS/1000}s before retry ${attempt + 1}/${maxRetries} for ${source}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        
        return [];
      }

      for (const item of extractedLeads) {
        // Require either phone or email
        const phone = (item.owner_phone || item.phone || "").replace(/\D/g, "");
        const email = item.owner_email || item.email || "";

        if (!phone && !email) {
          logStep(`Skipping ${source} lead without contact`, { address: item.property_address || item.address });
          continue;
        }

        leads.push({
          order_id: "", // Will be set later
          seller_name: item.owner_name || "Unknown",
          contact: phone || email,
          address: item.property_address || item.address || "",
          city: item.city || undefined,
          state: item.state || undefined,
          zip: item.zip || undefined,
          price: item.price || undefined,
          url: url,
          source: source,
          source_type: "fsbo",
          date_listed: new Date().toISOString(),
          listing_title: item.description || undefined,
          address_line_1: item.property_address || item.address || undefined,
          address_line_2: undefined,
          zipcode: item.zip || undefined,
        });
      }

      logStep(`${source} leads extracted successfully`, { count: leads.length, attempt });
      return leads; // Success - return the leads
      
    } catch (error) {
      const willRetry = attempt < maxRetries;
      logStep(`${source} scraping exception`, { 
        error: error instanceof Error ? error.message : String(error),
        attempt,
        willRetry
      });
      
      // Wait before retrying if we have attempts left
      if (willRetry) {
        logStep(`Waiting ${RETRY_DELAY_MS/1000}s before retry ${attempt + 1}/${maxRetries} for ${source}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      
      return []; // All retries exhausted
    }
  }
  
  // Should never reach here, but just in case
  logStep(`${source} - all retries exhausted`);
  return [];
}

// Deep scrape individual listing page to extract contact information
async function deepScrapeListingPage(url: string, source: string): Promise<{ phone?: string; email?: string; name?: string } | null> {
  if (!OLOSTEP_API_KEY) {
    return null;
  }

  try {
    logStep(`Deep scraping ${source} listing`, { url });

    const payload = {
      url_to_scrape: url,
      formats: ["json"],
      wait_before_scraping: 3000,
      llm_extract: {
        prompt: `Extract contact information from this property listing page. Return ONLY a valid JSON object:
{
  "owner_name": "string",
  "owner_phone": "string",
  "owner_email": "string"
}
Look for: Contact seller button, phone numbers, email addresses, seller name. If not found, return empty strings.`
      }
    };

    const response = await fetch("https://api.olostep.com/v1/scrapes", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OLOSTEP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logStep(`Deep scrape failed for ${source}`, { status: response.status, url });
      return null;
    }

    const data = await response.json();
    
    // Parse contact info from response
    let contactInfo: any = {};
    
    if (data?.result?.json_content) {
      try {
        contactInfo = typeof data.result.json_content === 'string' 
          ? JSON.parse(data.result.json_content)
          : data.result.json_content;
      } catch (e) {
        logStep(`Deep scrape JSON parse error for ${source}`, { url });
        return null;
      }
    }

    const phone = (contactInfo.owner_phone || "").replace(/\D/g, "");
    const email = contactInfo.owner_email || "";
    const name = contactInfo.owner_name || "";

    if (!phone && !email) {
      logStep(`Deep scrape found no contact info for ${source}`, { url });
      return null;
    }

    logStep(`Deep scrape success for ${source}`, { url, hasPhone: !!phone, hasEmail: !!email });
    return { phone, email, name };

  } catch (error) {
    logStep(`Deep scrape exception for ${source}`, { 
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

async function scrapeWithApifyFSBO(city: string): Promise<Lead[]> {
  logStep("Scraping FSBO.com via Apify", { city });

  if (!APIFY_API_KEY) {
    logStep("Apify API key missing");
    return [];
  }

  try {
    // Correct input format for the FSBO actor
    const actorInput = {
      searchQueries: [city], // Required field - array of search queries
      maxItems: 100
    };

    logStep("Apify FSBO input", actorInput);

    const apifyActorPath = FSBO_ACTOR_ID.replace("/", "~");
    const startRunResp = await fetch(
      `https://api.apify.com/v2/acts/${apifyActorPath}/runs?token=${APIFY_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorInput),
      }
    );

    if (!startRunResp.ok) {
      const errorText = await startRunResp.text();
      logStep("FSBO Apify start error", { status: startRunResp.status, error: errorText });
      return [];
    }

    const runStartJson = await startRunResp.json();
    const runId = runStartJson?.data?.id ?? runStartJson?.id;
    
    if (!runId) {
      logStep("FSBO run ID missing", { payload: runStartJson });
      return [];
    }

    logStep("FSBO run started", { runId });

    // Poll for completion
    const maxWaitMs = 5 * 60 * 1000; // 5 minutes
    const pollIntervalMs = 5000;
    const startTime = Date.now();
    let runStatus = "RUNNING";

    while (true) {
      const statusResp = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
      );
      const statusJson = await statusResp.json();
      runStatus = statusJson?.data?.status ?? statusJson?.status ?? "UNKNOWN";

      if (runStatus === "SUCCEEDED") break;
      if (["FAILED", "ABORTED", "TIMED-OUT"].includes(runStatus)) {
        logStep("FSBO run failed", { status: runStatus });
        return [];
      }
      if (Date.now() - startTime > maxWaitMs) {
        logStep("FSBO polling timeout");
        return [];
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    // Fetch results
    const datasetResp = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`
    );

    if (!datasetResp.ok) {
      logStep("FSBO dataset fetch error", { status: datasetResp.status });
      return [];
    }

    const rawResults = await datasetResp.json();
    logStep("FSBO results", { count: Array.isArray(rawResults) ? rawResults.length : 0 });

    const leads: Lead[] = [];
    const itemsWithUrls = rawResults.filter((item: any) => item.url);
    
    logStep("FSBO items with URLs for deep scraping", { count: itemsWithUrls.length });

    // Deep scrape each listing (limit to prevent timeout)
    const maxDeepScrapes = Math.min(itemsWithUrls.length, 20);
    
    for (let i = 0; i < maxDeepScrapes; i++) {
      const item = itemsWithUrls[i];
      
      // Try direct contact first
      let phone = (item.phone || item.contactPhone || "").replace(/\D/g, "");
      let email = item.email || item.contactEmail || "";
      let sellerName = item.sellerName || item.name || "";

      // If no contact info, deep scrape the listing page
      if ((!phone && !email) && item.url) {
        const contactInfo = await deepScrapeListingPage(item.url, "FSBO");
        if (contactInfo) {
          phone = contactInfo.phone || phone;
          email = contactInfo.email || email;
          sellerName = contactInfo.name || sellerName;
        }
      }

      if (!phone && !email) {
        logStep("Skipping FSBO lead without contact", {});
        continue;
      }

      leads.push({
        order_id: "", // Will be set later
        seller_name: sellerName || "Unknown",
        contact: phone || email,
        address: item.address || item.streetAddress || "",
        city: item.city || undefined,
        state: item.state || undefined,
        zip: item.zip || item.zipcode || undefined,
        price: item.price || item.listPrice || undefined,
        url: item.url || undefined,
        source: "FSBO",
        source_type: "fsbo",
        date_listed: item.datePosted || new Date().toISOString(),
        listing_title: item.title || undefined,
        address_line_1: item.address || undefined,
        address_line_2: undefined,
        zipcode: item.zip || item.zipcode || undefined,
      });
    }

    logStep("FSBO leads extracted", { count: leads.length });
    return leads;
  } catch (error) {
    logStep("FSBO scraping failed", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

function deduplicateLeads(leads: Lead[]): Lead[] {
  const seen = new Set<string>();
  const deduplicated: Lead[] = [];

  for (const lead of leads) {
    // Create unique key from contact + address
    const key = `${lead.contact.toLowerCase()}-${lead.address.toLowerCase()}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(lead);
    }
  }

  logStep("Deduplication", { 
    before: leads.length, 
    after: deduplicated.length,
    removed: leads.length - deduplicated.length 
  });

  return deduplicated;
}

interface CityUrlMapping {
  craigslistSubdomain: string;
  buyownerCity: string;
  state: string;
}

function buildUrlsFromCityState(city: string, state: string): CityUrlMapping {
  if (!city || !state) {
    throw new Error(`Invalid input: city="${city}", state="${state}"`);
  }
  
  // Validate state code (should be 2 letters)
  if (state.length !== 2 || !/^[A-Za-z]{2}$/.test(state)) {
    logStep("ERROR: Invalid state code", { 
      city, 
      state, 
      error: "State must be 2-letter abbreviation" 
    });
    throw new Error(`Invalid state code: "${state}". Must be 2-letter abbreviation (e.g., MI, CA, NY)`);
  }
  
  const stateLower = state.toLowerCase();
  const cityLower = city.toLowerCase();
  
  // Validate city name is not empty
  if (!city || city.trim().length === 0) {
    logStep("ERROR: Missing city name", { 
      city, 
      state, 
      error: "City name is empty" 
    });
    throw new Error(`Missing city name`);
  }
  
  // Build Craigslist subdomain (remove spaces, lowercase)
  const craigslistSubdomain = cityLower.replace(/\s+/g, '');
  
  // Build BuyOwner city (hyphenated, lowercase)
  const buyownerCity = cityLower.replace(/\s+/g, '-');
  
  logStep("City URL mapping", {
    input: `${city}, ${state}`,
    parsed: { city, state },
    craigslist: craigslistSubdomain,
    buyowner: buyownerCity
  });
  
  return {
    craigslistSubdomain,
    buyownerCity,
    state: stateLower
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let orderId: string | null = null;

  try {
    logStep("Function started");
    const body = await req.json();
    orderId = body.orderId;

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

    logStep("Order retrieved", { 
      orderId: order.id,
      tier: order.tier, 
      targetCity: order.primary_city,
      customerEmail: order.customer_email 
    });

    // Update order status to processing
    await supabase
      .from("orders")
      .update({ 
        status: "processing", 
        updated_at: new Date().toISOString() 
      })
      .eq("id", orderId);

    // Get tier quotas
    const tierQuota = TIER_QUOTAS[order.tier as keyof typeof TIER_QUOTAS];
    if (!tierQuota) {
      throw new Error(`Invalid tier: ${order.tier}`);
    }

    // Update order with min/max leads if not set
    if (!order.min_leads || !order.max_leads) {
      await supabase
        .from("orders")
        .update({
          min_leads: tierQuota.min,
          max_leads: tierQuota.max,
        })
        .eq("id", orderId);
    }

    const scrapeAttempts = (order.scrape_attempts || 0) + 1;

    // Parse city and build dynamic URLs with error handling
    let cityUrls: CityUrlMapping;
    try {
      cityUrls = buildUrlsFromCityState(order.primary_city, order.primary_state);
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : "Invalid city/state format";
      logStep("ERROR: City/state parsing failed", { 
        city: order.primary_city,
        state: order.primary_state, 
        error: errorMsg 
      });
      
      // Update order with error
      await supabase
        .from("orders")
        .update({
          status: "failed",
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ 
          error: errorMsg,
          hint: 'Both city and state are required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    logStep("Starting multi-source scrape", { 
      city: order.primary_city,
      attempt: scrapeAttempts,
      targetLeads: `${tierQuota.min}-${tierQuota.max}`
    });

    // Build dynamic URLs for each source
    const craigslistUrl = `https://${cityUrls.craigslistSubdomain}.craigslist.org/search/rea?query=owner`;
    const facebookUrl = `https://www.facebook.com/marketplace/search/?query=house%20for%20sale%20by%20owner&exact=false`;
    const buyownerUrl = `https://www.buyowner.com/fsbo-${cityUrls.buyownerCity}-${cityUrls.state}`;

    logStep("Scraper URLs", { craigslistUrl, facebookUrl, buyownerUrl });

    // Run all 4 scrapers in parallel - don't fail entire order if one fails
    const [fsboLeads, craigslistLeads, facebookLeads, buyownerLeads] = await Promise.all([
      scrapeWithApifyFSBO(`${order.primary_city}, ${order.primary_state}`).catch(err => {
        logStep("FSBO scraper failed", { error: err.message });
        return [];
      }),
      scrapeWithOlostep(craigslistUrl, "Craigslist", 3).catch(err => {
        logStep("Craigslist scraper failed", { error: err.message });
        return [];
      }),
      scrapeWithOlostep(facebookUrl, "Facebook", 3).catch(err => {
        logStep("Facebook scraper failed", { error: err.message });
        return [];
      }),
      scrapeWithOlostep(buyownerUrl, "BuyOwner", 3).catch(err => {
        logStep("BuyOwner scraper failed", { error: err.message });
        return [];
      })
    ]);

    // Combine all leads
    let allLeads = [...fsboLeads, ...craigslistLeads, ...facebookLeads, ...buyownerLeads];
    
    // Set order_id for all leads
    allLeads = allLeads.map(lead => ({ ...lead, order_id: orderId! }));

    logStep("All sources scraped", {
      fsbo: fsboLeads.length,
      craigslist: craigslistLeads.length,
      facebook: facebookLeads.length,
      buyowner: buyownerLeads.length,
      total: allLeads.length
    });

    // Deduplicate leads
    const uniqueLeads = deduplicateLeads(allLeads);

    // Check existing leads
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id", { count: "exact" })
      .eq("order_id", orderId);
    
    const existingCount = existingLeads?.length || 0;
    const totalLeadsAfterSave = existingCount + uniqueLeads.length;

    logStep("Lead count analysis", {
      existing: existingCount,
      newUnique: uniqueLeads.length,
      totalAfterSave: totalLeadsAfterSave,
      minRequired: tierQuota.min,
      maxAllowed: tierQuota.max
    });

    // Save new leads to database
    if (uniqueLeads.length > 0) {
      const { error: insertErr } = await supabase
        .from("leads")
        .insert(uniqueLeads);

      if (insertErr) {
        logStep("ERROR inserting leads", { error: insertErr.message });
        throw new Error(`Failed to insert leads: ${insertErr.message}`);
      }

      logStep("Leads saved to database", { count: uniqueLeads.length });
    }

    // Check if we've met the minimum quota
    const quotaMet = totalLeadsAfterSave >= tierQuota.min;
    const canRetry = scrapeAttempts < MAX_SCRAPE_ATTEMPTS;

    if (!quotaMet && canRetry) {
      // Need more leads - try again
      logStep("Quota not met - will retry", {
        current: totalLeadsAfterSave,
        required: tierQuota.min,
        attempt: scrapeAttempts
      });

      await supabase
        .from("orders")
        .update({
          scrape_attempts: scrapeAttempts,
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      // Trigger another scrape
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      await fetch(`${supabaseUrl}/functions/v1/scrape-leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ orderId })
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Retrying scrape for more leads',
          leadsFound: totalLeadsAfterSave,
          minRequired: tierQuota.min,
          attempt: scrapeAttempts
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap at maximum if exceeded
    const finalLeadCount = Math.min(totalLeadsAfterSave, tierQuota.max);

    // Determine final status
    let finalStatus: string;
    let statusReason: string;

    if (totalLeadsAfterSave >= tierQuota.min) {
      finalStatus = "completed";
      statusReason = "Quota met";
    } else {
      finalStatus = "insufficient_leads";
      statusReason = `Only found ${totalLeadsAfterSave} leads after ${scrapeAttempts} attempts (required: ${tierQuota.min})`;
      
      logStep("INSUFFICIENT LEADS", {
        found: totalLeadsAfterSave,
        required: tierQuota.min,
        maxAttemptsReached: scrapeAttempts >= MAX_SCRAPE_ATTEMPTS
      });
    }

    // Calculate source breakdown
    const { data: sourceStats } = await supabase
      .from("leads")
      .select("source")
      .eq("order_id", orderId);
    
    const sourceBreakdown: Record<string, number> = {};
    if (sourceStats) {
      for (const lead of sourceStats) {
        sourceBreakdown[lead.source] = (sourceBreakdown[lead.source] || 0) + 1;
      }
    }

    // Update order with final status
    await supabase
      .from("orders")
      .update({
        leads_count: finalLeadCount,
        total_leads_delivered: finalLeadCount,
        source_breakdown: sourceBreakdown,
        status: finalStatus,
        scrape_attempts: scrapeAttempts,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    logStep("Order updated", { 
      leadsDelivered: finalLeadCount, 
      status: finalStatus,
      reason: statusReason
    });

    // Only trigger finalize if order is completed
    if (finalStatus === "completed") {
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
        logStep("Finalize-order triggered successfully");
      } catch (e) {
        logStep("Finalize-order trigger failed", { error: e instanceof Error ? e.message : String(e) });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Scraping completed - quota met',
          leadsDelivered: finalLeadCount,
          quota: `${tierQuota.min}-${tierQuota.max}`,
          sources: sourceBreakdown,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Insufficient leads
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Insufficient leads found',
          leadsDelivered: finalLeadCount,
          minRequired: tierQuota.min,
          attemptsUsed: scrapeAttempts,
          status: "insufficient_leads"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("FATAL ERROR", { message: errorMessage });
    
    // Try to mark order as failed if we have the orderId
    if (orderId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        
        await supabase
          .from("orders")
          .update({ 
            status: "failed",
            error_message: errorMessage,
            updated_at: new Date().toISOString() 
          })
          .eq("id", orderId);
      } catch (e) {
        logStep("Failed to update order status", { error: e instanceof Error ? e.message : String(e) });
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
