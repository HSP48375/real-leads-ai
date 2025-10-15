import { Button } from "@/components/ui/button";
import { MapPin, Search, CheckCircle, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import SectionParallax from "./SectionParallax";
import MicroParallax from "./MicroParallax";

const steps = [
  {
    number: 1,
    icon: MapPin,
    title: "Choose Your City",
    description: "Select your target market and how many leads you need.",
  },
  {
    number: 2,
    icon: Search,
    title: "We Scrape & Verify",
    description: "Our system finds active FSBO sellers and verifies all contact info.",
  },
  {
    number: 3,
    icon: CheckCircle,
    title: "Delivered in 24 Hours",
    description: "Clean Google Sheet with verified names, phone numbers, and addresses.",
  },
  {
    number: 4,
    icon: Trophy,
    title: "Start Closing Deals",
    description: "Reach homeowners before your competition. Real leads, real results.",
  },
];

const HowItWorks = () => {
  return (
    <SectionParallax speed="medium">
      <section className="py-20 md:py-32 relative bg-background/50">
        <div className="container px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-24"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From order to inbox in 24 hours. No complexity, no waiting.
            </p>
          </motion.div>

          {/* Timeline - Desktop */}
          <div className="hidden md:block relative max-w-6xl mx-auto mb-16">
            {/* Curved connecting line with glow */}
            <svg
              className="absolute top-[60px] left-0 w-full h-[120px] -z-10"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <motion.path
                d="M 80 60 Q 400 20, 720 60 T 1360 60"
                stroke="url(#lineGradient)"
                strokeWidth="4"
                fill="none"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </svg>

            {/* Steps */}
            <div className="grid grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <MicroParallax key={step.number} offset={20}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    className="flex flex-col items-center text-center group"
                  >
                    {/* Numbered Circle */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="relative w-28 h-28 rounded-full bg-background border-4 border-primary flex items-center justify-center mb-6 shadow-lg hover:shadow-primary/50 transition-all duration-300"
                      style={{
                        boxShadow: "0 0 20px hsl(var(--primary) / 0.3)",
                      }}
                    >
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"></div>
                      <step.icon className="w-10 h-10 text-primary relative z-10" />
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg border-4 border-background">
                        {step.number}
                      </div>
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </motion.div>
                </MicroParallax>
              ))}
            </div>
          </div>

          {/* Timeline - Mobile */}
          <div className="md:hidden relative max-w-md mx-auto mb-16">
            {/* Vertical connecting line */}
            <div className="absolute left-[56px] top-[60px] bottom-[60px] w-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 shadow-lg" 
              style={{
                boxShadow: "0 0 10px hsl(var(--primary) / 0.5)",
              }}
            ></div>

            {/* Steps */}
            <div className="space-y-12">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                  className="flex gap-6"
                >
                  {/* Numbered Circle */}
                  <div className="flex-shrink-0">
                    <div
                      className="relative w-28 h-28 rounded-full bg-background border-4 border-primary flex items-center justify-center shadow-lg"
                      style={{
                        boxShadow: "0 0 20px hsl(var(--primary) / 0.3)",
                      }}
                    >
                      <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse"></div>
                      <step.icon className="w-10 h-10 text-primary relative z-10" />
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg border-4 border-background">
                        {step.number}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-6">
                    <h3 className="text-xl font-bold mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <p className="text-lg text-muted-foreground mb-6">
              Ready to get started?
            </p>
            <Button
              size="lg"
              className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-8 py-6 text-lg shadow-gold transition-all hover:shadow-xl"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See Pricing
            </Button>
          </motion.div>
        </div>
      </section>
    </SectionParallax>
  );
};

export default HowItWorks;
