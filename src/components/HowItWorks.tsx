import { Button } from "@/components/ui/button";

const steps = [
  {
    number: 1,
    emoji: "📍",
    title: "Choose Your City",
    description: "Select your target market and how many leads you need. We cover any city nationwide.",
    iconLeft: false,
  },
  {
    number: 2,
    emoji: "🔍",
    title: "We Scrape & Verify",
    description: "Our system finds active FSBO sellers across multiple platforms and verifies all contact information.",
    iconLeft: true,
  },
  {
    number: 3,
    emoji: "✅",
    title: "Delivered in 24 Hours",
    description: "Receive a clean Google Sheet with verified names, phone numbers, addresses, and property details.",
    iconLeft: false,
  },
  {
    number: 4,
    emoji: "🏆",
    title: "Start Closing Deals",
    description: "Reach homeowners before your competition. Real leads, real conversations, real commissions.",
    iconLeft: true,
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 md:py-32 relative bg-background">
      <div className="container px-4">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From order to inbox in 24 hours. No complexity, no waiting.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-20 md:space-y-24 max-w-6xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`grid md:grid-cols-2 gap-12 md:gap-16 items-center ${
                step.iconLeft ? "md:grid-flow-dense" : ""
              }`}
            >
              {/* Text Side */}
              <div className={`space-y-6 ${step.iconLeft ? "md:col-start-2" : ""}`}>
                {/* Numbered Circle */}
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-6">
                  <span className="text-3xl font-bold text-primary-foreground">
                    {step.number}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-3xl font-bold text-foreground">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Icon Side */}
              <div
                className={`flex justify-center ${
                  step.iconLeft ? "md:col-start-1 md:row-start-1" : ""
                }`}
              >
                <div className="text-[120px] leading-none">
                  {step.emoji}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20 md:mt-24">
          <p className="text-lg md:text-xl text-muted-foreground mb-6">
            Ready to get started?
          </p>
          <Button
            size="lg"
            className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-8 py-6 text-lg shadow-gold transition-all hover:shadow-xl"
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
