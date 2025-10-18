import { supabase } from "@/integrations/supabase/client";

export const setupStripeTestProducts = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('setup-test-products');
    
    if (error) throw error;
    
    console.log("Stripe test products created:", data);
    return data;
  } catch (error) {
    console.error("Error setting up Stripe products:", error);
    throw error;
  }
};
