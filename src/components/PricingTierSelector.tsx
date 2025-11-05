import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingTier {
  name: string;
  price: number;
  monthly: number;
  monthlySavings: number;
  leads: string;
  description: string;
  features: string[];
  tierValue: string;
  popular?: boolean;
}

export const allTiers: PricingTier[] = [
  {
    name: "Starter",
    price: 97,
    monthly: 87,
    monthlySavings: 10,
    leads: "20-25",
    description: "Perfect for getting started",
    features: [
      "20-25 Verified FSBO Leads",
      "Phone Number + Property Address",
      "Choose Your Coverage Area",
      "Delivered Within 1 Hour",
      "Email Support"
    ],
    tierValue: "starter"
  },
  {
    name: "Growth",
    price: 197,
    monthly: 177,
    monthlySavings: 20,
    leads: "40-50",
    description: "Most popular - Best value",
    features: [
      "40-50 Verified FSBO Leads",
      "Phone Number + Property Address",
      "Choose Your Coverage Area",
      "Delivered Within 1 Hour",
      "Priority Support"
    ],
    popular: true,
    tierValue: "growth"
  },
  {
    name: "Pro",
    price: 397,
    monthly: 357,
    monthlySavings: 40,
    leads: "110-130",
    description: "For serious lead generation",
    features: [
      "110-130 Verified FSBO Leads",
      "Phone Number + Property Address",
      "Choose Your Coverage Area",
      "Delivered Within 1 Hour",
      "Priority Support"
    ],
    tierValue: "pro"
  },
  {
    name: "Enterprise",
    price: 697,
    monthly: 627,
    monthlySavings: 70,
    leads: "150-200",
    description: "Maximum coverage & support",
    features: [
      "150-200 Verified FSBO Leads",
      "Phone Number + Property Address",
      "Choose Your Coverage Area",
      "Delivered Within 1 Hour",
      "Dedicated Account Manager"
    ],
    tierValue: "enterprise"
  }
];

interface PricingTierSelectorProps {
  selectedTier: string;
  billingType: 'onetime' | 'monthly';
  onTierSelect: (tierValue: string, price: number, leads: string) => void;
  onBillingChange: (billing: 'onetime' | 'monthly') => void;
}

const PricingTierSelector = ({ 
  selectedTier, 
  billingType, 
  onTierSelect,
  onBillingChange 
}: PricingTierSelectorProps) => {
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Your Plan</h2>
        <p className="text-sm text-muted-foreground">Choose the tier that fits your needs</p>
      </div>

      {/* Billing Toggle */}
      <div className="inline-flex items-center gap-2 p-1 bg-card/60 backdrop-blur-glass border border-primary/20 rounded-full shadow-lg w-full">
        <button
          type="button"
          onClick={() => onBillingChange('onetime')}
          className={cn(
            "flex-1 px-4 py-2 rounded-full font-semibold transition-all text-sm",
            billingType === 'onetime'
              ? 'bg-primary text-primary-foreground shadow-gold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          One-Time
        </button>
        <button
          type="button"
          onClick={() => onBillingChange('monthly')}
          className={cn(
            "flex-1 px-4 py-2 rounded-full font-semibold transition-all text-sm",
            billingType === 'monthly'
              ? 'bg-primary text-primary-foreground shadow-gold'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Monthly
        </button>
      </div>

      {/* Tier Cards */}
      <div className="space-y-4">
        {allTiers.map((tier) => {
          const isSelected = selectedTier === tier.tierValue;
          const currentPrice = billingType === 'onetime' ? tier.price : tier.monthly;
          
          return (
            <Card 
              key={tier.tierValue}
              className={cn(
                "relative cursor-pointer transition-all duration-300 hover:shadow-lg",
                isSelected 
                  ? "border-primary border-2 shadow-gold-glow bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onTierSelect(tier.tierValue, currentPrice, tier.leads)}
            >
              {tier.popular && (
                <div className="absolute top-0 right-4 -translate-y-1/2 px-2 py-0.5 bg-primary rounded-full shadow-gold">
                  <span className="text-[9px] font-bold text-primary-foreground">POPULAR</span>
                </div>
              )}
              
              <CardHeader className="pb-3 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-bold">{tier.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold">${currentPrice}</span>
                      {billingType === 'monthly' && (
                        <span className="text-xs text-muted-foreground">/mo</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tier.leads} leads</p>
                  </div>
                  
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                    isSelected 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PricingTierSelector;
