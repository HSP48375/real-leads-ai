import { Button } from "@/components/ui/button";
import { MapPin, Search, CheckCircle, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    number: 1,
    icon: MapPin,
    title: "Choose Your City",
    description: "Select your target market and how many leads you need. We cover any city nationwide.",
    visualLeft: false,
  },
  {
    number: 2,
    icon: Search,
    title: "We Scrape & Verify",
    description: "Our system finds active FSBO sellers across multiple platforms and verifies all contact information.",
    visualLeft: true,
  },
  {
    number: 3,
    icon: CheckCircle,
    title: "Delivered in 24 Hours",
    description: "Receive a clean Google Sheet with verified names, phone numbers, addresses, and property details.",
    visualLeft: false,
  },
  {
    number: 4,
    icon: Trophy,
    title: "Start Closing Deals",
    description: "Reach homeowners before your competition. Real leads, real conversations, real commissions.",
    visualLeft: true,
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 md:py-32 relative bg-background">
      <div className="container px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16 md:mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From order to inbox in 24 hours. No complexity, no waiting.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-24 md:space-y-32 max-w-7xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className={`grid md:grid-cols-2 gap-8 md:gap-16 items-center ${
                step.visualLeft ? "md:grid-flow-dense" : ""
              }`}
            >
              {/* Content Side */}
              <motion.div
                initial={{ opacity: 0, x: step.visualLeft ? 30 : -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
                className={`space-y-6 ${step.visualLeft ? "md:col-start-2" : ""}`}
              >
                {/* Numbered Circle */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl md:text-3xl font-bold text-primary-foreground">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                    {step.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                  {step.description}
                </p>
              </motion.div>

              {/* Visual Side */}
              <motion.div
                initial={{ opacity: 0, x: step.visualLeft ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
                className={`flex justify-center ${step.visualLeft ? "md:col-start-1 md:row-start-1" : ""}`}
              >
                <div
                  className="relative w-full max-w-[350px] aspect-square rounded-2xl bg-background/30 border-2 border-primary flex items-center justify-center group transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.4)]"
                >
                  <div className="absolute inset-0 rounded-2xl bg-primary/5"></div>
                  <step.icon className="w-24 h-24 md:w-32 md:h-32 text-primary relative z-10 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="text-center mt-20 md:mt-32"
        >
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
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
