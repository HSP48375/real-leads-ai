import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  
  const handleTierChange = (value: string) => {
    const tier = allTiers.find(t => t.tierValue === value);
    if (tier) {
      const price = billingType === 'onetime' ? tier.price : tier.monthly;
      onTierSelect(tier.tierValue, price, tier.leads);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Your New Leads</h2>
        <p className="text-sm text-muted-foreground">Choose your plan and billing preference</p>
      </div>

      {/* Billing Toggle */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Billing Type</Label>
        <div className="inline-flex items-center gap-2 p-1 bg-card/60 backdrop-blur-glass border border-primary/20 rounded-lg shadow-lg w-full">
          <button
            type="button"
            onClick={() => onBillingChange('onetime')}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-md font-semibold transition-all text-sm",
              billingType === 'onetime'
                ? 'bg-primary text-primary-foreground shadow-gold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            One-Time Purchase
          </button>
          <button
            type="button"
            onClick={() => onBillingChange('monthly')}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-md font-semibold transition-all text-sm",
              billingType === 'monthly'
                ? 'bg-primary text-primary-foreground shadow-gold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Monthly Subscription
          </button>
        </div>
      </div>

      {/* Tier Dropdown */}
      <div>
        <Label htmlFor="tier-select" className="text-sm font-medium mb-3 block">
          Select Plan
        </Label>
        <Select value={selectedTier} onValueChange={handleTierChange}>
          <SelectTrigger className="w-full h-12 text-base bg-card/60 backdrop-blur-glass border-primary/20">
            <SelectValue placeholder="Choose your plan" />
          </SelectTrigger>
          <SelectContent className="bg-card backdrop-blur-glass">
            {allTiers.map((tier) => {
              const price = billingType === 'onetime' ? tier.price : tier.monthly;
              return (
                <SelectItem 
                  key={tier.tierValue} 
                  value={tier.tierValue}
                  className="text-base py-3"
                >
                  <div className="flex items-center justify-between w-full gap-4">
                    <span className="font-semibold">{tier.name}</span>
                    <span className="text-muted-foreground">
                      ${price}{billingType === 'monthly' ? '/mo' : ''} • {tier.leads} leads
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default PricingTierSelector;
