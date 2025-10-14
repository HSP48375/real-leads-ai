import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { name, email, city, tier } = await req.json();

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: name,
        customer_email: email,
        city,
        tier,
        status: "processing",
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

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
      JSON.stringify({
        success: true,
        orderId: order.id,
        message: "Order created! Your leads are being generated and will be emailed to you shortly.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Process order error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
