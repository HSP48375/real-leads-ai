import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const ParallaxChevrons = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, 100]);

  return (
    <div ref={ref} className="fixed left-0 top-0 bottom-0 w-32 pointer-events-none z-0 overflow-hidden">
      {/* Chevron 1 */}
      <motion.div
        style={{ y: y1 }}
        className="absolute -left-8 top-1/4 w-32 h-32 opacity-30"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon 
            points="0,50 50,0 100,50 50,100" 
            fill="none" 
            stroke="hsl(199 89% 48%)" 
            strokeWidth="2"
          />
        </svg>
      </motion.div>

      {/* Chevron 2 */}
      <motion.div
        style={{ y: y2 }}
        className="absolute -left-12 top-1/2 w-40 h-40 opacity-20"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon 
            points="0,50 50,0 100,50 50,100" 
            fill="none" 
            stroke="hsl(199 89% 48%)" 
            strokeWidth="2"
          />
        </svg>
      </motion.div>

      {/* Chevron 3 */}
      <motion.div
        style={{ y: y3 }}
        className="absolute -left-6 top-2/3 w-24 h-24 opacity-25"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon 
            points="0,50 50,0 100,50 50,100" 
            fill="none" 
            stroke="hsl(199 89% 48%)" 
            strokeWidth="2"
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default ParallaxChevrons;
