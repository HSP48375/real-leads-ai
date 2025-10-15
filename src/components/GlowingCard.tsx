import { ReactNode, useRef, MouseEvent } from "react";
import { cn } from "@/lib/utils";

interface GlowingCardProps {
  children: ReactNode;
  className?: string;
  featured?: boolean;
}

const GlowingCard = ({ children, className, featured }: GlowingCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !glowRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    glowRef.current.style.setProperty("--x", `${x}px`);
    glowRef.current.style.setProperty("--y", `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      className={cn("relative group", className)}
      onMouseMove={handleMouseMove}
    >
      {/* Glowing edge effect */}
      <div
        ref={glowRef}
        className="glowing-card-border"
        style={{
          // @ts-ignore - CSS custom properties
          "--x": "50%",
          "--y": "50%",
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};

export default GlowingCard;
