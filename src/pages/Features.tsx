import Navigation from "@/components/flowvia/Navigation";
import Footer from "@/components/flowvia/Footer";
import ParallaxChevrons from "@/components/ParallaxChevrons";
import StarField from "@/components/StarField";
import { motion } from "framer-motion";
import { Monitor, Users, Target, Puzzle, Zap, Shield } from "lucide-react";

const Features = () => {
  const mainFeatures = [
    {
      icon: Monitor,
      title: "Project Monitoring",
      description: "Organize, prioritize, and track tasks for efficient completion.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Organize, prioritize, and track tasks for efficient completion.",
    },
    {
      icon: Target,
      title: "Task Coordination",
      description: "Organize, prioritize, and track tasks for efficient completion.",
    },
  ];

  const integrations = [
    {
      icon: Puzzle,
      title: "Project Monitoring",
      description: "Lorem ipsum dolor sit amet con sectetur Aliquam",
    },
    {
      icon: Zap,
      title: "Real-time Sync",
      description: "Lorem ipsum dolor sit amet con sectetur Aliquam",
    },
    {
      icon: Shield,
      title: "Data Security",
      description: "Lorem ipsum dolor sit amet con sectetur Aliquam",
    },
  ];

  return (
    <div className="min-h-screen relative">
      <ParallaxChevrons />
      <StarField />
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-heading font-bold mb-6">
              Features
            </h1>
            <p className="text-lg text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur. Aliquam amet pharetra nec pulvinar. Viverra sit felis elit amet senectus scelerisque.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Intelligence Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-6">
              Intelligence That Scales{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                with Your Business
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur. Aliquam amet pharetra nec pulvinar. Viverra
              sit felis elit amet senectus scelerisque. Odio enim accumsan
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {mainFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
              >
                <div className="backdrop-blur-xl bg-card/40 border-2 border-primary/20 rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-card h-full">
                  <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-heading font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-32 relative overflow-hidden bg-muted/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-6">
              Capabilities of{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Seamless Integrations
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur. Aliquam amet pharetra nec pulvinar. Viverra
              sit felis elit amet senectus
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {integrations.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="backdrop-blur-xl bg-card/40 border-2 border-primary/20 rounded-3xl p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-card"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-primary/10 flex items-center justify-center mb-6">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-heading font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;
