import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlowingCard from "@/components/GlowingCard";

const comparisonData = [
  {
    feature: "Delivery Speed",
    realtyLeadsAI: "Under 1 hour (most in 15-30 min)",
    traditional: "24-48 hours",
  },
  {
    feature: "Territory Targeting",
    realtyLeadsAI: "Custom radius search around your city",
    traditional: "Fixed zip codes only",
  },
  {
    feature: "Contact Information",
    realtyLeadsAI: "Direct phone numbers + emails included",
    traditional: "Property addresses only",
  },
  {
    feature: "Lead Freshness",
    realtyLeadsAI: "Scraped in real-time from active listings",
    traditional: "Recycled lists sold to multiple agents",
  },
  {
    feature: "Lead Verification",
    realtyLeadsAI: "FSBO-verified sellers only",
    traditional: "Mixed quality, agent-listed properties included",
  },
  {
    feature: "Pricing Model",
    realtyLeadsAI: "One-time payment, no subscription",
    traditional: "Recurring monthly fees",
  },
  {
    feature: "Data Format",
    realtyLeadsAI: "Organized Google Sheets + downloadable CSV",
    traditional: "Static PDFs",
  },
  {
    feature: "Territory Coverage",
    realtyLeadsAI: "Primary city + 50-mile radius + optional cities",
    traditional: "Single zip code",
  },
];

const ComparisonTable = () => {
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

        <div className="max-w-5xl mx-auto">
          {/* Desktop Table */}
          <div className="hidden md:block mb-12 relative">
            {/* Middle column glow wrapper */}
            <div className="absolute left-[calc(33.33%-12px)] top-0 bottom-0 w-[calc(33.33%+24px)] z-10 pointer-events-none">
              <GlowingCard className="h-full glow-always-on">
                <div className="h-full rounded-2xl"></div>
              </GlowingCard>
            </div>
            
            <div className="relative z-20 grid grid-cols-[1fr_1fr_1fr] gap-0 rounded-2xl border border-border bg-card overflow-hidden">
              {/* Table Header */}
              <div className="p-6 font-semibold text-sm uppercase tracking-wide text-muted-foreground border-b border-border bg-muted/30">
                Feature
              </div>
              <div className="p-6 font-bold text-lg uppercase tracking-wide text-center text-primary border-b border-border border-x border-border bg-muted/30 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative z-10 scale-[1.02]">
                RealtyLeadsAI
              </div>
              <div className="p-6 font-semibold text-sm uppercase tracking-wide text-center text-muted-foreground border-b border-border bg-muted/30">
                Traditional Services
              </div>

              {/* Table Rows */}
              {comparisonData.map((row, index) => (
                <>
                  <div
                    key={`${row.feature}-left`}
                    className={`p-6 font-medium text-foreground ${
                      index !== comparisonData.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    {row.feature}
                  </div>
                  <div
                    key={`${row.feature}-middle`}
                    className={`p-6 border-x border-border shadow-[0_0_20px_rgba(0,0,0,0.5)] relative z-10 scale-[1.02] ${
                      index !== comparisonData.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed font-medium">
                        {row.realtyLeadsAI}
                      </span>
                    </div>
                  </div>
                  <div
                    key={`${row.feature}-right`}
                    className={`p-6 ${
                      index !== comparisonData.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        {row.traditional}
                      </span>
                    </div>
                  </div>
                </>
              ))}
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4 mb-12">
            {comparisonData.map((row) => (
              <div
                key={row.feature}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="p-4 bg-muted/30 border-b border-border">
                  <h4 className="font-semibold text-sm">{row.feature}</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div className="rounded-xl p-3 border border-border">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-primary mb-1">
                          RealtyLeadsAI
                        </p>
                        <p className="text-sm font-medium">{row.realtyLeadsAI}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl p-3 bg-muted/20">
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Traditional Services
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {row.traditional}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <Button
              onClick={scrollToPricing}
              size="lg"
              className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-8"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonTable;
