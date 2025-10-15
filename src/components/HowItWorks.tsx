import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";

const steps = [
  {
    number: 1,
    emoji: "📍",
    title: "Choose Your City",
    description: "Select your target market and how many leads you need. We cover any city nationwide.",
  },
  {
    number: 2,
    emoji: "🔍",
    title: "We Scrape & Verify",
    description: "Our system finds active FSBO sellers across multiple platforms and verifies all contact information.",
  },
  {
    number: 3,
    emoji: "✅",
    title: "Delivered in 24 Hours",
    description: "Receive a clean Google Sheet with verified names, phone numbers, addresses, and property details.",
  },
  {
    number: 4,
    emoji: "🏆",
    title: "Start Closing Deals",
    description: "Reach homeowners before your competition. Real leads, real conversations, real commissions.",
  },
];

const HowItWorks = () => {
  const [hoveredRibbon, setHoveredRibbon] = useState<number | null>(null);

  return (
    <section className="py-20 md:py-32 relative bg-background overflow-hidden">
      <div className="container px-4">
        {/* Header */}
        <div className="text-center mb-32">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            How It Works
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            From order to inbox in 24 hours. No complexity, no waiting.
          </p>
        </div>

        {/* Steps with Arrow Ribbons */}
        <div className="relative max-w-6xl mx-auto min-h-[2000px]">
          {/* SVG Arrow Ribbons - Desktop Only */}
          <svg
            className="absolute inset-0 w-full h-full hidden md:block"
            style={{ zIndex: 1 }}
            viewBox="0 0 1000 2000"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Glow filter */}
              <filter id="ribbon-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Main flowing ribbon path */}
            <motion.path
              d="M 700 150 Q 400 250, 150 400 Q 50 500, 150 600 Q 500 750, 700 900 Q 800 1000, 700 1100 Q 400 1250, 150 1400 Q 50 1500, 150 1600"
              stroke={hoveredRibbon !== null ? "#FFD700" : "#8B7500"}
              strokeWidth="60"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300 cursor-pointer"
              style={{
                filter: hoveredRibbon !== null ? "url(#ribbon-glow) drop-shadow(0 0 25px rgba(255, 215, 0, 0.7))" : "none",
              }}
              onMouseEnter={() => setHoveredRibbon(0)}
              onMouseLeave={() => setHoveredRibbon(null)}
            />

            {/* Yellow border/outline */}
            <path
              d="M 700 150 Q 400 250, 150 400 Q 50 500, 150 600 Q 500 750, 700 900 Q 800 1000, 700 1100 Q 400 1250, 150 1400 Q 50 1500, 150 1600"
              stroke="#FFD700"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: "none" }}
            />
          </svg>

          {/* Steps positioned along the path */}
          {steps.map((step, index) => {
            // Positions matching the SVG path coordinates
            const positions = [
              { left: "65%", top: "7%" },    // Step 1 - top right
              { left: "10%", top: "30%" },   // Step 2 - left
              { left: "65%", top: "55%" },   // Step 3 - right
              { left: "10%", top: "80%" },   // Step 4 - left bottom
            ];

            return (
              <motion.div
                key={step.number}
                className="absolute hidden md:block"
                style={{
                  left: positions[index].left,
                  top: positions[index].top,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                onMouseEnter={() => setHoveredRibbon(index)}
                onMouseLeave={() => setHoveredRibbon(null)}
              >
                {/* Step Number Badge ON the ribbon */}
                <div className="relative flex items-center gap-6">
                  <motion.div
                    className="w-24 h-24 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold relative"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-4xl font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </motion.div>

                  {/* Icon floating next to badge */}
                  <motion.div
                    className="text-[80px] leading-none"
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {step.emoji}
                  </motion.div>
                </div>

                {/* Content card */}
                <motion.div
                  className="mt-8 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-6 max-w-md shadow-lg"
                  whileHover={{ y: -5, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
                  transition={{ duration: 0.2 }}
                >
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}

          {/* Mobile simplified view */}
          <div className="md:hidden space-y-20">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold flex-shrink-0">
                    <span className="text-3xl font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </div>
                  <div className="text-[60px] leading-none">
                    {step.emoji}
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-32">
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Ready to get started?
          </p>
          <Button
            size="lg"
            className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-10 py-7 text-xl shadow-gold transition-all hover:shadow-xl"
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
