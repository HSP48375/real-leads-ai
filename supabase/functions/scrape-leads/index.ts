import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APIFY_API_KEY = Deno.env.get("APIFY_API_KEY");
const OLOSTEP_API_KEY = Deno.env.get("OLOSTEP_API_KEY");

// FSBO scraper only for Apify - correct actor ID with 108 successful runs
const FSBO_ACTOR_ID = "dainty_screw/real-estate-fsbo-com-data-scraper";

// Tier quota definitions - match actual tier promises
const TIER_QUOTAS = {
  starter: { min: 20, max: 25 },
  growth: { min: 40, max: 50 },
  pro: { min: 110, max: 130 },
  enterprise: { min: 150, max: 200 },
};

const MAX_SCRAPE_ATTEMPTS = 3;

const logStep = (step: string, details?: any) => {
  console.log(`[SCRAPE-LEADS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

interface Lead {
  order_id: string;
  seller_name: string;
  contact: string;
  email?: string; // Store email separately
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

// Enhanced LLM extraction prompt for Olostep - simplified for better JSON extraction
const OLOSTEP_EXTRACTION_PROMPT = `You are extracting real estate listings. Return ONLY a valid JSON object with this exact structure:
{
  "leads": [
    {
      "owner_name": "string",
      "owner_phone": "string", 
      "owner_email": "string",
      "property_address": "string",
      "city": "string",
      "state": "string",
      "zip": "string",
      "price": "string"
    }
  ]
}
Extract ALL visible property listings. If no listings found, return {"leads": []}.`;


async function scrapeWithOlostep(url: string, source: string, maxRetries = 3): Promise<Lead[]> {
  const RETRY_DELAY_MS = 30000; // 30 seconds between retries
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logStep(`Scraping ${source}`, { url, attempt, maxRetries });

    if (!OLOSTEP_API_KEY) {
      logStep(`Olostep API key missing for ${source}`);
      return [];
    }

    try {
      const payload = {
        url_to_scrape: url,
        formats: ["json"],
        wait_before_scraping: 3000,
        llm_extract: {
          prompt: OLOSTEP_EXTRACTION_PROMPT
        }
      };

      logStep(`Olostep payload for ${source}`, payload);

      const response = await fetch("https://api.olostep.com/v1/scrapes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OLOSTEP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isTimeout = response.status === 504;
        
        logStep(`Olostep error for ${source}`, { 
          status: response.status, 
          error: errorText,
          isTimeout,
          attempt,
          willRetry: isTimeout && attempt < maxRetries
        });
        
        // If timeout and we have retries left, wait and try again
        if (isTimeout && attempt < maxRetries) {
          logStep(`Waiting ${RETRY_DELAY_MS/1000}s before retry ${attempt + 1}/${maxRetries} for ${source}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue; // Try next attempt
        }
        
        return []; // Give up after retries exhausted or non-timeout error
      }

      const data = await response.json();
      logStep(`Olostep raw response for ${source}`, { 
        status: response.status,
        dataKeys: Object.keys(data || {}),
        hasResult: !!data?.result,
        hasJsonContent: !!data?.result?.json_content,
        attempt 
      });

      const leads: Lead[] = [];
      
      // Try to parse JSON content from Olostep response
      let extractedLeads: any[] = [];
      
      // First try: direct leads array
      if (data?.leads && Array.isArray(data.leads)) {
        extractedLeads = data.leads;
      }
      // Second try: nested in result.json_content
      else if (data?.result?.json_content) {
        try {
          const jsonContent = typeof data.result.json_content === 'string' 
            ? JSON.parse(data.result.json_content)
            : data.result.json_content;
          
          extractedLeads = jsonContent?.leads || [];
        } catch (e) {
          logStep(`${source} JSON parsing error`, { 
            error: e instanceof Error ? e.message : String(e),
            attempt 
          });
        }
      }

      if (!Array.isArray(extractedLeads) || extractedLeads.length === 0) {
        logStep(`${source} returned no leads array`, { 
          dataStructure: typeof data,
          keys: Object.keys(data || {}),
          attempt 
        });
        
        // If this was a timeout and we have retries left, continue to next attempt
        if (attempt < maxRetries) {
          logStep(`Waiting ${RETRY_DELAY_MS/1000}s before retry ${attempt + 1}/${maxRetries} for ${source}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        
        return [];
      }

      for (const item of extractedLeads) {
        // Require either phone or email
        const phone = (item.owner_phone || item.phone || "").replace(/\D/g, "");
        const email = item.owner_email || item.email || "";

        if (!phone && !email) {
          logStep(`Skipping ${source} lead without contact`, { address: item.property_address || item.address });
          continue;
        }

        leads.push({
          order_id: "", // Will be set later
          seller_name: item.owner_name || "Unknown",
          contact: phone || email,
          address: item.property_address || item.address || "",
          city: item.city || undefined,
          state: item.state || undefined,
          zip: item.zip || undefined,
          price: item.price || undefined,
          url: url,
          source: source,
          source_type: "fsbo",
          date_listed: new Date().toISOString(),
          listing_title: item.description || undefined,
          address_line_1: item.property_address || item.address || undefined,
          address_line_2: undefined,
          zipcode: item.zip || undefined,
        });
      }

      logStep(`${source} leads extracted successfully`, { count: leads.length, attempt });
      return leads; // Success - return the leads
      
    } catch (error) {
      const willRetry = attempt < maxRetries;
      logStep(`${source} scraping exception`, { 
        error: error instanceof Error ? error.message : String(error),
        attempt,
        willRetry
      });
      
      // Wait before retrying if we have attempts left
      if (willRetry) {
        logStep(`Waiting ${RETRY_DELAY_MS/1000}s before retry ${attempt + 1}/${maxRetries} for ${source}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      
      return []; // All retries exhausted
    }
  }
  
  // Should never reach here, but just in case
  logStep(`${source} - all retries exhausted`);
  return [];
}

// Deep scrape individual listing page to extract contact information with retry logic
async function deepScrapeListingPage(url: string, source: string, fallbackAddress: string = "", maxRetries = 2): Promise<{ phone?: string; email?: string; firstName?: string; lastName?: string; address?: string; bedrooms?: number; bathrooms?: number; homeStyle?: string; yearBuilt?: number } | null> {
  if (!OLOSTEP_API_KEY) {
    return null;
  }

  const DEEP_SCRAPE_DELAY_MS = 2000; // 2 seconds between retries (optimized for speed)

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logStep(`Deep scraping ${source} listing`, { url, attempt, maxRetries });

      const payload = {
        url_to_scrape: url,
        formats: ["json"],
        wait_before_scraping: 4000,
        llm_extract: {
          prompt: `Extract ALL information from this property listing page. Search EVERYWHERE for complete details. Return ONLY valid JSON:
{
  "owner_first_name": "string",
  "owner_last_name": "string", 
  "owner_phone": "string (REQUIRED)",
  "owner_email": "string (optional - include if found)",
  "full_address": "string (include if found - street, city, state, zip)",
  "bedrooms": number,
  "bathrooms": number,
  "home_style": "string (e.g., Ranch, Colonial, Contemporary, Cape Cod, Victorian, etc.)",
  "year_built": number
}

CRITICAL - Search these locations for contact info:
- Contact seller buttons/forms
- Any text patterns: [name]@gmail.com, [name]@[domain].com
- "Email:" labels or "Contact:" sections
- Hidden in JavaScript or data attributes
- Author/seller profile sections
- "Contact [First Last]" in titles
- "Posted by [First Last]" in descriptions

CRITICAL - Property details to extract:
- Bedrooms: Look for "beds", "BR", "bedrooms" in description
- Bathrooms: Look for "baths", "BA", "bathrooms" in description  
- Home style: Look for property type, architectural style, house type
- Year built: Look for "built in", "year built", construction date

PRIORITY: Phone number is REQUIRED. Email is optional but include if found. Return first name and last name separately. Extract all numeric values. If not found, return null for numbers or empty strings for text.`
        }
      };

      const response = await fetch("https://api.olostep.com/v1/scrapes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OLOSTEP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const isTimeout = response.status === 504;
        logStep(`Deep scrape failed for ${source}`, { 
          status: response.status, 
          url, 
          attempt,
          isTimeout,
          willRetry: isTimeout && attempt < maxRetries
        });
        
        // Retry on timeout
        if (isTimeout && attempt < maxRetries) {
          logStep(`Waiting ${DEEP_SCRAPE_DELAY_MS/1000}s before deep scrape retry ${attempt + 1}/${maxRetries}`, { url });
          await new Promise(resolve => setTimeout(resolve, DEEP_SCRAPE_DELAY_MS));
          continue;
        }
        
        return null;
      }

      const data = await response.json();
      
      // Parse contact info from response
      let contactInfo: any = {};
      
      if (data?.result?.json_content) {
        try {
          contactInfo = typeof data.result.json_content === 'string' 
            ? JSON.parse(data.result.json_content)
            : data.result.json_content;
        } catch (e) {
          logStep(`Deep scrape JSON parse error for ${source}`, { url, attempt });
          
          if (attempt < maxRetries) {
            logStep(`Waiting ${DEEP_SCRAPE_DELAY_MS/1000}s before deep scrape retry ${attempt + 1}/${maxRetries}`, { url });
            await new Promise(resolve => setTimeout(resolve, DEEP_SCRAPE_DELAY_MS));
            continue;
          }
          
          return null;
        }
      }

      const phone = (contactInfo.owner_phone || "").replace(/\D/g, "");
      const email = contactInfo.owner_email || "";
      const firstName = contactInfo.owner_first_name || "";
      const lastName = contactInfo.owner_last_name || "";
      const extractedAddress = contactInfo.full_address || "";
      const finalAddress = extractedAddress || fallbackAddress;
      const bedrooms = contactInfo.bedrooms || null;
      const bathrooms = contactInfo.bathrooms || null;
      const homeStyle = contactInfo.home_style || "";
      const yearBuilt = contactInfo.year_built || null;

      if (!phone) {
        logStep(`Deep scrape incomplete - phone required for ${source}`, { 
          url, 
          attempt,
          hasPhone: !!phone,
          hasEmail: !!email
        });
        
        // Retry if incomplete and retries available
        if (attempt < maxRetries) {
          logStep(`Waiting ${DEEP_SCRAPE_DELAY_MS/1000}s before deep scrape retry ${attempt + 1}/${maxRetries}`, { url });
          await new Promise(resolve => setTimeout(resolve, DEEP_SCRAPE_DELAY_MS));
          continue;
        }
        
        return null;
      }

      logStep(`Deep scrape success for ${source}`, { 
        url, 
        hasPhone: !!phone, 
        hasEmail: !!email,
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
        hasAddress: !!finalAddress,
        addressSource: extractedAddress ? "deep_scrape" : "fallback",
        hasBedrooms: bedrooms !== null,
        hasBathrooms: bathrooms !== null,
        hasHomeStyle: !!homeStyle,
        hasYearBuilt: yearBuilt !== null,
        attempt 
      });
      return { phone, email, firstName, lastName, address: finalAddress, bedrooms, bathrooms, homeStyle, yearBuilt };

    } catch (error) {
      const willRetry = attempt < maxRetries;
      logStep(`Deep scrape exception for ${source}`, { 
        url,
        error: error instanceof Error ? error.message : String(error),
        attempt,
        willRetry
      });
      
      if (willRetry) {
        logStep(`Waiting ${DEEP_SCRAPE_DELAY_MS/1000}s before deep scrape retry ${attempt + 1}/${maxRetries}`, { url });
        await new Promise(resolve => setTimeout(resolve, DEEP_SCRAPE_DELAY_MS));
        continue;
      }
      
      return null;
    }
  }
  
  logStep(`Deep scrape - all retries exhausted for ${source}`, { url });
  return null;
}

async function scrapeWithApifyFSBO(city: string, options?: { orderId?: string; supabase?: any; maxListings?: number }): Promise<Lead[]> {
  logStep("Scraping FSBO.com via Apify", { city });

  if (!APIFY_API_KEY) {
    logStep("Apify API key missing");
    return [];
  }

  try {
    // Correct input format for the FSBO actor
    const actorInput = {
      searchQueries: [city], // Required field - array of search queries
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
    const maxWaitMs = 5 * 60 * 1000; // 5 minutes
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

    // Deep scrape each listing with PARALLEL processing to speed things up
    const maxDeepScrapes = Math.min(itemsWithUrls.length, options?.maxListings ?? 60);
    const seenPhones = new Set<string>(); // DEDUPLICATE BY PHONE NUMBER ONLY
    const rejectionReasons: { [key: string]: number } = {};
    
    // Process 5 listings in parallel for faster scraping
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
          // Try direct contact first
          let phone = (item.phone || item.contactPhone || "").replace(/\D/g, "");
          let email = item.email || item.contactEmail || "";
          let firstName = "";
          let lastName = "";
          let bedrooms: number | null = null;
          let bathrooms: number | null = null;
          let homeStyle = "";
          let yearBuilt: number | null = null;

          // Always deep scrape for complete contact info and property details
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
      
      // Process batch results and apply validations
      for (const result of batchResults) {
        const { item, phone, email, firstName, lastName, addressFromDeepScrape, fallbackAddress, bedrooms, bathrooms, homeStyle, yearBuilt } = result;
        
        // VALIDATION 1: Must have phone number
        if (!phone) {
          const reason = "missing_phone";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          logStep("REJECTED - missing phone", { url: item.url });
          continue;
        }

        // VALIDATION 2: Check for duplicate phone (USE PHONE AS UNIQUE IDENTIFIER)
        if (seenPhones.has(phone)) {
          const reason = "duplicate_phone";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          logStep("REJECTED - duplicate phone", { url: item.url, phone });
          continue;
        }
        seenPhones.add(phone);

        // VALIDATION 3: Must have first AND last name
        if (!firstName || !lastName) {
          const reason = "missing_name";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          logStep("REJECTED - missing first or last name", { 
            url: item.url, 
            phone,
            firstName,
            lastName
          });
          continue;
        }

        // VALIDATION 4: Must have address (from deep scrape with fallback or original search result)
        const address = addressFromDeepScrape || fallbackAddress;
        if (!address.trim()) {
          const reason = "missing_address";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          logStep("REJECTED - missing address", { url: item.url, phone });
          continue;
        }

        // VALIDATION 5: Must have price
        const price = item.price || item.listPrice || "";
        if (!price) {
          const reason = "missing_price";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          logStep("REJECTED - missing price", { url: item.url, phone });
          continue;
        }

        // VALIDATION 6: Must have bedrooms
        if (bedrooms === null || bedrooms === undefined) {
          const reason = "missing_bedrooms";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          logStep("REJECTED - missing bedrooms", { url: item.url, phone });
          continue;
        }

        // VALIDATION 7: Must have bathrooms
        if (bathrooms === null || bathrooms === undefined) {
          const reason = "missing_bathrooms";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          logStep("REJECTED - missing bathrooms", { url: item.url, phone });
          continue;
        }

        // VALIDATION 8: Must have home style
        if (!homeStyle || !homeStyle.trim()) {
          const reason = "missing_home_style";
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
          logStep("REJECTED - missing home style", { url: item.url, phone });
          continue;
        }

        // VALIDATION 9: Year built is optional (many listings don't have it)
        // Allow leads without year_built since it's supplementary data
        
        // ALL 8 CORE VALIDATIONS PASSED - CREATE COMPLETE LEAD
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
          bedrooms: bedrooms,
          bathrooms: bathrooms,
          home_style: homeStyle,
          year_built: yearBuilt,
        };

        logStep("ACCEPTED - complete lead with 8 required fields (year_built optional)", { 
          phone, 
          email, 
          name: `${firstName} ${lastName}`,
          address,
          price,
          bedrooms,
          bathrooms,
          homeStyle,
          yearBuilt
        });

        leads.push(lead);
        
        // Save each lead immediately to avoid timeouts
        if (options?.orderId && options?.supabase) {
          try {
            const { error } = await options.supabase
              .from("leads")
              .insert([lead]);
            if (error) {
              logStep("Lead insert error", { error: error.message, phone });
            } else {
              logStep("Lead saved", { phone, totalSaved: leads.length });
            }
          } catch (e) {
            logStep("Lead insert exception", { error: e instanceof Error ? e.message : String(e), phone });
          }
        }
      }
    }

    // Log rejection summary
    logStep("FSBO scraping complete", { 
      totalProcessed: maxDeepScrapes,
      acceptedLeads: leads.length,
      rejectionReasons
    });
    
    return leads;
  } catch (error) {
    logStep("FSBO scraping failed", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

function deduplicateLeads(leads: Lead[]): Lead[] {
  const seen = new Set<string>();
  const deduplicated: Lead[] = [];

  for (const lead of leads) {
    // Create unique key from contact + address
    const key = `${lead.contact.toLowerCase()}-${lead.address.toLowerCase()}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(lead);
    }
  }

  logStep("Deduplication", { 
    before: leads.length, 
    after: deduplicated.length,
    removed: leads.length - deduplicated.length 
  });

  return deduplicated;
}

interface CityUrlMapping {
  craigslistSubdomain: string;
  buyownerCity: string;
  state: string;
}

function buildUrlsFromCityState(city: string, state: string): CityUrlMapping {
  if (!city || !state) {
    throw new Error(`Invalid input: city="${city}", state="${state}"`);
  }
  
  // Validate state code (should be 2 letters)
  if (state.length !== 2 || !/^[A-Za-z]{2}$/.test(state)) {
    logStep("ERROR: Invalid state code", { 
      city, 
      state, 
      error: "State must be 2-letter abbreviation" 
    });
    throw new Error(`Invalid state code: "${state}". Must be 2-letter abbreviation (e.g., MI, CA, NY)`);
  }
  
  const stateLower = state.toLowerCase();
  const cityLower = city.toLowerCase();
  
  // Validate city name is not empty
  if (!city || city.trim().length === 0) {
    logStep("ERROR: Missing city name", { 
      city, 
      state, 
      error: "City name is empty" 
    });
    throw new Error(`Missing city name`);
  }
  
  // Build Craigslist subdomain (remove spaces, lowercase)
  const craigslistSubdomain = cityLower.replace(/\s+/g, '');
  
  // Build BuyOwner city (hyphenated, lowercase)
  const buyownerCity = cityLower.replace(/\s+/g, '-');
  
  logStep("City URL mapping", {
    input: `${city}, ${state}`,
    parsed: { city, state },
    craigslist: craigslistSubdomain,
    buyowner: buyownerCity
  });
  
  return {
    craigslistSubdomain,
    buyownerCity,
    state: stateLower
  };
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

    // Update order status to processing
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

    const scrapeAttempts = (order.scrape_attempts || 0) + 1;

    // Parse city and build dynamic URLs with error handling
    let cityUrls: CityUrlMapping;
    try {
      cityUrls = buildUrlsFromCityState(order.primary_city, order.primary_state);
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : "Invalid city/state format";
      logStep("ERROR: City/state parsing failed", { 
        city: order.primary_city,
        state: order.primary_state, 
        error: errorMsg 
      });
      
      // Update order with error
      await supabase
        .from("orders")
        .update({
          status: "failed",
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return new Response(
        JSON.stringify({ 
          error: errorMsg,
          hint: 'Both city and state are required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    logStep("Starting multi-source scrape", { 
      city: order.primary_city,
      attempt: scrapeAttempts,
      targetLeads: `${tierQuota.min}-${tierQuota.max}`
    });

    // Build dynamic URLs for each source
    const craigslistUrl = `https://${cityUrls.craigslistSubdomain}.craigslist.org/search/rea?query=owner`;
    const facebookUrl = `https://www.facebook.com/marketplace/search/?query=house%20for%20sale%20by%20owner&exact=false`;
    const buyownerUrl = `https://www.buyowner.com/fsbo-${cityUrls.buyownerCity}-${cityUrls.state}`;

    logStep("Scraper URLs", { craigslistUrl, facebookUrl, buyownerUrl });

    // Run all 4 scrapers in parallel - don't fail entire order if one fails
    const didIncremental = true; // FSBO saves incrementally

    const fsboLeads = await scrapeWithApifyFSBO(`${order.primary_city}, ${order.primary_state}`,
      { orderId, supabase, maxListings: 60 }
    ).catch((err) => {
      logStep("FSBO scraper failed", { error: err.message });
      return [] as Lead[];
    });

    // Skip other sources for now to reduce timeouts
    const craigslistLeads: Lead[] = [];
    const facebookLeads: Lead[] = [];
    const buyownerLeads: Lead[] = [];


    // Combine all leads
    let allLeads = [...fsboLeads, ...craigslistLeads, ...facebookLeads, ...buyownerLeads];
    
    // Set order_id for all leads
    allLeads = allLeads.map(lead => ({ ...lead, order_id: orderId! }));

    logStep("All sources scraped", {
      fsbo: fsboLeads.length,
      craigslist: craigslistLeads.length,
      facebook: facebookLeads.length,
      buyowner: buyownerLeads.length,
      total: allLeads.length
    });

    // Leads were already saved one-by-one during scraping to avoid timeouts
    // Just count what we have in the database now
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("id", { count: "exact" })
      .eq("order_id", orderId);
    
    const totalLeadsAfterSave = existingLeads?.length || 0;

    logStep("Lead count analysis", {
      totalLeadsSaved: totalLeadsAfterSave,
      minRequired: tierQuota.min,
      maxAllowed: tierQuota.max
    });

    // Check if we've met the minimum quota
    const quotaMet = totalLeadsAfterSave >= tierQuota.min;
    const canRetry = scrapeAttempts < MAX_SCRAPE_ATTEMPTS;

    if (!quotaMet && canRetry) {
      // Need more leads - try again
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
      // Insufficient leads
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
