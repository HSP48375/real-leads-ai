import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import OrderForm from "@/components/OrderForm";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import ScrollingText from "@/components/ScrollingText";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      <Navigation />
      <Hero />
      
      {/* Scrolling text separator */}
      <div className="py-8 border-y border-white/10">
        <ScrollingText text="REAL ESTATE LEADS" />
      </div>

      {/* All content */}
      <div id="features" className="relative z-10">
        <Features />
      </div>

      {/* Scrolling text separator */}
      <div className="py-8 border-y border-white/10">
        <ScrollingText text="VERIFIED • FRESH • TARGETED" />
      </div>

      <div id="pricing" className="relative z-10">
        <Pricing />
        <OrderForm />
      </div>

      <div id="testimonials" className="relative z-10">
        <Testimonials />
        <CTA />
        <Footer />
      </div>
    </div>
  );
};

export default Index;