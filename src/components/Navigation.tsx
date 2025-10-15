import { Button } from "./ui/button";

const Navigation = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-dark-green/95 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-lime flex items-center justify-center font-bold text-primary-foreground text-xl">
            RL
          </div>
          <span className="text-xl font-bold text-white">RealtyLeadsAI</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection("features")}
            className="text-white hover:text-primary transition-colors font-medium"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection("pricing")}
            className="text-white hover:text-primary transition-colors font-medium"
          >
            Pricing
          </button>
          <button
            onClick={() => scrollToSection("testimonials")}
            className="text-white hover:text-primary transition-colors font-medium"
          >
            Testimonials
          </button>
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => scrollToSection("pricing")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2 shadow-lime-glow"
        >
          GET LEADS
        </Button>
      </div>
    </nav>
  );
};

export default Navigation;
