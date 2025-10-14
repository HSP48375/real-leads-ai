import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

const GlobalParallax = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const { scrollY } = useScroll();
  
  // Layer 1: Background gradient (12% scroll speed)
  const gradientY = useTransform(scrollY, [0, 5000], [0, 600]);
  const gradientX = useTransform(scrollY, [0, 5000], [0, 200]);
  
  // Layer 2: Geometric mesh (28% scroll speed)
  const meshY = useTransform(scrollY, [0, 5000], [0, 1400]);
  const meshOpacity = useTransform(scrollY, [0, 1000, 2000, 3000, 4000], [0.08, 0.04, 0.08, 0.04, 0.08]);
  
  // Layer 3: Dust particles (20% scroll speed)
  const particleY = useTransform(scrollY, [0, 5000], [0, 1000]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Generate 40 particles spread across the entire page
    const newParticles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 200, // Spread across 200% height for continuous effect
      size: Math.random() * 2.5 + 0.8, // 0.8-3.3px
      delay: Math.random() * 10,
      duration: Math.random() * 25 + 20, // 20-45s
    }));
    
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Layer 1: Animated Gradient Background */}
      <motion.div 
        className="absolute inset-0 w-full h-[200vh]"
        style={{ 
          y: gradientY,
          x: gradientX,
          background: `linear-gradient(135deg, 
            hsl(0, 0%, 0%) 0%, 
            hsl(43, 20%, 8%) 25%,
            hsl(0, 0%, 0%) 50%,
            hsl(43, 20%, 8%) 75%,
            hsl(0, 0%, 0%) 100%
          )`
        }}
      />
      
      {/* Layer 2: Diagonal Geometric Mesh */}
      <motion.div 
        className="absolute inset-0 w-full h-[200vh]"
        style={{ 
          y: meshY,
          opacity: meshOpacity,
        }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 80px,
                hsl(43, 74%, 66%) 80px,
                hsl(43, 74%, 66%) 81px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 80px,
                hsl(43, 74%, 66%) 80px,
                hsl(43, 74%, 66%) 81px
              )
            `,
          }}
        />
      </motion.div>

      {/* Layer 3: Gold Dust Shimmer */}
      <motion.div 
        className="absolute inset-0 w-full h-[200vh]"
        style={{ y: particleY }}
      >
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `radial-gradient(circle, hsl(43, 74%, 66%) 0%, hsl(43, 74%, 56%) 100%)`,
              filter: `blur(${particle.size * 1}px)`,
            }}
            animate={{
              y: [-40, -200],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0, 0.3, 0],
              scale: [0.6, 1.4, 0.6],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      {/* Subtle vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,hsl(0,0%,0%,0.4)_100%)]" />
    </div>
  );
};

export default GlobalParallax;
