import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import OrderForm from "@/components/OrderForm";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import SectionParallax from "@/components/SectionParallax";
import GlobalParallax from "@/components/GlobalParallax";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      {/* Site-wide parallax background */}
      <GlobalParallax />
      
      {/* Content with alternating parallax speeds */}
      <div className="relative z-10">
        <SectionParallax speed="slow">
          <Hero />
        </SectionParallax>
        
        <SectionParallax speed="medium">
          <Features />
        </SectionParallax>
        
        <SectionParallax speed="fast">
          <Pricing />
        </SectionParallax>
        
        <SectionParallax speed="static">
          <OrderForm />
        </SectionParallax>
        
        <SectionParallax speed="rest">
          <Testimonials />
        </SectionParallax>
        
        <SectionParallax speed="medium">
          <CTA />
        </SectionParallax>
        
        <SectionParallax speed="static">
          <Footer />
        </SectionParallax>
      </div>
    </div>
  );
};

export default Index;
