interface AnimatedArrowProps {
  direction: "left" | "right";
}

const AnimatedArrow = ({ direction }: AnimatedArrowProps) => {
  const isLeft = direction === "left";
  
  return (
    <div className={`absolute top-0 ${isLeft ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} hidden lg:block`}>
      <svg
        width="80"
        height="300"
        viewBox="0 0 80 300"
        className="animate-pulse-glow"
      >
        {/* Arrow shaft */}
        <line
          x1="40"
          y1="20"
          x2="40"
          y2="260"
          stroke="hsl(var(--primary))"
          strokeWidth="4"
          strokeLinecap="round"
          className="drop-shadow-[0_0_12px_hsl(var(--primary))]"
        />
        
        {/* Arrow head */}
        <path
          d="M 40 280 L 20 250 L 40 260 L 60 250 Z"
          fill="hsl(var(--primary))"
          className="drop-shadow-[0_0_12px_hsl(var(--primary))]"
        />
      </svg>
    </div>
  );
};

export default AnimatedArrow;
