import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log("Webhook event received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (!metadata) {
        console.error("No metadata in session");
        return new Response("No metadata", { status: 400 });
      }

      const { tier, primary_city, search_radius, additional_cities, name, email } = metadata;

      console.log("Processing order for:", { tier, primary_city, email });

      // Create order record
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: name,
          customer_email: email,
          primary_city,
          search_radius: parseInt(search_radius),
          additional_cities: JSON.parse(additional_cities || "[]"),
          tier,
          status: "processing",
          stripe_payment_intent_id: session.payment_intent as string || session.subscription as string,
        })
        .select()
        .single();

      if (orderError) {
        console.error("Failed to create order:", orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log("Order created:", order.id);

      // Trigger lead scraping in background
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      
      fetch(`${SUPABASE_URL}/functions/v1/scrape-leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      }).catch(err => console.error("Background scraping error:", err));

      return new Response(
        JSON.stringify({ received: true, orderId: order.id }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Webhook error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});
