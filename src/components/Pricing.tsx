import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";

const allTiers = [
  {
    name: "Starter",
    price: "$97",
    subtext: "15-20 verified FSBO leads",
    features: [
      "Email support"
    ],
    cta: "GET STARTED"
  },
  {
    name: "Growth",
    price: "$197",
    subtext: "25-40 verified FSBO leads",
    featured: true,
    badge: "MOST POPULAR",
    features: [
      "Priority email support"
    ],
    cta: "GET STARTED"
  },
  {
    name: "Pro",
    price: "$397",
    subtext: "50-75 verified FSBO leads",
    features: [
      "Phone + email support"
    ],
    cta: "GET STARTED"
  },
  {
    name: "Enterprise",
    price: "$597",
    period: "/month",
    subtext: "80-120 verified FSBO leads per month",
    badge: "SUBSCRIPTION",
    features: [
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
          
          {/* Universal Features */}
          <div className="bg-card/80 backdrop-blur-glass border border-border rounded-2xl p-8 max-w-3xl mx-auto mb-16">
            <h3 className="text-xl font-bold mb-6">What's Included In Every Plan:</h3>
            <div className="grid md:grid-cols-2 gap-4 text-left">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <p className="font-semibold">Delivered in under 1 hour</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📍</span>
                <p className="font-semibold">Primary city + 50-mile radius</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📞</span>
                <p className="font-semibold">Direct seller phone numbers</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <p className="font-semibold">Google Sheets + CSV delivery</p>
              </div>
            </div>
          </div>
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
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-primary rounded-full shadow-gold whitespace-nowrap z-10">
                    <span className="text-[10px] font-bold text-primary-foreground">{tier.badge}</span>
                  </div>
                )}
                
                <CardHeader className="pb-8 pt-10 px-6">
                  <CardTitle className="text-xl min-h-[28px]">{tier.name}</CardTitle>
                  <div className="mt-4 min-h-[44px]">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    {('period' in tier) && <span className="text-lg text-muted-foreground">{(tier as any).period}</span>}
                  </div>
                  <CardDescription className="text-sm mt-3 min-h-[20px]">{tier.subtext}</CardDescription>
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
