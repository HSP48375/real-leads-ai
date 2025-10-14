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
    <div className="fixed inset-0 pointer-events-none overflow-hidden bg-black">
      {/* Cloud Layer 1 - deeper, slower */}
      <motion.div
        className="absolute inset-0 w-full h-[250vh] will-change-transform"
        style={{
          y: cloudY1,
          x: cloudX1,
          backgroundImage: `url(${cloudsLayer1})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          mixBlendMode: "screen",
          opacity: 0.3,
        }}
      />

      {/* Cloud Layer 2 - lighter, opposite drift */}
      <motion.div
        className="absolute inset-0 w-full h-[250vh] will-change-transform"
        style={{
          y: cloudY2,
          x: cloudX2,
          backgroundImage: `url(${cloudsLayer2})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          mixBlendMode: "screen",
          opacity: 0.25,
        }}
      />

      {/* Dark overlay for depth and contrast */}
      <div className="absolute inset-0 bg-black/80 pointer-events-none" />
    </div>
  );
};

export default GlobalParallax;
