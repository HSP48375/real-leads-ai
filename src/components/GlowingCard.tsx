import { ReactNode, useRef, MouseEvent, useEffect } from "react";
import { cn } from "@/lib/utils";

interface GlowingCardProps {
  children: ReactNode;
  className?: string;
}

const GlowingCard = ({ children, className }: GlowingCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const centerOfElement = (el: HTMLElement) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  };

  const pointerPositionRelativeToElement = (el: HTMLElement, e: MouseEvent<HTMLDivElement>) => {
    const pos = [e.clientX, e.clientY];
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = pos[0] - left;
    const y = pos[1] - top;
    const px = clamp((100 / width) * x);
    const py = clamp((100 / height) * y);
    return { pixels: [x, y], percent: [px, py] };
  };

  const angleFromPointerEvent = (dx: number, dy: number) => {
    let angleRadians = 0;
    let angleDegrees = 0;
    if (dx !== 0 || dy !== 0) {
      angleRadians = Math.atan2(dy, dx);
      angleDegrees = angleRadians * (180 / Math.PI) + 90;
      if (angleDegrees < 0) {
        angleDegrees += 360;
      }
    }
    return angleDegrees;
  };

  const distanceFromCenter = (el: HTMLElement, x: number, y: number) => {
    const [cx, cy] = centerOfElement(el);
    return [x - cx, y - cy];
  };

  const closenessToEdge = (el: HTMLElement, x: number, y: number) => {
    const [cx, cy] = centerOfElement(el);
    const [dx, dy] = distanceFromCenter(el, x, y);
    let k_x = Infinity;
    let k_y = Infinity;
    if (dx !== 0) {
      k_x = cx / Math.abs(dx);
    }
    if (dy !== 0) {
      k_y = cy / Math.abs(dy);
    }
    return clamp(1 / Math.min(k_x, k_y), 0, 1);
  };

  const round = (value: number, precision = 3) => parseFloat(value.toFixed(precision));

  const clamp = (value: number, min = 0, max = 100) =>
    Math.min(Math.max(value, min), max);

  const cardUpdate = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const position = pointerPositionRelativeToElement(cardRef.current, e);
    const [px, py] = position.pixels;
    const [perx, pery] = position.percent;
    const [dx, dy] = distanceFromCenter(cardRef.current, px, py);
    const edge = closenessToEdge(cardRef.current, px, py);
    const angle = angleFromPointerEvent(dx, dy);

    cardRef.current.style.setProperty("--pointer-x", `${round(perx)}%`);
    cardRef.current.style.setProperty("--pointer-y", `${round(pery)}%`);
    cardRef.current.style.setProperty("--pointer-deg", `${round(angle)}deg`);
    cardRef.current.style.setProperty("--pointer-d", `${round(edge * 100)}`);
  };

  return (
    <div
      ref={cardRef}
      className={cn("glow-card", className)}
      onPointerMove={cardUpdate}
    >
      <span className="glow"></span>
      <div className="glow-card-inner">
        {children}
      </div>
    </div>
  );
};

export default GlowingCard;
