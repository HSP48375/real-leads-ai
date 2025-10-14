import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, ReactNode } from "react";

interface SectionParallaxProps {
  children: ReactNode;
  speed?: "slow" | "medium" | "fast" | "static" | "rest";
  className?: string;
}

const SectionParallax = ({ children, speed = "static", className = "" }: SectionParallaxProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Alternating parallax speeds inspired by Bonatour
  const speedMap = {
    static: 0,
    rest: 0, // No motion for testimonials/CTA
    slow: 40, // Hero section
    medium: 80, // Features, CTA
    fast: 130, // Pricing
  };

  const y = useTransform(scrollYProgress, [0, 1], [0, speedMap[speed]]);
  const opacity = speed === "rest" 
    ? useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.85, 1, 1, 0.85])
    : 1;

  return (
    <motion.div 
      ref={ref} 
      className={`relative ${className}`}
      style={speed !== "static" && speed !== "rest" ? { y } : { opacity }}
    >
      {children}
    </motion.div>
  );
};

export default SectionParallax;
