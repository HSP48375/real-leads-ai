import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

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

function generatePDFFile(leads: any[], order: any): Uint8Array {
  const doc = new jsPDF();
  
  // PAGE 1: COVER PAGE
  doc.setFillColor(37, 99, 235); // Blue background
  doc.rect(0, 0, 210, 297, 'F');
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont(undefined, 'bold');
  doc.text('RealtyLeadsAI', 105, 80, { align: 'center' });
  
  doc.setFontSize(24);
  doc.text('Your FSBO Leads Report', 105, 100, { align: 'center' });
  
  // Lead count and location
  doc.setFontSize(16);
  doc.setFont(undefined, 'normal');
  doc.text(`${leads.length} Premium Leads • ${order.primary_city}, Michigan`, 105, 120, { align: 'center' });
  
  // Date
  const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  doc.setFontSize(12);
  doc.text(`Generated: ${orderDate}`, 105, 135, { align: 'center' });
  
  // Motivational quote
  doc.setFontSize(14);
  doc.setFont(undefined, 'italic');
  doc.text('"The fortune is in the follow-up"', 105, 200, { align: 'center' });
  
  // Footer on cover
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('RealtyLeadsAI.com • Fresh Leads Daily', 105, 280, { align: 'center' });
  
  // PAGE 2+: LEAD TABLE
  const rowsPerPage = 12;
  const startY = 30;
  const rowHeight = 18;
  
  leads.forEach((lead, index) => {
    const pageIndex = Math.floor(index / rowsPerPage);
    const rowIndex = index % rowsPerPage;
    
    // Add new page if needed
    if (rowIndex === 0 && index > 0) {
      doc.addPage();
    }
    
    // Reset colors for table pages
    if (rowIndex === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 297, 'F');
      
      // Page header
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('FSBO Leads', 105, 20, { align: 'center' });
      
      // Table headers
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(240, 240, 240);
      doc.rect(10, startY - 5, 190, 8, 'F');
      doc.text('Name', 12, startY);
      doc.text('Address', 50, startY);
      doc.text('Phone', 110, startY);
      doc.text('Price', 150, startY);
    }
    
    // Alternating row backgrounds
    const y = startY + 5 + (rowIndex * rowHeight);
    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(10, y - 5, 190, rowHeight, 'F');
    }
    
    // Format name - use seller_name or "Homeowner"
    const name = lead.seller_name || 'Homeowner';
    
    // Format address - handle both string and object formats
    let address = '';
    if (typeof lead.address === 'string') {
      address = lead.address;
    } else if (typeof lead.address === 'object' && lead.address) {
      // Extract street from object
      address = lead.address.street || '';
    }
    // Add city to address
    address = `${address}, ${lead.city || ''}`.substring(0, 30);
    
    // Format phone - extract from contact field
    const contact = lead.contact || '';
    let phone = '';
    if (contact.includes('@')) {
      // It's an email, show first part
      phone = contact.substring(0, 25);
    } else if (contact) {
      // Format phone number as (XXX) XXX-XXXX
      phone = contact.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    
    // Format price
    let price = '';
    if (lead.price) {
      const priceNum = String(lead.price).replace(/[^0-9]/g, '');
      if (priceNum) price = '$' + parseInt(priceNum).toLocaleString();
    }
    
    // Draw row data
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(name.substring(0, 18), 12, y + 2);
    doc.text(address, 50, y + 2);
    doc.text(phone, 110, y + 2);
    doc.text(price, 150, y + 2);
    
    // URL on second line if available
    if (lead.url) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(lead.url.substring(0, 60), 50, y + 8);
    }
  });
  
  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} of ${totalPages}`, 105, 290, { align: 'center' });
    if (i > 1) {
      doc.text('RealtyLeadsAI.com • Fresh Leads Daily', 105, 285, { align: 'center' });
    }
  }
  
  return doc.output('arraybuffer');
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

    // Generate PDF file
    console.log('[FINALIZE] Generating PDF file for', leads.length, 'leads');
    const pdfContent = generatePDFFile(leads, order);
    
    // Upload PDF to storage
    let pdfUrl = '';
    try {
      const fileName = `leads-${orderId}.pdf`;
      const filePath = `${orderId}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('lead-csvs')
        .upload(filePath, pdfContent, {
          contentType: 'application/pdf',
          upsert: true,
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('lead-csvs')
        .getPublicUrl(filePath);
      
      pdfUrl = publicUrl;
      console.log('[FINALIZE] PDF uploaded successfully:', pdfUrl);
    } catch (e) {
      console.error('[FINALIZE] PDF upload failed:', e);
    }
    
    // Generate CSV file as backup for CRM import
    console.log('[FINALIZE] Generating CSV backup file');
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
        sheet_url: pdfUrl || csvUrl || sheetUrl || order.sheet_url,
        delivered_at: new Date().toISOString(),
        leads_count: leads.length,
        total_leads_delivered: leads.length,
      })
      .eq('id', orderId);
    if (updErr) throw new Error(`Failed to update order: ${updErr.message}`);

    // Send email with PDF and CSV
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
          pdfUrl: pdfUrl,
          csvUrl: csvUrl,
          sheetUrl: sheetUrl,
          leads: leads.slice(0, 5), // First 5 leads for preview
          orderId: orderId,
        })
      }).catch(err => console.error('[FINALIZE] send-leads-ready failed', err));
    }

    return new Response(JSON.stringify({ success: true, pdfUrl, csvUrl, sheetUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('finalize-order error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});