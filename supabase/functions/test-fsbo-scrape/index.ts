import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const OLOSTEP_API_KEY = Deno.env.get("OLOSTEP_API_KEY");

const FSBO_ACTOR_ID = "dainty_screw/real-estate-fsbo-com-data-scraper"; // proven actor id

function log(step: string, details?: Record<string, unknown>) {
  console.log(`[TEST-FSBO] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
}

function normalizePhone(p?: string): string {
  if (!p) return "";
  return p.replace(/\D/g, "");
}

function maskPhone(p?: string): string | undefined {
  if (!p) return undefined;
  const digits = normalizePhone(p);
  if (digits.length < 10) return undefined;
  return `(***) ***-${digits.slice(-4)}`;
}

async function deepScrapeListingPage(url: string, addressFallback: string, maxWaitMs = 10000): Promise<{ phone?: string; email?: string; address?: string } | null> {
  try {
    if (!OLOSTEP_API_KEY) return null;

    const resp = await fetch("https://agent.olostep.com/olostep-p2p-incomingAPI", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OLOSTEP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        timeout: Math.min(maxWaitMs, 15000),
        saveHtml: false,
        saveMarkdown: false,
        removeCSSselectors: "default",
        htmlTransformer: "none",
        removeImages: true,
        fastLane: true,
      }),
    });

    if (!resp.ok) return null;

    const data = await resp.json();
    const text: string = data.markdown_content || data.text_content || "";

    const phoneRegex = /(\+1[-.\s]?)?(\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    const phones = text.match(phoneRegex) || [];
    const emails = text.match(emailRegex) || [];

    const result = {
      phone: phones[0] || "",
      email: emails[0] || "",
      address: addressFallback,
    };

    console.log(`[DEEP-SCRAPE][Olostep] ${url} -> phone:${result.phone ? "✓" : "✗"} email:${result.email ? "✓" : "✗"}`);

    return result;
  } catch (_) {
    return null;
  }
}

async function runFsboActor(city: string): Promise<any[]> {
  if (!APIFY_API_KEY) throw new Error("APIFY_API_KEY not configured");

  const input = {
    searchQueries: [city],
    maxItems: 100,
  };

  log("Starting FSBO actor", { city });

  const start = Date.now();
  const actorPath = FSBO_ACTOR_ID.replace("/", "~");
  const startResp = await fetch(`https://api.apify.com/v2/acts/${actorPath}/runs?token=${APIFY_API_KEY}` ,{
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!startResp.ok) throw new Error(`Apify start failed: ${startResp.status}`);
  const run = await startResp.json();
  const runId = run?.data?.id;
  if (!runId) throw new Error("Missing run id");

  // poll up to 60s
  while (Date.now() - start < 60000) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusResp = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`);
    const statusJson = await statusResp.json();
    const status = statusJson?.data?.status;
    if (status === "SUCCEEDED") {
      const dataResp = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`);
      const items = await dataResp.json();
      log("FSBO actor completed", { count: Array.isArray(items) ? items.length : 0 });
      return Array.isArray(items) ? items : [];
    }
    if (["FAILED", "ABORTED"].includes(status)) {
      throw new Error(`Apify run failed with status ${status}`);
    }
  }
  throw new Error("Apify run timed out");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST with { city, state, maxListings? }" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { city = "Novi", state = "MI", maxListings = 15 } = await req.json().catch(() => ({}));
    const cityQuery = `${city}, ${state}`;

    const fsboItems = await runFsboActor(cityQuery);
    const itemsWithUrls = fsboItems.filter((i: any) => i?.url);

    const limit = Math.min(itemsWithUrls.length, maxListings);
    log("Deep scraping listings", { limit, city: cityQuery });

    const BATCH = 5;
    const accepted: any[] = [];
    const samples: any[] = [];
    let processed = 0;

    for (let i = 0; i < limit; i += BATCH) {
      const batch = itemsWithUrls.slice(i, Math.min(i + BATCH, limit));
      log("Processing batch", { from: i + 1, to: Math.min(i + BATCH, limit) });

      const results = await Promise.all(
        batch.map(async (item: any) => {
          const fallbackAddress = item.address || item.streetAddress || "";
          const info = await deepScrapeListingPage(item.url, fallbackAddress, 10000);
          const phone = normalizePhone(info?.phone || item.phone || item.contactPhone || "");
          const email = info?.email || item.email || item.contactEmail || "";
          const address = info?.address || fallbackAddress;
          return { item, phone, email, address };
        })
      );

      for (const r of results) {
        processed++;
        if (r.phone && r.phone.length >= 10 && r.address) {
          const sellerName = r.item.seller || r.item.sellerName || "Property Owner";
          const lead = {
            seller_name: sellerName,
            phone_masked: maskPhone(r.phone),
            email: r.email || undefined,
            address: r.address,
            url: r.item.url,
            price: r.item.price || r.item.listPrice,
            source: "FSBO",
          };
          accepted.push(lead);
          if (samples.length < 5) samples.push(lead);
        }
      }
    }

    const response = {
      success: true,
      city: cityQuery,
      processed,
      deepScraped: Math.min(limit, processed),
      acceptedCount: accepted.length,
      sampleLeads: samples,
      note: "Phones are masked. This test does not write to DB or send emails.",
    };

    log("Test complete", { accepted: accepted.length, processed });

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("Test error", { message });
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});