import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");

// FSBO.com scraper - ONLY scraper used
const FSBO_ACTOR_ID = "dainty_screw/real-estate-fsbo-com-data-scraper";

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

    // Run FSBO.com scraper ONLY
    logStep("Starting FSBO.com scraper", { 
      city: order.primary_city,
      actor: FSBO_ACTOR_ID 
    });

    const actorInput = {
      addresses: [order.primary_city],
      maxListingPagesPerQuery: 10,
      searchRadius: order.search_radius ?? 25,
    };

    logStep("Calling Apify actor (two-step)", { input: actorInput });

    // Start the actor run (use ~ in actor path)
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

    // Parse and validate leads - ONLY save leads with phone numbers
    const validLeads: Lead[] = [];
    
    for (const item of rawResults) {
      // Validate phone field is present and non-empty
      if (!item.phone || item.phone.trim() === "") {
        logStep("Skipping lead without phone", { address: item.address1 });
        continue;
      }

      // Parse seller name into first/last
      const sellerParts = (item.seller || "").trim().split(/\s+/);
      const firstName = sellerParts[0] || "";
      const lastName = sellerParts.slice(1).join(" ") || "";

      // Strip formatting from phone (keep digits only)
      const cleanPhone = item.phone.replace(/\D/g, "");

      const lead: Lead = {
        firstName,
        lastName,
        phone: cleanPhone,
        address: item.address1 || "",
        city: item.city || "",
        state: item.state || "",
        zip: item.zipcode || "",
        price: item.price ? item.price.toString() : "",
        leadType: "FSBO",
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

    // Save leads to database
    if (validLeads.length > 0) {
      const leadsToInsert = validLeads.map(lead => ({
        order_id: lead.orderId,
        seller_name: `${lead.firstName} ${lead.lastName}`.trim() || "Unknown",
        contact: lead.phone,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
        price: lead.price,
        source: "FSBO.com",
        source_type: "fsbo",
        date_listed: lead.createdAt,
      }));

      const { error: insertErr } = await supabase
        .from("leads")
        .insert(leadsToInsert);

      if (insertErr) {
        logStep("ERROR inserting leads", { error: insertErr.message });
        throw new Error(`Failed to insert leads: ${insertErr.message}`);
      }

      logStep("Leads saved to database", { count: validLeads.length });
    }

    // Update order with lead count and status
    await supabase
      .from("orders")
      .update({
        leads_count: validLeads.length,
        total_leads_delivered: validLeads.length,
        source_breakdown: { "FSBO.com": validLeads.length },
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    logStep("Order updated", { leadsDelivered: validLeads.length, status: "completed" });

    // Trigger finalize-order to create CSV and send email
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
        message: 'FSBO.com scraping completed successfully',
        leadsDelivered: validLeads.length,
        source: "FSBO.com",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

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
