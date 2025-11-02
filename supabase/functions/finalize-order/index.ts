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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  try {
    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId required");

    // Load order and leads
    const { data: order, error: orderErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (orderErr || !order) throw new Error("Order not found");

    const { data: leads, error: leadsErr } = await supabase.from('leads').select('*').eq('order_id', orderId);
    if (leadsErr) throw new Error(`Failed to load leads: ${leadsErr.message}`);

    if (!leads || leads.length === 0) {
      // Nothing to finalize yet
      return new Response(JSON.stringify({ success: true, message: 'No leads yet to finalize.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Create Google Sheet
    let sheetUrl = '';
    try {
      sheetUrl = await createGoogleSheet(order, leads);
    } catch (e) {
      console.error('Sheet creation failed:', e);
      // Continue without sheet
    }

    // Update order with final details
    const { error: updErr } = await supabase
      .from('orders')
      .update({
        sheet_url: sheetUrl || order.sheet_url,
        delivered_at: new Date().toISOString(),
        leads_count: leads.length,
        total_leads_delivered: leads.length,
      })
      .eq('id', orderId);
    if (updErr) throw new Error(`Failed to update order: ${updErr.message}`);

    // Notify customer if we have sheet
    if (sheetUrl && order.customer_email) {
      const functionsUrl = Deno.env.get('SUPABASE_URL');
      await fetch(`${functionsUrl}/functions/v1/send-leads-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          email: order.customer_email,
          name: order.customer_name || 'there',
          leadCount: String(leads.length),
          city: order.primary_city,
          downloadUrl: sheetUrl,
        })
      }).catch(err => console.error('send-leads-ready failed', err));
    }

    return new Response(JSON.stringify({ success: true, sheetUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('finalize-order error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});