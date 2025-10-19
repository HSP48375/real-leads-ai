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

// Apify Actor IDs - using working actors from Apify store
const SCRAPERS = {
  zillow: "maxcopell~zillow-scraper", // Zillow scraper (all listings)
  zillow_property: "afanasenko~zillow-property-agent-data-scraper", // Zillow with agent data
  realtor: "compass~realtor-scraper", // Realtor.com scraper
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
  date_listed?: string;
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

    // Determine lead quotas based on tier (aim for minimum, delight with extras)
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

    // Build target cities list based on radius and additional cities
    const targetCities = [order.primary_city];
    if (order.additional_cities && order.additional_cities.length > 0) {
      targetCities.push(...order.additional_cities);
    }
    
    logStep("Target cities determined", { cities: targetCities, radius: order.search_radius });

    // Run all scrapers in parallel for all target cities
    const allLeads: Lead[] = [];

    logStep("Starting scraper runs");

    for (const city of targetCities) {
      // Zillow Basic Scraper
      try {
        const zillowResults = await runApifyScraper(SCRAPERS.zillow, {
          searchUrls: [`https://www.zillow.com/${city.toLowerCase().replace(/\s+/g, '-')}-mi/fsbo/`],
          maxItems: minimumQuota * 3,
        });
        allLeads.push(...parseZillowBasicResults(zillowResults));
        logStep(`Zillow scraper completed for ${city}`, { count: zillowResults.length });
      } catch (e) {
        logStep(`Zillow scraper error for ${city}`, { error: e instanceof Error ? e.message : String(e) });
      }

      // Zillow Property Scraper (with agent data for filtering)
      try {
        const zillowPropertyResults = await runApifyScraper(SCRAPERS.zillow_property, {
          search: `${city}, MI`,
          listingType: "forSaleByOwner",
          maxItems: minimumQuota * 2,
        });
        allLeads.push(...parseZillowPropertyResults(zillowPropertyResults));
        logStep(`Zillow property scraper completed for ${city}`, { count: zillowPropertyResults.length });
      } catch (e) {
        logStep(`Zillow property scraper error for ${city}`, { error: e instanceof Error ? e.message : String(e) });
      }

      // Realtor.com Scraper
      try {
        const realtorResults = await runApifyScraper(SCRAPERS.realtor, {
          location: `${city}, MI`,
          listingType: "fsbo",
          maxItems: minimumQuota * 2,
        });
        allLeads.push(...parseRealtorResults(realtorResults));
        logStep(`Realtor.com scraper completed for ${city}`, { count: realtorResults.length });
      } catch (e) {
        logStep(`Realtor.com scraper error for ${city}`, { error: e instanceof Error ? e.message : String(e) });
      }
    }

    logStep("All scrapers completed", { totalLeads: allLeads.length });

    // CRITICAL: Filter out agent-listed properties
    const fsboOnly = allLeads.filter(lead => {
      const hasAgentIndicators = 
        lead.seller_name?.toLowerCase().includes('agent') ||
        lead.seller_name?.toLowerCase().includes('broker') ||
        lead.seller_name?.toLowerCase().includes('realty') ||
        lead.seller_name?.toLowerCase().includes('real estate group') ||
        lead.seller_name?.toLowerCase().includes('mls');
      
      // Keep leads that either have "fsbo" in source OR don't have agent indicators
      // This allows Facebook Marketplace and other sources while filtering agents
      return !hasAgentIndicators || lead.source.toLowerCase().includes('fsbo');
    });

    logStep("Filtered out agent listings", { count: fsboOnly.length });

    // Remove duplicates based on address
    const uniqueLeads = removeDuplicates(fsboOnly);
    logStep("Removed duplicates", { count: uniqueLeads.length });

    // Check against existing database leads
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("address");

    const existingAddresses = new Set(existingLeads?.map(l => normalizeAddress(l.address)) || []);
    const newLeads = uniqueLeads.filter(
      lead => !existingAddresses.has(normalizeAddress(lead.address))
    );

    logStep("Filtered out existing leads", { newCount: newLeads.length });

    // Limit to maximum quota (but deliver all if naturally found up to max)
    const finalLeads = newLeads.slice(0, maximumQuota);
    logStep("Applied tier quota", { finalCount: finalLeads.length, minimum: minimumQuota, maximum: maximumQuota });

    // Check if we met minimum quota - handle partial delivery if needed
    let orderStatus = "delivered";
    let needsAdditionalScraping = false;
    let nextScrapeDate = null;

    if (finalLeads.length < minimumQuota) {
      // Mark as partial delivery and schedule re-scrapes
      orderStatus = "partial_delivery";
      needsAdditionalScraping = true;
      nextScrapeDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      logStep("Partial delivery - scheduling re-scrapes", { 
        found: finalLeads.length, 
        minimum: minimumQuota,
        nextScrape: nextScrapeDate 
      });
    } else {
      logStep("Minimum quota met", { found: finalLeads.length, minimum: minimumQuota });
    }

    // Enrich contacts using Reverse Contact Enricher
    const enrichedLeads = await enrichContacts(finalLeads);
    logStep("Contact enrichment completed");

    // Store leads in database
    const leadsToInsert = enrichedLeads.map(lead => ({
      order_id: orderId,
      seller_name: lead.seller_name || "Unknown",
      contact: lead.contact || null,
      address: lead.address,
      city: lead.city || order.city,
      state: lead.state || "MI",
      zip: lead.zip || null,
      price: lead.price || null,
      url: lead.url || null,
      source: lead.source,
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
    const sheetUrl = await createGoogleSheet(order, enrichedLeads);
    logStep("Google Sheet created", { url: sheetUrl });

    // Update order with sheet URL, status, and scraping info
    await supabase
      .from("orders")
      .update({
        sheet_url: sheetUrl,
        status: orderStatus,
        delivered_at: new Date().toISOString(),
        leads_count: enrichedLeads.length,
        total_leads_delivered: enrichedLeads.length,
        cities_searched: targetCities,
        needs_additional_scraping: needsAdditionalScraping,
        next_scrape_date: nextScrapeDate?.toISOString(),
      })
      .eq("id", orderId);

    // Only send email if we actually have leads to deliver
    if (enrichedLeads.length > 0) {
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

              <div class="lead-details">
                <div class="detail-line">✓ ${enrichedLeads.length} verified FSBO homeowners</div>
                <div class="detail-line">✓ Plan: ${order.tier.charAt(0).toUpperCase() + order.tier.slice(1)}</div>
                <div class="detail-line">✓ Location: ${order.primary_city}, MI</div>
              </div>

              <div style="text-align: center;">
                <a href="${sheetUrl}" class="cta-button">Download Your Leads</a>
              </div>

              <p>Your leads include verified contact information for homeowners selling their properties directly (FSBO).</p>
              
              <div class="footer">
                Questions? Just reply to this email.
              </div>
            </div>
          </body>
        </html>
      `;

      const emailResponse = await fetch("https://api.resend.com/emails", {
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

      if (!emailResponse.ok) {
        console.error("Email send failed:", await emailResponse.text());
      } else {
        logStep("Leads ready email sent successfully");
      }
    } else {
      logStep("No leads found - skipping email notification");
    }

    return new Response(
      JSON.stringify({
        success: true,
        leadsDelivered: enrichedLeads.length,
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

async function runApifyScraper(actorId: string, input: any): Promise<any[]> {
  const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apify API error (${response.status}): ${errorText}`);
  }

  const runData = await response.json();
  
  if (!runData.data || !runData.data.id) {
    throw new Error(`Apify API returned invalid response: ${JSON.stringify(runData)}`);
  }
  
  const runId = runData.data.id;

  // Wait for run to complete
  let status = "RUNNING";
  while (status === "RUNNING") {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const statusResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${APIFY_API_KEY}`);
    const statusData = await statusResponse.json();
    status = statusData.data.status;
  }

  // Get results
  const resultsResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs/${runId}/dataset/items?token=${APIFY_API_KEY}`);
  return await resultsResponse.json();
}

function parseZillowBasicResults(results: any[]): Lead[] {
  return results
    .filter(item => item.hdpData?.homeInfo?.listing_sub_type?.is_FSBA === true)
    .map(item => ({
      seller_name: item.brokerName || undefined,
      contact: undefined,
      address: item.address || item.addressStreet,
      city: item.addressCity,
      state: item.addressState,
      zip: item.addressZipcode,
      price: item.unformattedPrice?.toString() || item.price,
      url: item.detailUrl || `https://www.zillow.com/homedetails/${item.zpid}_zpid/`,
      source: "Zillow FSBO",
      date_listed: undefined,
    }));
}

function parseZillowPropertyResults(results: any[]): Lead[] {
  return results
    .filter(item => !item.agentName || item.agentName.toLowerCase().includes('owner'))
    .map(item => ({
      seller_name: item.agentName || undefined,
      contact: item.cellPhone || item.agentEmail || undefined,
      address: item.streetAddress,
      city: item.city,
      state: item.state,
      zip: item.zipcode,
      price: item.price?.toString(),
      url: item.hdpUrl,
      source: "Zillow FSBO",
      date_listed: undefined,
    }));
}

function parseRealtorResults(results: any[]): Lead[] {
  return results.map(item => ({
    seller_name: item.agent?.name || null,
    contact: item.agent?.phone || item.agent?.email || null,
    address: item.location?.address?.line,
    city: item.location?.address?.city,
    state: item.location?.address?.state_code,
    zip: item.location?.address?.postal_code,
    price: item.list_price?.toString(),
    url: item.permalink,
    source: "Realtor.com FSBO",
    date_listed: item.list_date,
  }));
}

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
  // Run contact enrichment for leads without contact info
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

async function createGoogleSheet(order: any, leads: Lead[]): Promise<string> {
  const jwt = await createJWT(GOOGLE_SERVICE_ACCOUNT);

  if (!GOOGLE_SHEETS_FOLDER_ID) {
    throw new Error("Missing GOOGLE_SHEETS_FOLDER_ID secret. Create/share a Drive folder and set this secret.");
  }

  // Create spreadsheet directly in the shared folder via Drive API
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

  // Initialize header + data using Sheets API
  const values = [
    ["Name", "Phone/Email", "Address", "City", "State", "Zip", "Price", "Source", "Listing URL", "Date Listed"],
    ...leads.map(lead => [
      lead.seller_name || "",
      lead.contact || "",
      lead.address,
      lead.city || "",
      lead.state || "",
      lead.zip || "",
      lead.price || "",
      lead.source,
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

  // Base64url encode (RFC 4648)
  const base64UrlEncode = (str: string) => {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;

  // Import the private key for RS256 signing
  const privateKeyPem = serviceAccount.private_key;
  
  // Convert PEM to ArrayBuffer for signing
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  // Import key for RSASSA-PKCS1-v1_5 (RS256)
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

  // Sign the unsigned token
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  // Base64url encode the signature
  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  const encodedSignature = signatureBase64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const signedJwt = `${unsignedToken}.${encodedSignature}`;

  // Exchange JWT for access token
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
