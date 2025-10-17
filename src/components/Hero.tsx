import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import MicroParallax from "./MicroParallax";
import ParallaxBackground from "./ParallaxBackground";
import heroImage from "@/assets/hero-home-sunset.jpg";
import { useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const Hero = () => {
  const glowCardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const glowCard = glowCardRef.current;
    if (!glowCard) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = glowCard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      glowCard.style.setProperty('--pointer-x', `${x}px`);
      glowCard.style.setProperty('--pointer-y', `${y}px`);
    };

    glowCard.addEventListener('pointermove', handlePointerMove);
    return () => glowCard.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <section className="relative min-h-screen flex items-start justify-center">
      {/* Parallax background image */}
      <ParallaxBackground imageSrc={heroImage} />
      {/* Dark overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none"></div>
      {/* Radial accent overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(43,74%,66%,0.15),transparent_50%)] pointer-events-none"></div>
      
      <div className="container relative z-10 px-4 text-center pt-16">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Badge with micro-parallax */}
          <MicroParallax offset={20}>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card/40 backdrop-blur-glass border border-primary/30 shadow-gold">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow"></div>
              <span className="text-sm font-medium text-foreground uppercase tracking-wider">
                Trusted by thousands of realtors nationwide
              </span>
            </div>
          </MicroParallax>

          {/* Main heading */}
          <h1 className="font-bold leading-tight text-3xl md:text-5xl lg:text-6xl text-[hsl(var(--headline))]">
            Real leads you can rely on
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-foreground max-w-2xl mx-auto">
            No cold calls. No chasing. Fresh FSBO leads delivered in under 1 hour—get leads faster than any competitor.
          </p>

          {/* Value props */}
          <div className="flex flex-wrap justify-center gap-12 text-lg md:text-xl text-foreground pt-32">
            <div className="flex items-center gap-2">
              <span>⚡ Delivered in under 1 hour</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📞 Direct seller phone numbers</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📍 Territory-based targeting</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔄 Fresh leads, never recycled</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="pt-12 flex flex-col sm:flex-row justify-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <div ref={glowCardRef} className="glow-card inline-block">
                  <span className="glow"></span>
                  <div className="card-inner">
                    <Button 
                      size="lg" 
                      className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-8 py-6 text-lg transition-all duration-300 group relative overflow-hidden border-0"
                    >
                      <span className="relative z-10">Go to Dashboard</span>
                      <ArrowRight className="ml-2 relative z-10 group-hover:translate-x-1 transition-transform animate-pulse" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </Button>
                  </div>
                </div>
              </Link>
            ) : (
              <Link to="/signup">
                <div ref={glowCardRef} className="glow-card inline-block">
                  <span className="glow"></span>
                  <div className="card-inner">
                    <Button 
                      size="lg" 
                      className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold px-8 py-6 text-lg transition-all duration-300 group relative overflow-hidden border-0"
                    >
                      <span className="relative z-10">Get Started</span>
                      <ArrowRight className="ml-2 relative z-10 group-hover:translate-x-1 transition-transform animate-pulse" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </Button>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
