import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

const steps = [
  {
    number: 1,
    title: "Choose Your City",
    description: "Select your target market and how many leads you need. We cover any city nationwide.",
  },
  {
    number: 2,
    title: "We Scrape & Verify",
    description: "Our system finds active FSBO sellers across multiple platforms and verifies all contact information.",
  },
  {
    number: 3,
    title: "Delivered in 24 Hours",
    description: "Receive a clean Google Sheet with verified names, phone numbers, addresses, and property details.",
  },
  {
    number: 4,
    title: "Start Closing Deals",
    description: "Reach homeowners before your competition. Real leads, real conversations, real commissions.",
  },
];

const HowItWorks = () => {
  const [hoveredRibbon, setHoveredRibbon] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-24 relative bg-background overflow-hidden">
      <div className="container px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            How It Works
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            From order to inbox in 24 hours. No complexity, no waiting.
          </p>
        </div>

        {/* Steps with Arrow Ribbons */}
        <div className="relative max-w-5xl mx-auto min-h-[500px]">{/* Changed from 1100px to 500px */}
          {/* SVG Arrow Ribbons - Desktop Only */}
          <svg
            className="absolute inset-0 w-full h-full hidden md:block"
            style={{ zIndex: 1 }}
            viewBox="0 0 1000 500"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Glow filter matching pricing cards */}
              <filter id="ribbon-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur"/>
                <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 0.84 0 0 0  0 0 0 0 0  0 0 0 0.6 0" result="glow"/>
                <feMerge>
                  <feMergeNode in="glow"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Single yellow ribbon - no double line */}
            <motion.path
              d="M 200 50 Q 600 70, 850 150 Q 950 190, 850 230 Q 500 330, 150 400 Q 200 440, 500 470"
              stroke="#FFD700"
              strokeWidth="20"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300 cursor-pointer"
              style={{
                filter: hoveredRibbon !== null ? "url(#ribbon-glow) drop-shadow(0 0 40px rgba(255, 215, 0, 0.8)) drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))" : "none",
              }}
              onMouseEnter={() => setHoveredRibbon(0)}
              onMouseLeave={() => setHoveredRibbon(null)}
            />
          </svg>

          {/* Steps positioned along the path */}
          {steps.map((step, index) => {
            // Positions matching the condensed SVG ribbon path
            const positions = [
              { left: "20%", top: "10%" },   // Step 1
              { left: "85%", top: "30%" },   // Step 2
              { left: "15%", top: "70%" },   // Step 3
              { left: "50%", top: "92%" },   // Step 4 - moved more to the right
            ];

            return (
              <motion.div
                key={step.number}
                className="absolute hidden md:block"
                style={{
                  left: positions[index].left,
                  top: positions[index].top,
                  transform: "translateX(-50%)",
                  zIndex: 10,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                onMouseEnter={() => setHoveredRibbon(index)}
                onMouseLeave={() => setHoveredRibbon(null)}
              >
                <div className="flex flex-col items-center text-center max-w-xs">
                  {/* Step Number Badge ON the ribbon */}
                  <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold relative flex-shrink-0 mb-3"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-2xl font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </motion.div>

                  {/* Description directly under number - center aligned */}
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Mobile simplified view */}
          <div className="md:hidden space-y-8">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold flex-shrink-0">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
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
