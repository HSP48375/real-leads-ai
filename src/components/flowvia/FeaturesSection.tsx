import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { TrendingUp, Users, Target } from "lucide-react";

const FeaturesSection = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [100, -100]);

  const features = [
    {
      icon: TrendingUp,
      title: "Growth Insights",
      description: "Lorem ipsum dolor sit amet consectetur. Sed est hac tempor.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Lorem ipsum dolor sit amet consectetur. Sed est hac tempor.",
    },
    {
      icon: Target,
      title: "Goal Tracking",
      description: "Lorem ipsum dolor sit amet consectetur. Sed est hac tempor.",
    },
  ];

  return (
    <section ref={ref} className="py-32 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-6">
            Intelligence That Scales{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              with Your Business
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Lorem ipsum dolor sit amet consectetur. Aliquam amet pharetra nec pulvinar. Viverra
            sit felis elit amet senectus scelerisque.
          </p>
        </motion.div>

        <motion.div style={{ y }} className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="group"
            >
              <div className="backdrop-blur-glass bg-card/50 border border-white/10 rounded-2xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-glow h-full">
                <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
