// Debug utility to fetch raw Apify FSBO actor results for a given runId
// Uses APIFY_API_KEY secret from environment. Public endpoint with CORS enabled.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
    if (!APIFY_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing APIFY_API_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept runId via query param or JSON body
    const url = new URL(req.url);
    let runId = url.searchParams.get("runId") || "";

    if (!runId && (req.method === "POST" || req.method === "PUT")) {
      const body = await req.json().catch(() => ({}));
      runId = body.runId || "";
    }

    if (!runId) {
      return new Response(JSON.stringify({ error: "Missing required parameter: runId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch run status
    const statusResp = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
    if (!statusResp.ok) {
      const errText = await statusResp.text();
      return new Response(JSON.stringify({ error: "Failed to fetch run status", status: statusResp.status, details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const statusJson = await statusResp.json();

    // Fetch dataset items
    const dataResp = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`);
    if (!dataResp.ok) {
      const errText = await dataResp.text();
      return new Response(JSON.stringify({ error: "Failed to fetch dataset items", status: dataResp.status, details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const items = await dataResp.json();

    // Build a compact response with a sample and keys summary to avoid huge payloads
    const sample = Array.isArray(items) ? items.slice(0, 3) : items;
    const keysSummary = Array.isArray(items) && items.length > 0
      ? Object.keys(items[0])
      : [];

    const response = {
      runId,
      status: statusJson?.data?.status ?? statusJson?.status ?? "UNKNOWN",
      itemCount: Array.isArray(items) ? items.length : 0,
      keys: keysSummary,
      sample,
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});