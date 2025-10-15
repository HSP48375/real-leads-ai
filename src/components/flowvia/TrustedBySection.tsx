import { motion } from "framer-motion";

const TrustedBySection = () => {
  // Logo placeholders - In production, these would be actual company logos
  const companies = Array(6).fill(null);

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Trusted by Companies
          </p>
        </motion.div>

        {/* Scrolling Logos */}
        <div className="relative">
          <div className="flex gap-12 animate-marquee">
            {[...companies, ...companies].map((_, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-32 h-16 backdrop-blur-glass bg-card/30 border border-white/5 rounded-lg flex items-center justify-center"
              >
                <div className="w-20 h-8 bg-gradient-primary opacity-30 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustedBySection;
