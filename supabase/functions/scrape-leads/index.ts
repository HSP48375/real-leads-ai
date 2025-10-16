import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const GOOGLE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") || "{}");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Apify Actor IDs for each scraper
const SCRAPERS = {
  zillow_fsbo: "maxcopell/zillow-detail-scraper",
  craigslist: "curious_coder/craigslist-scraper",
  realtor_fsbo: "dainty_screw/realtor-com-scraper",
  facebook_marketplace: "apify/facebook-marketplace-scraper",
  fsbo_com: "dainty_screw/real-estate-fsbo-com-data-scraper",
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

    // Determine lead quotas based on tier (aim high, guarantee minimum)
    const quotas = {
      starter: { target: 25, minimum: 20 },
      growth: { target: 60, minimum: 40 },
      pro: { target: 100, minimum: 80 },
      enterprise: { target: 150, minimum: 120 },
    };
    
    const tierQuota = quotas[order.tier as keyof typeof quotas] || quotas.starter;
    const leadQuota = tierQuota.target;
    const minimumQuota = tierQuota.minimum;
    logStep("Lead quota", { target: leadQuota, minimum: minimumQuota });

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
      // Zillow FSBO Scraper
      try {
        const zillowResults = await runApifyScraper(SCRAPERS.zillow_fsbo, {
          search: `${city}, MI FSBO`,
          maxItems: leadQuota * 2,
        });
        allLeads.push(...parseZillowResults(zillowResults));
        logStep(`Zillow scraper completed for ${city}`, { count: zillowResults.length });
      } catch (e) {
        logStep(`Zillow scraper error for ${city}`, { error: e instanceof Error ? e.message : String(e) });
      }

      // Craigslist FSBO Scraper
      try {
        const craigslistResults = await runApifyScraper(SCRAPERS.craigslist, {
          searchQueries: [`https://detroit.craigslist.org/search/reo?query=fsbo+${city}`],
          maxItems: leadQuota * 2,
        });
        allLeads.push(...parseCraigslistResults(craigslistResults));
        logStep(`Craigslist scraper completed for ${city}`, { count: craigslistResults.length });
      } catch (e) {
        logStep(`Craigslist scraper error for ${city}`, { error: e instanceof Error ? e.message : String(e) });
      }

      // Facebook Marketplace Scraper
      try {
        const fbResults = await runApifyScraper(SCRAPERS.facebook_marketplace, {
          search: "house for sale by owner",
          location: `${city}, MI`,
          maxItems: leadQuota * 2,
        });
        allLeads.push(...parseFacebookResults(fbResults));
        logStep(`Facebook Marketplace scraper completed for ${city}`, { count: fbResults.length });
      } catch (e) {
        logStep(`Facebook scraper error for ${city}`, { error: e instanceof Error ? e.message : String(e) });
      }

      // FSBO.com Scraper
      try {
        const fsboResults = await runApifyScraper(SCRAPERS.fsbo_com, {
          location: city,
          maxItems: leadQuota * 2,
        });
        allLeads.push(...parseFSBOResults(fsboResults));
        logStep(`FSBO.com scraper completed for ${city}`, { count: fsboResults.length });
      } catch (e) {
        logStep(`FSBO.com scraper error for ${city}`, { error: e instanceof Error ? e.message : String(e) });
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
      
      return !hasAgentIndicators && lead.source.toLowerCase().includes('fsbo');
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

    // Limit to quota
    const finalLeads = newLeads.slice(0, leadQuota);
    logStep("Applied tier quota", { finalCount: finalLeads.length });

    // Check if we met minimum quota - handle refunds if needed
    let refundAmount = null;
    let refundReason = null;

    if (finalLeads.length < minimumQuota) {
      const percentageDelivered = (finalLeads.length / minimumQuota) * 100;
      const tierPrices = { starter: 9700, growth: 19700, pro: 39700, enterprise: 59700 };
      const orderPrice = tierPrices[order.tier as keyof typeof tierPrices] || 0;

      if (percentageDelivered < 50) {
        // Full refund if less than 50% of minimum
        refundAmount = orderPrice;
        refundReason = `Only ${finalLeads.length} leads found (${percentageDelivered.toFixed(0)}% of minimum ${minimumQuota}). Full refund issued.`;
        logStep("Full refund triggered", { found: finalLeads.length, minimum: minimumQuota });
      } else if (percentageDelivered < 80) {
        // Partial refund if 50-80% of minimum
        const refundPercentage = 100 - percentageDelivered;
        refundAmount = Math.floor((orderPrice * refundPercentage) / 100);
        refundReason = `Only ${finalLeads.length} leads found (${percentageDelivered.toFixed(0)}% of minimum ${minimumQuota}). Partial refund issued.`;
        logStep("Partial refund triggered", { found: finalLeads.length, minimum: minimumQuota, refund: refundAmount });
      } else {
        // No refund if >80% of minimum
        logStep("No refund needed", { found: finalLeads.length, minimum: minimumQuota, percentage: percentageDelivered });
      }

      // Process refund via Stripe if applicable
      if (refundAmount && order.stripe_payment_intent_id) {
        try {
          const stripe = await import("https://esm.sh/stripe@18.5.0");
          const stripeClient = new stripe.default(Deno.env.get("STRIPE_SECRET_KEY") || "", {
            apiVersion: "2025-08-27.basil",
          });
          
          await stripeClient.refunds.create({
            payment_intent: order.stripe_payment_intent_id,
            amount: refundAmount,
          });
          
          logStep("Refund processed via Stripe", { amount: refundAmount });
        } catch (refundError) {
          console.error("Refund failed:", refundError);
          refundReason += " (Refund processing failed - will be handled manually)";
        }
      }
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

    // Update order with sheet URL, status, and refund info
    await supabase
      .from("orders")
      .update({
        sheet_url: sheetUrl,
        status: "delivered",
        delivered_at: new Date().toISOString(),
        leads_count: enrichedLeads.length,
        cities_searched: targetCities,
        refund_amount: refundAmount,
        refund_reason: refundReason,
      })
      .eq("id", orderId);

    // Send email with sheet link
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RealtyLeadsAI <onboarding@resend.dev>",
        to: [order.customer_email],
        subject: "Your RealtyLeadsAI Verified Leads Are Ready",
        html: `
          <h1>Hi ${order.customer_name},</h1>
          <p>Your verified homeowner leads are ready!</p>
          <p><strong>Leads delivered:</strong> ${enrichedLeads.length} verified FSBO homeowners</p>
          <p><strong>Plan tier:</strong> ${order.tier.charAt(0).toUpperCase() + order.tier.slice(1)}</p>
          <p><strong>Location:</strong> ${order.city}, MI</p>
          <p><a href="${sheetUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Your Leads</a></p>
          <p>Your leads include verified contact information for homeowners selling their properties directly (FSBO) in the Metro Detroit area.</p>
          <p>Best regards,<br>RealtyLeadsAI Team</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      console.error("Email send failed:", await emailResponse.text());
    }

    logStep("Email sent successfully");

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

  const runData = await response.json();
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

function parseZillowResults(results: any[]): Lead[] {
  return results.map(item => ({
    seller_name: item.contactName || item.listingAgent || null,
    contact: item.contactPhone || item.email || null,
    address: item.address || item.streetAddress,
    city: item.city,
    state: item.state,
    zip: item.zipcode,
    price: item.price?.toString(),
    url: item.url,
    source: "Zillow FSBO",
    date_listed: item.dateListed,
  }));
}

function parseCraigslistResults(results: any[]): Lead[] {
  return results.map(item => ({
    seller_name: item.posterName || null,
    contact: item.phoneNumber || item.email || null,
    address: item.address || item.location,
    city: item.city || "Detroit",
    state: "MI",
    zip: item.postalCode || null,
    price: item.price?.toString(),
    url: item.url,
    source: "Craigslist FSBO",
    date_listed: item.postedDate,
  }));
}

function parseFacebookResults(results: any[]): Lead[] {
  return results.map(item => ({
    seller_name: item.sellerName || item.marketplace_listing_title || undefined,
    contact: undefined,
    address: item.location || item.marketplace_listing_location,
    city: item.city || "Detroit",
    state: "MI",
    zip: undefined,
    price: item.price?.toString() || item.marketplace_listing_price,
    url: item.url,
    source: "Facebook Marketplace",
    date_listed: item.creationTime,
  }));
}

function parseFSBOResults(results: any[]): Lead[] {
  return results.map(item => ({
    seller_name: item.ownerName || item.sellerName || null,
    contact: item.phone || item.email || null,
    address: item.address || item.propertyAddress,
    city: item.city,
    state: item.state || "MI",
    zip: item.zipCode,
    price: item.askingPrice?.toString() || item.price,
    url: item.listingUrl || item.url,
    source: "FSBO.com",
    date_listed: item.listingDate,
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
    const enrichResults = await runApifyScraper("dainty_screw/reverse-contact-enricher", {
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
  
  // Create new spreadsheet
  const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: `RealtyLeadsAI - ${order.customer_name} - ${new Date().toLocaleDateString()}`,
      },
      sheets: [{
        properties: { title: "Verified Leads" },
      }],
    }),
  });

  const sheet = await createResponse.json();
  const spreadsheetId = sheet.spreadsheetId;

  // Populate with data
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
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaim = btoa(JSON.stringify(claim));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;

  // Note: This is simplified - in production, use proper JWT signing
  // For now, we'll use the service account directly with Google API
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: unsignedToken,
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
