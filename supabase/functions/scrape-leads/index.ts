import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");

// Scrapers - for foreclosures, bank owned, and FSBO properties
const ZILLOW_ACTOR_ID = "maxcopell/zillow-scraper";
const REALTOR_ACTOR_ID = "epctex/realtor-scraper";

// Tier quota definitions
const TIER_QUOTAS = {
  starter: { min: 20, max: 25 },
  growth: { min: 40, max: 50 },
  scale: { min: 75, max: 100 },
};

const MAX_RADIUS = 100; // Maximum search radius in miles
const MAX_SCRAPE_ATTEMPTS = 3; // Maximum number of scrape attempts
const RADIUS_INCREMENT = 25; // Increase radius by this amount each attempt

const logStep = (step: string, details?: any) => {
  console.log(`[SCRAPE-LEADS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

interface Lead {
  firstName?: string;
  lastName?: string;
  phone: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: string;
  leadType: string;
  orderId: string;
  createdAt: string;
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

    // ✅ UPDATE ORDER STATUS TO SCRAPING_STARTED
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

    // Initialize or get current scraping state
    const currentRadius = order.current_radius || order.search_radius || 25;
    const scrapeAttempts = (order.scrape_attempts || 0) + 1;

    // Determine which scraper to use (alternate to maximize coverage)
    const useRealtorScraper = scrapeAttempts % 2 === 0;
    const actorId = useRealtorScraper ? REALTOR_ACTOR_ID : ZILLOW_ACTOR_ID;
    
    logStep(`Starting ${useRealtorScraper ? 'Realtor' : 'Zillow'} scraper`, { 
      city: order.primary_city,
      actor: actorId,
      attempt: scrapeAttempts,
      targetLeads: `${tierQuota.min}-${tierQuota.max}`
    });

    const cityState = order.primary_city; // e.g. "Detroit MI"
    
    // Build actor input based on scraper type
    const actorInput = useRealtorScraper ? {
      search: `${cityState} foreclosure OR bankOwned OR auction OR forSaleByOwner`,
      startUrls: [],
      maxItems: 200,
      endPage: 10,
      includeFloorplans: false,
      proxy: { useApifyProxy: true },
      extendOutputFunction: "($) => { return {}; }"
    } : {
      searchUrls: [
        `https://www.zillow.com/${cityState.toLowerCase().replace(/,/g, '').replace(/\s+/g, '-')}/`
      ],
      maxItems: 200
    };

    logStep(`Calling Apify ${useRealtorScraper ? 'Realtor' : 'Zillow'} actor`, { input: actorInput });

    // Start the actor run (use ~ in actor path)
    const apifyActorPath = actorId.replace("/", "~");
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
      logStep("Apify start run error", { status: startRunResp.status, error: errorText });

      // Mark order as failed
      const errorMsg = `Apify actor start failed (${startRunResp.status}): ${errorText}`;
      await supabase
        .from("orders")
        .update({
          status: "failed",
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      throw new Error(errorMsg);
    }

    const runStartJson = await startRunResp.json();
    const runId = runStartJson?.data?.id ?? runStartJson?.id;
    if (!runId) {
      logStep("Apify run id missing", { payload: runStartJson });
      const errorMsg = "Apify actor returned no runId";
      await supabase
        .from("orders")
        .update({ 
          status: "failed", 
          error_message: errorMsg,
          updated_at: new Date().toISOString() 
        })
        .eq("id", orderId);
      throw new Error(errorMsg);
    }
    logStep("Apify run started", { runId });

    // Poll run status until completion
    const maxWaitMs = 8 * 60 * 1000; // 8 minutes to stay within 10-min timeout
    const pollIntervalMs = 5000;
    const startTime = Date.now();
    let runStatus = "RUNNING";

    while (true) {
      const statusResp = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
      );
      const statusJson = await statusResp.json();
      runStatus = statusJson?.data?.status ?? statusJson?.status ?? "UNKNOWN";
      logStep("Apify run status", { runStatus });

      if (runStatus === "SUCCEEDED") break;
      if (["FAILED", "ABORTED", "TIMED-OUT"].includes(runStatus)) {
        const errorMsg = `Apify run ended with status: ${runStatus}`;
        await supabase
          .from("orders")
          .update({ 
            status: "failed", 
            error_message: errorMsg,
            updated_at: new Date().toISOString() 
          })
          .eq("id", orderId);
        throw new Error(errorMsg);
      }
      if (Date.now() - startTime > maxWaitMs) {
        const errorMsg = "Apify run polling timed out";
        await supabase
          .from("orders")
          .update({ 
            status: "failed", 
            error_message: errorMsg,
            updated_at: new Date().toISOString() 
          })
          .eq("id", orderId);
        throw new Error(errorMsg);
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    // Fetch dataset items for the completed run
    const datasetResp = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`
    );

    if (!datasetResp.ok) {
      const errorText = await datasetResp.text();
      logStep("Apify dataset fetch error", { status: datasetResp.status, error: errorText });
      const errorMsg = `Failed to fetch dataset items (${datasetResp.status}): ${errorText}`;
      await supabase
        .from("orders")
        .update({ 
          status: "failed", 
          error_message: errorMsg,
          updated_at: new Date().toISOString() 
        })
        .eq("id", orderId);
      throw new Error(errorMsg);
    }

    const rawResults = await datasetResp.json();
    logStep("Raw results received", { count: Array.isArray(rawResults) ? rawResults.length : 0 });

    // Log full raw data structure for analysis
    if (Array.isArray(rawResults) && rawResults.length > 0) {
      console.log("=== FULL RAW ZILLOW DATA ===");
      console.log("Total items:", rawResults.length);
      console.log("First item (full structure):", JSON.stringify(rawResults[0], null, 2));
      console.log("All available fields:", Object.keys(rawResults[0]));
      console.log("================================");
    }

    // Parse and validate leads - different format per scraper
    const validLeads: Lead[] = [];
    
    for (const item of rawResults) {
      // Extract phone based on scraper type
      let phoneField = "";
      if (useRealtorScraper) {
        phoneField = item.agent?.office?.phone || item.agent?.phones?.[0]?.number || "";
      } else {
        phoneField = item.phone || item.contactPhone || item.agentPhone || "";
      }
      
      if (!phoneField || phoneField.trim() === "") {
        logStep("Skipping lead without phone", { address: item.address || item.streetAddress });
        continue;
      }

      // Strip formatting from phone (keep digits only)
      const cleanPhone = phoneField.replace(/\D/g, "");
      
      if (cleanPhone.length < 10) {
        logStep("Skipping lead with invalid phone", { phone: phoneField });
        continue;
      }

      const lead: Lead = {
        firstName: useRealtorScraper ? (item.agent?.name || "").split(" ")[0] : (item.agentName || ""),
        lastName: useRealtorScraper ? (item.agent?.name || "").split(" ").slice(1).join(" ") : "",
        phone: cleanPhone,
        address: item.address || item.streetAddress || item.location?.address?.line || "",
        city: item.city || item.location?.address?.city || "",
        state: item.state || item.location?.address?.state_code || "",
        zip: item.zipcode || item.zip || item.location?.address?.postal_code || "",
        price: item.price || item.listPrice || item.list_price || "",
        leadType: useRealtorScraper ? (item.status || "Realtor") : (item.propertyType || "Zillow"),
        orderId: orderId,
        createdAt: new Date().toISOString()
      };

      validLeads.push(lead);
    }

    logStep("Leads validated", { 
      total: rawResults.length, 
      valid: validLeads.length,
      rejected: rawResults.length - validLeads.length 
    });

    // Calculate total leads including existing ones
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id", { count: "exact" })
      .eq("order_id", orderId);
    
    const existingCount = existingLeads?.length || 0;
    const totalLeadsAfterSave = existingCount + validLeads.length;

    logStep("Lead count analysis", {
      existing: existingCount,
      newValid: validLeads.length,
      totalAfterSave: totalLeadsAfterSave,
      minRequired: tierQuota.min,
      maxAllowed: tierQuota.max
    });

    // Save NEW leads to database (don't duplicate)
    if (validLeads.length > 0) {
      const leadsToInsert = rawResults
        .filter((item: any) => {
          let phoneField = "";
          if (useRealtorScraper) {
            phoneField = item.agent?.office?.phone || item.agent?.phones?.[0]?.number || "";
          } else {
            phoneField = item.phone || item.contactPhone || item.agentPhone || "";
          }
          const cleanPhone = phoneField.replace(/\D/g, "");
          return cleanPhone.length >= 10;
        })
        .map((item: any) => {
          let phoneField = "";
          let sellerName = "Unknown";
          let fullAddress = "";
          let sourceUrl = null;
          
          if (useRealtorScraper) {
            phoneField = item.agent?.office?.phone || item.agent?.phones?.[0]?.number || "";
            sellerName = item.agent?.name || "Unknown";
            fullAddress = item.location?.address?.line || item.address || "";
            sourceUrl = item.permalink || null;
          } else {
            phoneField = item.phone || item.contactPhone || item.agentPhone || "";
            sellerName = item.agentName || item.brokerName || "Unknown";
            fullAddress = item.address || item.streetAddress || "";
            sourceUrl = item.url || (item.zpid ? `https://www.zillow.com/homedetails/${item.zpid}_zpid/` : null);
          }
          
          const cleanPhone = phoneField.replace(/\D/g, "");
          
          return {
            order_id: orderId,
            seller_name: sellerName,
            contact: cleanPhone,
            address: fullAddress,
            city: useRealtorScraper ? (item.location?.address?.city || null) : (item.city || null),
            state: useRealtorScraper ? (item.location?.address?.state_code || null) : (item.state || null),
            zip: useRealtorScraper ? (item.location?.address?.postal_code || null) : (item.zipcode || item.zip || null),
            price: item.price || item.listPrice || item.list_price || null,
            url: sourceUrl,
            source: useRealtorScraper ? "Realtor" : "Zillow",
            source_type: useRealtorScraper ? (item.status || "realtor") : (item.propertyType || "zillow"),
            date_listed: item.dateSold || item.listingDate || item.list_date || new Date().toISOString(),
            listing_title: item.description || null,
            address_line_1: fullAddress,
            address_line_2: null,
            zipcode: useRealtorScraper ? (item.location?.address?.postal_code || null) : (item.zipcode || item.zip || null),
          };
        });

      const { error: insertErr } = await supabase
        .from("leads")
        .insert(leadsToInsert);

      if (insertErr) {
        logStep("ERROR inserting leads", { error: insertErr.message });
        throw new Error(`Failed to insert leads: ${insertErr.message}`);
      }

      logStep("Leads saved to database", { count: validLeads.length });
    }

    // Check if we've met the minimum quota
    const quotaMet = totalLeadsAfterSave >= tierQuota.min;
    const canExpandRadius = currentRadius < MAX_RADIUS && scrapeAttempts < MAX_SCRAPE_ATTEMPTS;

    if (!quotaMet && canExpandRadius) {
      // Need more leads - expand radius and try again
      const newRadius = Math.min(currentRadius + RADIUS_INCREMENT, MAX_RADIUS);
      
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

      // Trigger another scrape with expanded radius
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
          message: 'Retrying Zillow scrape for more leads',
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
        maxRadiusReached: currentRadius >= MAX_RADIUS,
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

    // Only trigger finalize if order is completed (not insufficient_leads)
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
      // Insufficient leads - needs manual review
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Insufficient leads found',
          leadsDelivered: finalLeadCount,
          minRequired: tierQuota.min,
          attemptsUsed: scrapeAttempts,
          maxRadiusReached: currentRadius >= MAX_RADIUS,
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
