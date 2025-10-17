import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

const comparisonData = [
  {
    feature: "Delivery Speed",
    realtyLeadsAI: "Under 1 hour (most in 15-30 min)",
    traditional: "24-48 hours",
    realtyHas: true,
  },
  {
    feature: "Territory Targeting",
    realtyLeadsAI: "Custom radius search around your city",
    traditional: "Fixed zip codes only",
    realtyHas: true,
  },
  {
    feature: "Contact Information",
    realtyLeadsAI: "Direct phone numbers + emails included",
    traditional: "Property addresses only",
    realtyHas: true,
  },
  {
    feature: "Lead Freshness",
    realtyLeadsAI: "Scraped in real-time from active listings",
    traditional: "Recycled lists sold to multiple agents",
    realtyHas: true,
  },
  {
    feature: "Lead Verification",
    realtyLeadsAI: "FSBO-verified sellers only",
    traditional: "Mixed quality, agent-listed properties included",
    realtyHas: true,
  },
  {
    feature: "Pricing Model",
    realtyLeadsAI: "One-time payment, no subscription",
    traditional: "Recurring monthly fees",
    realtyHas: true,
  },
  {
    feature: "Data Format",
    realtyLeadsAI: "Organized Google Sheets + downloadable CSV",
    traditional: "Static PDFs",
    realtyHas: true,
  },
  {
    feature: "Territory Coverage",
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
        <p className="text-center text-sm text-muted-foreground mb-8">
          The difference is clear
        </p>

        <div ref={tableRef} className="max-w-6xl mx-auto">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
            <div className="grid grid-cols-3">
              {/* Header */}
              <div className="p-6 border-b border-border/50">
                <h3 className="text-lg font-semibold text-muted-foreground">Feature</h3>
              </div>
              <div className="p-6 border-b border-l border-border/50 bg-gradient-gold/10 backdrop-blur-md">
                <h3 className="text-lg font-bold text-primary">RealtyLeadsAI</h3>
              </div>
              <div className="p-6 border-b border-l border-border/50 bg-muted/30">
                <h3 className="text-lg font-medium text-muted-foreground/70">Traditional Lead Services</h3>
              </div>

              {/* Rows */}
              {comparisonData.map((row, index) => (
                <div
                  key={row.feature}
                  className="contents group"
                  style={{
                    animation: isVisible
                      ? `fade-in 0.5s ease-out ${index * 0.1}s both`
                      : "none",
                  }}
                >
                  <div className="p-6 border-b border-border/50 group-hover:bg-accent/30 transition-colors duration-200">
                    <p className="text-base font-medium">{row.feature}</p>
                  </div>
                  <div className="p-6 border-b border-l border-border/50 bg-gradient-gold/5 group-hover:bg-gradient-gold/15 transition-all duration-200 group-hover:shadow-gold/20 group-hover:shadow-lg">
                    <div className="flex items-start gap-3">
                      <Check className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110" />
                      <p className="text-base font-medium">{row.realtyLeadsAI}</p>
                    </div>
                  </div>
                  <div className="p-6 border-b border-l border-border/50 bg-muted/20 group-hover:bg-muted/30 transition-colors duration-200">
                    <div className="flex items-start gap-3">
                      <X className="w-6 h-6 text-destructive/70 flex-shrink-0 mt-0.5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-12" />
                      <p className="text-base text-muted-foreground/70">{row.traditional}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {comparisonData.map((row, index) => (
              <div
                key={row.feature}
                className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden"
                style={{
                  animation: isVisible
                    ? `fade-in 0.5s ease-out ${index * 0.1}s both`
                    : "none",
                }}
              >
                <div className="p-4 bg-accent/30">
                  <h4 className="font-semibold text-base">{row.feature}</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-gold/10">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-primary mb-1">RealtyLeadsAI</p>
                      <p className="text-sm font-medium">{row.realtyLeadsAI}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                    <X className="w-5 h-5 text-destructive/70 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground/70 mb-1">Traditional Services</p>
                      <p className="text-sm text-muted-foreground/70">{row.traditional}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Button
              onClick={scrollToPricing}
              size="lg"
              className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-8 py-6 text-lg transition-all duration-300 group relative overflow-hidden border-0 shadow-gold"
            >
              <span className="relative z-10">See it in action</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
