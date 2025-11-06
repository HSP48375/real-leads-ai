import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

// Get coordinates for a city using Mapbox Geocoding API (100% reliable, 100k free requests/month)
async function getCityCoordinates(city: string, state: string): Promise<{ lat: number; lon: number } | null> {
  if (!MAPBOX_API_KEY) {
    logStep('Mapbox API key missing - cannot geocode');
    return null;
  }
  
  try {
    const query = encodeURIComponent(`${city}, ${state}, USA`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_API_KEY}&types=place&country=US&limit=1`;
    
    logStep(`Geocoding ${city}, ${state} with Mapbox`, { url: url.replace(MAPBOX_API_KEY, 'HIDDEN') });
    
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

// Find all cities within radius using Mapbox's powerful proximity search
async function getCitiesWithinRadius(centerCity: string, centerState: string, radiusMiles: number): Promise<string[]> {
  if (!MAPBOX_API_KEY) {
    logStep('Mapbox API key missing - cannot find cities in radius');
    return [centerCity];
  }
  
  try {
    logStep(`Finding cities within ${radiusMiles} miles of ${centerCity}, ${centerState}`);
    
    // First, get coordinates of center city
    const centerCoords = await getCityCoordinates(centerCity, centerState);
    if (!centerCoords) {
      logStep(`Could not geocode center city: ${centerCity}, ${centerState}`);
      return [centerCity];
    }
    
    logStep(`Center coordinates`, { lat: centerCoords.lat, lon: centerCoords.lon });
    
    // Calculate bounding box (approximate: 1 degree lat = 69 miles, 1 degree lon = 54.6 miles at 42°N)
    const latDelta = radiusMiles / 69;
    const lonDelta = radiusMiles / 54.6;
    
    const minLon = centerCoords.lon - lonDelta;
    const minLat = centerCoords.lat - latDelta;
    const maxLon = centerCoords.lon + lonDelta;
    const maxLat = centerCoords.lat + latDelta;
    
    // Search for cities in bounding box using Mapbox
    // Use state name in query to get better results
    const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;
    const query = encodeURIComponent(centerState);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${MAPBOX_API_KEY}&types=place&country=US&bbox=${bbox}&limit=50&proximity=${centerCoords.lon},${centerCoords.lat}`;
    
    logStep('Searching cities in bounding box with Mapbox', { bbox, state: centerState });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      logStep(`Mapbox search failed for ${centerCity}`, { status: response.status });
      return [centerCity];
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      logStep(`No cities found within ${radiusMiles} miles of ${centerCity}`);
      return [centerCity];
    }
    
    // Filter cities by actual distance and extract names
    const cities: Set<string> = new Set([centerCity]);
    
    for (const feature of data.features) {
      const [lon, lat] = feature.center;
      const distance = calculateDistance(centerCoords.lat, centerCoords.lon, lat, lon);
      
      if (distance <= radiusMiles) {
        const cityName = feature.text || feature.place_name.split(',')[0];
        cities.add(cityName);
        logStep(`Found city: ${cityName}`, { distance: distance.toFixed(1) + ' miles' });
      }
    }
    
    logStep(`Found ${cities.size} cities within ${radiusMiles} miles`, { cities: Array.from(cities) });
    return Array.from(cities);
    
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
const OLOSTEP_API_KEY = Deno.env.get("OLOSTEP_API_KEY");
const ZENROWS_API_KEY = Deno.env.get("ZENROWS_API_KEY");

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

// ZenRows extraction prompt - professional anti-bot bypass
const ZENROWS_EXTRACTION_PROMPT = `Extract ALL real estate "for sale by owner" property listings from this page. Return ONLY valid JSON:
{
  "leads": [
    {
      "owner_name": "string (seller/owner name)",
      "owner_phone": "string (phone number - REQUIRED)",
      "owner_email": "string (email if available)",
      "property_address": "string (full street address)",
      "city": "string",
      "state": "string (2-letter code)",
      "zip": "string",
      "price": "string (asking price)",
      "bedrooms": number,
      "bathrooms": number,
      "year_built": number,
      "home_style": "string (property type/style)"
    }
  ]
}

CRITICAL: 
- Extract ALL listings on the page
- Phone number is REQUIRED for each lead
- If no contact info found, skip that listing
- Return {"leads": []} if no listings found`;


// ZenRows scraper with HTML parsing for Craigslist
async function scrapeWithZenRowsHTML(url: string, source: string, maxRetries = 2): Promise<Lead[]> {
  const RETRY_DELAY_MS = 10000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logStep(`Scraping ${source} with ZenRows HTML`, { url, attempt, maxRetries });

    if (!ZENROWS_API_KEY) {
      logStep(`ZenRows API key missing for ${source}`);
      return [];
    }

    try {
      const zenrowsUrl = new URL('https://api.zenrows.com/v1/');
      zenrowsUrl.searchParams.set('apikey', ZENROWS_API_KEY);
      zenrowsUrl.searchParams.set('url', url);
      zenrowsUrl.searchParams.set('js_render', 'true');
      zenrowsUrl.searchParams.set('premium_proxy', 'true');
      zenrowsUrl.searchParams.set('wait', '3000');

      const response = await fetch(zenrowsUrl.toString(), { method: "GET" });

      if (!response.ok) {
        const errorText = await response.text();
        const isTimeout = response.status === 504 || response.status === 524;
        const isRateLimit = response.status === 429;
        
        logStep(`ZenRows error for ${source}`, { 
          status: response.status, 
          error: errorText.substring(0, 200),
          attempt,
          willRetry: (isTimeout || isRateLimit) && attempt < maxRetries
        });
        
        if ((isTimeout || isRateLimit) && attempt < maxRetries) {
          const delay = isRateLimit ? RETRY_DELAY_MS * 2 : RETRY_DELAY_MS;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return [];
      }

      const htmlContent = await response.text();
      logStep(`ZenRows HTML retrieved for ${source}`, { 
        htmlLength: htmlContent.length,
        attempt 
      });

      // Parse Craigslist HTML - extract phone numbers and addresses
      const leads: Lead[] = [];
      
      if (source === "Craigslist") {
        // Extract listing items - Craigslist uses <li class="cl-static-search-result">
        const listingRegex = /<li[^>]*class="[^"]*cl-static-search-result[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
        const listings = htmlContent.match(listingRegex) || [];
        
        logStep(`Craigslist listings found`, { count: listings.length });
        
        for (const listing of listings) {
          try {
            // Extract title/address from <div class="title">
            const titleMatch = listing.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            const titleText = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
            
            // Extract link and ID
            const linkMatch = listing.match(/href="([^"]+)"/);
            const linkUrl = linkMatch ? linkMatch[1] : '';
            
            // Extract price
            const priceMatch = listing.match(/<div[^>]*class="[^"]*price[^"]*"[^>]*>\$?([\d,]+)<\/div>/i);
            const price = priceMatch ? `$${priceMatch[1]}` : '';
            
            // Skip if no contact info (we'll add phone parsing later)
            if (titleText && linkUrl) {
              leads.push({
                order_id: '',
                seller_name: 'Owner',
                contact: 'See listing',
                address: titleText,
                price: price || undefined,
                url: linkUrl.startsWith('http') ? linkUrl : `https://craigslist.org${linkUrl}`,
                source: 'Craigslist',
                source_type: 'web_scrape',
                listing_title: titleText,
              });
            }
          } catch (e) {
            logStep(`Error parsing Craigslist listing`, { error: e instanceof Error ? e.message : String(e) });
          }
        }
      }
      
      logStep(`${source} leads parsed`, { count: leads.length });
      return leads;
      
    } catch (error) {
      const willRetry = attempt < maxRetries;
      logStep(`${source} ZenRows exception`, { 
        error: error instanceof Error ? error.message : String(error),
        attempt,
        willRetry
      });
      
      if (willRetry) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      
      return [];
    }
  }
  
  logStep(`${source} - all ZenRows retries exhausted`);
  return [];
}

// ZenRows scraper with AUTOPARSE for real estate sites (Zillow, Trulia, ForSaleByOwner)
async function scrapeWithZenRowsAutoparse(url: string, source: string, maxRetries = 2): Promise<Lead[]> {
  const RETRY_DELAY_MS = 10000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logStep(`Scraping ${source} with ZenRows Autoparse`, { url, attempt, maxRetries });

    if (!ZENROWS_API_KEY) {
      logStep(`ZenRows API key missing for ${source}`);
      return [];
    }

    try {
      const zenrowsUrl = new URL('https://api.zenrows.com/v1/');
      zenrowsUrl.searchParams.set('apikey', ZENROWS_API_KEY);
      zenrowsUrl.searchParams.set('url', url);
      zenrowsUrl.searchParams.set('js_render', 'true');
      zenrowsUrl.searchParams.set('premium_proxy', 'true');
      zenrowsUrl.searchParams.set('wait', '3000');
      zenrowsUrl.searchParams.set('autoparse', 'true'); // Enable autoparse for real estate

      const response = await fetch(zenrowsUrl.toString(), { method: "GET" });

      if (!response.ok) {
        const errorText = await response.text();
        const isTimeout = response.status === 504 || response.status === 524;
        const isRateLimit = response.status === 429;
        
        logStep(`ZenRows autoparse error for ${source}`, { 
          status: response.status, 
          error: errorText.substring(0, 200),
          attempt,
          willRetry: (isTimeout || isRateLimit) && attempt < maxRetries
        });
        
        if ((isTimeout || isRateLimit) && attempt < maxRetries) {
          const delay = isRateLimit ? RETRY_DELAY_MS * 2 : RETRY_DELAY_MS;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return [];
      }

      const jsonData = await response.json();
      logStep(`ZenRows autoparse data retrieved for ${source}`, { 
        hasListings: !!jsonData?.listings,
        listingsCount: jsonData?.listings?.length || 0,
        attempt 
      });

      // Parse autoparsed real estate data
      const leads: Lead[] = [];
      
      if (jsonData?.listings && Array.isArray(jsonData.listings)) {
        for (const listing of jsonData.listings) {
          try {
            // ZenRows autoparse returns structured real estate data
            const address = listing.address || listing.full_address || '';
            const price = listing.price || listing.listing_price || '';
            const phone = listing.phone || listing.contact_phone || '';
            
            if (address || phone) {
              leads.push({
                order_id: '',
                seller_name: listing.agent_name || listing.seller_name || 'Owner',
                contact: phone || 'See listing',
                email: listing.email || listing.contact_email,
                address: address,
                city: listing.city,
                state: listing.state,
                zip: listing.zip || listing.zipcode,
                price: price,
                url: listing.url || listing.listing_url,
                source: source,
                source_type: 'web_scrape',
                bedrooms: listing.bedrooms || listing.beds,
                bathrooms: listing.bathrooms || listing.baths,
                home_style: listing.property_type || listing.home_type,
                year_built: listing.year_built,
                listing_title: listing.title || listing.description?.substring(0, 100),
              });
            }
          } catch (e) {
            logStep(`Error parsing ${source} listing`, { error: e instanceof Error ? e.message : String(e) });
          }
        }
      }
      
      logStep(`${source} autoparse leads extracted`, { count: leads.length });
      return leads;
      
    } catch (error) {
      const willRetry = attempt < maxRetries;
      logStep(`${source} ZenRows autoparse exception`, { 
        error: error instanceof Error ? error.message : String(error),
        attempt,
        willRetry
      });
      
      if (willRetry) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      
      return [];
    }
  }
  
  logStep(`${source} - all ZenRows autoparse retries exhausted`);
  return [];
}

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

async function scrapeWithApifyFSBO(city: string, options?: { orderId?: string; supabase?: any; maxListings?: number; insertLeadIfUnique?: (lead: any) => Promise<boolean> }): Promise<Lead[]> {
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
        
        // Save each lead immediately to avoid timeouts (with duplicate check)
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

// Map cities to their Craigslist metro area subdomains
function getCraigslistMetro(city: string, state: string): string {
  const cityLower = city.toLowerCase().trim();
  const stateLower = state.toLowerCase().trim();
  
  // Metro area mappings by state
  const metroMappings: { [state: string]: { [city: string]: string } } = {
    // Michigan
    'mi': {
      'novi': 'detroit',
      'troy': 'detroit',
      'livonia': 'detroit',
      'dearborn': 'detroit',
      'warren': 'detroit',
      'sterling heights': 'detroit',
      'farmington hills': 'detroit',
      'westland': 'detroit',
      'rochester hills': 'detroit',
      'southfield': 'detroit',
      'royal oak': 'detroit',
      'detroit': 'detroit',
      'ann arbor': 'annarbor',
      'ypsilanti': 'annarbor',
      'grand rapids': 'grandrapids',
      'lansing': 'lansing',
      'flint': 'flint',
    },
    // California
    'ca': {
      'los angeles': 'losangeles',
      'santa monica': 'losangeles',
      'pasadena': 'losangeles',
      'long beach': 'losangeles',
      'glendale': 'losangeles',
      'burbank': 'losangeles',
      'san francisco': 'sfbay',
      'oakland': 'sfbay',
      'san jose': 'sfbay',
      'berkeley': 'sfbay',
      'palo alto': 'sfbay',
      'san diego': 'sandiego',
      'sacramento': 'sacramento',
      'fresno': 'fresno',
    },
    // Texas
    'tx': {
      'houston': 'houston',
      'dallas': 'dallas',
      'fort worth': 'dallas',
      'austin': 'austin',
      'san antonio': 'sanantonio',
      'el paso': 'elpaso',
    },
    // New York
    'ny': {
      'new york': 'newyork',
      'brooklyn': 'newyork',
      'manhattan': 'newyork',
      'queens': 'newyork',
      'bronx': 'newyork',
      'staten island': 'newyork',
      'buffalo': 'buffalo',
      'rochester': 'rochester',
      'albany': 'albany',
    },
    // Florida
    'fl': {
      'miami': 'miami',
      'orlando': 'orlando',
      'tampa': 'tampa',
      'jacksonville': 'jacksonville',
      'fort lauderdale': 'miami',
    },
    // Illinois
    'il': {
      'chicago': 'chicago',
      'naperville': 'chicago',
      'aurora': 'chicago',
    },
    // Pennsylvania
    'pa': {
      'philadelphia': 'philadelphia',
      'pittsburgh': 'pittsburgh',
    },
    // Ohio
    'oh': {
      'cleveland': 'cleveland',
      'columbus': 'columbus',
      'cincinnati': 'cincinnati',
    },
    // Georgia
    'ga': {
      'atlanta': 'atlanta',
    },
    // North Carolina
    'nc': {
      'charlotte': 'charlotte',
      'raleigh': 'raleigh',
    },
    // Washington
    'wa': {
      'seattle': 'seattle',
      'tacoma': 'seattle',
      'spokane': 'spokane',
    },
    // Massachusetts
    'ma': {
      'boston': 'boston',
    },
    // Arizona
    'az': {
      'phoenix': 'phoenix',
      'tucson': 'tucson',
    },
    // Colorado
    'co': {
      'denver': 'denver',
      'boulder': 'boulder',
    },
  };
  
  // Check if we have a mapping for this state
  const stateMap = metroMappings[stateLower];
  if (stateMap && stateMap[cityLower]) {
    return stateMap[cityLower];
  }
  
  // Fallback: use city name (sanitized)
  return cityLower.replace(/\s+/g, '');
}

// Build URLs for a specific source and city
function buildUrlsFromCityState(city: string, state: string, source: 'craigslist' | 'fsbo' | 'zillow' | 'trulia'): string[] {
  if (!city || !state) {
    logStep("Invalid input", { city, state });
    return [];
  }
  
  // Validate state code (should be 2 letters)
  if (state.length !== 2 || !/^[A-Za-z]{2}$/.test(state)) {
    logStep("Invalid state code", { city, state });
    return [];
  }
  
  const stateLower = state.toLowerCase();
  const stateUpper = state.toUpperCase();
  const cityLower = city.toLowerCase();
  const cityHyphenated = cityLower.replace(/\s+/g, '-');
  
  // Validate city name is not empty
  if (!city || city.trim().length === 0) {
    logStep("Missing city name", { city, state });
    return [];
  }
  
  switch (source) {
    case 'craigslist':
      const craigslistSubdomain = getCraigslistMetro(city, state);
      return [`https://${craigslistSubdomain}.craigslist.org/search/rea?query=owner`];
      
    case 'fsbo':
      return [`https://www.forsalebyowner.com/search/list/${cityHyphenated}-${stateLower}`];
      
    case 'zillow':
      return [`https://www.zillow.com/${cityHyphenated}-${stateLower}/fsbo/`];
      
    case 'trulia':
      return [`https://www.trulia.com/for_sale/${city},${stateUpper}/fsbo_lt/`];
      
    default:
      return [];
  }
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

    // INTELLIGENT SEQUENTIAL SCRAPING - Run sources one by one until target is met
    // Cost order: FSBO (cheapest via Apify) → Craigslist → ForSaleByOwner.com → Zillow → Trulia
    
    const didIncremental = true; // FSBO saves incrementally
    let totalLeadsCollected = 0;
    let sourcesRun: string[] = [];
    
    // Helper function to check current lead count in database
    const getCurrentLeadCount = async (): Promise<number> => {
      const { data, error } = await supabase
        .from("leads")
        .select("id", { count: "exact" })
        .eq("order_id", orderId);
      
      if (error) {
        logStep("Error checking lead count", { error: error.message });
        return 0;
      }
      
      return data?.length || 0;
    };
    
    // Helper function to check if lead already exists (prevent duplicates during retries)
    const leadExists = async (phone: string, address: string): Promise<boolean> => {
      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
      const normalizedAddress = address.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from("leads")
        .select("id")
        .eq("order_id", orderId)
        .ilike("address", `%${normalizedAddress}%`)
        .limit(1);
      
      if (error) {
        logStep("Error checking for duplicate lead", { error: error.message });
        return false;
      }
      
      // If we found a lead with similar address, check phone
      if (data && data.length > 0) {
        const { data: phoneData } = await supabase
          .from("leads")
          .select("contact")
          .eq("order_id", orderId)
          .eq("id", data[0].id)
          .single();
        
        if (phoneData) {
          const existingPhone = (phoneData.contact || '').replace(/\D/g, '').slice(-10);
          return existingPhone === normalizedPhone;
        }
      }
      
      return false;
    };
    
    // Helper function to insert lead with duplicate checking
    const insertLeadIfUnique = async (lead: any): Promise<boolean> => {
      // Check if lead already exists
      const exists = await leadExists(lead.contact || '', lead.address || '');
      
      if (exists) {
        logStep("⏭️ Skipping duplicate lead", { 
          phone: (lead.contact || '').slice(0, 10) + '...', 
          address: (lead.address || '').slice(0, 30) + '...'
        });
        return false;
      }
      
      // Insert the lead
      const { error } = await supabase.from("leads").insert([lead]);
      
      if (error) {
        logStep("Lead insert error", { error: error.message });
        return false;
      }
      
      return true;
    };
    
    // Check if max attempts exceeded - if so, finalize with what we have
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

    logStep("Starting RADIUS-BASED multi-source scrape", { 
      city: order.primary_city,
      state: order.primary_state,
      radius: order.search_radius || 25,
      attempt: scrapeAttempts,
      targetLeads: `${tierQuota.min}-${tierQuota.max}`
    });

    // Get all cities within the search radius
    const radiusMiles = order.search_radius || 25;
    const citiesInRadius = await getCitiesWithinRadius(
      order.primary_city,
      order.primary_state,
      radiusMiles
    );
    
    // Combine with additional cities from order
    const allCities = [...new Set([...citiesInRadius, ...(order.additional_cities || [])])];
    logStep(`Total cities to search (${allCities.length})`, { 
      first10: allCities.slice(0, 10).join(', ') + (allCities.length > 10 ? '...' : '')
    });

    // Build URLs for all cities in radius
    const craigslistUrls: string[] = [];
    const fsboComUrls: string[] = [];
    const zillowUrls: string[] = [];
    const truliaUrls: string[] = [];
    
    for (const city of allCities) {
      craigslistUrls.push(...buildUrlsFromCityState(city, order.primary_state, 'craigslist'));
      fsboComUrls.push(...buildUrlsFromCityState(city, order.primary_state, 'fsbo'));
      zillowUrls.push(...buildUrlsFromCityState(city, order.primary_state, 'zillow'));
      truliaUrls.push(...buildUrlsFromCityState(city, order.primary_state, 'trulia'));
    }
    
    logStep(`Total URLs to scrape`, { 
      craigslist: craigslistUrls.length,
      forsalebyowner: fsboComUrls.length, 
      zillow: zillowUrls.length,
      trulia: truliaUrls.length,
      totalCities: allCities.length
    });

    // Update order with cities searched
    await supabase
      .from("orders")
      .update({ 
        cities_searched: allCities,
        updated_at: new Date().toISOString() 
      })
      .eq("id", orderId);
    
    // Helper function to check if target is met
    const isTargetMet = (currentCount: number): boolean => {
      return currentCount >= tierQuota.min && currentCount <= tierQuota.max;
    };

    // Track execution time to prevent timeout
    const executionStartTime = Date.now();
    const MAX_EXECUTION_TIME_MS = 50000; // 50 seconds max (edge functions timeout ~60s)
    
    const shouldExitDueToTimeout = (): boolean => {
      const elapsed = Date.now() - executionStartTime;
      return elapsed > MAX_EXECUTION_TIME_MS;
    };

    logStep("Starting SEQUENTIAL scraping with intelligent stopping", {
      targetRange: `${tierQuota.min}-${tierQuota.max}`,
      strategy: "Cost-optimized: FSBO → Craigslist → Others",
      maxExecutionTime: `${MAX_EXECUTION_TIME_MS}ms`
    });

    // SOURCE 1: FSBO.com via Apify (CHEAPEST - $0.05-0.15 per order)
    if (totalLeadsCollected < tierQuota.min) {
      logStep("SOURCE 1: FSBO.com - Starting", { citiesCount: allCities.length });
      
      for (const city of allCities) {
        // Check if quota is met before processing next city
        totalLeadsCollected = await getCurrentLeadCount();
        if (isTargetMet(totalLeadsCollected)) {
          logStep(`🎯 Quota met during FSBO scraping - stopping at ${city}`, {
            leadsCollected: totalLeadsCollected,
            targetRange: `${tierQuota.min}-${tierQuota.max}`
          });
          break;
        }
        
        // Check timeout before next city
        if (shouldExitDueToTimeout()) {
          logStep("⏱️ TIMEOUT APPROACHING during FSBO loop", { 
            leadsCollected: totalLeadsCollected,
            elapsedTime: `${Date.now() - executionStartTime}ms`
          });
          break;
        }
        
        try {
          const fsboLeads = await scrapeWithApifyFSBO(`${city}, ${order.primary_state}`, 
            { orderId, supabase, maxListings: 20 }
          );
          
          if (fsboLeads && fsboLeads.length > 0) {
            logStep(`FSBO.com - ${city}`, { leadsFound: fsboLeads.length });
          }
        } catch (err) {
          logStep(`FSBO.com failed for ${city}`, { error: err instanceof Error ? err.message : String(err) });
        }
      }
      
      totalLeadsCollected = await getCurrentLeadCount();
      sourcesRun.push("FSBO.com");
      
      logStep("SOURCE 1: FSBO.com - Complete", { 
        totalLeads: totalLeadsCollected,
        targetMin: tierQuota.min,
        targetMet: isTargetMet(totalLeadsCollected),
        elapsedTime: `${Date.now() - executionStartTime}ms`
      });
      
      // Check if we should exit due to timeout
      if (shouldExitDueToTimeout()) {
        logStep("⏱️ TIMEOUT APPROACHING - Triggering retry", { 
          leadsCollected: totalLeadsCollected,
          elapsedTime: `${Date.now() - executionStartTime}ms`,
          attempt: scrapeAttempts
        });
        
        // Increment attempt counter and trigger retry
        await supabase
          .from("orders")
          .update({
            scrape_attempts: scrapeAttempts + 1,
            status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        
        // Trigger retry
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
            message: 'Timeout approaching - retrying',
            leadsFound: totalLeadsCollected,
            elapsedTime: Date.now() - executionStartTime,
            attempt: scrapeAttempts + 1
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (isTargetMet(totalLeadsCollected)) {
        logStep("🎯 TARGET MET after FSBO.com - Stopping", { 
          leadsCollected: totalLeadsCollected,
          sourcesUsed: sourcesRun 
        });
      }
    }

    // SOURCE 2: Craigslist via ZenRows ($0.11-0.22 per order with 10 deep scrapes)
    if (totalLeadsCollected < tierQuota.min) {
      logStep("SOURCE 2: Craigslist - Starting", { urlsCount: craigslistUrls.length });
      
      const craigslistLimit = Math.min(craigslistUrls.length, 10); // Limit to control costs
      
      for (let i = 0; i < craigslistLimit; i++) {
        // Check if quota is met before processing next URL
        totalLeadsCollected = await getCurrentLeadCount();
        if (isTargetMet(totalLeadsCollected)) {
          logStep(`🎯 Quota met during Craigslist scraping - stopping at URL ${i+1}`, {
            leadsCollected: totalLeadsCollected,
            targetRange: `${tierQuota.min}-${tierQuota.max}`
          });
          break;
        }
        
        // Check timeout before next URL
        if (shouldExitDueToTimeout()) {
          logStep("⏱️ TIMEOUT APPROACHING during Craigslist loop", { 
            leadsCollected: totalLeadsCollected,
            elapsedTime: `${Date.now() - executionStartTime}ms`
          });
          break;
        }
        
        const url = craigslistUrls[i];
        try {
          const craigslistLeads = await scrapeWithZenRowsHTML(url, "Craigslist");
          
          if (craigslistLeads && craigslistLeads.length > 0) {
            // Save leads to database (with duplicate check)
            let newLeadsCount = 0;
            for (const lead of craigslistLeads) {
              lead.order_id = orderId!;
              const inserted = await insertLeadIfUnique(lead);
              if (inserted) newLeadsCount++;
            }
            
            logStep(`Craigslist - URL ${i+1}/${craigslistLimit}`, { 
              leadsScraped: craigslistLeads.length,
              newLeadsAdded: newLeadsCount
            });
          }
        } catch (err) {
          logStep(`Craigslist failed for URL ${i+1}`, { error: err instanceof Error ? err.message : String(err) });
        }
      }
      
      totalLeadsCollected = await getCurrentLeadCount();
      sourcesRun.push("Craigslist");
      
      logStep("SOURCE 2: Craigslist - Complete", { 
        totalLeads: totalLeadsCollected,
        targetMin: tierQuota.min,
        targetMet: isTargetMet(totalLeadsCollected),
        elapsedTime: `${Date.now() - executionStartTime}ms`
      });
      
      // Check timeout again
      if (shouldExitDueToTimeout()) {
        logStep("⏱️ TIMEOUT APPROACHING - Triggering retry after Craigslist", { 
          leadsCollected: totalLeadsCollected,
          elapsedTime: `${Date.now() - executionStartTime}ms`
        });
        
        await supabase
          .from("orders")
          .update({
            scrape_attempts: scrapeAttempts + 1,
            status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        
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
            message: 'Timeout approaching - retrying',
            leadsFound: totalLeadsCollected,
            elapsedTime: Date.now() - executionStartTime,
            attempt: scrapeAttempts + 1
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (isTargetMet(totalLeadsCollected)) {
        logStep("🎯 TARGET MET after Craigslist - Stopping", { 
          leadsCollected: totalLeadsCollected,
          sourcesUsed: sourcesRun 
        });
      }
    }

    // SOURCE 3: ForSaleByOwner.com via ZenRows Autoparse
    if (totalLeadsCollected < tierQuota.min) {
      logStep("SOURCE 3: ForSaleByOwner.com - Starting", { urlsCount: fsboComUrls.length });
      
      const fsboComLimit = Math.min(fsboComUrls.length, 10);
      
      for (let i = 0; i < fsboComLimit; i++) {
        const url = fsboComUrls[i];
        try {
          const fsboComLeads = await scrapeWithZenRowsAutoparse(url, "ForSaleByOwner.com");
          
          if (fsboComLeads && fsboComLeads.length > 0) {
            let newLeadsCount = 0;
            for (const lead of fsboComLeads) {
              lead.order_id = orderId!;
              const inserted = await insertLeadIfUnique(lead);
              if (inserted) newLeadsCount++;
            }
            
            logStep(`ForSaleByOwner.com - URL ${i+1}/${fsboComLimit}`, { 
              leadsScraped: fsboComLeads.length,
              newLeadsAdded: newLeadsCount
            });
          }
        } catch (err) {
          logStep(`ForSaleByOwner.com failed for URL ${i+1}`, { error: err instanceof Error ? err.message : String(err) });
        }
      }
      
      totalLeadsCollected = await getCurrentLeadCount();
      sourcesRun.push("ForSaleByOwner.com");
      
      logStep("SOURCE 3: ForSaleByOwner.com - Complete", { 
        totalLeads: totalLeadsCollected,
        targetMin: tierQuota.min,
        targetMet: isTargetMet(totalLeadsCollected)
      });
      
      if (isTargetMet(totalLeadsCollected)) {
        logStep("🎯 TARGET MET after ForSaleByOwner.com - Stopping", { 
          leadsCollected: totalLeadsCollected,
          sourcesUsed: sourcesRun 
        });
      }
    }

    // SOURCE 4: Zillow via ZenRows Autoparse
    if (totalLeadsCollected < tierQuota.min) {
      logStep("SOURCE 4: Zillow - Starting", { urlsCount: zillowUrls.length });
      
      const zillowLimit = Math.min(zillowUrls.length, 10);
      
      for (let i = 0; i < zillowLimit; i++) {
        const url = zillowUrls[i];
        try {
          const zillowLeads = await scrapeWithZenRowsAutoparse(url, "Zillow");
          
          if (zillowLeads && zillowLeads.length > 0) {
            let newLeadsCount = 0;
            for (const lead of zillowLeads) {
              lead.order_id = orderId!;
              const inserted = await insertLeadIfUnique(lead);
              if (inserted) newLeadsCount++;
            }
            
            logStep(`Zillow - URL ${i+1}/${zillowLimit}`, { 
              leadsScraped: zillowLeads.length,
              newLeadsAdded: newLeadsCount
            });
          }
        } catch (err) {
          logStep(`Zillow failed for URL ${i+1}`, { error: err instanceof Error ? err.message : String(err) });
        }
      }
      
      totalLeadsCollected = await getCurrentLeadCount();
      sourcesRun.push("Zillow");
      
      logStep("SOURCE 4: Zillow - Complete", { 
        totalLeads: totalLeadsCollected,
        targetMin: tierQuota.min,
        targetMet: isTargetMet(totalLeadsCollected)
      });
      
      if (isTargetMet(totalLeadsCollected)) {
        logStep("🎯 TARGET MET after Zillow - Stopping", { 
          leadsCollected: totalLeadsCollected,
          sourcesUsed: sourcesRun 
        });
      }
    }

    // SOURCE 5: Trulia via ZenRows Autoparse
    if (totalLeadsCollected < tierQuota.min) {
      logStep("SOURCE 5: Trulia - Starting", { urlsCount: truliaUrls.length });
      
      const truliaLimit = Math.min(truliaUrls.length, 10);
      
      for (let i = 0; i < truliaLimit; i++) {
        const url = truliaUrls[i];
        try {
          const truliaLeads = await scrapeWithZenRowsAutoparse(url, "Trulia");
          
          if (truliaLeads && truliaLeads.length > 0) {
            let newLeadsCount = 0;
            for (const lead of truliaLeads) {
              lead.order_id = orderId!;
              const inserted = await insertLeadIfUnique(lead);
              if (inserted) newLeadsCount++;
            }
            
            logStep(`Trulia - URL ${i+1}/${truliaLimit}`, { 
              leadsScraped: truliaLeads.length,
              newLeadsAdded: newLeadsCount
            });
          }
        } catch (err) {
          logStep(`Trulia failed for URL ${i+1}`, { error: err instanceof Error ? err.message : String(err) });
        }
      }
      
      totalLeadsCollected = await getCurrentLeadCount();
      sourcesRun.push("Trulia");
      
      logStep("SOURCE 5: Trulia - Complete", { 
        totalLeads: totalLeadsCollected,
        targetMin: tierQuota.min,
        targetMet: isTargetMet(totalLeadsCollected)
      });
      
      if (isTargetMet(totalLeadsCollected)) {
        logStep("🎯 TARGET MET after Trulia - Stopping", { 
          leadsCollected: totalLeadsCollected,
          sourcesUsed: sourcesRun 
        });
      }
    }

    logStep("Sequential scraping complete", {
      totalLeadsCollected,
      targetRange: `${tierQuota.min}-${tierQuota.max}`,
      sourcesRun: sourcesRun.join(" → "),
      citiesSearched: allCities.length,
      radiusMiles: radiusMiles
    });

    // Leads were saved during sequential scraping
    // totalLeadsCollected already has the final count from last check
    const totalLeadsAfterSave = totalLeadsCollected;

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
