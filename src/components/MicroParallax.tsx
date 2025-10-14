import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, ReactNode } from "react";

interface MicroParallaxProps {
  children: ReactNode;
  offset?: number;
  className?: string;
}

// Micro-parallax for small UI elements (badges, icons)
const MicroParallax = ({ children, offset = 15, className = "" }: MicroParallaxProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Subtle vertical offset
  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);

  // Check for reduced motion
  const prefersReducedMotion = 
    typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div 
      ref={ref}
      className={className}
      style={{ y }}
    >
      {children}
    </motion.div>
  );
};

export default MicroParallax;
