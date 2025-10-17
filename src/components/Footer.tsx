import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-6">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-6 mb-4">
          <div className="col-span-2">
            <h3 className="text-xl font-bold mb-2">
              <span className="text-primary">RealtyLeadsAI</span>
            </h3>
            <p className="text-muted-foreground text-sm mb-2">
              Fresh real estate leads. Geo-verified. Scam-free.
            </p>
            <p className="text-xs text-muted-foreground">
              © 2025 RealtyLeadsAI. All rights reserved.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-foreground text-sm">Product</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">How It Works</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-foreground text-sm">Company</h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
