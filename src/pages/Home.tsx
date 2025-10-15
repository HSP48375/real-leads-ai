import Navigation from "@/components/flowvia/Navigation";
import Hero from "@/components/flowvia/Hero";
import TrustedBySection from "@/components/flowvia/TrustedBySection";
import FeaturesSection from "@/components/flowvia/FeaturesSection";
import IntegrationsSection from "@/components/flowvia/IntegrationsSection";
import PricingSection from "@/components/flowvia/PricingSection";
import CTASection from "@/components/flowvia/CTASection";
import Footer from "@/components/flowvia/Footer";

const Home = () => {
  return (
    <div className="min-h-screen relative">
      <Navigation />
      <Hero />
      <TrustedBySection />
      <FeaturesSection />
      <IntegrationsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Home;
