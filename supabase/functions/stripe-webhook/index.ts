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

      const { tier, billing, price, leads, primary_city, search_radius, additional_cities, name, email } = metadata;

      console.log("Processing order for:", { tier, billing, primary_city, email });

      // Calculate next delivery date for monthly subscriptions
      const nextDeliveryDate = billing === 'monthly' 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

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
          billing_type: billing,
          price_paid: parseInt(price),
          lead_count_range: leads,
          status: "processing",
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_subscription_id: session.subscription as string || null,
          next_delivery_date: nextDeliveryDate,
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
        body: JSON.stringify({ 
          orderId: order.id,
          orderType: billing,
          subscriptionId: order.stripe_subscription_id,
          tier,
          email,
          cities: [primary_city, ...JSON.parse(additional_cities || "[]")],
          radius: `${search_radius} miles`,
          leadCount: leads,
          deliveryDate: new Date().toISOString()
        }),
      }).catch(err => console.error("Background scraping error:", err));

      // TODO: Send welcome email with password setup link
      // This would call a send-welcome-email function

      return new Response(
        JSON.stringify({ received: true, orderId: order.id }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle subscription renewals
    if (event.type === "invoice.paid" && event.data.object.billing_reason === "subscription_cycle") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.subscription as string;

      console.log("Processing subscription renewal:", subscriptionId);

      // Find the original order
      const { data: orders, error: findError } = await supabase
        .from("orders")
        .select("*")
        .eq("stripe_subscription_id", subscriptionId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (findError || !orders || orders.length === 0) {
        console.error("Could not find order for subscription:", subscriptionId);
        return new Response("Order not found", { status: 404 });
      }

      const originalOrder = orders[0];

      // Calculate next delivery date
      const nextDeliveryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create new order for this month's delivery
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: originalOrder.customer_name,
          customer_email: originalOrder.customer_email,
          primary_city: originalOrder.primary_city,
          search_radius: originalOrder.search_radius,
          additional_cities: originalOrder.additional_cities,
          tier: originalOrder.tier,
          billing_type: 'monthly',
          price_paid: originalOrder.price_paid,
          lead_count_range: originalOrder.lead_count_range,
          status: "processing",
          stripe_subscription_id: subscriptionId,
          next_delivery_date: nextDeliveryDate,
        })
        .select()
        .single();

      if (orderError) {
        console.error("Failed to create renewal order:", orderError);
        throw new Error(`Failed to create renewal order: ${orderError.message}`);
      }

      console.log("Renewal order created:", newOrder.id);

      // Trigger lead scraping for renewal
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      
      fetch(`${SUPABASE_URL}/functions/v1/scrape-leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          orderId: newOrder.id,
          orderType: 'subscription',
          subscriptionId: subscriptionId,
          tier: originalOrder.tier,
          email: originalOrder.customer_email,
          cities: [originalOrder.primary_city, ...(originalOrder.additional_cities || [])],
          radius: `${originalOrder.search_radius} miles`,
          leadCount: originalOrder.lead_count_range,
          deliveryDate: new Date().toISOString()
        }),
      }).catch(err => console.error("Background scraping error:", err));

      // TODO: Send renewal notification email

      return new Response(
        JSON.stringify({ received: true, orderId: newOrder.id }),
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
