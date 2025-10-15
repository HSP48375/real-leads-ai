import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import MicroParallax from "./MicroParallax";
import ScrollingText from "./ScrollingText";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-20">
      {/* Radial green glow overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(68,100%,70%,0.15),transparent_70%)] pointer-events-none"></div>
      
      <div className="container relative z-10 px-4 py-20 text-center flex-1 flex items-center">
        <div className="max-w-5xl mx-auto space-y-8 w-full">
          {/* Badge with micro-parallax */}
          <MicroParallax offset={20}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-primary/40 shadow-lime">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow"></div>
              <span className="text-xs font-medium text-white uppercase tracking-wider">
                Trusted by thousands of realtors nationwide
              </span>
            </div>
          </MicroParallax>

          {/* Main heading */}
          <h1 className="font-black leading-[0.9] tracking-tighter">
            <span className="block text-7xl md:text-[10rem] lg:text-[14rem] text-white uppercase">
              REAL LEADS
            </span>
            <span className="block text-4xl md:text-6xl lg:text-7xl text-white uppercase mt-4">
              You Can Rely On
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-medium">
            Stop chasing bad leads. Start connecting with real homeowners — fast.
          </p>

          {/* Value props */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-white/80 pt-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="font-medium">Real People</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="font-medium">Real Listings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="font-medium">Sent in under 24 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="font-medium">No recycled data</span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-8">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-7 text-lg shadow-lime-glow transition-all duration-300 group relative overflow-hidden uppercase tracking-wide"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="relative z-10">Get Verified Leads</span>
              <ArrowRight className="ml-2 relative z-10 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* Scrolling text marquee */}
      <div className="w-full py-6 border-t border-white/10">
        <ScrollingText text="REALTYLEADSAI" />
      </div>
    </section>
  );
};

export default Hero;
