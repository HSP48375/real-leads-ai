import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, ReactNode } from "react";

interface SectionParallaxProps {
  children: ReactNode;
  speed?: "slow" | "medium" | "fast" | "static";
  className?: string;
}

const SectionParallax = ({ children, speed = "static", className = "" }: SectionParallaxProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Different parallax speeds for variety
  const speedMap = {
    static: 0,
    slow: 50,
    medium: 100,
    fast: 150
  };

  const y = useTransform(scrollYProgress, [0, 1], [0, speedMap[speed]]);

  return (
    <motion.div 
      ref={ref} 
      className={`relative ${className}`}
      style={speed !== "static" ? { y } : {}}
    >
      {children}
    </motion.div>
  );
};

export default SectionParallax;
