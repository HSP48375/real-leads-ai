const Footer = () => {
  return (
    <footer className="border-t border-white/10 py-12 bg-gradient-dark-green">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2">
            <h3 className="text-2xl font-bold mb-4 text-white">
              RealtyLeadsAI
            </h3>
            <p className="text-white/70 mb-4 font-medium">
              Fresh real estate leads. Geo-verified. Scam-free.
            </p>
            <p className="text-sm text-white/60">
              © 2025 RealtyLeadsAI. All rights reserved.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white">Product</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#testimonials" className="hover:text-primary transition-colors">Testimonials</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4 text-white">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-center text-sm text-white/60">
          <p className="font-medium">Built for realtors who demand quality over quantity.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
