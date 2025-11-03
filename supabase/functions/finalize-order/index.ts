import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_SHEETS_FOLDER_ID = Deno.env.get("GOOGLE_SHEETS_FOLDER_ID") || "";
const GOOGLE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") || "{}");

async function createJWT(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const base64UrlEncode = (str: string) => btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const unsignedToken = `${encodedHeader}.${encodedClaim}`;
  const privateKeyPem = serviceAccount.private_key;
  const pemContents = privateKeyPem.replace("-----BEGIN PRIVATE KEY-----","").replace("-----END PRIVATE KEY-----","").replace(/\s/g,"");
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryDer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsignedToken));
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const signedJwt = `${unsignedToken}.${sigBase64}`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}` });
  if (!tokenResponse.ok) throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function createGoogleSheet(order: any, leads: any[]): Promise<string> {
  if (!GOOGLE_SHEETS_FOLDER_ID) throw new Error("Missing GOOGLE_SHEETS_FOLDER_ID");
  const jwt = await createJWT(GOOGLE_SERVICE_ACCOUNT);

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `RealtyLeadsAI - ${order.customer_name || order.customer_email} - ${new Date().toLocaleDateString()}`,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [GOOGLE_SHEETS_FOLDER_ID],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    // Fallback: create in root
    const retry = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `RealtyLeadsAI - ${order.customer_name || order.customer_email} - ${new Date().toLocaleDateString()}`,
        mimeType: "application/vnd.google-apps.spreadsheet",
      }),
    });
    if (!retry.ok) throw new Error(`Failed to create Google Sheet: ${err}`);
    const retryFile = await retry.json();
    await appendSheetValues(jwt, retryFile.id, leads);
    return `https://docs.google.com/spreadsheets/d/${retryFile.id}`;
  }

  const file = await createRes.json();
  await appendSheetValues(jwt, file.id, leads);
  return `https://docs.google.com/spreadsheets/d/${file.id}`;
}

async function appendSheetValues(jwt: string, spreadsheetId: string, leads: any[]) {
  const values = [
    ["Name", "Phone/Email", "Address", "City", "State", "Zip", "Price", "Source", "Type", "Listing URL", "Date Listed"],
    ...leads.map(lead => [
      lead.seller_name || "",
      lead.contact || "",
      lead.address,
      lead.city || "",
      lead.state || "",
      lead.zip || "",
      lead.price || "",
      lead.source,
      lead.source_type,
      lead.url || "",
      lead.date_listed || "",
    ]),
  ];
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
}

function generateCSVFile(leads: any[], order: any): string {
  // Helper to clean and format values - NO extra escaping!
  const cleanValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    
    // Remove any JSON artifacts or extra quotes
    str = str.replace(/^["']+|["']+$/g, '');
    
    // Only escape if absolutely necessary (contains comma)
    if (str.includes(',')) {
      return `"${str}"`;
    }
    return str;
  };

  const rows: string[] = [];

  // Row 1: Branding header
  rows.push('RealtyLeadsAI - Fresh FSBO Leads');
  
  // Row 2: Order metadata
  const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  rows.push(`Generated: ${orderDate} | Location: ${order.primary_city}, MI | Total Leads: ${leads.length}`);
  
  // Row 3: Empty separator
  rows.push('');
  
  // Row 4: Column headers
  rows.push('Name,Phone,Email,Address,City,State,Zip,Price,Days on Market,Property Type,Source,Listing URL,Notes');
  
  // Rows 5+: Lead data
  leads.forEach(lead => {
    // Calculate days on market
    let daysOnMarket = '';
    if (lead.date_listed) {
      const listedDate = new Date(lead.date_listed);
      const today = new Date();
      const diffDays = Math.ceil((today.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24));
      daysOnMarket = String(Math.max(0, diffDays));
    }
    
    // Parse contact for phone/email
    const contact = lead.contact || '';
    let phone = '';
    let email = '';
    if (contact.includes('@')) {
      email = contact;
    } else if (contact) {
      phone = contact;
    }
    
    // Clean address - handle both string and JSON object
    let address = '';
    if (typeof lead.address === 'string') {
      address = lead.address;
    } else if (typeof lead.address === 'object' && lead.address) {
      address = lead.address.street || '';
    }
    
    // Format price - just numbers
    let price = '';
    if (lead.price) {
      price = String(lead.price).replace(/[^0-9]/g, '');
      if (price) price = '$' + price;
    }
    
    // Build clean row - minimal escaping
    const rowData = [
      cleanValue(lead.seller_name || 'Homeowner'),
      cleanValue(phone),
      cleanValue(email),
      cleanValue(address),
      cleanValue(lead.city || ''),
      cleanValue(lead.state || 'MI'),
      cleanValue(lead.zip || ''),
      cleanValue(price),
      cleanValue(daysOnMarket),
      cleanValue(lead.source_type || 'FSBO'),
      cleanValue(lead.source || ''),
      cleanValue(lead.url || ''),
      '' // Notes column (empty)
    ];
    
    rows.push(rowData.join(','));
  });
  
  // UTF-8 BOM for Excel compatibility
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}

async function uploadCSVToStorage(supabase: any, orderId: string, csvContent: string): Promise<string> {
  const fileName = `leads-${orderId}.csv`;
  const filePath = `${orderId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('lead-csvs')
    .upload(filePath, csvContent, {
      contentType: 'text/csv;charset=utf-8',
      upsert: true,
    });
  
  if (error) {
    console.error('Failed to upload CSV:', error);
    throw new Error(`CSV upload failed: ${error.message}`);
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from('lead-csvs')
    .getPublicUrl(filePath);
  
  return publicUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId required");

    // Load order and leads
    const { data: order, error: orderErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (orderErr || !order) throw new Error("Order not found");

    // IDEMPOTENCY CHECK: Don't send duplicate emails
    if (order.delivered_at) {
      console.log('[FINALIZE] Order already delivered at:', order.delivered_at);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Order already finalized',
        csvUrl: order.sheet_url 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: leads, error: leadsErr } = await supabase.from('leads').select('*').eq('order_id', orderId);
    if (leadsErr) throw new Error(`Failed to load leads: ${leadsErr.message}`);

    if (!leads || leads.length === 0) {
      // Nothing to finalize yet
      return new Response(JSON.stringify({ success: true, message: 'No leads yet to finalize.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate CSV file
    console.log('[FINALIZE] Generating CSV file for', leads.length, 'leads');
    const csvContent = generateCSVFile(leads, order);
    
    // Upload CSV to storage
    let csvUrl = '';
    try {
      csvUrl = await uploadCSVToStorage(supabase, orderId, csvContent);
      console.log('[FINALIZE] CSV uploaded successfully:', csvUrl);
    } catch (e) {
      console.error('[FINALIZE] CSV upload failed:', e);
    }

    // Try creating Google Sheet as backup (optional)
    let sheetUrl = '';
    try {
      sheetUrl = await createGoogleSheet(order, leads);
      console.log('[FINALIZE] Google Sheet created:', sheetUrl);
    } catch (e) {
      console.error('[FINALIZE] Sheet creation failed (continuing with CSV):', e);
    }

    // Update order with final details
    const { error: updErr } = await supabase
      .from('orders')
      .update({
        sheet_url: csvUrl || sheetUrl || order.sheet_url,
        delivered_at: new Date().toISOString(),
        leads_count: leads.length,
        total_leads_delivered: leads.length,
      })
      .eq('id', orderId);
    if (updErr) throw new Error(`Failed to update order: ${updErr.message}`);

    // Send email with CSV and preview
    if (order.customer_email) {
      console.log('[FINALIZE] Sending leads-ready email to:', order.customer_email);
      const functionsUrl = Deno.env.get('SUPABASE_URL');
      await fetch(`${functionsUrl}/functions/v1/send-leads-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          email: order.customer_email,
          name: order.customer_name || 'there',
          leadCount: String(leads.length),
          city: order.primary_city,
          csvUrl: csvUrl,
          sheetUrl: sheetUrl,
          leads: leads.slice(0, 5), // First 5 leads for preview
          orderId: orderId,
        })
      }).catch(err => console.error('[FINALIZE] send-leads-ready failed', err));
    }

    return new Response(JSON.stringify({ success: true, csvUrl, sheetUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('finalize-order error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});