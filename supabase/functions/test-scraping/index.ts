import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Lead {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  price?: string;
  source?: string;
}

interface ScrapingResult {
  source: string;
  success: boolean;
  leadsFound: number;
  error?: string;
  leads?: Lead[];
  timeTaken: number;
}

// ZenRows scraping function - returns HTML content
async function scrapeWithZenRows(url: string, source: string, waitForSelector?: string): Promise<string> {
  const ZENROWS_API_KEY = Deno.env.get('ZENROWS_API_KEY');
  if (!ZENROWS_API_KEY) {
    throw new Error('ZENROWS_API_KEY not configured');
  }

  console.log(`[ZenRows] Scraping ${source}: ${url}`);
  
  const zenrowsUrl = new URL('https://api.zenrows.com/v1/');
  zenrowsUrl.searchParams.set('apikey', ZENROWS_API_KEY);
  zenrowsUrl.searchParams.set('url', url);
  zenrowsUrl.searchParams.set('js_render', 'true');
  zenrowsUrl.searchParams.set('premium_proxy', 'true');
  zenrowsUrl.searchParams.set('wait', '3000');
  
  if (waitForSelector) {
    zenrowsUrl.searchParams.set('wait_for', waitForSelector);
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`[ZenRows] Attempt ${attempt + 1}/3 for ${source}`);
      
      const response = await fetch(zenrowsUrl.toString(), {
        method: 'GET',
      });

      if (response.status === 429) {
        console.log(`[ZenRows] Rate limited on attempt ${attempt + 1}, waiting 10s...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ZenRows API error (${response.status}): ${errorText}`);
      }

      const htmlContent = await response.text();
      console.log(`[ZenRows] Retrieved HTML: ${htmlContent.length} chars from ${source}`);
      
      return htmlContent;

    } catch (error) {
      lastError = error as Error;
      console.error(`[ZenRows] Attempt ${attempt + 1} failed for ${source}:`, error);
      
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  throw lastError || new Error(`Failed to scrape ${source} after 3 attempts`);
}

// Map cities to their Craigslist metro area subdomains
function getCraigslistMetro(city: string, state: string): string {
  const cityLower = city.toLowerCase().trim();
  const stateLower = state.toLowerCase().trim();
  
  const metroMappings: { [state: string]: { [city: string]: string } } = {
    'mi': {
      'novi': 'detroit',
      'troy': 'detroit',
      'livonia': 'detroit',
      'dearborn': 'detroit',
      'warren': 'detroit',
      'sterling heights': 'detroit',
      'detroit': 'detroit',
      'ann arbor': 'annarbor',
      'grand rapids': 'grandrapids',
    },
    'ca': {
      'los angeles': 'losangeles',
      'san francisco': 'sfbay',
      'san diego': 'sandiego',
    },
    'tx': {
      'houston': 'houston',
      'dallas': 'dallas',
      'austin': 'austin',
    },
    'ny': {
      'new york': 'newyork',
      'brooklyn': 'newyork',
      'buffalo': 'buffalo',
    },
  };
  
  const stateMap = metroMappings[stateLower];
  if (stateMap && stateMap[cityLower]) {
    return stateMap[cityLower];
  }
  
  return cityLower.replace(/\s+/g, '');
}

// Parse Craigslist HTML to extract leads
function parseCraigslistHTML(html: string): Lead[] {
  const leads: Lead[] = [];
  
  // Craigslist uses <li class="cl-static-search-result"> for listings
  const listingRegex = /<li[^>]*class="[^"]*cl-static-search-result[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  const matches = html.matchAll(listingRegex);
  
  for (const match of matches) {
    const listingHtml = match[1];
    
    // Extract title/link
    const titleMatch = listingHtml.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*posting-title[^"]*"[^>]*>([^<]+)<\/a>/i);
    const url = titleMatch?.[1];
    const title = titleMatch?.[2]?.trim();
    
    // Extract price
    const priceMatch = listingHtml.match(/<span class="priceinfo">([^<]+)<\/span>/i);
    const price = priceMatch?.[1]?.trim();
    
    // Extract location
    const locationMatch = listingHtml.match(/<span class="location">([^<]+)<\/span>/i);
    const location = locationMatch?.[1]?.trim();
    
    if (title) {
      leads.push({
        name: title,
        address: location || 'Location not specified',
        price: price || 'Price not listed',
        source: 'Craigslist',
      });
    }
  }
  
  return leads;
}

// Parse BuyOwner HTML to extract leads
function parseBuyOwnerHTML(html: string): Lead[] {
  const leads: Lead[] = [];
  
  // BuyOwner uses property cards
  const propertyRegex = /<div[^>]*class="[^"]*property[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  const matches = html.matchAll(propertyRegex);
  
  for (const match of matches) {
    const propertyHtml = match[1];
    
    // Extract address
    const addressMatch = propertyHtml.match(/<span[^>]*class="[^"]*address[^"]*"[^>]*>([^<]+)<\/span>/i);
    const address = addressMatch?.[1]?.trim();
    
    // Extract price
    const priceMatch = propertyHtml.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/span>/i);
    const price = priceMatch?.[1]?.trim();
    
    if (address) {
      leads.push({
        address,
        price: price || 'Price not listed',
        source: 'BuyOwner',
      });
    }
  }
  
  return leads;
}

// Parse Owners.com HTML to extract leads
function parseOwnersComHTML(html: string): Lead[] {
  const leads: Lead[] = [];
  
  // Owners.com uses listing cards
  const listingRegex = /<div[^>]*class="[^"]*listing[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  const matches = html.matchAll(listingRegex);
  
  for (const match of matches) {
    const listingHtml = match[1];
    
    // Extract address
    const addressMatch = listingHtml.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const address = addressMatch?.[1]?.trim();
    
    // Extract price
    const priceMatch = listingHtml.match(/\$[\d,]+/);
    const price = priceMatch?.[0];
    
    if (address) {
      leads.push({
        address,
        price: price || 'Price not listed',
        source: 'Owners.com',
      });
    }
  }
  
  return leads;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== MANUAL SCRAPING TEST STARTED ===');
    
    const city = 'Novi';
    const state = 'MI';
    const testResults: ScrapingResult[] = [];

    // Get Craigslist metro
    const craigslistMetro = getCraigslistMetro(city, state);

    // Test sources with their URLs (Facebook removed, FSBO via Apify)
    const sources = [
      {
        name: 'Craigslist',
        url: `https://${craigslistMetro}.craigslist.org/search/rea?query=for+sale+by+owner+${city}`,
        waitFor: undefined,
      },
      {
        name: 'BuyOwner',
        url: `https://www.buyowner.com/fsbo-${city.toLowerCase().replace(/\s+/g, '-')}-${state.toLowerCase()}`,
        waitFor: '.property',
      },
      {
        name: 'Owners.com',
        url: `https://owner.com/search/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`,
        waitFor: '.listing',
      },
    ];

    // Test each source
    for (const source of sources) {
      console.log(`\n--- Testing ${source.name} ---`);
      const startTime = Date.now();
      
      try {
        const htmlContent = await scrapeWithZenRows(source.url, source.name, source.waitFor);
        const timeTaken = Date.now() - startTime;
        
        // Parse HTML to extract actual leads
        let parsedLeads: Lead[] = [];
        if (source.name === 'Craigslist') {
          parsedLeads = parseCraigslistHTML(htmlContent);
        } else if (source.name === 'BuyOwner') {
          parsedLeads = parseBuyOwnerHTML(htmlContent);
        } else if (source.name === 'Owners.com') {
          parsedLeads = parseOwnersComHTML(htmlContent);
        }
        
        testResults.push({
          source: source.name,
          success: true,
          leadsFound: parsedLeads.length,
          leads: parsedLeads.slice(0, 5), // Include first 5 leads as sample
          timeTaken,
        });
        
        console.log(`✓ ${source.name}: Found ${parsedLeads.length} leads in ${timeTaken}ms`);
      } catch (error) {
        const timeTaken = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        testResults.push({
          source: source.name,
          success: false,
          leadsFound: 0,
          error: errorMessage,
          timeTaken,
        });
        
        console.log(`✗ ${source.name}: Failed - ${errorMessage} (${timeTaken}ms)`);
      }
    }

    // Calculate summary statistics
    const totalLeads = testResults.reduce((sum, r) => sum + r.leadsFound, 0);
    const successfulSources = testResults.filter(r => r.success).length;
    const totalTime = testResults.reduce((sum, r) => sum + r.timeTaken, 0);

    const summary = {
      testCompleted: new Date().toISOString(),
      location: `${city}, ${state}`,
      totalSources: sources.length,
      successfulSources,
      failedSources: sources.length - successfulSources,
      totalLeads,
      totalTimeMs: totalTime,
      averageTimePerSourceMs: Math.round(totalTime / sources.length),
    };

    console.log('\n=== TEST SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    console.log('\n=== DETAILED RESULTS ===');
    console.log(JSON.stringify(testResults, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results: testResults,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Test scraping error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
