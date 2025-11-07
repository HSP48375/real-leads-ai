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
  starter: { min: 20, max: 25 },
  growth: { min: 40, max: 50 },
  pro: { min: 110, max: 130 },
  enterprise: { min: 150, max: 200 },
};

const MAX_SCRAPE_ATTEMPTS = 3;

// Cost tracking and protection
const APIFY_COSTS = {
  fsbo_per_city: 0.05, // Approximate cost per city search
  deep_scrape_per_listing: 0.02, // Approximate cost per deep scrape
};

const TEST_MODE_MAX_CITIES = 2; // Limit test orders to 2 cities
const COST_WARNING_THRESHOLD = 50; // Warn when monthly costs approach $50

const logStep = (step: string, details?: any) => {
  console.log(`[SCRAPE-LEADS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

async function deepScrapeListingPage(url: string, source: string, addressFallback: string): Promise<any> {
  try {
    const apiKey = Deno.env.get("APIFY_API_KEY");
    if (!apiKey) {
      logStep(`${source} deep scrape skipped - no API key`);
      return null;
    }

    // Use Apify's web scraper for deep scraping
    const actorInput = {
      startUrls: [{ url }],
      proxyConfiguration: { useApifyProxy: true },
      maxRequestRetries: 2,
      maxPagesPerCrawl: 1,
      pageFunction: `
        async function pageFunction(context) {
          const { page } = context;
          const phoneRegex = /\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g;
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g;
          
          const text = await page.content();
          const phones = text.match(phoneRegex) || [];
          const emails = text.match(emailRegex) || [];
          
          return {
            phone: phones[0] || '',
            email: emails[0] || '',
            firstName: '',
            lastName: '',
            address: '${addressFallback}',
            bedrooms: null,
            bathrooms: null,
            homeStyle: '',
            yearBuilt: null
          };
        }
      `
    };

    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorInput),
      }
    );

    if (!response.ok) {
      logStep(`${source} deep scrape failed`, { status: response.status });
      return null;
    }

    const runData = await response.json();
    const runId = runData?.data?.id;

    if (!runId) return null;

    // Poll for results
    let attempts = 0;
    while (attempts < 20) {
      await new Promise(r => setTimeout(r, 3000));
      
      const statusResp = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );
      const statusData = await statusResp.json();
      const status = statusData?.data?.status;

      if (status === "SUCCEEDED") {
        const dataResp = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
        );
        const results = await dataResp.json();
        return results[0] || null;
      }

      if (["FAILED", "ABORTED"].includes(status)) {
        return null;
      }

      attempts++;
    }

    return null;
  } catch (error) {
    logStep(`Deep scrape error`, { error: error instanceof Error ? error.message : String(error) });
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
      maxItems: 100
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

    // Poll for completion
    const maxWaitMs = 5 * 60 * 1000;
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
    const itemsWithUrls = rawResults.filter((item: any) => item.url);
    
    logStep("FSBO items with URLs for deep scraping", { count: itemsWithUrls.length });

    // Deep scrape each listing with PARALLEL processing
    const maxDeepScrapes = Math.min(itemsWithUrls.length, options?.maxListings ?? 60);
    const seenPhones = new Set<string>();
    const rejectionReasons: { [key: string]: number } = {};
    
    const PARALLEL_BATCH_SIZE = 5;
    
    for (let i = 0; i < maxDeepScrapes; i += PARALLEL_BATCH_SIZE) {
      const batchEnd = Math.min(i + PARALLEL_BATCH_SIZE, maxDeepScrapes);
      const batchItems = itemsWithUrls.slice(i, batchEnd);
      
      logStep("FSBO parallel batch progress", { 
        batchStart: i + 1, 
        batchEnd, 
        total: maxDeepScrapes,
        batchSize: batchItems.length
      });
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batchItems.map(async (item: any) => {
          let phone = (item.phone || item.contactPhone || "").replace(/\D/g, "");
          let email = item.email || item.contactEmail || "";
          let firstName = "";
          let lastName = "";
          let bedrooms: number | null = null;
          let bathrooms: number | null = null;
          let homeStyle = "";
          let yearBuilt: number | null = null;

          const fallbackAddress = item.address || item.streetAddress || "";
          let addressFromDeepScrape = "";
          
          if (item.url) {
            const contactInfo = await deepScrapeListingPage(item.url, "FSBO", fallbackAddress);
            if (contactInfo) {
              phone = contactInfo.phone || phone;
              email = contactInfo.email || email;
              firstName = contactInfo.firstName || firstName;
              lastName = contactInfo.lastName || lastName;
              addressFromDeepScrape = contactInfo.address || "";
              bedrooms = contactInfo.bedrooms !== undefined ? contactInfo.bedrooms : bedrooms;
              bathrooms = contactInfo.bathrooms !== undefined ? contactInfo.bathrooms : bathrooms;
              homeStyle = contactInfo.homeStyle || homeStyle;
              yearBuilt = contactInfo.yearBuilt !== undefined ? contactInfo.yearBuilt : yearBuilt;
            }
          }

          return {
            item,
            phone,
            email,
            firstName,
            lastName,
            addressFromDeepScrape,
            fallbackAddress,
            bedrooms,
            bathrooms,
            homeStyle,
            yearBuilt
          };
        })
      );
      
      // Process batch results - 4 CORE FIELD VALIDATION (phone, name, address, price)
      for (const result of batchResults) {
        let { item, phone, email, firstName, lastName, addressFromDeepScrape, fallbackAddress, bedrooms, bathrooms, homeStyle, yearBuilt } = result;
        
        // VALIDATION 1: Must have phone number
        if (!phone) {
          const reason = "missing_phone";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          continue;
        }

        // VALIDATION 2: Check for duplicate phone
        if (seenPhones.has(phone)) {
          const reason = "duplicate_phone";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          continue;
        }
        seenPhones.add(phone);

        // VALIDATION 3: Must have name
        if (!firstName || !lastName) {
          const sellerName = item.seller || "";
          if (sellerName) {
            const parts = sellerName.trim().split(/\s+/);
            if (parts.length >= 2) {
              firstName = parts[0];
              lastName = parts.slice(1).join(" ");
            } else if (parts.length === 1) {
              firstName = parts[0];
              lastName = "Owner";
            }
          }
          
          if (!firstName) {
            const reason = "missing_name";
            rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
            continue;
          }
        }

        // VALIDATION 4: Must have address
        const address = addressFromDeepScrape || fallbackAddress;
        if (!address.trim()) {
          const reason = "missing_address";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          continue;
        }

        // VALIDATION 5: Must have price
        const price = item.price || item.listPrice || "";
        if (!price) {
          const reason = "missing_price";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          continue;
        }
        
        // ALL 4 CORE VALIDATIONS PASSED
        const title = item.title || "";
        const propertyType = item.propertyType || item.type || "";
        
        const lead: Lead = {
          order_id: options?.orderId || "",
          seller_name: `${firstName} ${lastName}`,
          contact: phone,
          email: email,
          address: address,
          city: item.city || undefined,
          state: item.state || undefined,
          zip: item.zip || item.zipcode || undefined,
          price: price || undefined,
          url: item.url || undefined,
          source: "FSBO",
          source_type: "fsbo",
          date_listed: item.datePosted || new Date().toISOString(),
          listing_title: title || propertyType || undefined,
          address_line_1: address || undefined,
          address_line_2: undefined,
          zipcode: item.zip || item.zipcode || undefined,
          bedrooms: bedrooms ?? undefined,
          bathrooms: bathrooms ?? undefined,
          home_style: homeStyle || undefined,
          year_built: yearBuilt ?? undefined,
        };

        logStep("ACCEPTED - lead with 4 core fields", { 
          phone, 
          name: `${firstName} ${lastName}`,
          address,
          price
        });

        leads.push(lead);
        
        // Save each lead immediately (with duplicate check)
        if (options?.orderId && options?.supabase && options?.insertLeadIfUnique) {
          try {
            const inserted = await options.insertLeadIfUnique(lead);
            if (inserted) {
              logStep("Lead saved", { phone, totalSaved: leads.length });
            }
          } catch (e) {
            logStep("Lead insert exception", { error: e instanceof Error ? e.message : String(e), phone });
          }
        }
      }
    }

    logStep("FSBO scraping complete", { 
      totalProcessed: maxDeepScrapes,
      acceptedLeads: leads.length,
      validationApproach: "4 core fields (phone, name, address, price)",
      rejectionReasons
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
    const { orderId: id } = await req.json();
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
      currentAttempt: order.scrape_attempts || 0
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
    
    // Check if max attempts exceeded
    if (scrapeAttempts > MAX_SCRAPE_ATTEMPTS) {
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
    }

    // COST PROTECTION: Check if this is a test order
    const isTestMode = Deno.env.get("TEST_MODE") === "true" || order.price_paid < 100;
    
    logStep("Starting FSBO-only scrape", { 
      city: order.primary_city,
      state: order.primary_state,
      radius: order.search_radius || 25,
      attempt: scrapeAttempts,
      targetLeads: `${tierQuota.min}-${tierQuota.max}`,
      testMode: isTestMode
    });

    // Get all cities within the search radius
    const radiusMiles = order.search_radius || 25;
    const citiesInRadius = await getCitiesWithinRadius(
      order.primary_city,
      order.primary_state,
      radiusMiles
    );
    
    // Combine with additional cities from order
    let allCities = [...new Set([...citiesInRadius, ...(order.additional_cities || [])])];
    
    // COST PROTECTION: Limit cities in test mode
    if (isTestMode && allCities.length > TEST_MODE_MAX_CITIES) {
      logStep(`⚠️ TEST MODE: Limiting to ${TEST_MODE_MAX_CITIES} cities (found ${allCities.length})`, {
        original: allCities.slice(0, 5).join(', '),
        limited: allCities.slice(0, TEST_MODE_MAX_CITIES).join(', ')
      });
      allCities = allCities.slice(0, TEST_MODE_MAX_CITIES);
    }
    
    logStep(`Total cities to search (${allCities.length})`, { 
      first10: allCities.slice(0, 10).join(', ') + (allCities.length > 10 ? '...' : ''),
      testMode: isTestMode
    });

    // Update order with cities searched
    await supabase
      .from("orders")
      .update({ 
        cities_searched: allCities,
        updated_at: new Date().toISOString() 
      })
      .eq("id", orderId);
    
    // Track execution time to prevent timeout
    const executionStartTime = Date.now();
    const MAX_EXECUTION_TIME_MS = 50000; // 50 seconds max
    
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
        const fsboLeads = await scrapeWithApifyFSBO(`${city}, ${order.primary_state}`, 
          { orderId, supabase, maxListings: 20, insertLeadIfUnique }
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
    const canRetry = scrapeAttempts < MAX_SCRAPE_ATTEMPTS;

    if (!quotaMet && canRetry) {
      // Need more leads - try again
      logStep("Quota not met - will retry", {
        current: totalLeadsCollected,
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
