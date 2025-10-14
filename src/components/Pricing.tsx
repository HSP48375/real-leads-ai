import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "$99",
    leads: "15-25 leads",
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
    price: "$199",
    leads: "40-60 leads",
    description: "Great for small agencies and independent agents.",
    featured: true,
    features: [
      "40-60 verified leads",
      "Multiple city options",
      "Delivered within 24 hours",
      "Clean Google Sheet",
      "Priority email support",
      "Monthly updates available"
    ]
  },
  {
    name: "Pro",
    price: "$399",
    leads: "100-150 leads",
    description: "Full city coverage, best for serious realtors and broker teams.",
    features: [
      "100-150 verified leads",
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
    <section id="pricing" className="py-20 bg-background">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Pricing That Makes
            <span className="bg-gradient-gold bg-clip-text text-transparent"> Sense</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            All plans include fresh, geo-verified leads with no recycled data. Choose what fits your business.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <Card 
              key={tier.name}
              className={`relative ${
                tier.featured 
                  ? 'border-primary shadow-gold scale-105' 
                  : 'border-border'
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-gold rounded-full">
                  <span className="text-sm font-semibold text-primary-foreground">Most Popular</span>
                </div>
              )}
              
              <CardHeader className="pb-8 pt-8">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                </div>
                <CardDescription className="text-base mt-2">{tier.leads}</CardDescription>
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
                  className={`w-full ${
                    tier.featured
                      ? 'bg-gradient-gold hover:opacity-90 text-primary-foreground shadow-gold'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                  size="lg"
                >
                  Get Started
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
