import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

const ParallaxDust = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const { scrollY } = useScroll();
  
  // Background gradient parallax (10-15% scroll speed)
  const gradientY = useTransform(scrollY, [0, 1000], [0, 120]);
  
  // Particle parallax (30% scroll speed)
  const particleY = useTransform(scrollY, [0, 1000], [0, 300]);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Generate 20 particles with randomized properties
    const goldHues = ['#FFD700', '#FFB700', '#FFF3C4'];
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, // Random horizontal position (%)
      y: Math.random() * 100, // Random vertical position (%)
      size: Math.random() * 1.5 + 1, // 1-2.5px
      color: goldHues[Math.floor(Math.random() * goldHues.length)],
      delay: Math.random() * 10, // Random animation delay
      duration: Math.random() * 15 + 20, // 20-35s duration
    }));
    
    setParticles(newParticles);
  }, []);

  return (
    <>
      {/* Layer 1: Gradient Shift */}
      <motion.div 
        className="absolute inset-0 bg-gradient-dark opacity-100"
        style={{ y: gradientY }}
      />
      
      {/* Layer 2: Gold Dust Particles */}
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
              backgroundColor: particle.color,
              opacity: 0.2,
              filter: `blur(${particle.size * 0.5}px)`,
            }}
            animate={{
              y: [-20, -80],
              x: [0, Math.random() * 6 - 3, 0],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </motion.div>

      {/* Layer 3: Subtle Geometric Texture (Optional) */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 35px,
            hsl(var(--primary)) 35px,
            hsl(var(--primary)) 36px
          )`,
        }}
      />
    </>
  );
};

export default ParallaxDust;
