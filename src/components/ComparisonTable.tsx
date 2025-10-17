import { Check, X, Zap, MapPin, Phone, RefreshCw, CheckCircle, DollarSign, FileSpreadsheet, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

const comparisonData = [
  {
    feature: "Delivery Speed",
    icon: Zap,
    realtyLeadsAI: "Under 1 hour (most in 15-30 min)",
    traditional: "24-48 hours",
    realtyHas: true,
  },
  {
    feature: "Territory Targeting",
    icon: MapPin,
    realtyLeadsAI: "Custom radius search around your city",
    traditional: "Fixed zip codes only",
    realtyHas: true,
  },
  {
    feature: "Contact Information",
    icon: Phone,
    realtyLeadsAI: "Direct phone numbers + emails included",
    traditional: "Property addresses only",
    realtyHas: true,
  },
  {
    feature: "Lead Freshness",
    icon: RefreshCw,
    realtyLeadsAI: "Scraped in real-time from active listings",
    traditional: "Recycled lists sold to multiple agents",
    realtyHas: true,
  },
  {
    feature: "Lead Verification",
    icon: CheckCircle,
    realtyLeadsAI: "FSBO-verified sellers only",
    traditional: "Mixed quality, agent-listed properties included",
    realtyHas: true,
  },
  {
    feature: "Pricing Model",
    icon: DollarSign,
    realtyLeadsAI: "One-time payment, no subscription",
    traditional: "Recurring monthly fees",
    realtyHas: true,
  },
  {
    feature: "Data Format",
    icon: FileSpreadsheet,
    realtyLeadsAI: "Organized Google Sheets + downloadable CSV",
    traditional: "Static PDFs",
    realtyHas: true,
  },
  {
    feature: "Territory Coverage",
    icon: Target,
    realtyLeadsAI: "Primary city + 50-mile radius + optional cities",
    traditional: "Single zip code",
    realtyHas: true,
  },
];

const ComparisonTable = () => {
  const [isVisible, setIsVisible] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (tableRef.current) {
      observer.observe(tableRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToPricing = () => {
    const pricingSection = document.getElementById("pricing");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="py-20 relative">
      <div className="container px-4">
        <p className="text-center text-sm uppercase tracking-[2px] text-muted-foreground mb-10">
          The difference is clear
        </p>

        <div ref={tableRef} className="max-w-7xl mx-auto">
          {/* Desktop Card Layout */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_1.4fr_1fr] gap-8 mb-16">
            {/* Features Column */}
            <div className="space-y-8">
              <div className="h-32" /> {/* Spacer for header alignment */}
              {comparisonData.map((row, index) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.feature}
                    className="flex items-start gap-4 py-8"
                    style={{
                      animation: isVisible
                        ? `fade-in 0.5s ease-out ${index * 0.1}s both`
                        : "none",
                    }}
                  >
                    <Icon className="w-6 h-6 text-primary/80 flex-shrink-0 mt-1" />
                    <p className="text-lg font-medium text-foreground">{row.feature}</p>
                  </div>
                );
              })}
            </div>

            {/* RealtyLeadsAI Card - Hero Treatment */}
            <div
              className="relative transform scale-105"
              style={{
                animation: isVisible ? "fade-in 0.6s ease-out, pulse-glow 3s ease-in-out infinite" : "none",
              }}
            >
              <div className="absolute inset-0 bg-gradient-gold rounded-2xl blur-xl opacity-30 animate-pulse-glow" />
              <div className="relative rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-background/95 to-primary/5 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Badge */}
                <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-sm border border-primary/30 px-4 py-1.5 rounded-full">
                  <span className="text-xs font-bold text-primary tracking-wider uppercase">Fastest</span>
                </div>
                
                {/* Header */}
                <div className="p-8 pb-6 text-center border-b border-primary/20">
                  <h3 className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                    RealtyLeadsAI
                  </h3>
                </div>

                {/* Values */}
                <div className="space-y-0">
                  {comparisonData.map((row, index) => (
                    <div
                      key={row.feature}
                      className="group p-8 border-b border-primary/10 hover:bg-gradient-gold/10 transition-all duration-300"
                      style={{
                        animation: isVisible
                          ? `fade-in 0.5s ease-out ${(index * 0.1) + 0.2}s both`
                          : "none",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <Check className="w-5 h-5 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        </div>
                        <p className="text-base font-medium text-foreground leading-relaxed">
                          {row.realtyLeadsAI}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Traditional Services Card - Muted */}
            <div
              style={{
                animation: isVisible ? "fade-in 0.6s ease-out 0.1s both" : "none",
              }}
            >
              <div className="rounded-2xl border border-border/30 bg-muted/30 backdrop-blur-sm shadow-lg overflow-hidden opacity-70">
                {/* Header */}
                <div className="p-8 pb-6 text-center border-b border-border/30">
                  <h3 className="text-xl font-medium text-muted-foreground">
                    Traditional Lead Services
                  </h3>
                </div>

                {/* Values */}
                <div className="space-y-0">
                  {comparisonData.map((row, index) => (
                    <div
                      key={row.feature}
                      className="group p-8 border-b border-border/20 hover:bg-muted/40 transition-colors duration-300"
                      style={{
                        animation: isVisible
                          ? `fade-in 0.5s ease-out ${(index * 0.1) + 0.3}s both`
                          : "none",
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-200">
                          <X className="w-5 h-5 text-destructive/70" />
                        </div>
                        <p className="text-base text-muted-foreground/70 leading-relaxed">
                          {row.traditional}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Stacked Cards */}
          <div className="lg:hidden space-y-6 mb-16">
            {comparisonData.map((row, index) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.feature}
                  className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden"
                  style={{
                    animation: isVisible
                      ? `fade-in 0.5s ease-out ${index * 0.1}s both`
                      : "none",
                  }}
                >
                  {/* Feature Header */}
                  <div className="p-5 bg-accent/20 border-b border-border/30 flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary/80" />
                    <h4 className="font-semibold text-base">{row.feature}</h4>
                  </div>
                  
                  {/* Comparison */}
                  <div className="p-5 space-y-4">
                    {/* RealtyLeadsAI */}
                    <div className="relative rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 p-4">
                      <div className="absolute top-2 right-2 bg-primary/20 px-2 py-0.5 rounded-full">
                        <span className="text-[10px] font-bold text-primary uppercase">Best</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-primary mb-1">RealtyLeadsAI</p>
                          <p className="text-sm font-medium leading-relaxed">{row.realtyLeadsAI}</p>
                        </div>
                      </div>
                    </div>

                    {/* Traditional */}
                    <div className="rounded-xl bg-muted/30 border border-border/30 p-4 opacity-70">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                          <X className="w-4 h-4 text-destructive/70" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-muted-foreground/70 mb-1">Traditional Services</p>
                          <p className="text-sm text-muted-foreground/70 leading-relaxed">{row.traditional}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Button
              onClick={scrollToPricing}
              size="lg"
              className="h-[60px] bg-gradient-gold hover:opacity-90 hover:scale-105 text-primary-foreground font-semibold px-12 text-lg transition-all duration-300 group relative overflow-hidden border-0 shadow-gold"
            >
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
