import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0?target=deno&no-dts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();

    console.log("Sending welcome email to:", email);

    const emailResponse = await resend.emails.send({
      from: "RealtyLeadsAI <hello@realtyleadsai.com>",
      to: [email],
      subject: "Welcome to RealtyLeadsAI! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #0a1612 0%, #1a3a2e 100%);
                padding: 40px 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
              }
              .logo {
                color: #FFD700;
                font-size: 32px;
                font-weight: bold;
                margin: 0;
              }
              .content {
                background: #ffffff;
                padding: 40px 30px;
                border-left: 1px solid #e5e7eb;
                border-right: 1px solid #e5e7eb;
              }
              .greeting {
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 20px;
                color: #1a3a2e;
              }
              .section {
                margin-bottom: 30px;
              }
              .section-title {
                font-size: 18px;
                font-weight: 600;
                color: #1a3a2e;
                margin-bottom: 10px;
              }
              .features {
                background: #f9fafb;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .feature-item {
                padding: 10px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .feature-item:last-child {
                border-bottom: none;
              }
              .feature-icon {
                color: #FFD700;
                margin-right: 8px;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
                color: #1a3a2e;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
              }
              .footer {
                background: #f9fafb;
                padding: 30px;
                text-align: center;
                border-radius: 0 0 8px 8px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
              }
              .footer a {
                color: #FFD700;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 class="logo">RealtyLeadsAI</h1>
            </div>
            
            <div class="content">
              <div class="greeting">Welcome, ${name}! 🎉</div>
              
              <div class="section">
                <p>Thank you for joining RealtyLeadsAI! We're excited to help you close more deals with verified FSBO leads.</p>
              </div>

              <div class="features">
                <div class="section-title">What You Get:</div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span> Verified FSBO seller contact information
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span> Delivered within 24 hours
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span> City-specific lead targeting
                </div>
                <div class="feature-item">
                  <span class="feature-icon">✓</span> No recycled data - fresh leads only
                </div>
              </div>

              <div class="section">
                <div class="section-title">Quick Start Guide:</div>
                <ol>
                  <li>Browse our pricing tiers and select the package that fits your needs</li>
                  <li>Choose your target city or territory</li>
                  <li>Receive your verified leads via Google Sheets within 24 hours</li>
                  <li>Start reaching out and closing deals!</li>
                </ol>
              </div>

              <div style="text-align: center;">
                <a href="https://realtyleadsai.com/dashboard" class="cta-button">
                  Go to Dashboard
                </a>
              </div>

              <div class="section">
                <p><strong>Need Help?</strong><br>
                Our support team is here for you at <a href="mailto:hello@realtyleadsai.com" style="color: #FFD700;">hello@realtyleadsai.com</a></p>
              </div>
            </div>

            <div class="footer">
              <p>Join 527+ agents already closing more deals with RealtyLeadsAI</p>
              <p style="margin-top: 20px;">
                <a href="https://realtyleadsai.com">Visit Website</a> | 
                <a href="https://realtyleadsai.com/terms-of-service">Terms</a> | 
                <a href="https://realtyleadsai.com/privacy-policy">Privacy</a>
              </p>
              <p style="margin-top: 20px; color: #9ca3af;">
                © 2025 RealtyLeadsAI. All rights reserved.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
