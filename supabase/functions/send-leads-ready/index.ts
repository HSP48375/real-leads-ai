import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadsReadyRequest {
  email: string;
  name: string;
  leadCount: string;
  city: string;
  excelUrl?: string;
  sheetUrl?: string;
  leads?: any[];
  orderId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, leadCount, city, excelUrl, sheetUrl, leads, orderId }: LeadsReadyRequest = await req.json();

    console.log("[LEADS-READY] Sending email to:", email);

    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://real-leads-ai.lovable.app";

    // Format address properly - handle both string and object formats
    const formatAddress = (lead: any): string => {
      // If address is a string, use it directly
      if (typeof lead.address === 'string') {
        return lead.address;
      }
      // If address is an object (parsed JSON), format it
      if (typeof lead.address === 'object' && lead.address) {
        const addr = lead.address;
        return addr.street || '';
      }
      return '';
    };

    // Generate lead preview table
    let leadsPreviewHtml = '';
    if (leads && leads.length > 0) {
      const previewLeads = leads.slice(0, 3); // Show only 3 leads
      leadsPreviewHtml = `
        <div style="margin: 20px 0;">
          <h3 style="color: #1a3a2e; margin-bottom: 15px;">📋 Preview of Your Leads:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Name</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Address</th>
                <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Contact</th>
              </tr>
            </thead>
            <tbody>
              ${previewLeads.map(lead => {
                const address = formatAddress(lead);
                const fullAddress = `${address}${lead.city ? ', ' + lead.city : ''}${lead.state ? ', ' + lead.state : ''}${lead.zip ? ' ' + lead.zip : ''}`;
                return `
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.seller_name || 'Homeowner'}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${fullAddress}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.contact || 'See CSV'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <p style="color: #6b7280; font-size: 14px;">
            ${leads.length > 3 ? `+ ${leads.length - 3} more leads in the Excel file. ` : ''}
            Full contact details, prices, and listing info available in the Excel download.
          </p>
        </div>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 650px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 30px;
            }
            h1 {
              color: #1a3a2e;
              font-size: 24px;
              margin: 0 0 20px 0;
            }
            .highlight-box {
              background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
              border-left: 4px solid #22c55e;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
              color: #1a3a2e;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 10px 10px 10px 0;
            }
            .secondary-button {
              display: inline-block;
              background: #f3f4f6;
              color: #1a3a2e;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 10px 10px 10px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Your ${leadCount} FSBO Leads Are Ready!</h1>
            
            <p>Hi ${name},</p>

            <div class="highlight-box">
              <strong style="font-size: 18px;">✅ ${leadCount} Fresh Leads Delivered</strong><br/>
              <span style="color: #6b7280;">Location: ${city} • Ready to Close</span>
            </div>

            ${leadsPreviewHtml}

            <p><strong>📥 Download Your Leads Now:</strong></p>
            
            <div style="margin: 20px 0;">
              ${excelUrl ? `<a href="${excelUrl}" class="cta-button">📊 Download Excel File</a>` : ''}
              ${sheetUrl ? `<a href="${sheetUrl}" class="secondary-button">📊 Open Google Sheet</a>` : ''}
              <a href="${appBaseUrl}/dashboard" class="secondary-button">🔐 View Dashboard</a>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              💡 <strong>Pro Tip:</strong> Start calling the leads with the highest property values first - they're more likely to accept competitive offers!
            </p>

            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Review the lead details and contact information</li>
              <li>Prioritize high-value properties</li>
              <li>Start reaching out to homeowners</li>
              <li>Close deals and earn commissions! 💰</li>
            </ul>
            
            <div class="footer">
              <p><strong>Need more leads?</strong> Order again at ${appBaseUrl}</p>
              <p>Questions? Just reply to this email - we're here to help!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "RealtyLeadsAI <onboarding@resend.dev>",
      to: [email],
      subject: `🎉 Your ${leadCount} FSBO Leads Are Ready!`,
      html: emailHtml,
    });

    console.log("[LEADS-READY] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[LEADS-READY] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
