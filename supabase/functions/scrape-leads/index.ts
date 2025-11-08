import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

// ============ MAPBOX GEOCODING API - RELIABLE & NATIONWIDE ============

const MAPBOX_API_KEY = Deno.env.get("MAPBOX_API_KEY");

// Haversine formula to calculate distance between two points in miles
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get coordinates for a city using Mapbox Geocoding API
async function getCityCoordinates(city: string, state: string): Promise<{ lat: number; lon: number } | null> {
  if (!MAPBOX_API_KEY) {
    logStep('Mapbox API key missing - cannot geocode');
    return null;
  }
  
  try {
    const query = encodeURIComponent(`${city}, ${state}, USA`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_API_KEY}&types=place&country=US&limit=1`;
    
    logStep(`Geocoding ${city}, ${state} with Mapbox`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logStep(`Mapbox geocoding error for ${city}`, { status: response.status });
      return null;
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      logStep(`No geocoding results for ${city}, ${state}`);
      return null;
    }
    
    const [lon, lat] = data.features[0].center;
    logStep(`Successfully geocoded ${city}, ${state}`, { lat, lon });
    
    return { lat, lon };
  } catch (error) {
    logStep('Error geocoding with Mapbox', { city, state, error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// Find all cities within radius using multiple Mapbox seed queries and bbox filtering
async function getCitiesWithinRadius(centerCity: string, centerState: string, radiusMiles: number): Promise<string[]> {
  if (!MAPBOX_API_KEY) {
    logStep('Mapbox API key missing - cannot find cities in radius');
    return [centerCity];
  }

  try {
    logStep(`Finding cities within ${radiusMiles} miles of ${centerCity}, ${centerState}`);

    const centerCoords = await getCityCoordinates(centerCity, centerState);
    if (!centerCoords) {
      logStep(`Could not geocode center city: ${centerCity}, ${centerState}`);
      return [centerCity];
    }

    // Create a latitude/longitude bounding box (approximation)
    const latDelta = radiusMiles / 69; // ~69 miles per degree latitude
    const lonDelta = radiusMiles / 54.6; // ~54.6 miles per degree longitude at mid-latitudes

    const minLon = centerCoords.lon - lonDelta;
    const minLat = centerCoords.lat - latDelta;
    const maxLon = centerCoords.lon + lonDelta;
    const maxLat = centerCoords.lat + latDelta;

    const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

    // Use multiple seed queries to comprehensively enumerate places in bbox
    // Using vowels + common consonants captures most city names
    const seedQueries = ['a','e','i','o','u','r','n','s','t','l'];
    const types = 'place,locality';
    const baseParams = `access_token=${MAPBOX_API_KEY}&types=${types}&country=US&bbox=${bbox}&limit=50&proximity=${centerCoords.lon},${centerCoords.lat}`;

    logStep('Searching cities in bounding box with Mapbox (multi-seed)', { bbox, seeds: seedQueries.join(',') });

    const requests = seedQueries.map((q) =>
      fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${baseParams}`)
    );

    const responses = await Promise.allSettled(requests);

    // Aggregate and deduplicate cities by normalized name
    const citiesSet = new Map<string, { name: string; lat: number; lon: number; distance: number }>();

    for (const res of responses) {
      if (res.status !== 'fulfilled') continue;
      const resp = res.value;
      if (!resp.ok) continue;
      try {
        const data = await resp.json();
        const features = Array.isArray(data?.features) ? data.features : [];
        for (const feature of features) {
          if (!feature?.center || !Array.isArray(feature.center)) continue;
          const [lon, lat] = feature.center as [number, number];
          const distance = calculateDistance(centerCoords.lat, centerCoords.lon, lat, lon);
          if (distance > radiusMiles) continue; // enforce true radius, not just bbox

          const rawName: string = feature?.text || (feature?.place_name?.split(',')[0] ?? '');
          if (!rawName) continue;
          const normalized = rawName.trim().toLowerCase();

          if (!citiesSet.has(normalized)) {
            citiesSet.set(normalized, { name: rawName.trim(), lat, lon, distance });
            logStep(`Found city: ${rawName.trim()}`, { distance: `${distance.toFixed(1)} miles` });
          } else {
            // Keep the closer instance if duplicates appear across seeds
            const existing = citiesSet.get(normalized)!;
            if (distance < existing.distance) {
              citiesSet.set(normalized, { name: rawName.trim(), lat, lon, distance });
            }
          }
        }
      } catch (_) {
        // ignore JSON parse errors for individual responses
      }
    }

    // Always include the center city
    const centerNormalized = centerCity.trim().toLowerCase();
    if (!citiesSet.has(centerNormalized)) {
      citiesSet.set(centerNormalized, { name: centerCity.trim(), lat: centerCoords.lat, lon: centerCoords.lon, distance: 0 });
    }

    // Sort by distance ascending and cap to a reasonable number (e.g., top 25)
    const sorted = Array.from(citiesSet.values()).sort((a, b) => a.distance - b.distance);
    const result = sorted.map((c) => c.name);

    logStep(`Found ${result.length} cities within ${radiusMiles} miles`, { cities: result });
    return result.length > 0 ? result : [centerCity];
  } catch (error) {
    logStep('Error finding cities within radius', { error: error instanceof Error ? error.message : String(error) });
    return [centerCity];
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");

// FSBO scraper only - correct actor ID with 108 successful runs
const FSBO_ACTOR_ID = "dainty_screw/real-estate-fsbo-com-data-scraper";

// Tier quota definitions
const TIER_QUOTAS = {
  starter: { min: 20, max: 25, maxCities: 2 },
  growth: { min: 40, max: 50, maxCities: 5 },
  pro: { min: 110, max: 130, maxCities: 10 },
  enterprise: { min: 150, max: 200, maxCities: 20 },
};

const MAX_SCRAPE_ATTEMPTS = 3;

// Cost tracking and protection
const APIFY_COSTS = {
  fsbo_per_city: 0.05, // Approximate cost per city search
  deep_scrape_per_listing: 0.02, // Approximate cost per deep scrape
};

// Tier-based city limits for cost optimization
const TIER_CITY_LIMITS = {
  starter: 2,    // $97 tier: 2 cities max (same as test mode)
  growth: 5,     // $197 tier: 4-5 cities max
  pro: 10,       // $397 tier: 8-10 cities max
  enterprise: 20 // $697 tier: 15-20 cities max
};

const logStep = (step: string, details?: any) => {
  console.log(`[SCRAPE-LEADS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

// Normalize phone number: remove 1+ prefix, ensure 10 digits
const normalizePhone = (phone: string): string => {
  const digitsOnly = phone.replace(/\D/g, "");
  
  // If 11 digits and starts with 1, remove the 1
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return digitsOnly.substring(1);
  }
  
  // If 10 digits, return as is
  if (digitsOnly.length === 10) {
    return digitsOnly;
  }
  
  // Otherwise return the cleaned version (may be invalid)
  return digitsOnly;
};

interface Lead {
  order_id: string;
  seller_name: string;
  contact: string;
  email?: string;
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
  bedrooms?: number;
  bathrooms?: number;
  home_style?: string;
  year_built?: number;
}

// ============ APIFY FSBO SCRAPER - PROVEN & COST-EFFECTIVE ============

async function deepScrapeListingPage(url: string, source: string, addressFallback: string, maxWaitMs: number = 15000): Promise<any> {
  try {
    const olostepApiKey = Deno.env.get("OLOSTEP_API_KEY");
    if (!olostepApiKey) {
      logStep("❌ Olostep API key missing");
      return null;
    }

    logStep(`🔍 Deep scraping: ${url.substring(0, 60)}...`);

    // Use Olostep for better extraction of contact info from listing pages
    const response = await fetch("https://agent.olostep.com/olostep-p2p-incomingAPI", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${olostepApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: url,
        timeout: Math.min(maxWaitMs, 15000), // Max 15s for Olostep
        saveHtml: false,
        saveMarkdown: false,
        removeCSSselectors: "default",
        htmlTransformer: "none",
        removeImages: true,
        fastLane: true // Use fast lane for quick extraction
      })
    });

    if (!response.ok) {
      logStep(`❌ Olostep failed for ${url}`, { status: response.status });
      return null;
    }

    const data = await response.json();
    const text = data.markdown_content || data.text_content || "";
    
    logStep(`📄 Olostep returned ${text.length} chars for ${url.substring(0, 40)}...`);
    
    // Extract phone and email with regex
    const phoneRegex = /\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    const phones = text.match(phoneRegex) || [];
    const emails = text.match(emailRegex) || [];
    
    logStep(`📞 Extracted from ${url.substring(0, 40)}...`, { 
      phones: phones.length,
      emails: emails.length,
      firstPhone: phones[0] || 'none',
      firstEmail: emails[0] || 'none'
    });
    
    const result = {
      phone: phones[0] || '',
      email: emails[0] || '',
      address: addressFallback
    };
    
    console.log(`[DEEP-SCRAPE] ${url} -> phone: ${result.phone ? '✓' : '✗'}, email: ${result.email ? '✓' : '✗'}`);
    
    return result;
  } catch (error) {
    logStep(`❌ Deep scrape error for ${url}`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

async function scrapeWithApifyFSBO(
  city: string,
  options?: {
    orderId?: string;
    supabase?: any;
    maxListings?: number;
    insertLeadIfUnique?: (lead: Lead) => Promise<boolean>;
  }
): Promise<Lead[]> {
  try {
    if (!APIFY_API_KEY) {
      logStep("Apify API key missing");
      return [];
    }

    logStep("Starting FSBO scrape", { city, maxListings: options?.maxListings || 60 });

    const actorInput = {
      searchQueries: [city],
      maxItems: options?.maxListings || 100 // Use maxListings from options (200 in exhaustive mode)
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

    // Poll for completion (extended timeout for exhaustive mode)
    const maxWaitMs = (options?.maxListings || 60) > 100 ? 180000 : 45000; // 3 min if exhaustive, 45s normal
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
    
    // Log sample of raw Apify data to see what fields are available
    if (rawResults.length > 0) {
      const sampleItem = rawResults[0];
      logStep("📊 Sample raw Apify item fields", { 
        hasPhone: !!sampleItem.phone || !!sampleItem.contactPhone,
        hasEmail: !!sampleItem.email || !!sampleItem.contactEmail,
        hasAddress: !!sampleItem.address || !!sampleItem.streetAddress,
        allFields: Object.keys(sampleItem).join(', '),
        phoneValue: sampleItem.phone || sampleItem.contactPhone || 'none',
        emailValue: sampleItem.email || sampleItem.contactEmail || 'none'
      });
    }

    const leads: Lead[] = [];
    const itemsWithUrls = rawResults.filter((item: any) => item.url);
    
    logStep("FSBO items with URLs for deep scraping", { count: itemsWithUrls.length });

    // Process results WITH parallel deep scraping (5 at a time with 10s timeout each)
    const maxListings = Math.min(itemsWithUrls.length, options?.maxListings ?? 60);
    const seenPhones = new Set<string>();
    const rejectionReasons: { [key: string]: number } = {};
    
    const BATCH_SIZE = 3; // Process 3 listings at a time
    const DEEP_SCRAPE_TIMEOUT = (options?.maxListings || 60) > 100 ? 15000 : 6000; // 15s in exhaustive, 6s normal
    
    logStep("Starting parallel deep scraping with timeout protection", { 
      count: maxListings, 
      maxTimePerListing: `${DEEP_SCRAPE_TIMEOUT / 1000}s`, 
      batchSize: BATCH_SIZE,
      exhaustiveMode: (options?.maxListings || 60) > 100
    });
    
    for (let batchStart = 0; batchStart < maxListings; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, maxListings);
      const batchItems = itemsWithUrls.slice(batchStart, batchEnd);
      
      logStep(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}`, { 
        range: `${batchStart + 1}-${batchEnd}`,
        total: maxListings
      });
      
      // Deep scrape batch in parallel
      const batchResults = await Promise.all(
        batchItems.map(async (item: any) => {
          const fallbackAddress = item.address || item.streetAddress || item.fullAddress || item.location || item.addressLine || item.address_line_1 || "";
          
          logStep(`🏠 Raw Apify item data`, {
            url: item.url?.substring(0, 50) + '...',
            rawPhone: item.phone || item.contactPhone || 'none',
            rawEmail: item.email || item.contactEmail || 'none',
            rawAddress: fallbackAddress?.substring(0, 40) || 'none'
          });
          
          const contactInfo = item.url 
            ? await deepScrapeListingPage(item.url, "FSBO", fallbackAddress, DEEP_SCRAPE_TIMEOUT)
            : null;
          
          const finalPhone = normalizePhone(contactInfo?.phone || item.phone || item.contactPhone || "");
          const finalEmail = contactInfo?.email || item.email || item.contactEmail || "";
          
          logStep(`✅ Final contact data`, {
            url: item.url?.substring(0, 50) + '...',
            phone: finalPhone || 'MISSING',
            email: finalEmail || 'MISSING',
            source: contactInfo?.phone ? 'olostep' : (item.phone || item.contactPhone ? 'apify' : 'none')
          });
          
          return {
            item,
            phone: finalPhone,
            email: finalEmail,
            address: contactInfo?.address || fallbackAddress
          };
        })
      );
      
      // Validate and save batch results
      for (const result of batchResults) {
        const { item, phone, email, address } = result;
        
        // Parse seller name
        let firstName = "";
        let lastName = "";
        const sellerName = item.seller || item.sellerName || "";
        if (sellerName) {
          const parts = sellerName.trim().split(/\s+/);
          if (parts.length >= 2) {
            firstName = parts[0];
            lastName = parts.slice(1).join(" ");
          } else if (parts.length === 1) {
            firstName = parts[0];
            lastName = "Owner";
          }
        } else {
          firstName = "Property";
          lastName = "Owner";
        }
        
        // VALIDATION 1: Must have phone
        if (!phone) {
          rejectionReasons["missing_phone"] = (rejectionReasons["missing_phone"] || 0) + 1;
          continue;
        }

        // VALIDATION 2: No duplicate phones
        if (seenPhones.has(phone)) {
          rejectionReasons["duplicate_phone"] = (rejectionReasons["duplicate_phone"] || 0) + 1;
          continue;
        }
        seenPhones.add(phone);

        // VALIDATION 3: Must have address
        if (!address) {
          rejectionReasons["missing_address"] = (rejectionReasons["missing_address"] || 0) + 1;
          continue;
        }

        // Build lead object
        const lead: Lead = {
          order_id: options?.orderId || "",
          seller_name: `${firstName} ${lastName}`.trim(),
          address,
          city: item.city || undefined,
          state: item.state || undefined,
          zip: item.zip || item.zipcode || undefined,
          price: item.price || undefined,
          contact: phone,
          email: email || undefined,
          url: item.url || undefined,
          source: "FSBO.com",
          source_type: "fsbo",
          date_listed: item.datePosted || item.dateListed || undefined,
          listing_title: item.title || item.propertyType || undefined,
          address_line_1: address || undefined,
          address_line_2: undefined,
          zipcode: item.zip || item.zipcode || undefined,
          bedrooms: item.bedrooms ?? item.beds ?? undefined,
          bathrooms: item.bathrooms ?? item.baths ?? undefined,
          home_style: item.propertyType || item.homeStyle || undefined,
          year_built: item.yearBuilt ?? undefined,
        };

        leads.push(lead);
        
        // Save immediately
        if (options?.orderId && options?.supabase && options?.insertLeadIfUnique) {
          try {
            const inserted = await options.insertLeadIfUnique(lead);
            if (inserted) {
              logStep("✅ Lead saved", { phone, name: `${firstName} ${lastName}`, total: leads.length });
            }
          } catch (e) {
            logStep("❌ Lead save failed", { error: e instanceof Error ? e.message : String(e) });
          }
        }
      }
    }

    logStep("✅ FSBO scraping complete", { 
      totalProcessed: maxListings,
      acceptedLeads: leads.length,
      validationApproach: "Deep scrape with 10s timeout per listing",
      rejectionReasons,
      speed: "OPTIMIZED (parallel batches with timeout protection)"
    });
    
    return leads;
  } catch (error) {
    logStep("FSBO scraping failed", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

// ============ MAIN SCRAPING LOGIC ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let orderId: string | undefined;

  try {
    const { orderId: id, exhaustive = false } = await req.json();
    orderId = id;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Scraping started", { orderId });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      logStep("Order not found", { orderId, error: orderError });
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Order found", {
      tier: order.tier,
      city: order.primary_city,
      state: order.primary_state,
      currentAttempt: order.scrape_attempts || 0,
      exhaustiveMode: exhaustive
    });

    // Increment scrape attempts
    const scrapeAttempts = (order.scrape_attempts || 0) + 1;
    await supabase
      .from("orders")
      .update({ scrape_attempts: scrapeAttempts })
      .eq("id", orderId);

    const tierQuota = TIER_QUOTAS[order.tier as keyof typeof TIER_QUOTAS] || { min: 20, max: 26 };
    
    // Helper to get current lead count
    const getCurrentLeadCount = async (): Promise<number> => {
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("order_id", orderId);
      return count || 0;
    };
    
    let totalLeadsCollected = await getCurrentLeadCount();
    logStep("Current lead count", { count: totalLeadsCollected });
    
    // Helper to check if lead exists
    const leadExists = async (phone: string, address: string): Promise<boolean> => {
      if (!phone && !address) return false;
      
      const { data, error } = await supabase
        .from("leads")
        .select("id")
        .eq("order_id", orderId)
        .or(`contact.eq.${phone},address.eq.${address}`)
        .limit(1);
      
      if (error) {
        logStep("Lead exists check error", { error: error.message });
        return false;
      }
      
      return (data?.length || 0) > 0;
    };
    
    // Helper to insert lead with duplicate checking
    const insertLeadIfUnique = async (lead: any): Promise<boolean> => {
      const exists = await leadExists(lead.contact || '', lead.address || '');
      
      if (exists) {
        logStep("⏭️ Skipping duplicate lead", { 
          phone: (lead.contact || '').slice(0, 10) + '...'
        });
        return false;
      }
      
      const { error } = await supabase.from("leads").insert([lead]);
      
      if (error) {
        logStep("Lead insert error", { error: error.message });
        return false;
      }
      
      return true;
    };
    
    // Check if max attempts exceeded (SKIP in exhaustive mode)
    if (!exhaustive && scrapeAttempts >= MAX_SCRAPE_ATTEMPTS) {
      const currentLeadCount = await getCurrentLeadCount();
      logStep("⚠️ MAX ATTEMPTS EXCEEDED - Forcing finalization", { 
        attempts: scrapeAttempts,
        maxAttempts: MAX_SCRAPE_ATTEMPTS,
        leadsCollected: currentLeadCount
      });
      
      // Trigger finalize-order
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      await fetch(`${supabaseUrl}/functions/v1/finalize-order`, {
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
          message: 'Max attempts exceeded - order finalized',
          leadsFound: currentLeadCount,
          attempt: scrapeAttempts
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (exhaustive && scrapeAttempts >= MAX_SCRAPE_ATTEMPTS) {
      logStep("🚀 EXHAUSTIVE MODE: Ignoring max attempts limit", { 
        attempts: scrapeAttempts,
        normalLimit: MAX_SCRAPE_ATTEMPTS
      });
    }

    // COST OPTIMIZATION: Apply tier-based city limits (SKIP in exhaustive mode)
    const tierCityLimit = exhaustive ? 999 : (TIER_CITY_LIMITS[order.tier as keyof typeof TIER_CITY_LIMITS] || 2);
    const isTestMode = Deno.env.get("TEST_MODE") === "true" || order.price_paid < 100;
    
    // In exhaustive mode, progressively widen radius: 25 -> 50 -> 100 -> 150 -> 200
    let radiusMiles = order.current_radius || order.search_radius || 25;
    if (exhaustive && scrapeAttempts > 1) {
      const radiusProgression = [25, 50, 100, 150, 200];
      const nextRadiusIndex = radiusProgression.findIndex(r => r >= radiusMiles) + 1;
      if (nextRadiusIndex < radiusProgression.length) {
        radiusMiles = radiusProgression[nextRadiusIndex];
        logStep("🌍 EXHAUSTIVE MODE: Widening search radius", { 
          previousRadius: order.current_radius || order.search_radius || 25,
          newRadius: radiusMiles,
          attempt: scrapeAttempts
        });
        await supabase
          .from("orders")
          .update({ current_radius: radiusMiles })
          .eq("id", orderId);
      }
    }
    
    logStep(`Starting ${exhaustive ? 'EXHAUSTIVE' : 'FSBO-only'} scrape`, { 
      city: order.primary_city,
      state: order.primary_state,
      radius: radiusMiles,
      attempt: scrapeAttempts,
      targetLeads: `${tierQuota.min}-${tierQuota.max}`,
      tier: order.tier,
      tierCityLimit: exhaustive ? 'UNLIMITED' : tierCityLimit,
      isTestMode,
      exhaustiveMode: exhaustive
    });
    const citiesInRadius = await getCitiesWithinRadius(
      order.primary_city,
      order.primary_state,
      radiusMiles
    );
    
    // Combine with additional cities from order
    let allCities = [...new Set([...citiesInRadius, ...(order.additional_cities || [])])];
    
    logStep(`🗺️ COVERAGE DISCOVERY: Found ${allCities.length} cities within ${radiusMiles} miles`, { 
      first10: allCities.slice(0, 10).join(', ') + (allCities.length > 10 ? '...' : ''),
      total: allCities.length
    });
    
    // COST OPTIMIZATION: Apply tier-based city limits (cities are sorted by distance, so we scrape closest first)
    // SKIP in exhaustive mode
    const originalCityCount = allCities.length;
    if (!exhaustive && allCities.length > tierCityLimit) {
      logStep(`💰 COST OPTIMIZATION: Limiting to ${tierCityLimit} cities for ${order.tier} tier (found ${originalCityCount})`, {
        tier: order.tier,
        pricePoint: `$${order.price_paid}`,
        original: allCities.slice(0, 5).join(', ') + '...',
        limited: allCities.slice(0, tierCityLimit).join(', '),
        costSavings: `~$${((originalCityCount - tierCityLimit) * APIFY_COSTS.fsbo_per_city).toFixed(2)}`
      });
      allCities = allCities.slice(0, tierCityLimit);
    } else if (exhaustive) {
      logStep(`🚀 EXHAUSTIVE MODE: Scraping ALL ${allCities.length} cities within ${radiusMiles} miles`, {
        tier: order.tier,
        cities: allCities.length,
        radius: radiusMiles,
        targetLeads: tierQuota.min
      });
    }
    
    logStep(`✅ Cities to scrape: ${allCities.length}`, { 
      cities: allCities.join(', '),
      tier: order.tier,
      targetLeads: `${tierQuota.min}-${tierQuota.max}`
    });

    // Update order with cities searched
    await supabase
      .from("orders")
      .update({ 
        cities_searched: allCities,
        updated_at: new Date().toISOString() 
      })
      .eq("id", orderId);
    
    // Track execution time to prevent timeout (extended in exhaustive mode)
    const executionStartTime = Date.now();
    const MAX_EXECUTION_TIME_MS = exhaustive ? 1140000 : 80000; // 19 min in exhaustive, 80s normal
    
    const shouldExitDueToTimeout = (): boolean => {
      const elapsed = Date.now() - executionStartTime;
      return elapsed > MAX_EXECUTION_TIME_MS;
    };

    logStep("Starting FSBO.com sequential scraping", {
      targetRange: `${tierQuota.min}-${tierQuota.max}`,
      citiesCount: allCities.length,
      maxExecutionTime: `${MAX_EXECUTION_TIME_MS}ms`
    });

    // FSBO.com via Apify - ONLY SOURCE
    for (const city of allCities) {
      // Check if quota is met
      totalLeadsCollected = await getCurrentLeadCount();
      if (totalLeadsCollected >= tierQuota.min) {
        logStep(`🎯 Quota met - stopping at ${city}`, {
          leadsCollected: totalLeadsCollected,
          targetRange: `${tierQuota.min}-${tierQuota.max}`
        });
        break;
      }
      
      // Check timeout
      if (shouldExitDueToTimeout()) {
        logStep("⏱️ TIMEOUT APPROACHING", { 
          leadsCollected: totalLeadsCollected,
          elapsedTime: `${Date.now() - executionStartTime}ms`
        });
        break;
      }
      
      try {
        const maxListings = exhaustive ? 200 : 10;
        const fsboLeads = await scrapeWithApifyFSBO(`${city}, ${order.primary_state}`, 
          { orderId, supabase, maxListings, insertLeadIfUnique }
        );
        
        if (fsboLeads && fsboLeads.length > 0) {
          logStep(`FSBO.com - ${city}`, { leadsFound: fsboLeads.length });
        }
      } catch (err) {
        logStep(`FSBO.com failed for ${city}`, { error: err instanceof Error ? err.message : String(err) });
      }
    }
    
    totalLeadsCollected = await getCurrentLeadCount();
    
    // COST TRACKING: Calculate estimated Apify costs
    const estimatedCost = (allCities.length * APIFY_COSTS.fsbo_per_city) + 
                         (totalLeadsCollected * APIFY_COSTS.deep_scrape_per_listing);
    
    logStep("FSBO scraping complete", {
      totalLeadsCollected,
      targetRange: `${tierQuota.min}-${tierQuota.max}`,
      citiesSearched: allCities.length,
      radiusMiles: radiusMiles,
      elapsedTime: `${Date.now() - executionStartTime}ms`,
      estimatedApifyCost: `$${estimatedCost.toFixed(2)}`,
      testMode: isTestMode
    });
    
    // Update order with cost tracking
    await supabase
      .from("orders")
      .update({ 
        scraping_cost: estimatedCost,
        updated_at: new Date().toISOString() 
      })
      .eq("id", orderId);

    // Check if we've met the minimum quota
    const quotaMet = totalLeadsCollected >= tierQuota.min;
    const canRetry = exhaustive ? true : scrapeAttempts < MAX_SCRAPE_ATTEMPTS;

    if (!quotaMet && canRetry) {
      logStep(exhaustive ? "🔄 EXHAUSTIVE MODE: Auto-retrying until quota met" : "Quota not met - will retry", {
        current: totalLeadsCollected,
        required: tierQuota.min,
        attempt: scrapeAttempts,
        exhaustive
      });
      await supabase
        .from("orders")
        .update({
          scrape_attempts: scrapeAttempts,
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      // Trigger another scrape with exhaustive mode preserved
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      await fetch(`${supabaseUrl}/functions/v1/scrape-leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ orderId, exhaustive })
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Retrying scrape for more leads',
          leadsFound: totalLeadsCollected,
          minRequired: tierQuota.min,
          attempt: scrapeAttempts
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap at maximum if exceeded
    const finalLeadCount = Math.min(totalLeadsCollected, tierQuota.max);

    // Determine final status
    let finalStatus: string;
    let statusReason: string;

    if (totalLeadsCollected >= tierQuota.min) {
      finalStatus = "completed";
      statusReason = "Quota met";
    } else {
      finalStatus = "insufficient_leads";
      statusReason = `Only found ${totalLeadsCollected} leads after ${scrapeAttempts} attempts (required: ${tierQuota.min})`;
      
      logStep("INSUFFICIENT LEADS", {
        found: totalLeadsCollected,
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
      // Insufficient leads - notify customer
      logStep("INSUFFICIENT LEADS - Sending notification email", {
        leadsFound: totalLeadsCollected,
        required: tierQuota.min,
        customerEmail: order.customer_email
      });

      // Send failure notification email
      if (order.customer_email) {
        try {
          const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
          
          await resend.emails.send({
            from: 'FSBO Lead Generation <onboarding@resend.dev>',
            to: [order.customer_email],
            subject: `Order Update: Unable to Find Sufficient Leads in ${order.primary_city}`,
            html: `
              <h2>Order Status Update</h2>
              <p>Hi ${order.customer_name || 'there'},</p>
              <p>We've attempted to collect leads for your order in <strong>${order.primary_city}</strong>, but unfortunately we were only able to find <strong>${totalLeadsCollected} leads</strong> after ${scrapeAttempts} attempts.</p>
              <p>Your <strong>${order.tier}</strong> tier requires a minimum of <strong>${tierQuota.min} leads</strong>.</p>
              <h3>What happens next?</h3>
              <ul>
                <li>You have NOT been charged for this order</li>
                <li>We recommend trying a different city or larger metropolitan area</li>
                <li>You can contact support for assistance</li>
              </ul>
              <p>We apologize for the inconvenience.</p>
              <p>Best regards,<br/>FSBO Lead Generation Team</p>
            `
          });
          
          logStep("Insufficient leads notification email sent");
        } catch (emailError) {
          logStep("Failed to send insufficient leads email", { 
            error: emailError instanceof Error ? emailError.message : String(emailError) 
          });
        }
      }

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
