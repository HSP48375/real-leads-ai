import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Radial accent overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(43,74%,66%,0.15),transparent_50%)]"></div>
      
      <div className="container relative z-10 px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/40 backdrop-blur-glass border border-primary/30 shadow-gold">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow"></div>
            <span className="text-xs font-medium text-foreground uppercase tracking-wider">
              Trusted by 500+ Real Estate Professionals
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Fresh Real Estate Leads.
            <br />
            <span className="bg-gradient-gold bg-clip-text text-transparent">
              Geo-Verified. Scam-Free.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            No cold lists. No recycled data. Real homeowners, verified and ready within 24 hours.
          </p>

          {/* Value props */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>Real people. Real listings.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>Verified within 24 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span>No recycled data</span>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Button 
              size="lg" 
              className="bg-gradient-gold hover:opacity-90 hover:shadow-gold-glow text-primary-foreground font-semibold px-8 py-6 text-lg shadow-gold transition-all duration-300 group relative overflow-hidden"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="relative z-10">Get Verified Leads</span>
              <ArrowRight className="ml-2 relative z-10 group-hover:translate-x-1 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
