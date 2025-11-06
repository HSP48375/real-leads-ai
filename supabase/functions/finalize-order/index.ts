import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCSVFile(leads: any[], order: any): string {
  const cleanValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    let str = String(val).trim();
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows: string[] = [];
  
  // Headers - ALL available FSBO.com fields
  rows.push('First Name,Last Name,Address Line 1,Address Line 2,Full Address,City,State,Zip,Phone,Email,Price,Listing Title,URL,Days Listed');
  
  leads.forEach(lead => {
    // Parse name into first/last
    const fullName = lead.seller_name || 'Homeowner';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Parse address - get street only
    let street = '';
    try {
      if (typeof lead.address === 'string') {
        const trimmed = lead.address.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const obj = JSON.parse(trimmed);
          street = obj.street || obj.address || '';
        } else {
          street = trimmed;
        }
      } else if (typeof lead.address === 'object' && lead.address) {
        street = lead.address.street || lead.address.address || '';
      }
    } catch (_) {
      street = String(lead.address || '');
    }
    
    // Parse contact for phone/email
    const phone = lead.contact || '';
    const email = lead.email || ''; // Use separate email column
    
    // Format phone as (248) 555-1234
    let formattedPhone = '';
    if (phone) {
      const digits = phone.replace(/\D+/g, '');
      if (digits.length >= 10) {
        const d = digits.slice(-10);
        formattedPhone = `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6,10)}`;
      } else {
        formattedPhone = phone;
      }
    }
    
    // Price as plain number
    let price = '';
    if (lead.price) {
      price = String(lead.price).replace(/[^0-9]/g, '');
    }
    
    // Days listed
    let daysListed = '';
    if (lead.date_listed) {
      const listedDate = new Date(lead.date_listed);
      const today = new Date();
      const diffDays = Math.ceil((today.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24));
      daysListed = String(Math.max(0, diffDays));
    }
    
    const rowData = [
      cleanValue(firstName),
      cleanValue(lastName),
      cleanValue(lead.address_line_1 || ''),
      cleanValue(lead.address_line_2 || ''),
      cleanValue(street),
      cleanValue(lead.city || ''),
      cleanValue(lead.state || 'MI'),
      cleanValue(lead.zipcode || lead.zip || ''),
      cleanValue(formattedPhone),
      cleanValue(email),
      cleanValue(price),
      cleanValue(lead.listing_title || ''),
      cleanValue(lead.url || ''),
      cleanValue(daysListed)
    ];
    
    rows.push(rowData.join(','));
  });
  
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}

async function uploadCSVToStorage(supabase: any, orderId: string, csvContent: string): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`; // HHMM
  const fileName = `leads_${dateStr}_${timeStr}.csv`;
  const filePath = `${orderId}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('lead-csvs')
    .upload(filePath, csvContent, {
      contentType: 'text/csv; charset=utf-8',
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

    const { data: rawLeads, error: leadsErr } = await supabase.from('leads').select('*').eq('order_id', orderId);
    if (leadsErr) throw new Error(`Failed to load leads: ${leadsErr.message}`);

    if (!rawLeads || rawLeads.length === 0) {
      // Nothing to finalize yet
      return new Response(JSON.stringify({ success: true, message: 'No leads yet to finalize.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // DEDUPLICATE LEADS - prevent duplicate entries in CSV
    const uniqueLeads: any[] = [];
    const seen = new Set<string>();
    
    for (const lead of rawLeads) {
      const key = `${(lead.contact || '').toLowerCase()}-${(lead.address || '').toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLeads.push(lead);
      }
    }
    
    console.log(`[FINALIZE] Deduplication: ${rawLeads.length} → ${uniqueLeads.length} leads (removed ${rawLeads.length - uniqueLeads.length} duplicates)`);

    // ENFORCE STRICT LEAD CAPS
    const maxLeadLimits = {
      starter: 26,
      growth: 51,
      pro: 101,
      enterprise: 151,
    };
    
    const maxAllowed = maxLeadLimits[order.tier as keyof typeof maxLeadLimits] || 26;
    const leads = uniqueLeads.slice(0, maxAllowed);
    
    console.log(`[FINALIZE] Enforcing lead cap: ${rawLeads.length} → ${leads.length} (max: ${maxAllowed})`);
    if (rawLeads.length > leads.length) {
      // Remove excess leads from database
      const excessIds = rawLeads.slice(maxAllowed).map(l => l.id);
      await supabase.from('leads').delete().in('id', excessIds);
      console.log(`[FINALIZE] Deleted ${excessIds.length} excess leads`);
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
      throw new Error('Failed to upload CSV file');
    }

    // Update order with final details
    const { error: updErr } = await supabase
      .from('orders')
      .update({
        sheet_url: csvUrl,
        delivered_at: new Date().toISOString(),
        leads_count: leads.length,
        total_leads_delivered: leads.length,
      })
      .eq('id', orderId);
    if (updErr) throw new Error(`Failed to update order: ${updErr.message}`);

    // Send email with CSV
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
          leads: leads.slice(0, 5),
          orderId: orderId,
        })
      }).catch(err => console.error('[FINALIZE] send-leads-ready failed', err));
    }

    return new Response(JSON.stringify({ success: true, csvUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('finalize-order error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});