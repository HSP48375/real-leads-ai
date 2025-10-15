import Navigation from "@/components/flowvia/Navigation";
import Footer from "@/components/flowvia/Footer";
import PricingSection from "@/components/flowvia/PricingSection";
import { motion } from "framer-motion";

const Pricing = () => {
  return (
    <div className="min-h-screen relative">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-heading font-bold mb-6">
              Pricing
            </h1>
            <p className="text-lg text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur. Aliquam amet pharetra nec pulvinar. Viverra
              sit felis elit amet senectus scelerisque.
            </p>
          </motion.div>
        </div>
      </section>

      <PricingSection />

      <Footer />
    </div>
  );
};

export default Pricing;
