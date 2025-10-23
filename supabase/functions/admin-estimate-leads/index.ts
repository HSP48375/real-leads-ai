import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");

const SCRAPERS = {
  zillow: "maxcopell~zillow-scraper",
  realtor: "epctex~realtor-scraper",
  fsbo: "dainty_screw~real-estate-fsbo-com-data-scraper",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Verify admin access
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role (you'll need to implement role checking)
    // For now, we'll just check if the user exists
    
    const { city, radius } = await req.json();

    if (!city || !radius) {
      return new Response(
        JSON.stringify({ error: "City and radius are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ADMIN-ESTIMATE] Estimating leads for ${city} (${radius}mi radius)`);

    // Run lightweight test queries (limit to 5 items each for estimation)
    const estimates: Record<string, number> = {};

    // Zillow estimate
    try {
      const zillowResults = await estimateApifyResults(SCRAPERS.zillow, {
        searchUrls: [`https://www.zillow.com/${city.toLowerCase().replace(/\s+/g, '-')}-mi/fsbo/`],
        maxItems: 5,
      });
      estimates["Zillow FSBO"] = Math.round(zillowResults * 10); // Extrapolate from sample
    } catch (e) {
      estimates["Zillow FSBO"] = 0;
    }

    // Realtor estimate
    try {
      const realtorResults = await estimateApifyResults(SCRAPERS.realtor, {
        startUrls: [`https://www.realtor.com/realestateandhomes-search/${city.replace(/\s+/g, '_')}_MI/type-single-family-home/fsbo/sby-1`],
        maxItems: 5,
      });
      estimates["Realtor.com FSBO"] = Math.round(realtorResults * 8); // Extrapolate
    } catch (e) {
      estimates["Realtor.com FSBO"] = 0;
    }

    // FSBO.com estimate
    try {
      const fsboResults = await estimateApifyResults(SCRAPERS.fsbo, {
        startUrls: [`https://www.fsbo.com/search?location=${encodeURIComponent(city + ', MI')}`],
        maxItems: 5,
      });
      estimates["FSBO.com"] = Math.round(fsboResults * 8); // Extrapolate
    } catch (e) {
      estimates["FSBO.com"] = 0;
    }

    const totalEstimate = Object.values(estimates).reduce((sum, count) => sum + count, 0);

    console.log(`[ADMIN-ESTIMATE] Completed`, { city, radius, estimates, totalEstimate });

    return new Response(
      JSON.stringify({
        success: true,
        city,
        radius,
        estimatedLeadsBySource: estimates,
        totalEstimate,
        note: "This is a rough estimate based on small samples. Actual results may vary.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[ADMIN-ESTIMATE] ERROR:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function estimateApifyResults(actorId: string, input: any): Promise<number> {
  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    throw new Error(`Apify API error: ${response.status}`);
  }

  const results = await response.json();
  return results.length;
}