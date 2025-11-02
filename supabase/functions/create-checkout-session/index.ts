import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe price IDs for each tier (TEST MODE)
const PRICE_IDS = {
  starter: "price_1SP52tE8tn1MdmKJNSZKbZpZ",
  growth: "price_1SP52uE8tn1MdmKJuWKryyxi",
  pro: "price_1SP52uE8tn1MdmKJSft8cGYl",
  enterprise: "price_1SP52vE8tn1MdmKJUQ3B7qGk",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tier, billing, price, leads, primary_city, search_radius, additional_cities, name, email } = await req.json();

    console.log("Creating checkout session:", { tier, billing, hasEmail: !!email });

    // Validate inputs
    if (!tier || !billing || !price || !leads || !primary_city || !search_radius || !name || !email) {
      throw new Error("Missing required fields");
    }

    const priceId = PRICE_IDS[tier as keyof typeof PRICE_IDS];
    if (!priceId) {
      throw new Error(`Invalid tier: ${tier}`);
    }
    
    // Determine Stripe mode based on billing type
    const mode = billing === 'monthly' ? 'subscription' : 'payment';

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_TEST_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${req.headers.get("origin")}/payment-success?email=${encodeURIComponent(email)}`,
      cancel_url: `${req.headers.get("origin")}/order?tier=${tier}&billing=${billing}&price=${price}&leads=${leads}&payment=cancelled`,
      metadata: {
        tier,
        billing,
        price: price.toString(),
        leads,
        primary_city,
        search_radius: search_radius.toString(),
        additional_cities: JSON.stringify(additional_cities || []),
        name,
        email,
        // Security: user_id is derived on server from email, not trusted from client
      },
    });

    console.log("Checkout session created successfully");

    return new Response(
      JSON.stringify({ sessionUrl: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Checkout session error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
