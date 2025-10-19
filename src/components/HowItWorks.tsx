import { Button } from "@/components/ui/button";
import { MapPin, Search, FileCheck, Trophy } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: MapPin,
    title: "Choose Your City",
    description: "Select your target market and how many leads you need. We cover any city nationwide.",
  },
  {
    number: 2,
    icon: Search,
    title: "We Scrape & Verify",
    description: "Our system finds active FSBO sellers across multiple platforms and verifies all contact information.",
  },
  {
    number: 3,
    icon: FileCheck,
    title: "Delivered in Under 1 Hour",
    description: "Receive a clean Google Sheet with verified names, phone numbers, addresses, and property details. Most orders completed in 15-30 minutes.",
  },
  {
    number: 4,
    icon: Trophy,
    title: "Start Closing Deals",
    description: "Reach homeowners before your competition. Real leads, real conversations, real commissions.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-24 relative bg-background">
      <div className="container px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            How It Works
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            From order to inbox in under 1 hour. Lightning-fast delivery, no complexity, no waiting.
          </p>
        </div>

        {/* Vertical Timeline */}
        <div className="relative max-w-3xl mx-auto">
          {/* Vertical yellow line */}
          <div className="absolute left-[30px] top-[30px] bottom-[30px] w-[3px] bg-primary hidden md:block" />

          {/* Steps */}
          <div className="space-y-24 md:space-y-32">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative flex items-start gap-8">
                  {/* Numbered dot on the line */}
                  <div className="flex-shrink-0 w-[60px] h-[60px] rounded-full bg-primary flex items-center justify-center shadow-gold relative z-10">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-2">
                    <div className="flex items-center gap-4 mb-3">
                      <Icon className="w-10 h-10 text-primary" strokeWidth={2} />
                      <h3 className="text-2xl font-bold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <p className="text-base md:text-lg text-muted-foreground mb-5">
            Ready to get started?
          </p>
          <Button
            size="lg"
            className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-8 py-5 text-base shadow-gold transition-all hover:shadow-xl"
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See Pricing
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
