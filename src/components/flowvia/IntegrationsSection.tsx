import { motion } from "framer-motion";
import { Puzzle, Zap, Shield } from "lucide-react";

const IntegrationsSection = () => {
  const integrations = [
    {
      icon: Puzzle,
      title: "Project Monitoring",
      description: "Lorem ipsum dolor sit amet con sectetur Aliquam",
    },
    {
      icon: Zap,
      title: "Project Monitoring",
      description: "Lorem ipsum dolor sit amet con sectetur Aliquam",
    },
    {
      icon: Shield,
      title: "Project Monitoring",
      description: "Lorem ipsum dolor sit amet con sectetur Aliquam",
    },
    {
      icon: Puzzle,
      title: "Project Monitoring",
      description: "Lorem ipsum dolor sit amet con sectetur Aliquam",
    },
  ];

  return (
    <section className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-6">
              Capabilities of Seamless Integrations
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              Lorem ipsum dolor sit amet consectetur. Aliquam amet pharetra nec pulvinar. Viverra sit felis elit amet senectus
            </p>

            <div className="space-y-6">
              {integrations.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex gap-4 items-start group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-gradient-primary transition-all">
                    <item.icon className="w-6 h-6 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-bold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative aspect-square">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl" />
              
              {/* Main Visual */}
              <div className="relative backdrop-blur-xl bg-card/40 border-2 border-primary/20 rounded-3xl p-8 h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-gradient-primary opacity-30" />
                  <p className="text-muted-foreground">Integration Dashboard</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default IntegrationsSection;
