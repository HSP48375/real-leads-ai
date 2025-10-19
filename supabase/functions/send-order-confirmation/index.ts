import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderConfirmationRequest {
  email: string;
  name: string;
  tier: string;
  price: number;
  leadCount: string;
  city: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, tier, price, leadCount, city }: OrderConfirmationRequest = await req.json();

    console.log("Sending order confirmation email to:", email);

    // Generate password reset link
    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (resetError) {
      console.error("Error generating password reset link:", resetError);
      throw resetError;
    }

    const passwordSetUrl = resetData.properties?.action_link || "";

    const emailResponse = await resend.emails.send({
      from: "RealtyLeadsAI <hello@realtyleadsai.com>",
      to: [email],
      subject: "Order Confirmed - Leads Arriving in 24hrs ✓",
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
              .order-details {
                background: #f9fafb;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
              }
              .detail-line {
                margin: 8px 0;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                color: #1a3a2e;
                padding: 14px 28px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
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
              
              <p>Your order is confirmed!</p>

              <div class="order-details">
                <div class="detail-line">✓ ${leadCount} FSBO leads for ${city}</div>
                <div class="detail-line">✓ $${(price / 100).toFixed(2)} paid</div>
                <div class="detail-line">✓ Delivery: Within 24 hours</div>
              </div>

              <p><strong>🔐 Set Your Password</strong></p>
              <p>We created your account: ${email}</p>

              <div style="text-align: center;">
                <a href="${passwordSetUrl}" class="cta-button">Set Password Now</a>
              </div>

              <p>You'll get another email when your leads are ready.</p>
              
              <div class="footer">
                Questions? Just reply to this email.
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Order confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-confirmation function:", error);
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
