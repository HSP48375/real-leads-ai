import Navigation from "@/components/flowvia/Navigation";
import Footer from "@/components/flowvia/Footer";
import ParallaxChevrons from "@/components/ParallaxChevrons";
import StarField from "@/components/StarField";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, MessageCircle, Clock } from "lucide-react";

const Contact = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

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
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground">
              Lorem ipsum dolor sit amet consectetur. Aliquam amet pharetra nec pulvinar. Viverra sit felis elit amet senectus scelerisque.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Left - Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl sm:text-5xl font-heading font-bold mb-6">
                Get in Touch with Us
              </h2>
              <p className="text-lg text-muted-foreground mb-12">
                Lorem ipsum dolor sit amet consectetur. Aliquam amet pharetra nec pulvinar. Viverra sit felis elit amet senectus scelerisque. Odio enim accumsan
              </p>

              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold mb-1">24/7 support</h3>
                    <p className="text-sm text-muted-foreground">24/7 support</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold mb-1">Live Chat Support</h3>
                    <p className="text-sm text-muted-foreground">Live Chat Support</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold mb-1">Address</h3>
                    <p className="text-sm text-muted-foreground">
                      2118 Thornridge Cir. Syracuse, Connecticut 35624
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right - Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="backdrop-blur-xl bg-card/40 border-2 border-primary/20 rounded-3xl p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <Input
                        placeholder="Name"
                        className="bg-muted/50 border-white/10"
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="Email"
                        className="bg-muted/50 border-white/10"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <select className="w-full px-4 py-3 bg-muted/50 border border-white/10 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="">Select one...</option>
                      <option value="general">General Inquiry</option>
                      <option value="support">Support</option>
                      <option value="sales">Sales</option>
                    </select>
                  </div>

                  <div>
                    <Textarea
                      placeholder="Message"
                      rows={6}
                      className="bg-muted/50 border-white/10 resize-none"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                  >
                    Send Message
                  </Button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
