import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_TEST_SECRET_KEY") || "", {
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
          stripe_payment_intent_id: (session.payment_intent as string) || session.id,
          stripe_subscription_id: (session.subscription as string) || null,
          next_delivery_date: nextDeliveryDate,
        })
        .select()
        .single();

      if (orderError) {
        console.error("Failed to create order from checkout.session.completed:", orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log("Order created:", {
        orderIdPrefix: order.id.substring(0, 8) + "...",
        status: order.status,
        tier,
      });

      // Send order confirmation email with password setup link (only once)
      try {
        console.log("Triggering order confirmation email for:", email);
        
        // Check if we already sent confirmation email for this order
        const { data: existingEmailLog } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_intent_id', (session.payment_intent as string) || session.id)
          .not('id', 'eq', order.id)
          .limit(1);
        
        if (existingEmailLog && existingEmailLog.length > 0) {
          console.log("Order confirmation already sent for this payment, skipping duplicate email");
        } else {
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

    // Handle payment_intent.succeeded (fallback path)
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log("payment_intent.succeeded:", {
        amountCents: pi.amount,
        currency: pi.currency,
        status: pi.status,
      });

      const { data: existing, error: findError } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", pi.id)
        .limit(1);

      if (findError) {
        console.error("Error checking existing order for payment_intent:", findError);
      }

      if (existing && existing.length > 0) {
        console.log("Order already exists for payment_intent; skipping insert.", {
          orderId: existing[0].id,
          payment_intent: pi.id,
        });
        return new Response(
          JSON.stringify({ received: true, skipped: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
        const session = sessions.data[0];

        if (!session) {
          console.error("No checkout session found for payment_intent:", pi.id);
          return new Response(
            JSON.stringify({ received: true, sessionFound: false }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        // Reuse same insertion logic as checkout.session.completed
        const metadata = session.metadata || {};
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
        const price_paid = typeof session.amount_total === "number"
          ? Math.round(session.amount_total / 100)
          : (metadata.price ? parseInt(metadata.price, 10) : null);
        const status = session.payment_status === "paid" ? "processing" : "pending";
        const nextDeliveryDate = billing === "monthly"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { data: order, error: insertError } = await supabase
          .from("orders")
          .insert({
            customer_name: name,
            customer_email: email,
            primary_city,
            search_radius,
            additional_cities,
            tier,
            billing_type: billing,
            price_paid,
            lead_count_range: leads,
            status,
            stripe_payment_intent_id: (session.payment_intent as string) || session.id,
            stripe_subscription_id: (session.subscription as string) || null,
            next_delivery_date: nextDeliveryDate,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to create order from payment_intent.succeeded:", insertError);
          throw new Error(`Failed to create order: ${insertError.message}`);
        }

        console.log("Order created from payment_intent.succeeded:", {
          orderIdPrefix: order.id.substring(0, 8) + "...",
          tier: metadata.tier,
        });

        return new Response(
          JSON.stringify({ received: true, orderId: order.id }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("Error handling payment_intent.succeeded:", e);
        return new Response(
          JSON.stringify({ received: true, error: "payment_intent handler error" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Handle charge.succeeded (additional fallback)
    if (event.type === "charge.succeeded") {
      const charge = event.data.object as Stripe.Charge;
      const piId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : (charge.payment_intent as any)?.id;
      console.log("charge.succeeded:", {
        amountCents: charge.amount,
        currency: charge.currency,
        paid: charge.paid,
      });

      if (!piId) {
        console.error("charge.succeeded without payment_intent id");
        return new Response(
          JSON.stringify({ received: true, missingPaymentIntent: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const { data: existing, error: findError2 } = await supabase
        .from("orders")
        .select("id")
        .eq("stripe_payment_intent_id", piId)
        .limit(1);

      if (findError2) {
        console.error("Error checking existing order for charge:", findError2);
      }

      if (existing && existing.length > 0) {
        console.log("Order already exists for charge/payment_intent; skipping insert.", {
          orderId: existing[0].id,
          payment_intent: piId,
        });
        return new Response(
          JSON.stringify({ received: true, skipped: true }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
        const session = sessions.data[0];

        if (!session) {
          console.error("No checkout session found for charge/payment_intent:", piId);
          return new Response(
            JSON.stringify({ received: true, sessionFound: false }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }

        const metadata = session.metadata || {};
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
        const price_paid = typeof session.amount_total === "number"
          ? Math.round(session.amount_total / 100)
          : (metadata.price ? parseInt(metadata.price, 10) : null);
        const status = session.payment_status === "paid" ? "processing" : "pending";
        const nextDeliveryDate = billing === "monthly"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { data: order, error: insertError } = await supabase
          .from("orders")
          .insert({
            customer_name: name,
            customer_email: email,
            primary_city,
            search_radius,
            additional_cities,
            tier,
            billing_type: billing,
            price_paid,
            lead_count_range: leads,
            status,
            stripe_payment_intent_id: (session.payment_intent as string) || session.id,
            stripe_subscription_id: (session.subscription as string) || null,
            next_delivery_date: nextDeliveryDate,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to create order from charge.succeeded:", insertError);
          throw new Error(`Failed to create order: ${insertError.message}`);
        }

        console.log("Order created from charge.succeeded:", {
          orderId: order.id,
          payment_intent: piId,
          sessionId: session.id,
        });

        return new Response(
          JSON.stringify({ received: true, orderId: order.id }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("Error handling charge.succeeded:", e);
        return new Response(
          JSON.stringify({ received: true, error: "charge handler error" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
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
