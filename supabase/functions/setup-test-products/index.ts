import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_TEST_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    console.log("Creating test products and prices...");

    const tiers = [
      { name: "Starter", price: 97 },
      { name: "Growth", price: 197 },
      { name: "Pro", price: 397 },
      { name: "Enterprise", price: 697 },
    ];

    const priceIds: Record<string, string> = {};

    for (const tier of tiers) {
      // Create product
      const product = await stripe.products.create({
        name: `${tier.name} Plan`,
        description: `${tier.name} tier - one-time payment`,
      });

      console.log(`Created product: ${product.id} for ${tier.name}`);

      // Create one-time price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price * 100, // Convert to cents
        currency: "usd",
      });

      console.log(`Created price: ${price.id} for ${tier.name} - $${tier.price}`);

      priceIds[tier.name.toLowerCase()] = price.id;
    }

    console.log("All test products created successfully:", priceIds);

    return new Response(
      JSON.stringify({ 
        success: true,
        priceIds,
        message: "Test products created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Setup error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
