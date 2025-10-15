import ScrollParallaxHero from "@/components/ScrollParallaxHero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import OrderForm from "@/components/OrderForm";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      <ScrollParallaxHero />
      
      {/* All content */}
      <div className="relative z-10">
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