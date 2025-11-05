import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");

// Zillow scraper - for foreclosures, bank owned, and FSBO properties
const ZILLOW_ACTOR_ID = "maxcopell/zillow-scraper";

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

    logStep("Starting Zillow scraper", { 
      city: order.primary_city,
      actor: ZILLOW_ACTOR_ID,
      attempt: scrapeAttempts,
      targetLeads: `${tierQuota.min}-${tierQuota.max}`
    });

    // Build search queries for Zillow (foreclosure, bank owned, FSBO)
    const cityState = order.primary_city; // e.g. "Detroit MI"
    const actorInput = {
      searchQueries: [
        `${cityState} foreclosure`,
        `${cityState} bank owned`,
        `${cityState} FSBO`
      ],
      extractionMethod: "PAGINATION_WITH_ZOOM_IN",
      maxItems: 200
    };

    logStep("Calling Apify Zillow actor", { input: actorInput });

    // Start the actor run (use ~ in actor path)
    const apifyActorPath = ZILLOW_ACTOR_ID.replace("/", "~");
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
      await supabase
        .from("orders")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      throw new Error(`Apify actor start failed (${startRunResp.status}): ${errorText}`);
    }

    const runStartJson = await startRunResp.json();
    const runId = runStartJson?.data?.id ?? runStartJson?.id;
    if (!runId) {
      logStep("Apify run id missing", { payload: runStartJson });
      await supabase
        .from("orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", orderId);
      throw new Error("Apify actor returned no runId");
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
        await supabase
          .from("orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId);
        throw new Error(`Apify run ended with status: ${runStatus}`);
      }
      if (Date.now() - startTime > maxWaitMs) {
        await supabase
          .from("orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId);
        throw new Error("Apify run polling timed out");
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
      await supabase
        .from("orders")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", orderId);
      throw new Error(`Failed to fetch dataset items (${datasetResp.status}): ${errorText}`);
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

    // Parse and validate leads - Zillow returns phone in various formats
    const validLeads: Lead[] = [];
    
    for (const item of rawResults) {
      // Zillow may have phone in different fields - check common ones
      const phoneField = item.phone || item.contactPhone || item.agentPhone || "";
      
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
        firstName: item.agentName || "",
        lastName: "",
        phone: cleanPhone,
        address: item.address || item.streetAddress || "",
        city: item.city || "",
        state: item.state || "",
        zip: item.zipcode || item.zip || "",
        price: item.price || item.listPrice || "",
        leadType: item.propertyType || "Zillow",
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
          const phoneField = item.phone || item.contactPhone || item.agentPhone || "";
          const cleanPhone = phoneField.replace(/\D/g, "");
          return cleanPhone.length >= 10;
        })
        .map((item: any) => {
          const phoneField = item.phone || item.contactPhone || item.agentPhone || "";
          const cleanPhone = phoneField.replace(/\D/g, "");
          const fullAddress = item.address || item.streetAddress || "";
          
          return {
            order_id: orderId,
            seller_name: item.agentName || item.brokerName || "Unknown",
            contact: cleanPhone,
            address: fullAddress,
            city: item.city || null,
            state: item.state || null,
            zip: item.zipcode || item.zip || null,
            price: item.price || item.listPrice || null,
            url: item.url || item.zpid ? `https://www.zillow.com/homedetails/${item.zpid}_zpid/` : null,
            source: "Zillow",
            source_type: item.propertyType || "zillow",
            date_listed: item.dateSold || item.listingDate || new Date().toISOString(),
            listing_title: item.description || null,
            address_line_1: fullAddress,
            address_line_2: null,
            zipcode: item.zipcode || item.zip || null,
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

    // Update order with final status
    await supabase
      .from("orders")
      .update({
        leads_count: finalLeadCount,
        total_leads_delivered: finalLeadCount,
        source_breakdown: { "Zillow": finalLeadCount },
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
          message: 'Zillow scraping completed - quota met',
          leadsDelivered: finalLeadCount,
          quota: `${tierQuota.min}-${tierQuota.max}`,
          source: "Zillow",
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
