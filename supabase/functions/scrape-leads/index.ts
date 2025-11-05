import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const OLOSTEP_API_KEY = Deno.env.get("OLOSTEP_API_KEY");

// FSBO scraper only for Apify
const FSBO_ACTOR_ID = "apify/fsbo-scraper";

// Tier quota definitions
const TIER_QUOTAS = {
  starter: { min: 20, max: 25 },
  growth: { min: 40, max: 50 },
  scale: { min: 75, max: 100 },
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

// JSON schema for Olostep LLM extraction
const LEAD_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    leads: {
      type: "array",
      items: {
        type: "object",
        properties: {
          owner_name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          state: { type: "string" },
          zip: { type: "string" },
          price: { type: "string" }
        },
        required: ["address"]
      }
    }
  }
};

async function scrapeWithOlostep(url: string, source: string): Promise<Lead[]> {
  logStep(`Scraping ${source}`, { url });

  try {
    const response = await fetch("https://api.olostep.com/v1/scrapes", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OLOSTEP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        jsonSchema: LEAD_EXTRACTION_SCHEMA
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep(`Olostep error for ${source}`, { status: response.status, error: errorText });
      return [];
    }

    const data = await response.json();
    logStep(`Olostep response for ${source}`, { data });

    const leads: Lead[] = [];
    const extractedLeads = data?.leads || data?.data?.leads || [];

    for (const item of extractedLeads) {
      // Require either phone or email
      const phone = item.phone?.replace(/\D/g, "") || "";
      const email = item.email || "";

      if (!phone && !email) {
        logStep(`Skipping ${source} lead without contact`, { address: item.address });
        continue;
      }

      leads.push({
        order_id: "", // Will be set later
        seller_name: item.owner_name || "Unknown",
        contact: phone || email,
        address: item.address || "",
        city: item.city || null,
        state: item.state || null,
        zip: item.zip || null,
        price: item.price || null,
        url: url,
        source: source,
        source_type: "fsbo",
        date_listed: new Date().toISOString(),
        listing_title: null,
        address_line_1: item.address || null,
        address_line_2: null,
        zipcode: item.zip || null,
      });
    }

    logStep(`${source} leads extracted`, { count: leads.length });
    return leads;
  } catch (error) {
    logStep(`${source} scraping failed`, { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

async function scrapeWithApifyFSBO(city: string): Promise<Lead[]> {
  logStep("Scraping FSBO.com", { city });

  try {
    const actorInput = {
      search: city,
      maxItems: 100
    };

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

    for (const item of rawResults) {
      const phone = (item.phone || item.contactPhone || "").replace(/\D/g, "");
      const email = item.email || item.contactEmail || "";

      if (!phone && !email) {
        logStep("Skipping FSBO lead without contact", { address: item.address });
        continue;
      }

      leads.push({
        order_id: "", // Will be set later
        seller_name: item.sellerName || item.name || "Unknown",
        contact: phone || email,
        address: item.address || item.streetAddress || "",
        city: item.city || null,
        state: item.state || null,
        zip: item.zip || item.zipcode || null,
        price: item.price || item.listPrice || null,
        url: item.url || null,
        source: "FSBO",
        source_type: "fsbo",
        date_listed: item.datePosted || new Date().toISOString(),
        listing_title: item.title || null,
        address_line_1: item.address || null,
        address_line_2: null,
        zipcode: item.zip || item.zipcode || null,
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

    // Parse city for URL building
    const cityState = order.primary_city; // e.g. "Detroit MI"
    const cityParts = cityState.split(" ");
    const city = cityParts[0].toLowerCase(); // "detroit"
    const state = cityParts[1]?.toLowerCase() || ""; // "mi"

    logStep("Starting multi-source scrape", { 
      city,
      state,
      attempt: scrapeAttempts,
      targetLeads: `${tierQuota.min}-${tierQuota.max}`
    });

    // Run all 4 scrapers in parallel
    const [fsboLeads, craigslistLeads, facebookLeads, buyownerLeads] = await Promise.all([
      scrapeWithApifyFSBO(cityState),
      scrapeWithOlostep(`https://${city}.craigslist.org/search/rea#search=owner`, "Craigslist"),
      scrapeWithOlostep(`https://facebook.com/marketplace/${city}/propertyrentals`, "Facebook"),
      scrapeWithOlostep(`https://buyowner.com/search/${city}`, "BuyOwner")
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
