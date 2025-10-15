interface ScrollingTextProps {
  text: string;
  className?: string;
}

const ScrollingText = ({ text, className = "" }: ScrollingTextProps) => {
  // Repeat the text to ensure seamless scrolling
  const repeatedText = Array(20).fill(text).join(" • ");

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div className="inline-block animate-[marquee_40s_linear_infinite]">
        <span className="text-2xl md:text-3xl font-bold text-white/20 tracking-wider">
          {repeatedText}
        </span>
      </div>
    </div>
  );
};

export default ScrollingText;
