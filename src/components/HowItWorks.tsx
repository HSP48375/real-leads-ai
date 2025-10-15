import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    number: 1,
    emoji: "📍",
    title: "Choose Your City",
    description: "Select your target market and how many leads you need. We cover any city nationwide.",
    ribbonColor: "#FFD700", // Yellow
  },
  {
    number: 2,
    emoji: "🔍",
    title: "We Scrape & Verify",
    description: "Our system finds active FSBO sellers across multiple platforms and verifies all contact information.",
    ribbonColor: "#60A5FA", // Blue
  },
  {
    number: 3,
    emoji: "✅",
    title: "Delivered in 24 Hours",
    description: "Receive a clean Google Sheet with verified names, phone numbers, addresses, and property details.",
    ribbonColor: "#FFD700", // Yellow
  },
  {
    number: 4,
    emoji: "🏆",
    title: "Start Closing Deals",
    description: "Reach homeowners before your competition. Real leads, real conversations, real commissions.",
    ribbonColor: "#F87171", // Red
  },
];

const StepItem = ({ step, index }: { step: typeof steps[0]; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="relative">
      {/* Curved Ribbon Path */}
      <svg
        className="absolute -left-32 top-0 w-64 h-full overflow-visible pointer-events-none hidden md:block"
        style={{ zIndex: 0 }}
      >
        <motion.path
          d={
            index === 0
              ? "M 80 -100 Q 80 50, 80 100 Q 80 200, 50 300 Q 20 400, 80 500"
              : index === 1
              ? "M 80 0 Q 20 100, 80 200 Q 140 300, 80 400 Q 20 500, 80 600"
              : index === 2
              ? "M 80 0 Q 140 100, 80 200 Q 20 300, 80 400 Q 140 500, 80 600"
              : "M 80 0 Q 20 100, 80 200 Q 140 300, 80 400 Q 20 500, 80 600"
          }
          stroke={step.ribbonColor}
          strokeWidth="70"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        />
      </svg>

      {/* Step Number Badge */}
      <motion.div
        className="absolute -left-20 top-20 w-20 h-20 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold hidden md:flex"
        style={{ zIndex: 10 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <span className="text-3xl font-bold text-primary-foreground">
          {step.number}
        </span>
      </motion.div>

      {/* Content */}
      <motion.div
        className="flex items-start gap-8 md:gap-12 pl-8 md:pl-0"
        initial={{ opacity: 0, x: 20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6, delay: 1 }}
      >
        {/* Icon/Visual */}
        <div className="flex-shrink-0">
          <div className="text-[100px] md:text-[120px] leading-none">
            {step.emoji}
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 pt-4">
          <div className="md:hidden w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold mb-4">
            <span className="text-2xl font-bold text-primary-foreground">
              {step.number}
            </span>
          </div>
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {step.title}
          </h3>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const HowItWorks = () => {
  return (
    <section className="py-20 md:py-32 relative bg-background overflow-hidden">
      <div className="container px-4">
        {/* Header */}
        <div className="text-center mb-20 md:mb-32">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            How It Works
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            From order to inbox in 24 hours. No complexity, no waiting.
          </p>
        </div>

        {/* Steps with Curved Ribbons */}
        <div className="space-y-32 md:space-y-40 max-w-5xl mx-auto md:ml-40">
          {steps.map((step, index) => (
            <StepItem key={step.number} step={step} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-32 md:mt-40">
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
