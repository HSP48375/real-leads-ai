import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const PricingSection = () => {
  const plans = [
    {
      name: "Starter",
      price: "$0",
      period: "month",
      description: "Affordable Basic package, packed with essential features.",
      features: [
        "Access to core AI features",
        "3 team members",
        "Email support",
      ],
      featured: false,
    },
    {
      name: "Premium",
      price: "$15",
      period: "month",
      description: "Affordable Basic package, packed with essential features.",
      features: [
        "Access to core AI features",
        "3 team members",
        "Email support",
      ],
      featured: true,
    },
    {
      name: "Teams",
      price: "$150",
      period: "month",
      description: "Affordable Basic package, packed with essential features.",
      features: [
        "Access to core AI features",
        "3 team members",
        "Email support",
      ],
      featured: false,
    },
  ];

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-6">
            The Best Pricing Plans
          </h2>
          <p className="text-lg text-muted-foreground">
            Lorem ipsum dolor sit amet consectetur. Praesent fames in consequat faucibus.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-sm font-medium text-white">
                  Most Popular
                </div>
              )}
              <div
                className={`backdrop-blur-xl border-2 rounded-3xl p-8 h-full flex flex-col ${
                  plan.featured
                    ? "bg-card/60 border-primary/50 shadow-card"
                    : "bg-card/40 border-primary/20"
                }`}
              >
                <h3 className="text-2xl font-heading font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-5xl font-heading font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>

                <Button
                  className={`w-full mb-8 ${
                    plan.featured
                      ? "bg-gradient-primary hover:shadow-glow"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                  asChild
                >
                  <Link to="/contact">Get Started Now</Link>
                </Button>

                <ul className="space-y-4 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
