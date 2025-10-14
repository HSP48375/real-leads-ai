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
      
      {/* Content with relative positioning */}
      <div className="relative z-10">
        <Hero />
        <SectionParallax speed="slow">
          <Features />
        </SectionParallax>
        <SectionParallax speed="medium">
          <Pricing />
        </SectionParallax>
        <SectionParallax speed="static">
          <OrderForm />
        </SectionParallax>
        <SectionParallax speed="slow">
          <Testimonials />
        </SectionParallax>
        <SectionParallax speed="medium">
          <CTA />
        </SectionParallax>
        <Footer />
      </div>
    </div>
  );
};

export default Index;
