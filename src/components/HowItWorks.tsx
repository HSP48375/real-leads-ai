import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

// Animated Step Components with REAL CSS animations
const MapPinAnimation = () => (
  <div className="w-[300px] h-[300px] relative flex items-center justify-center">
    {/* Map dots */}
    <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-primary/30" />
    <div className="absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-primary/30" />
    <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-primary/30" />
    
    {/* Pulse rings */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="absolute w-20 h-20 rounded-full border-2 border-primary/40 animate-[pulse_3s_ease-out_infinite]" />
      <div className="absolute w-20 h-20 rounded-full border-2 border-primary/30 animate-[pulse_3s_ease-out_infinite_1s]" style={{ animationDelay: '1s' }} />
      <div className="absolute w-20 h-20 rounded-full border-2 border-primary/20 animate-[pulse_3s_ease-out_infinite_2s]" style={{ animationDelay: '2s' }} />
    </div>
    
    {/* Animated pin drop */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[pinDrop_3s_ease-out_infinite]">
      <svg width="60" height="80" viewBox="0 0 60 80" className="drop-shadow-lg">
        <path d="M30 0 C13.5 0 0 13.5 0 30 C0 45 30 80 30 80 C30 80 60 45 60 30 C60 13.5 46.5 0 30 0 Z" fill="#FFD700"/>
        <circle cx="30" cy="30" r="12" fill="#1a1a1a"/>
      </svg>
    </div>
  </div>
);

const ScanAnimation = () => (
  <div className="w-[300px] h-[300px] relative flex items-center justify-center">
    {/* Document icons */}
    <div className="absolute top-1/3 left-1/4 w-12 h-16 border-2 border-primary/40 rounded" />
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-12 h-16 border-2 border-primary/40 rounded" />
    <div className="absolute top-1/3 right-1/4 w-12 h-16 border-2 border-primary/40 rounded" />
    
    {/* Checkmarks that appear */}
    <svg className="absolute top-2/3 left-1/4 animate-[checkmarkAppear_4s_ease-in-out_infinite]" width="20" height="20" viewBox="0 0 20 20">
      <path d="M 4 10 L 8 14 L 16 6" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <svg className="absolute top-2/3 left-1/2 -translate-x-1/2 animate-[checkmarkAppear_4s_ease-in-out_infinite_1s]" width="20" height="20" viewBox="0 0 20 20" style={{ animationDelay: '1s' }}>
      <path d="M 4 10 L 8 14 L 16 6" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <svg className="absolute top-2/3 right-1/4 animate-[checkmarkAppear_4s_ease-in-out_infinite_2s]" width="20" height="20" viewBox="0 0 20 20" style={{ animationDelay: '2s' }}>
      <path d="M 4 10 L 8 14 L 16 6" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    
    {/* Magnifying glass scanning */}
    <div className="absolute top-1/2 -translate-y-1/2 animate-[scan_4s_ease-in-out_infinite]">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="24" cy="24" r="18" fill="none" stroke="#FFD700" strokeWidth="4"/>
        <line x1="37" y1="37" x2="52" y2="52" stroke="#FFD700" strokeWidth="4" strokeLinecap="round"/>
      </svg>
    </div>
  </div>
);

const SpreadsheetAnimation = () => (
  <div className="w-[300px] h-[300px] relative flex items-center justify-center">
    {/* Grid */}
    <div className="relative w-48 h-40 border-2 border-primary/40 rounded">
      {/* Grid lines */}
      <div className="absolute top-0 left-1/3 w-px h-full bg-primary/30" />
      <div className="absolute top-0 left-2/3 w-px h-full bg-primary/30" />
      
      {/* Animated filling rows */}
      <div className="absolute top-2 left-2 right-2 space-y-2">
        <div className="h-6 bg-primary/20 rounded overflow-hidden">
          <div className="h-full bg-primary animate-[fillRow_4s_ease-in-out_infinite] rounded" />
        </div>
        <div className="h-6 bg-primary/20 rounded overflow-hidden">
          <div className="h-full bg-primary animate-[fillRow_4s_ease-in-out_infinite_0.5s] rounded" style={{ animationDelay: '0.5s' }} />
        </div>
        <div className="h-6 bg-primary/20 rounded overflow-hidden">
          <div className="h-full bg-primary animate-[fillRow_4s_ease-in-out_infinite_1s] rounded" style={{ animationDelay: '1s' }} />
        </div>
        <div className="h-6 bg-primary/20 rounded overflow-hidden">
          <div className="h-full bg-primary animate-[fillRow_4s_ease-in-out_infinite_1.5s] rounded" style={{ animationDelay: '1.5s' }} />
        </div>
        <div className="h-6 bg-primary/20 rounded overflow-hidden">
          <div className="h-full bg-primary animate-[fillRow_4s_ease-in-out_infinite_2s] rounded" style={{ animationDelay: '2s' }} />
        </div>
      </div>
    </div>
    
    {/* Green checkmark */}
    <div className="absolute top-8 right-8 animate-[checkmarkAppear_4s_ease-in-out_infinite_2.5s]" style={{ animationDelay: '2.5s' }}>
      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <path d="M 6 12 L 10 16 L 18 8" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  </div>
);

const TrophyAnimation = () => (
  <div className="w-[300px] h-[300px] relative flex items-center justify-center">
    {/* Trophy - floating */}
    <div className="animate-[float_3s_ease-in-out_infinite]">
      <svg width="80" height="100" viewBox="0 0 80 100">
        {/* Base */}
        <rect x="30" y="80" width="20" height="8" fill="#FFD700"/>
        <rect x="25" y="70" width="30" height="10" fill="#FFD700"/>
        
        {/* Cup */}
        <path d="M 20 30 Q 20 20 30 20 L 50 20 Q 60 20 60 30 L 55 50 Q 55 60 40 60 Q 25 60 25 50 Z" fill="#FFD700"/>
        
        {/* Handles */}
        <path d="M 20 35 Q 10 35 10 45 Q 10 50 18 50" fill="none" stroke="#FFD700" strokeWidth="3"/>
        <path d="M 60 35 Q 70 35 70 45 Q 70 50 62 50" fill="none" stroke="#FFD700" strokeWidth="3"/>
      </svg>
    </div>
    
    {/* Sparkles */}
    <div className="absolute top-12 left-12 animate-[sparkle_3s_ease-in-out_infinite]">
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M 10 0 L 11 9 L 20 10 L 11 11 L 10 20 L 9 11 L 0 10 L 9 9 Z" fill="#FFD700"/>
      </svg>
    </div>
    <div className="absolute top-16 right-12 animate-[sparkle_3s_ease-in-out_infinite_1s]" style={{ animationDelay: '1s' }}>
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M 10 0 L 11 9 L 20 10 L 11 11 L 10 20 L 9 11 L 0 10 L 9 9 Z" fill="#FFD700"/>
      </svg>
    </div>
    <div className="absolute bottom-20 left-16 animate-[sparkle_3s_ease-in-out_infinite_2s]" style={{ animationDelay: '2s' }}>
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M 10 0 L 11 9 L 20 10 L 11 11 L 10 20 L 9 11 L 0 10 L 9 9 Z" fill="#FFD700"/>
      </svg>
    </div>
    
    {/* Floating dollar signs */}
    <div className="absolute top-1/2 left-1/3 animate-[floatUp_3s_ease-in-out_infinite] text-2xl font-bold text-green-500">$</div>
    <div className="absolute top-1/2 right-1/3 animate-[floatUp_3s_ease-in-out_infinite_1.5s] text-2xl font-bold text-green-500" style={{ animationDelay: '1.5s' }}>$</div>
  </div>
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
    animation: TrophyAnimation,
    title: "Start Closing Deals",
    description: "Reach homeowners before your competition. Real leads, real conversations, real commissions.",
    visualLeft: true,
  },
];

const HowItWorks = () => {
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  
  const inView2 = useInView(step2Ref, { once: true, margin: "-100px" });
  const inView3 = useInView(step3Ref, { once: true, margin: "-100px" });
  const inView4 = useInView(step4Ref, { once: true, margin: "-100px" });

  const [circlePositions, setCirclePositions] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    const updatePositions = () => {
      const refs = [step1Ref, step2Ref, step3Ref, step4Ref];
      const positions = refs.map(ref => {
        if (ref.current) {
          const circle = ref.current.querySelector('.numbered-circle');
          if (circle) {
            const rect = circle.getBoundingClientRect();
            const container = ref.current.closest('section');
            const containerRect = container?.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2 - (containerRect?.left || 0),
              y: rect.top + rect.height / 2 - (containerRect?.top || 0)
            };
          }
        }
        return { x: 0, y: 0 };
      });
      setCirclePositions(positions);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    setTimeout(updatePositions, 100); // Update after initial render
    return () => window.removeEventListener('resize', updatePositions);
  }, []);

  return (
    <section className="py-20 md:py-32 relative bg-background overflow-hidden">
      <div className="container px-4 relative max-w-6xl mx-auto">
        {/* Animated connecting path */}
        {circlePositions.length === 4 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none hidden md:block"
            style={{ zIndex: 0 }}
          >
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FFD700" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {/* Path segment 1 to 2 */}
            <motion.path
              d={`M ${circlePositions[0].x} ${circlePositions[0].y} C ${circlePositions[0].x + 100} ${circlePositions[0].y + 50}, ${circlePositions[1].x - 100} ${circlePositions[1].y - 50}, ${circlePositions[1].x} ${circlePositions[1].y}`}
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth="2"
              strokeDasharray="8 8"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={inView2 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            {/* Path segment 2 to 3 */}
            <motion.path
              d={`M ${circlePositions[1].x} ${circlePositions[1].y} C ${circlePositions[1].x + 100} ${circlePositions[1].y + 50}, ${circlePositions[2].x - 100} ${circlePositions[2].y - 50}, ${circlePositions[2].x} ${circlePositions[2].y}`}
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth="2"
              strokeDasharray="8 8"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={inView3 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            {/* Path segment 3 to 4 */}
            <motion.path
              d={`M ${circlePositions[2].x} ${circlePositions[2].y} C ${circlePositions[2].x + 100} ${circlePositions[2].y + 50}, ${circlePositions[3].x - 100} ${circlePositions[3].y - 50}, ${circlePositions[3].x} ${circlePositions[3].y}`}
              fill="none"
              stroke="url(#pathGradient)"
              strokeWidth="2"
              strokeDasharray="8 8"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={inView4 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>
        )}

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

        {/* Steps - REDUCED SPACING */}
        <div className="space-y-16 md:space-y-20 max-w-6xl mx-auto relative" style={{ zIndex: 1 }}>
          {steps.map((step, index) => {
            const stepRef = index === 0 ? step1Ref : index === 1 ? step2Ref : index === 2 ? step3Ref : step4Ref;
            return (
              <motion.div
                key={step.number}
                ref={stepRef}
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
                    <div className="numbered-circle w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
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
