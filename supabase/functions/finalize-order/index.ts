import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

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

function generateExcelFile(leads: any[], order: any): Uint8Array {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create worksheet data
  const wsData: any[][] = [];
  
  // Row 1: Branding
  wsData.push(['RealtyLeadsAI - Fresh FSBO Leads']);
  
  // Row 2: Order info
  const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  wsData.push([
    `Generated: ${orderDate} | Location: ${order.primary_city}, MI | Total Leads: ${leads.length}`
  ]);
  
  // Row 3: Empty
  wsData.push([]);
  
  // Row 4: Headers
  wsData.push([
    'Name',
    'Phone',
    'Email', 
    'Address',
    'City',
    'State',
    'Zip',
    'Price',
    'Days on Market',
    'Property Type',
    'Source',
    'Listing URL',
    'Notes'
  ]);
  
  // Rows 5+: Lead data
  leads.forEach(lead => {
    // Calculate days on market
    let daysOnMarket = '';
    if (lead.date_listed) {
      const listedDate = new Date(lead.date_listed);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - listedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysOnMarket = String(diffDays);
    }
    
    // Parse contact for phone/email
    const contact = lead.contact || '';
    let phone = '';
    let email = '';
    if (contact.includes('@')) {
      email = contact;
    } else {
      phone = contact;
    }
    
    // Parse price to number if possible
    let priceValue = lead.price || '';
    if (typeof priceValue === 'string') {
      priceValue = priceValue.replace(/[^0-9]/g, '');
      if (priceValue) {
        priceValue = parseInt(priceValue);
      }
    }
    
    wsData.push([
      lead.seller_name || 'Homeowner',
      phone,
      email,
      lead.address || '',
      lead.city || '',
      lead.state || 'MI',
      lead.zip || '',
      priceValue,
      daysOnMarket,
      lead.source_type || 'FSBO',
      lead.source || '',
      lead.url || '',
      '' // Empty notes column
    ]);
  });
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Name
    { wch: 15 }, // Phone
    { wch: 25 }, // Email
    { wch: 30 }, // Address
    { wch: 15 }, // City
    { wch: 8 },  // State
    { wch: 10 }, // Zip
    { wch: 12 }, // Price
    { wch: 15 }, // Days on Market
    { wch: 15 }, // Property Type
    { wch: 20 }, // Source
    { wch: 40 }, // URL
    { wch: 30 }, // Notes
  ];
  
  // Freeze header row (row 4)
  ws['!freeze'] = { xSplit: 0, ySplit: 4 };
  
  // Apply styles to branding row (row 1)
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 16, color: { rgb: "1a3a2e" } },
      alignment: { horizontal: 'center' }
    };
  }
  
  // Apply styles to info row (row 2)
  if (ws['A2']) {
    ws['A2'].s = {
      font: { sz: 11, color: { rgb: "6b7280" } },
      alignment: { horizontal: 'center' }
    };
  }
  
  // Apply styles to header row (row 4)
  const headerRow = 4;
  const headers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  headers.forEach(col => {
    const cellRef = `${col}${headerRow}`;
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4B5563" } },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }
  });
  
  // Apply alternating row colors to data rows
  for (let i = 5; i <= wsData.length; i++) {
    const isEven = (i - 5) % 2 === 0;
    const bgColor = isEven ? "FFFFFF" : "F3F4F6";
    headers.forEach(col => {
      const cellRef = `${col}${i}`;
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: bgColor } }
        };
      }
    });
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'FSBO Leads');
  
  // Generate Excel file as Uint8Array
  const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(excelBuffer);
}

async function uploadExcelToStorage(supabase: any, orderId: string, excelBuffer: Uint8Array): Promise<string> {
  const fileName = `leads-${orderId}.xlsx`;
  const filePath = `${orderId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('lead-csvs')
    .upload(filePath, excelBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    });
  
  if (error) {
    console.error('Failed to upload Excel:', error);
    throw new Error(`Excel upload failed: ${error.message}`);
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

    // Generate Excel file
    console.log('[FINALIZE] Generating Excel file for', leads.length, 'leads');
    const excelBuffer = generateExcelFile(leads, order);
    
    // Upload Excel to storage
    let excelUrl = '';
    try {
      excelUrl = await uploadExcelToStorage(supabase, orderId, excelBuffer);
      console.log('[FINALIZE] Excel uploaded successfully:', excelUrl);
    } catch (e) {
      console.error('[FINALIZE] Excel upload failed:', e);
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
        sheet_url: excelUrl || sheetUrl || order.sheet_url,
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
          excelUrl: excelUrl,
          sheetUrl: sheetUrl,
          leads: leads.slice(0, 5), // First 5 leads for preview
          orderId: orderId,
        })
      }).catch(err => console.error('[FINALIZE] send-leads-ready failed', err));
    }

    return new Response(JSON.stringify({ success: true, excelUrl, sheetUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('finalize-order error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});