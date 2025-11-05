import { motion } from "framer-motion";

interface AnimatedArrowProps {
  direction: "left" | "right";
}

const AnimatedArrow = ({ direction }: AnimatedArrowProps) => {
  const isLeft = direction === "left";
  
  return (
    <div className={`absolute top-0 ${isLeft ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} hidden lg:block`}>
      <motion.svg
        width="120"
        height="300"
        viewBox="0 0 120 300"
        className="drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
      >
        {/* Glowing squiggly path */}
        <motion.path
          d={isLeft 
            ? "M 100 20 Q 80 40, 85 60 T 70 100 Q 60 120, 75 140 T 60 180 Q 55 200, 70 220 T 55 260 L 30 280"
            : "M 20 20 Q 40 40, 35 60 T 50 100 Q 60 120, 45 140 T 60 180 Q 65 200, 50 220 T 65 260 L 90 280"
          }
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="500"
          strokeDashoffset="0"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="500"
            to="0"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </motion.path>
        
        {/* Arrow head */}
        <motion.g
          initial={{ y: 0 }}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d={isLeft 
              ? "M 30 280 L 20 270 L 30 275 L 25 265 Z"
              : "M 90 280 L 100 270 L 90 275 L 95 265 Z"
            }
            fill="hsl(var(--primary))"
            className="drop-shadow-[0_0_6px_rgba(234,179,8,0.8)]"
          />
        </motion.g>

        {/* Pulsing glow circles along the path */}
        <motion.circle
          cx={isLeft ? "85" : "35"}
          cy="60"
          r="4"
          fill="hsl(var(--primary))"
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="2.5s"
            repeatCount="indefinite"
            begin="0s"
          />
        </motion.circle>
        
        <motion.circle
          cx={isLeft ? "70" : "50"}
          cy="100"
          r="4"
          fill="hsl(var(--primary))"
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="2.5s"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </motion.circle>
        
        <motion.circle
          cx={isLeft ? "75" : "45"}
          cy="140"
          r="4"
          fill="hsl(var(--primary))"
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="2.5s"
            repeatCount="indefinite"
            begin="1s"
          />
        </motion.circle>
        
        <motion.circle
          cx={isLeft ? "60" : "60"}
          cy="180"
          r="4"
          fill="hsl(var(--primary))"
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="2.5s"
            repeatCount="indefinite"
            begin="1.5s"
          />
        </motion.circle>
        
        <motion.circle
          cx={isLeft ? "70" : "50"}
          cy="220"
          r="4"
          fill="hsl(var(--primary))"
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;1;0"
            dur="2.5s"
            repeatCount="indefinite"
            begin="2s"
          />
        </motion.circle>
      </motion.svg>
    </div>
  );
};

export default AnimatedArrow;
