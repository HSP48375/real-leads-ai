import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";
import GlowingCard from "@/components/GlowingCard";
import { useNavigate } from "react-router-dom";

const allTiers = [
  {
    name: "Starter",
    price: 97,
    monthly: 87,
    monthlySavings: 10,
    leads: "20-25",
    description: "Perfect for getting started",
    features: [
      "20-25 Verified FSBO Leads",
      "1 City Coverage",
      "Phone + Email + Address",
      "Delivered Within 24 Hours"
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
      "Up to 2 Cities",
      "Phone + Email + Address",
      "Delivered Within 24 Hours",
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
      "Up to 3 Cities",
      "Phone + Email + Address",
      "Delivered Within 12 Hours",
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
      "Unlimited Cities",
      "Phone + Email + Address",
      "Delivered Within 6 Hours",
      "Dedicated Account Manager"
    ],
    tierValue: "enterprise"
  }
];

const Pricing = () => {
  const navigate = useNavigate();
  const [billingType, setBillingType] = React.useState<'onetime' | 'monthly'>('onetime');

  const handleGetStarted = (tier: string, billing: 'onetime' | 'monthly', price: number, leads: string) => {
    navigate(`/order?tier=${tier}&billing=${billing}&price=${price}&leads=${leads}`);
  };

  return (
    <section id="pricing" className="py-20 relative">
      <div className="container px-4">
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Choose Your Plan
          </h2>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 p-1 bg-card/60 backdrop-blur-glass border border-primary/20 rounded-full shadow-lg">
            <button
              onClick={() => setBillingType('onetime')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                billingType === 'onetime'
                  ? 'bg-primary text-primary-foreground shadow-gold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              One-Time
            </button>
            <button
              onClick={() => setBillingType('monthly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                billingType === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-gold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mt-20">
          {allTiers.map((tier, index) => (
            <GlowingCard key={tier.name}>
              <Card 
                className={`relative backdrop-blur-glass transition-all duration-500 hover:-translate-y-2 animate-fade-in border-transparent bg-card/60 shadow-none h-full flex flex-col ${
                  tier.popular ? 'shadow-gold-glow lg:scale-105' : ''
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-primary rounded-full shadow-gold whitespace-nowrap z-10">
                    <span className="text-[10px] font-bold text-primary-foreground">MOST POPULAR</span>
                  </div>
                )}
                
                <CardHeader className="pb-8 pt-10 px-6">
                  <CardTitle className="text-xl min-h-[28px]">{tier.name}</CardTitle>
                  <div className="mt-4 min-h-[64px]">
                    {billingType === 'onetime' ? (
                      <>
                        <span className="text-3xl font-bold">${tier.price}</span>
                        <p className="text-sm text-muted-foreground mt-1">one-time</p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">${tier.monthly}</span>
                        <span className="text-xl text-muted-foreground">/month</span>
                        <p className="text-sm text-primary mt-1">Save ${tier.monthlySavings}/month</p>
                      </>
                    )}
                  </div>
                  <CardDescription className="text-sm mt-3 min-h-[20px]">{tier.description}</CardDescription>
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
                    className="w-full bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold shadow-gold transition-all hover:shadow-xl"
                    size="lg"
                    onClick={() => handleGetStarted(
                      tier.tierValue, 
                      billingType, 
                      billingType === 'onetime' ? tier.price : tier.monthly, 
                      tier.leads
                    )}
                  >
                    {billingType === 'onetime' 
                      ? `Get Started - $${tier.price}`
                      : tier.tierValue === 'enterprise' 
                        ? `Start Subscription - $${tier.monthly}/month`
                        : `Subscribe - $${tier.monthly}/month`
                    }
                    <ArrowRight className="ml-2 h-5 w-5" />
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
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                </div>
                
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
                
                <div className="flex-shrink-0">
                  <Button 
                    className="bg-primary text-primary-foreground shadow-gold hover:opacity-90 hover:shadow-gold-glow px-8"
                    size="lg"
                    onClick={() => handleGetStarted('enterprise', billingType, billingType === 'onetime' ? 697 : 627, '150-200')}
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