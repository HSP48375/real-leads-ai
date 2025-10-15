import { Link } from "react-router-dom";

const Footer = () => {
  const footerLinks = {
    product: [
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: "Pricing", path: "/pricing" },
    ],
    company: [
      { name: "Contact Us", path: "/contact" },
    ],
  };

  return (
    <footer className="border-t border-white/10 py-16 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center">
                <span className="text-xl font-bold text-white">F</span>
              </div>
              <span className="text-2xl font-heading font-bold">Flowvia</span>
            </div>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Elevate your business strategy with Flowvia's intelligent platform for modern teams.
            </p>
            <p className="text-sm text-muted-foreground">
              © 2026 Flowvia. All rights reserved.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-heading font-bold mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-heading font-bold mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 text-center">
          <p className="text-sm text-muted-foreground">
            Built for modern teams who demand excellence.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
