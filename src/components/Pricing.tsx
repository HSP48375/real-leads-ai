import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";

const oneTimeTiers = [
  {
    name: "Starter",
    price: "$97",
    subtext: "15-25 verified leads",
    costPerLead: "$3.88–$6.47 per lead",
    description: "Perfect for testing the waters with verified FSBO leads.",
    features: [
      "Single city targeting",
      "Delivered in 24 hours (Google Sheet)",
      "Email support"
    ],
    cta: "GET STARTED"
  },
  {
    name: "Growth",
    price: "$197",
    subtext: "25-35 verified leads",
    costPerLead: "$5.63–$7.88 per lead",
    description: "Great for small agencies and independent agents.",
    featured: true,
    badge: "MOST POPULAR",
    features: [
      "Multiple city options",
      "Delivered in 24 hours (Google Sheet)",
      "Priority email support",
      "Monthly updates available"
    ],
    cta: "GET STARTED"
  },
  {
    name: "Pro",
    price: "$397",
    subtext: "50-70 verified leads",
    costPerLead: "$5.67–$7.94 per lead",
    description: "Full city coverage, best for serious realtors and broker teams.",
    features: [
      "Unlimited city targeting",
      "Delivered in 12 hours (Google Sheet)",
      "Priority support + phone",
      "Weekly updates available",
      "Dedicated account manager"
    ],
    cta: "GET STARTED"
  },
  {
    name: "Enterprise",
    price: "Custom Pricing",
    subtext: "100+ verified leads per order",
    costPerLead: "$3.50–$5.00 per lead",
    description: "For brokerages, large teams, and high-volume agents.",
    badge: "TEAMS & API",
    enterprise: true,
    features: [
      "API access for CRM integration",
      "White-label delivery options",
      "24/7 priority support",
      "Custom dashboard & team tools",
      "Bulk processing"
    ],
    cta: "CONTACT SALES"
  }
];

const monthlyTiers = [
  {
    name: "Starter",
    price: "$79",
    period: "/month",
    savings: "Save $18",
    subtext: "15-25 leads monthly",
    costPerLead: "$3.16–$5.27 per lead",
    description: "Perfect for consistent lead flow without commitment.",
    features: [
      "Single city targeting",
      "Delivered in 24 hours (Google Sheet)",
      "Email support"
    ],
    cta: "START SUBSCRIPTION"
  },
  {
    name: "Growth",
    price: "$167",
    period: "/month",
    savings: "Save $30",
    subtext: "25-35 leads monthly",
    costPerLead: "$4.77–$6.68 per lead",
    description: "Great for active agents building a pipeline.",
    featured: true,
    badge: "MOST POPULAR",
    features: [
      "Multiple city options",
      "Delivered in 24 hours (Google Sheet)",
      "Priority email support",
      "1 campaign rollover"
    ],
    cta: "START SUBSCRIPTION"
  },
  {
    name: "Pro",
    price: "$337",
    period: "/month",
    savings: "Save $60",
    subtext: "50-70 leads monthly",
    costPerLead: "$4.81–$6.74 per lead",
    description: "Best for top producers and small teams.",
    features: [
      "Unlimited city targeting",
      "Delivered in 12 hours (Google Sheet)",
      "Priority support + phone",
      "Weekly updates",
      "Dedicated manager + 2 rollovers"
    ],
    cta: "START SUBSCRIPTION"
  },
  {
    name: "Enterprise",
    price: "Starting at $997",
    period: "/month",
    savings: "Unlimited campaigns",
    subtext: "Unlimited leads",
    costPerLead: "$2.50–$4.00 per lead",
    description: "For brokerages and high-volume operations.",
    badge: "TEAMS & API",
    enterprise: true,
    features: [
      "Full API access",
      "White-label delivery",
      "24/7 priority support",
      "Custom integrations & team dashboard",
      "Dedicated success manager + SLA"
    ],
    cta: "SCHEDULE DEMO"
  }
];

const Pricing = () => {
  const [isMonthly, setIsMonthly] = useState(false);
  const currentTiers = isMonthly ? monthlyTiers : oneTimeTiers;

  return (
    <section id="pricing" className="py-20 relative">
      <div className="container px-4">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <p className="text-lg md:text-xl text-foreground mb-8">
            All plans include fresh, geo-verified leads with no recycled data. Real homeowners, verified and ready within 24 hours.
          </p>
          
          {/* Pricing Toggle */}
          <div className="inline-flex items-center bg-card/40 backdrop-blur-glass border border-border rounded-full p-1 shadow-subtle">
            <button
              onClick={() => setIsMonthly(false)}
              className={`px-8 py-3 rounded-full font-semibold text-base transition-all duration-300 ${
                !isMonthly
                  ? "bg-primary text-primary-foreground shadow-gold"
                  : "text-foreground hover:text-primary"
              }`}
            >
              One-Time Purchase
            </button>
            <button
              onClick={() => setIsMonthly(true)}
              className={`px-8 py-3 rounded-full font-semibold text-base transition-all duration-300 ${
                isMonthly
                  ? "bg-primary text-primary-foreground shadow-gold"
                  : "text-foreground hover:text-primary"
              }`}
            >
              Monthly Subscription
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {currentTiers.map((tier, index) => (
            <GlowingCard key={`${tier.name}-${isMonthly}`}>
              <Card 
                className={`relative backdrop-blur-glass transition-all duration-500 hover:-translate-y-2 animate-fade-in border-transparent bg-card/60 shadow-none h-full flex flex-col ${
                  tier.featured ? 'shadow-gold-glow lg:scale-105' : ''
                } ${tier.enterprise ? 'border border-primary/30' : ''}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full shadow-gold whitespace-nowrap">
                    <span className="text-[10px] font-bold text-primary-foreground">{tier.badge}</span>
                  </div>
                )}
                
                <CardHeader className="pb-8 pt-10 px-6">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    {('period' in tier) && <span className="text-lg text-muted-foreground">{(tier as any).period}</span>}
                  </div>
                  {('savings' in tier) && (
                    <p className="text-[10px] text-primary font-semibold mt-2 opacity-80">{(tier as any).savings}</p>
                  )}
                  <CardDescription className="text-sm mt-3">{tier.subtext}</CardDescription>
                  <p className="text-[11px] text-primary/70 mt-1.5 font-medium opacity-70">{tier.costPerLead}</p>
                  <p className="text-sm text-muted-foreground mt-4 min-h-[40px]">{tier.description}</p>
                </CardHeader>

                <CardContent className="flex-grow px-6">
                  <ul className="space-y-4" style={{ lineHeight: '1.8' }}>
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                        <span className="text-[13px] text-foreground leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-8 px-6 pb-6">
                  <Button 
                    className={`w-full transition-all duration-300 ${
                      tier.featured || tier.enterprise
                        ? 'bg-primary text-primary-foreground shadow-gold hover:opacity-90 hover:shadow-gold-glow'
                        : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-gold'
                    }`}
                    size="lg"
                    onClick={() => document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    {tier.cta}
                  </Button>
                </CardFooter>
              </Card>
            </GlowingCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
