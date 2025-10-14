import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import cloudsLayer1 from "@/assets/clouds-layer-1.jpg";
import cloudsLayer2 from "@/assets/clouds-layer-2.jpg";

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
  
  // Layer 0: Slow-moving cloud layers (15% scroll speed)
  const cloudY1 = useTransform(scrollY, [0, 5000], [0, 750]);
  const cloudX1 = useTransform(scrollY, [0, 5000], [0, 300]);
  const cloudY2 = useTransform(scrollY, [0, 5000], [0, 650]);
  const cloudX2 = useTransform(scrollY, [0, 5000], [0, -250]);
  
  // Layer 1: Background gradient with morphing hue (10% scroll speed)
  const gradientY = useTransform(scrollY, [0, 5000], [0, 500]);
  const gradientX = useTransform(scrollY, [0, 5000], [0, 150]);
  const gradientHue = useTransform(scrollY, [0, 1500, 3000, 4500], [0, 10, 5, 15]); // Subtle hue shift
  
  // Layer 2: Geometric mesh with rotation (25% scroll speed)
  const meshY = useTransform(scrollY, [0, 5000], [0, 1250]);
  const meshRotation = useTransform(scrollY, [0, 5000], [0, 15]); // Gentle rotation
  const meshOpacity = useTransform(
    scrollY, 
    [0, 800, 1600, 2400, 3200, 4000], 
    [0.08, 0.04, 0.09, 0.03, 0.08, 0.04]
  );
  
  // Layer 3: Dust particles with density modulation (18% scroll speed)
  const particleY = useTransform(scrollY, [0, 5000], [0, 900]);
  const particleDensity = useTransform(
    scrollY,
    [0, 1000, 2000, 3000, 4000],
    [1, 0.6, 1, 0.5, 1]
  );
  
  // Layer 4: Ambient diagonal light (12% scroll speed)
  const lightY = useTransform(scrollY, [0, 5000], [0, 600]);
  const lightX = useTransform(scrollY, [0, 5000], [-100, 200]);
  const lightOpacity = useTransform(
    scrollY,
    [0, 1000, 2000, 3000, 4000],
    [0.15, 0.08, 0.12, 0.06, 0.1]
  );

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Detect mobile
    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 15 : 50; // Reduce on mobile

    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 250,
      size: Math.random() * 2.5 + 0.8,
      delay: Math.random() * 12,
      duration: Math.random() * 30 + 25,
    }));
    
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Layer 0: Subtle Moving Clouds (Behind Everything) */}
      <div className="absolute inset-0 hidden md:block">
        {/* Cloud Layer 1 - Deeper, slower */}
        <motion.div
          className="absolute inset-0 w-full h-[250vh] will-change-transform"
          style={{
            y: cloudY1,
            x: cloudX1,
            backgroundImage: `url(${cloudsLayer1})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "repeat",
            mixBlendMode: "soft-light",
            opacity: 0.4,
          }}
        />
        
        {/* Cloud Layer 2 - Lighter, faster */}
        <motion.div
          className="absolute inset-0 w-full h-[250vh] will-change-transform"
          style={{
            y: cloudY2,
            x: cloudX2,
            backgroundImage: `url(${cloudsLayer2})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "repeat",
            mixBlendMode: "overlay",
            opacity: 0.3,
          }}
        />
        
        {/* Dark overlay to keep clouds subtle and cinematic */}
        <div 
          className="absolute inset-0 bg-black/80"
          style={{ mixBlendMode: "normal" }}
        />
      </div>
      
      {/* Layer 1: Animated Gradient with Morphing Hue */}
      <motion.div 
        className="absolute inset-0 w-full h-[250vh] will-change-transform"
        style={{ 
          y: gradientY,
          x: gradientX,
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: useTransform(
              gradientHue,
              (hue) => `linear-gradient(135deg, 
                hsl(0, 0%, 0%) 0%, 
                hsl(${43 + hue}, 20%, 8%) 25%,
                hsl(0, 0%, 0%) 50%,
                hsl(${43 + hue}, 20%, 8%) 75%,
                hsl(0, 0%, 0%) 100%
              )`
            )
          }}
        />
      </motion.div>
      
      {/* Layer 2: Diagonal Mesh with Rotation */}
      <motion.div 
        className="absolute inset-0 w-full h-[250vh] will-change-transform"
        style={{ 
          y: meshY,
          opacity: meshOpacity,
          rotate: meshRotation,
          transformOrigin: "center center",
        }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 90px,
                hsl(43, 74%, 66%) 90px,
                hsl(43, 74%, 66%) 91px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 90px,
                hsl(43, 74%, 66%) 90px,
                hsl(43, 74%, 66%) 91px
              )
            `,
          }}
        />
      </motion.div>

      {/* Layer 3: Gold Dust with Density Modulation */}
      <motion.div 
        className="absolute inset-0 w-full h-[250vh] will-change-transform"
        style={{ 
          y: particleY,
          opacity: particleDensity,
        }}
      >
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full will-change-transform"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `radial-gradient(circle, hsl(43, 74%, 66%) 0%, hsl(43, 74%, 56%) 100%)`,
              filter: `blur(${particle.size * 1.2}px)`,
            }}
            animate={{
              y: [-50, -250],
              x: [0, Math.random() * 25 - 12.5, 0],
              opacity: [0, 0.35, 0],
              scale: [0.5, 1.5, 0.5],
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

      {/* Layer 4: Ambient Diagonal Light Beam */}
      <motion.div
        className="absolute w-[150%] h-[200vh] will-change-transform"
        style={{
          y: lightY,
          x: lightX,
          opacity: lightOpacity,
          background: `linear-gradient(
            135deg,
            transparent 0%,
            hsl(43, 74%, 66%, 0.15) 45%,
            hsl(43, 74%, 66%, 0.25) 50%,
            hsl(43, 74%, 66%, 0.15) 55%,
            transparent 100%
          )`,
          transform: "rotate(-25deg)",
          transformOrigin: "center",
        }}
      />

      {/* Subtle vignette for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_45%,hsl(0,0%,0%,0.5)_100%)]" />
    </div>
  );
};

export default GlobalParallax;
