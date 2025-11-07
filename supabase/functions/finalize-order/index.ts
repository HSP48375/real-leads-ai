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
  
  // Headers - ALL available FSBO.com fields including property details
  rows.push('First Name,Last Name,Address Line 1,Address Line 2,Full Address,City,State,Zip,Phone,Email,Price,Bedrooms,Bathrooms,Home Style,Year Built,Listing Title,URL,Days Listed');
  
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
      cleanValue(lead.bedrooms !== null && lead.bedrooms !== undefined ? String(lead.bedrooms) : ''),
      cleanValue(lead.bathrooms !== null && lead.bathrooms !== undefined ? String(lead.bathrooms) : ''),
      cleanValue(lead.home_style || ''),
      cleanValue(lead.year_built !== null && lead.year_built !== undefined ? String(lead.year_built) : ''),
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

    // DEDUPLICATE LEADS - Track duplicates for deletion
    const uniqueLeads: any[] = [];
    const duplicateIds: string[] = [];
    const seen = new Set<string>();
    
    // Helper to normalize phone numbers
    const normalizePhone = (phone: string): string => {
      if (!phone) return '';
      return phone.replace(/\D/g, '').slice(-10); // Last 10 digits only
    };
    
    // Helper to normalize address
    const normalizeAddress = (addr: string): string => {
      if (!addr) return '';
      return addr.toLowerCase()
        .replace(/[.,]/g, '') // Remove periods and commas
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };
    
    for (const lead of rawLeads) {
      // Only deduplicate if we have BOTH contact AND address
      const normalizedPhone = normalizePhone(lead.contact || '');
      const normalizedEmail = (lead.email || '').toLowerCase().trim();
      const normalizedAddr = normalizeAddress(lead.address || '');
      
      // Skip deduplication if missing critical fields
      if (!normalizedAddr || (!normalizedPhone && !normalizedEmail)) {
        console.log(`[FINALIZE] Keeping lead without complete data:`, {
          id: lead.id.slice(0, 8),
          hasPhone: !!normalizedPhone,
          hasEmail: !!normalizedEmail,
          hasAddress: !!normalizedAddr
        });
        uniqueLeads.push(lead);
        continue;
      }
      
      // Create deduplication key using phone OR email + address
      const contactKey = normalizedPhone || normalizedEmail;
      const key = `${contactKey}-${normalizedAddr}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLeads.push(lead);
      } else {
        // This is a true duplicate - mark for deletion
        console.log(`[FINALIZE] Duplicate found:`, {
          id: lead.id.slice(0, 8),
          contact: contactKey.slice(0, 10) + '...',
          address: normalizedAddr.slice(0, 30) + '...'
        });
        duplicateIds.push(lead.id);
      }
    }
    
    console.log(`[FINALIZE] Deduplication: ${rawLeads.length} → ${uniqueLeads.length} leads (${duplicateIds.length} duplicates marked for deletion)`);

    // Delete duplicate leads from database immediately
    if (duplicateIds.length > 0) {
      const { error: delErr } = await supabase.from('leads').delete().in('id', duplicateIds);
      if (delErr) {
        console.error('[FINALIZE] Failed to delete duplicates:', delErr);
      } else {
        console.log(`[FINALIZE] Deleted ${duplicateIds.length} duplicate leads from database`);
      }
    }

    // ENFORCE STRICT LEAD CAPS - Match exact tier minimums and maximums
    const tierLimits = {
      starter: { min: 20, max: 25 },
      growth: { min: 40, max: 50 },
      pro: { min: 110, max: 130 },
      enterprise: { min: 150, max: 200 },
    };
    
    const limits = tierLimits[order.tier as keyof typeof tierLimits] || { min: 20, max: 26 };
    
    // CHECK MINIMUM REQUIREMENT
    if (uniqueLeads.length < limits.min) {
      console.log(`[FINALIZE] INSUFFICIENT LEADS: ${uniqueLeads.length} < ${limits.min} (tier: ${order.tier})`);
      
      // Update order to failed status
      await supabase
        .from('orders')
        .update({
          status: 'failed',
          error_message: `Only ${uniqueLeads.length} leads found. Minimum required: ${limits.min}`,
        })
        .eq('id', orderId);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Insufficient leads: ${uniqueLeads.length}/${limits.min} required`,
          leadsFound: uniqueLeads.length,
          minRequired: limits.min
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const leads = uniqueLeads.slice(0, limits.max);
    
    console.log(`[FINALIZE] Lead validation: ${uniqueLeads.length} leads (min: ${limits.min}, max: ${limits.max}) → finalizing ${leads.length}`);
    
    // Delete excess leads beyond tier cap from database
    if (uniqueLeads.length > limits.max) {
      const excessLeads = uniqueLeads.slice(limits.max);
      const excessIds = excessLeads.map(l => l.id);
      const { error: capErr } = await supabase.from('leads').delete().in('id', excessIds);
      if (capErr) {
        console.error('[FINALIZE] Failed to delete excess leads:', capErr);
      } else {
        console.log(`[FINALIZE] Deleted ${excessIds.length} leads exceeding tier cap`);
      }
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