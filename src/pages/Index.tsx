import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import OrderForm from "@/components/OrderForm";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import GlobalParallax from "@/components/GlobalParallax";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      {/* Site-wide parallax background */}
      <GlobalParallax />
      
      {/* All content on same background - no section parallax */}
      <div className="relative z-10">
        <Hero />
        <Features />
        <Pricing />
        <OrderForm />
        <Testimonials />
        <CTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;