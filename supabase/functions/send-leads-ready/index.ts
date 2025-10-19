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
  downloadUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, leadCount, city, downloadUrl }: LeadsReadyRequest = await req.json();

    console.log("Sending leads ready email to:", email);

    const siteUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovableproject.com') || "https://realtyleadsai.com";

    const emailResponse = await resend.emails.send({
      from: "RealtyLeadsAI <hello@realtyleadsai.com>",
      to: [email],
      subject: "Your Leads Are Ready 📊",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
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
                font-size: 22px;
                margin: 0 0 20px 0;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                color: #1a3a2e;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 15px 0;
              }
              .login-link {
                color: #FFD700;
                text-decoration: none;
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
              <h1>Hi ${name},</h1>
              
              <p>Your ${leadCount} ${city} FSBO leads are ready!</p>

              <div style="text-align: center;">
                <a href="${downloadUrl}" class="cta-button">Download Leads</a>
              </div>

              <p>Or login anytime: <a href="${siteUrl}/login" class="login-link">${siteUrl}/login</a></p>

              <p>Good luck closing! 🏠</p>
              
              <div class="footer">
                Need help? Just reply to this email.
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Leads ready email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-leads-ready function:", error);
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
