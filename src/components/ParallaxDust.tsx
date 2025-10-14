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

const ParallaxDust = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const { scrollY } = useScroll();
  
  // Layer 1: Background gradient (10-15% scroll speed)
  const gradientY = useTransform(scrollY, [0, 1000], [0, 120]);
  const gradientX = useTransform(scrollY, [0, 1000], [0, 50]); // Left-to-right light movement
  
  // Layer 2: Geometric mesh (25-30% scroll speed)
  const meshY = useTransform(scrollY, [0, 1000], [0, 280]);
  
  // Layer 3: Dust particles (20% scroll speed)
  const particleY = useTransform(scrollY, [0, 1000], [0, 200]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Generate 30 subtle particles
    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1, // 1-3px
      delay: Math.random() * 8,
      duration: Math.random() * 20 + 25, // 25-45s
    }));
    
    setParticles(newParticles);
  }, []);

  return (
    <>
      {/* Layer 1: Animated Gradient Background */}
      <motion.div 
        className="absolute inset-0 bg-gradient-dark"
        style={{ 
          y: gradientY,
          x: gradientX,
        }}
      />
      
      {/* Layer 2: Diagonal Geometric Mesh */}
      <motion.div 
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{ y: meshY }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 80px,
                hsl(var(--primary)) 80px,
                hsl(var(--primary)) 81px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 80px,
                hsl(var(--primary)) 80px,
                hsl(var(--primary)) 81px
              )
            `,
          }}
        />
      </motion.div>

      {/* Layer 3: Gold Dust Shimmer */}
      <motion.div 
        className="absolute inset-0 overflow-hidden pointer-events-none"
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
              filter: `blur(${particle.size * 0.8}px)`,
            }}
            animate={{
              y: [-30, -150],
              x: [0, Math.random() * 15 - 7.5, 0],
              opacity: [0, 0.25, 0],
              scale: [0.8, 1.2, 0.8],
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

      {/* Radial overlay for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,hsl(43,74%,66%,0.12),transparent_50%)] pointer-events-none"></div>
    </>
  );
};

export default ParallaxDust;
