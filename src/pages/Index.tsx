import { useEffect } from "react";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import OrderForm from "@/components/OrderForm";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import "@/scrollParallax.js";

const Index = () => {

  return (
    <div className="min-h-screen relative">
      {/* All content */}
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