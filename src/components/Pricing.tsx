import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";

const allTiers = [
  {
    name: "Starter",
    price: "$97",
    subtext: "20-25 verified FSBO leads",
    costPerLead: "$3.88–$4.85 per verified lead",
    description: "Perfect for testing the waters with verified FSBO leads.",
    features: [
      "20-25 verified FSBO leads",
      "⚡ Delivered in under 1 hour",
      "Primary city + 50-mile radius",
      "Optional: Up to 5 additional cities",
      "Google Sheets + CSV delivery",
      "Email support"
    ],
    cta: "GET STARTED"
  },
  {
    name: "Growth",
    price: "$197",
    subtext: "40-60 verified FSBO leads",
    costPerLead: "$3.28–$4.93 per verified lead",
    description: "Great for small agencies and independent agents.",
    featured: true,
    badge: "MOST POPULAR",
    features: [
      "40-60 verified FSBO leads",
      "⚡ Delivered in under 1 hour",
      "Primary city + 50-mile radius",
      "Optional: Up to 5 additional cities",
      "Google Sheets + CSV delivery",
      "Priority email support"
    ],
    cta: "GET STARTED"
  },
  {
    name: "Pro",
    price: "$397",
    subtext: "80-100 verified FSBO leads",
    costPerLead: "$3.97–$4.96 per verified lead",
    description: "Full territory coverage, best for serious realtors and broker teams.",
    features: [
      "80-100 verified FSBO leads",
      "⚡ Delivered in under 1 hour",
      "Primary city + 50-mile radius",
      "Optional: Up to 5 additional cities",
      "Google Sheets + CSV delivery",
      "Phone + email support"
    ],
    cta: "GET STARTED"
  },
  {
    name: "Enterprise",
    price: "$597",
    period: "/month",
    savings: "Best value for high-volume agents",
    subtext: "120-150 verified FSBO leads per month",
    costPerLead: "$3.98–$4.98 per verified lead",
    description: "For high-volume agents and teams needing consistent lead flow.",
    badge: "SUBSCRIPTION",
    features: [
      "120-150 verified FSBO leads per month",
      "⚡ Delivered in under 1 hour",
      "Primary city + 50-mile radius",
      "Optional: Up to 5 additional cities",
      "Google Sheets + CSV delivery",
      "Dedicated account manager",
      "Priority support"
    ],
    cta: "START SUBSCRIPTION"
  }
];

const Pricing = () => {

  return (
    <section id="pricing" className="py-20 relative">
      <div className="container px-4">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Plan
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            All plans include fresh, geo-verified FSBO leads delivered in under 1 hour. Real homeowners, verified and ready—no recycled data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mt-12">
          {allTiers.map((tier, index) => (
            <GlowingCard key={tier.name}>
              <Card 
                className={`relative backdrop-blur-glass transition-all duration-500 hover:-translate-y-2 animate-fade-in border-transparent bg-card/60 shadow-none h-full flex flex-col ${
                  tier.featured ? 'shadow-gold-glow lg:scale-105' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {tier.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full shadow-gold whitespace-nowrap">
                    <span className="text-[10px] font-bold text-primary-foreground">{tier.badge}</span>
                  </div>
                )}
                
                <CardHeader className="pb-8 pt-10 px-6">
                  <CardTitle className="text-xl min-h-[28px]">{tier.name}</CardTitle>
                  <div className="mt-4 min-h-[44px]">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    {('period' in tier) && <span className="text-lg text-muted-foreground">{(tier as any).period}</span>}
                  </div>
                  {('savings' in tier) ? (
                    <p className="text-[10px] text-primary font-semibold mt-2 opacity-80 min-h-[16px]">{(tier as any).savings}</p>
                  ) : (
                    <div className="min-h-[16px] mt-2"></div>
                  )}
                  <CardDescription className="text-sm mt-3 min-h-[20px]">{tier.subtext}</CardDescription>
                  <div className="min-h-[14px] mt-1.5">
                    {tier.costPerLead && <p className="text-[9px] text-primary font-semibold">{tier.costPerLead}</p>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 min-h-[40px]">{tier.description}</p>
                </CardHeader>

                <CardContent className="flex-grow px-6">
                  <ul className="space-y-5" style={{ lineHeight: '2.0' }}>
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 min-h-[28px]">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                        <span className="text-[13px] text-foreground leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-8 px-6 pb-6">
                  <Button 
                    className={`w-full transition-all duration-300 ${
                      tier.featured
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

        {/* API Access Section */}
        <div className="mt-12 max-w-7xl mx-auto">
          <Card className="backdrop-blur-glass bg-card/80 border-2 border-primary/30 shadow-gold-glow">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-grow text-center lg:text-left">
                  <h3 className="text-2xl font-bold mb-2">Need API Access or Custom Integrations?</h3>
                  <p className="text-muted-foreground mb-4">
                    Direct API access to integrate with your CRM, build custom workflows, or white-label our service.
                  </p>
                  <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      Direct API
                    </span>
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      Webhooks
                    </span>
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      Custom endpoints
                    </span>
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      White-label
                    </span>
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      Technical support
                    </span>
                  </div>
                </div>
                
                {/* CTA Button */}
                <div className="flex-shrink-0">
                  <Button 
                    className="bg-primary text-primary-foreground shadow-gold hover:opacity-90 hover:shadow-gold-glow px-8"
                    size="lg"
                    onClick={() => document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Contact for API Access
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
