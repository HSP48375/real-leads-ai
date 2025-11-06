import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapingResult {
  source: string;
  success: boolean;
  leadsFound: number;
  error?: string;
  leads?: any[];
  timeTaken: number;
}

// ZenRows scraping function - returns HTML content
async function scrapeWithZenRows(url: string, source: string): Promise<string> {
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
      },
      {
        name: 'BuyOwner',
        url: `https://www.buyowner.com/search?location=${city},${state}`,
      },
      {
        name: 'Owners.com',
        url: `https://www.owner.com/search/${state.toLowerCase()}/${city.toLowerCase().replace(/\s+/g, '-')}`,
      },
    ];

    // Test each source
    for (const source of sources) {
      console.log(`\n--- Testing ${source.name} ---`);
      const startTime = Date.now();
      
      try {
        const htmlContent = await scrapeWithZenRows(source.url, source.name);
        const timeTaken = Date.now() - startTime;
        
        // For now, just return success with HTML length info
        testResults.push({
          source: source.name,
          success: true,
          leadsFound: 0, // Will be parsed in next iteration
          leads: [{ htmlLength: htmlContent.length, preview: htmlContent.substring(0, 500) }],
          timeTaken,
        });
        
        console.log(`✓ ${source.name}: Retrieved ${htmlContent.length} chars in ${timeTaken}ms`);
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
