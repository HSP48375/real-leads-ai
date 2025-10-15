import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";

const tiers = [
  {
    name: "Starter",
    price: "$97",
    leads: "15-25 leads",
    costPerLead: "$3.88–$6.47 per verified lead",
    description: "Perfect for testing the waters with verified FSBO leads.",
    features: [
      "15-25 verified leads",
      "Single city targeting",
      "Delivered within 24 hours",
      "Clean Google Sheet",
      "Email support"
    ]
  },
  {
    name: "Growth",
    price: "$197",
    leads: "25-35 leads",
    costPerLead: "$5.63–$7.88 per verified lead",
    description: "Great for small agencies and independent agents.",
    featured: true,
    features: [
      "25-35 verified leads",
      "Multiple city options",
      "Delivered within 24 hours",
      "Clean Google Sheet",
      "Priority email support",
      "Monthly updates available"
    ]
  },
  {
    name: "Pro",
    price: "$397",
    leads: "50-70 leads",
    costPerLead: "$5.67–$7.94 per verified lead",
    description: "Full city coverage, best for serious realtors and broker teams.",
    features: [
      "50-70 verified leads",
      "Unlimited city targeting",
      "Delivered within 12 hours",
      "Clean Google Sheet",
      "Priority support + phone",
      "Weekly updates available",
      "Dedicated account manager"
    ]
  }
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-20 relative">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Pricing That Makes
            <span className="bg-gradient-gold bg-clip-text text-transparent"> Sense</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            All plans include fresh, geo-verified leads with no recycled data. Real homeowners, verified and ready within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <GlowingCard key={tier.name}>
              <Card 
                className={`relative backdrop-blur-glass transition-all duration-500 hover:-translate-y-2 animate-fade-in border-transparent ${
                  tier.featured 
                    ? 'shadow-gold-glow scale-105 bg-card/60' 
                    : 'bg-card/40'
                }`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
              {tier.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-gold rounded-full shadow-gold">
                  <span className="text-sm font-semibold text-primary-foreground">Most Popular</span>
                </div>
              )}
              
              <CardHeader className="pb-8 pt-8">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                </div>
                <CardDescription className="text-base mt-2">{tier.leads}</CardDescription>
                <p className="text-xs text-primary/80 mt-1 font-medium">{tier.costPerLead}</p>
                <p className="text-sm text-muted-foreground mt-4">{tier.description}</p>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button 
                  className={`w-full transition-all duration-300 ${
                    tier.featured
                      ? 'bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 hover:shadow-[0_0_80px_hsl(43_74%_66%_/_0.6),0_0_40px_hsl(43_74%_66%_/_0.4)]'
                      : 'bg-secondary text-secondary-foreground hover:bg-gradient-gold hover:text-primary-foreground hover:shadow-gold-glow'
                  }`}
                  size="lg"
                  onClick={() => document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Get Started
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
