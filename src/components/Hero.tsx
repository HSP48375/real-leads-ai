import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-dark"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(43,74%,66%,0.1),transparent_50%)]"></div>
      
      <div className="container relative z-10 px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
            No cold lists. No spam. Just fresh, real homeowners ready to sell—verified within 24 hours.
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
              className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-8 py-6 text-lg shadow-gold transition-all hover:shadow-xl group"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Get Verified Leads
              <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
