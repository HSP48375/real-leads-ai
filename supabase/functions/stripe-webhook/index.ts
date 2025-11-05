import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_TEST_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
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
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
    
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    console.log("Webhook event received:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      console.log("checkout.session.completed:", {
        hasEmail: !!(session.customer_email || session.customer_details?.email),
        amountCents: session.amount_total,
        paymentStatus: session.payment_status,
        tier: metadata.tier,
      });

      const tier = metadata.tier ?? metadata.plan ?? "starter";
      const billing = metadata.billing ?? (session.mode === "subscription" ? "monthly" : "onetime");
      const leads = metadata.leads ?? null;
      const primary_city = metadata.primary_city ?? metadata.city ?? "";
      const search_radius = parseInt(metadata.search_radius ?? metadata.radius ?? "50", 10);
      const additional_cities = (() => {
        try { return JSON.parse(metadata.additional_cities || "[]"); } catch { return []; }
      })();
      const name = metadata.name ?? metadata.customer_name ?? session.customer_details?.name ?? null;
      const email = session.customer_email ?? session.customer_details?.email ?? metadata.email ?? null;

      // Prefer Stripe reported amount; fallback to metadata.price
      const price_paid = typeof session.amount_total === "number"
        ? Math.round(session.amount_total / 100)
        : (metadata.price ? parseInt(metadata.price, 10) : null);

      const status = session.payment_status === "paid" ? "processing" : "pending";
      const nextDeliveryDate = billing === "monthly"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Security: Always derive user_id from email lookup, never trust client-supplied value
      let finalUserId = null;
      if (email) {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const matchedUser = existingUsers?.users?.find((u: { email?: string; id: string }) => u.email === email) || null;
        if (matchedUser) {
          finalUserId = matchedUser.id;
          console.log("User matched by email");
        }
      }

      // Idempotency guard: ensure we only create one order per Payment Intent / session
      const piId = (session.payment_intent as string) || session.id;
      const { data: existingByPi, error: existingCheckError } = await supabase
        .from('orders')
        .select('id')
        .eq('stripe_payment_intent_id', piId)
        .maybeSingle();

      if (existingCheckError) {
        console.warn('Existing order check error:', existingCheckError.message);
      }

      if (existingByPi) {
        console.log('Idempotency: order already exists, skipping creation', { orderId: existingByPi.id, piId });
        return new Response(
          JSON.stringify({ received: true, skipped: true, reason: 'order_exists', orderId: existingByPi.id }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name: name,
          customer_email: email,
          user_id: finalUserId,
          primary_city,
          search_radius,
          additional_cities,
          tier,
          billing_type: billing,
          price_paid,
          lead_count_range: leads,
          status,
          // Persist PI when available; fallback to session id for traceability
          stripe_payment_intent_id: piId,
          stripe_subscription_id: (session.subscription as string) || null,
          next_delivery_date: nextDeliveryDate,
        })
        .select()
        .single();

      if (orderError) {
        // Treat unique violations as idempotent success
        const msg = orderError.message || '';
        if (msg.includes('duplicate') || msg.includes('already exists') || (orderError as any).code === '23505') {
          const { data: existing } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_payment_intent_id', piId)
            .maybeSingle();
          if (existing?.id) {
            console.log('Duplicate insert avoided via DB constraint - returning existing order');
            return new Response(
              JSON.stringify({ received: true, skipped: true, reason: 'order_exists', orderId: existing.id }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
        console.error("Failed to create order from checkout.session.completed:", orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log("Order created:", {
        orderIdPrefix: order.id.substring(0, 8) + "...",
        status: order.status,
        tier,
      });

      // Send order confirmation email with password setup link
      try {
        console.log("Triggering order confirmation email for:", email);
        
        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-order-confirmation', {
          body: {
            email: email,
            name: name || "there",
            tier,
            price: price_paid,
            leadCount: leads || "15-20",
            city: primary_city,
          },
        });

        if (emailError) {
          console.error("Failed to send order confirmation email:", emailError);
        } else {
          console.log("Order confirmation email sent successfully:", emailData);
        }
      } catch (emailError) {
        console.error("Error sending order confirmation email:", emailError);
      }

      // Trigger native lead scraping automation
      try {
        console.log("Triggering scrape-leads...");
        
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        const scrapeResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          },
          body: JSON.stringify({ orderId: order.id }),
        });

        if (!scrapeResponse.ok) {
          console.error("Failed to trigger scrape-leads, status:", scrapeResponse.status);
        } else {
          console.log("Lead scraping started successfully");
        }
      } catch (scrapeError) {
        console.error("Error triggering scrape-leads:", scrapeError instanceof Error ? scrapeError.message : String(scrapeError));
      }

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

      // Trigger native lead scraping automation for renewal
      try {
        console.log("Triggering scrape-leads for renewal order:", newOrder.id);
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        const scrapeResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
          },
          body: JSON.stringify({ orderId: newOrder.id }),
        });

        if (!scrapeResponse.ok) {
          console.error("Failed to trigger scrape-leads for renewal:", await scrapeResponse.text());
        } else {
          console.log("Lead scraping automation started successfully for renewal");
        }
      } catch (scrapeError) {
        console.error("Error triggering scrape-leads for renewal:", scrapeError);
      }

      // TODO: Send renewal notification email

      return new Response(
        JSON.stringify({ received: true, orderId: newOrder.id }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle payment_intent.succeeded (DISABLED - checkout.session.completed handles all order creation)
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log("payment_intent.succeeded received - checking if order exists:", {
        payment_intent: pi.id,
      });

      // Check if order already exists (created by checkout.session.completed)
      const { data: existing, error: findError } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", pi.id)
        .limit(1);

      if (findError) {
        console.error("Error checking existing order for payment_intent:", findError);
      }

      if (existing && existing.length > 0) {
        console.log("✅ Order already exists from checkout.session.completed; skipping duplicate.", {
          orderId: existing[0].id,
          payment_intent: pi.id,
        });
        return new Response(
          JSON.stringify({ received: true, skipped: true, reason: "order_exists" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // If no order exists, log warning but don't create (checkout.session.completed should have handled it)
      console.warn("⚠️ payment_intent.succeeded received but no order found - checkout.session.completed may have failed");
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: "no_checkout_session" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );

    }

    // Handle charge.succeeded (DISABLED - no order creation)
    if (event.type === "charge.succeeded") {
      const charge = event.data.object as Stripe.Charge;
      console.log("charge.succeeded received - ignoring (handled by checkout.session.completed)", {
        charge_id: charge.id,
        payment_intent: charge.payment_intent,
      });
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: "handled_by_checkout" }),
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
