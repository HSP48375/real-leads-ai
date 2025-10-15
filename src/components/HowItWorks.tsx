import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

// Custom SVG Animations
const MapPinAnimation = () => (
  <svg width="280" height="280" viewBox="0 0 280 280" className="animate-fade-in">
    {/* Map dots */}
    <circle cx="80" cy="120" r="4" fill="#FFD700" opacity="0.3" />
    <circle cx="140" cy="100" r="4" fill="#FFD700" opacity="0.3" />
    <circle cx="200" cy="130" r="4" fill="#FFD700" opacity="0.3" />
    <circle cx="110" cy="160" r="4" fill="#FFD700" opacity="0.3" />
    <circle cx="170" cy="170" r="4" fill="#FFD700" opacity="0.3" />
    
    {/* Pin with bounce animation */}
    <g className="animate-[bounce_3s_ease-in-out_infinite]">
      <path
        d="M140 80 L140 140 L150 160 L140 140 L130 160 L140 140 Z"
        fill="#FFD700"
      />
      <circle cx="140" cy="80" r="20" fill="#FFD700" />
      <circle cx="140" cy="80" r="10" fill="#1a1a1a" />
    </g>
    
    {/* Pulse rings */}
    <circle cx="140" cy="160" r="30" fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.6" className="animate-[ping_3s_ease-out_infinite]" />
    <circle cx="140" cy="160" r="40" fill="none" stroke="#FFD700" strokeWidth="2" opacity="0.3" className="animate-[ping_3s_ease-out_infinite_0.5s]" style={{ animationDelay: '0.5s' }} />
  </svg>
);

const ScanAnimation = () => (
  <svg width="280" height="280" viewBox="0 0 280 280" className="animate-fade-in">
    {/* Documents */}
    <rect x="60" y="100" width="40" height="50" rx="4" fill="rgba(255,215,0,0.1)" stroke="#FFD700" strokeWidth="2" />
    <rect x="120" y="100" width="40" height="50" rx="4" fill="rgba(255,215,0,0.1)" stroke="#FFD700" strokeWidth="2" />
    <rect x="180" y="100" width="40" height="50" rx="4" fill="rgba(255,215,0,0.1)" stroke="#FFD700" strokeWidth="2" />
    
    {/* Magnifying glass with movement */}
    <g className="animate-[scan_3s_ease-in-out_infinite]">
      <circle cx="140" cy="80" r="20" fill="none" stroke="#FFD700" strokeWidth="3" />
      <line x1="155" y1="95" x2="170" y2="110" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />
    </g>
    
    {/* Checkmarks */}
    <g className="animate-[checkmark_3s_ease-in-out_infinite]">
      <path d="M 70 170 L 80 180 L 100 160" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 130 170 L 140 180 L 160 160" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 190 170 L 200 180 L 220 160" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

const SpreadsheetAnimation = () => (
  <svg width="280" height="280" viewBox="0 0 280 280" className="animate-fade-in">
    {/* Grid outline */}
    <rect x="80" y="80" width="120" height="120" fill="rgba(255,215,0,0.05)" stroke="#FFD700" strokeWidth="2" rx="4" />
    
    {/* Vertical lines */}
    <line x1="120" y1="80" x2="120" y2="200" stroke="#FFD700" strokeWidth="1" opacity="0.3" />
    <line x1="160" y1="80" x2="160" y2="200" stroke="#FFD700" strokeWidth="1" opacity="0.3" />
    
    {/* Animated rows filling */}
    <g className="animate-[fillRows_3s_ease-in-out_infinite]">
      <rect x="85" y="85" width="110" height="18" fill="#FFD700" opacity="0.6" />
      <rect x="85" y="108" width="110" height="18" fill="#FFD700" opacity="0.5" />
      <rect x="85" y="131" width="110" height="18" fill="#FFD700" opacity="0.4" />
      <rect x="85" y="154" width="110" height="18" fill="#FFD700" opacity="0.3" />
      <rect x="85" y="177" width="110" height="18" fill="#FFD700" opacity="0.2" />
    </g>
    
    {/* Final checkmark */}
    <g className="animate-[checkmark_3s_ease-in-out_infinite]">
      <circle cx="230" cy="90" r="15" fill="#10b981" />
      <path d="M 223 90 L 228 95 L 237 86" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

const SuccessAnimation = () => (
  <svg width="280" height="280" viewBox="0 0 280 280" className="animate-fade-in">
    {/* Trophy base */}
    <rect x="120" y="180" width="40" height="10" fill="#FFD700" />
    <rect x="130" y="165" width="20" height="15" fill="#FFD700" />
    
    {/* Trophy cup */}
    <path
      d="M 110 140 Q 110 120 130 120 L 150 120 Q 170 120 170 140 L 165 160 Q 165 170 140 170 Q 115 170 115 160 Z"
      fill="#FFD700"
      className="animate-[pulse_3s_ease-in-out_infinite]"
    />
    
    {/* Trophy handles */}
    <path d="M 110 130 Q 95 130 95 145 Q 95 155 105 155" fill="none" stroke="#FFD700" strokeWidth="3" />
    <path d="M 170 130 Q 185 130 185 145 Q 185 155 175 155" fill="none" stroke="#FFD700" strokeWidth="3" />
    
    {/* Sparkles */}
    <g className="animate-[sparkle_3s_ease-in-out_infinite]">
      <path d="M 90 100 L 92 105 L 97 107 L 92 109 L 90 114 L 88 109 L 83 107 L 88 105 Z" fill="#FFD700" />
      <path d="M 190 95 L 192 100 L 197 102 L 192 104 L 190 109 L 188 104 L 183 102 L 188 100 Z" fill="#FFD700" />
      <path d="M 140 80 L 142 85 L 147 87 L 142 89 L 140 94 L 138 89 L 133 87 L 138 85 Z" fill="#FFD700" />
    </g>
    
    {/* Rising dollar signs */}
    <g className="animate-[float_3s_ease-in-out_infinite]" opacity="0.6">
      <text x="110" y="100" fill="#10b981" fontSize="20" fontWeight="bold">$</text>
      <text x="160" y="110" fill="#10b981" fontSize="20" fontWeight="bold">$</text>
    </g>
  </svg>
);

const steps = [
  {
    number: 1,
    animation: MapPinAnimation,
    title: "Choose Your City",
    description: "Select your target market and how many leads you need. We cover any city nationwide.",
    visualLeft: false,
  },
  {
    number: 2,
    animation: ScanAnimation,
    title: "We Scrape & Verify",
    description: "Our system finds active FSBO sellers across multiple platforms and verifies all contact information.",
    visualLeft: true,
  },
  {
    number: 3,
    animation: SpreadsheetAnimation,
    title: "Delivered in 24 Hours",
    description: "Receive a clean Google Sheet with verified names, phone numbers, addresses, and property details.",
    visualLeft: false,
  },
  {
    number: 4,
    animation: SuccessAnimation,
    title: "Start Closing Deals",
    description: "Reach homeowners before your competition. Real leads, real conversations, real commissions.",
    visualLeft: true,
  },
];

const HowItWorks = () => {
  const pathRef = useRef<SVGPathElement>(null);
  const section1Ref = useRef(null);
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  const section4Ref = useRef(null);
  
  const inView2 = useInView(section2Ref, { once: true, margin: "-100px" });
  const inView3 = useInView(section3Ref, { once: true, margin: "-100px" });
  const inView4 = useInView(section4Ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 md:py-32 relative bg-background overflow-hidden">
      <div className="container px-4 relative">
        {/* Animated treasure map path */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
          style={{ zIndex: 0 }}
        >
          <defs>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFD700" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            ref={pathRef}
            d="M 50% 15% Q 65% 25% 50% 35% Q 35% 45% 50% 55% Q 65% 65% 50% 75% Q 35% 85% 50% 95%"
            fill="none"
            stroke="url(#pathGradient)"
            strokeWidth="3"
            strokeDasharray="8 8"
            strokeLinecap="round"
            className="transition-all duration-[2400ms] ease-out"
            style={{
              strokeDashoffset: !inView2 ? 2000 : !inView3 ? 1333 : !inView4 ? 666 : 0,
            }}
          />
        </svg>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16 md:mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From order to inbox in 24 hours. No complexity, no waiting.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-24 md:space-y-32 max-w-7xl mx-auto relative" style={{ zIndex: 1 }}>
          {steps.map((step, index) => {
            const sectionRef = index === 0 ? section1Ref : index === 1 ? section2Ref : index === 2 ? section3Ref : section4Ref;
            return (
              <motion.div
                key={step.number}
                ref={sectionRef}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                className={`grid md:grid-cols-2 gap-8 md:gap-16 items-center ${
                  step.visualLeft ? "md:grid-flow-dense" : ""
                }`}
              >
                {/* Content Side */}
                <motion.div
                  initial={{ opacity: 0, x: step.visualLeft ? 30 : -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
                  className={`space-y-6 ${step.visualLeft ? "md:col-start-2" : ""}`}
                >
                  {/* Numbered Circle */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                      <span className="text-2xl md:text-3xl font-bold text-primary-foreground">
                        {step.number}
                      </span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                      {step.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                    {step.description}
                  </p>
                </motion.div>

                {/* Visual Side - Custom Animation */}
                <motion.div
                  initial={{ opacity: 0, x: step.visualLeft ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
                  className={`flex justify-center ${step.visualLeft ? "md:col-start-1 md:row-start-1" : ""}`}
                >
                  <div className="relative w-full max-w-[300px] flex items-center justify-center">
                    <step.animation />
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="text-center mt-20 md:mt-32"
        >
          <p className="text-lg md:text-xl text-muted-foreground mb-6">
            Ready to get started?
          </p>
          <Button
            size="lg"
            className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-8 py-6 text-lg shadow-gold transition-all hover:shadow-xl"
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          >
            See Pricing
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
