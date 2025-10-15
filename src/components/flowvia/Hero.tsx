import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const Hero = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32 pb-20">
      {/* Parallax Content */}
      <motion.div style={{ y, opacity }} className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-heading font-bold mb-6 leading-tight text-white"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Awesome Webflow Template for Your SAAS!
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Lorem ipsum dolor sit amet consectetur. Aliquam amet pharetra nec pulvinar. Viverra sit felis elit amet senectus scelerisque. Odio enim accumsan
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <Button size="lg" asChild>
              <Link to="/contact">Get Started Now</Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Dashboard Previews */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-20 relative"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto perspective-1000">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="relative group"
                style={{
                  transform: i === 2 ? 'scale(1.05) translateY(-20px)' : 'scale(0.95)',
                }}
              >
                <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative border-2 border-primary/30 rounded-2xl p-2 bg-card/60 backdrop-blur-sm hover:border-primary/50 transition-all">
                  <div className="aspect-[4/3] bg-gradient-to-br from-card to-background rounded-xl flex items-center justify-center overflow-hidden">
                    <div className="text-center p-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/20 backdrop-blur-sm" />
                      <p className="text-sm text-muted-foreground">
                        {i === 1 ? 'Features' : i === 2 ? 'Home page' : i === 3 ? 'Pricing' : 'Contact Us'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
