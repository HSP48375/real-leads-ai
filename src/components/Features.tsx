import { Shield, Clock, Target, Database } from "lucide-react";
import MicroParallax from "./MicroParallax";

const features = [
  {
    icon: Shield,
    title: "Verified Quality",
    description: "Every lead is verified and delivered in under 1 hour. No cold, recycled lists—just active sellers ready to move."
  },
  {
    icon: Clock,
    title: "Fresh Data",
    description: "Leads scraped in real-time from active listings. Not months-old data that everyone else has."
  },
  {
    icon: Target,
    title: "Geo-Targeted",
    description: "Choose your city, get hyper-local leads. Perfect for agents who know their market best."
  },
  {
    icon: Database,
    title: "Clean Delivery",
    description: "Organized Google Sheets with seller name, phone, address, price, and source. Ready to use immediately."
  }
];

const Features = () => {
  return (
    <section id="features" className="py-12 relative mb-20">
      <div className="container px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Why Choose
            <span className="text-primary"> RealtyLeadsAI?</span>
          </h2>
          <p className="text-xl text-muted-foreground">
            Most lead companies sell recycled, outdated lists. We deliver fresh, real-time scraped data from active listings.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div key={feature.title} className="text-center space-y-4">
              <MicroParallax offset={12 + index * 3}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-gold">
                  <feature.icon className="w-8 h-8 text-primary-foreground" />
                </div>
              </MicroParallax>
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
