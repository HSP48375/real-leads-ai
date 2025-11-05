import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import OrderForm from "@/components/OrderForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PricingTierSelector, { allTiers } from "@/components/PricingTierSelector";

const Order = () => {
  const [searchParams] = useSearchParams();
  
  // Initialize state from URL params or defaults
  const initialTier = searchParams.get("tier") || "growth";
  const initialBilling = (searchParams.get("billing") as 'onetime' | 'monthly') || "onetime";
  const initialPrice = parseInt(searchParams.get("price") || "197");
  const initialLeads = searchParams.get("leads") || "40-50";

  const [selectedTier, setSelectedTier] = useState(initialTier);
  const [billingType, setBillingType] = useState<'onetime' | 'monthly'>(initialBilling);
  const [price, setPrice] = useState(initialPrice);
  const [leads, setLeads] = useState(initialLeads);

  const handleTierSelect = (tierValue: string, tierPrice: number, tierLeads: string) => {
    setSelectedTier(tierValue);
    setPrice(tierPrice);
    setLeads(tierLeads);
  };

  const handleBillingChange = (billing: 'onetime' | 'monthly') => {
    setBillingType(billing);
    
    // Update price based on new billing type
    const tier = allTiers.find(t => t.tierValue === selectedTier);
    if (tier) {
      const newPrice = billing === 'onetime' ? tier.price : tier.monthly;
      setPrice(newPrice);
    }
  };

  const orderParams = {
    tier: selectedTier,
    billing: billingType,
    price: price,
    leads: leads
  };

  return (
    <div className="min-h-screen relative bg-background">
      <Header />
      <div className="pt-20 pb-12">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Section 1: Toggle */}
            <PricingTierSelector
              selectedTier={selectedTier}
              billingType={billingType}
              onTierSelect={handleTierSelect}
              onBillingChange={handleBillingChange}
            />

            {/* Section 2 & 3: Order Form with Benefits */}
            <OrderForm 
              orderParams={orderParams}
              onTierChange={handleTierSelect}
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Order;
