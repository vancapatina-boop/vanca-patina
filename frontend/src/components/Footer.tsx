import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-card/50">
    <div className="container mx-auto px-4 lg:px-8 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        <div>
          <h3 className="text-xl font-display font-bold text-gradient-copper mb-4">VANCA PATINA</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Premium decorative chemical solutions for metal finishes, patina effects, and artistic coatings.
          </p>
        </div>
        <div>
          <h4 className="font-semibold mb-4 text-foreground">Quick Links</h4>
          <div className="flex flex-col gap-2">
            {["/shop", "/categories", "/about", "/contact"].map((to) => (
              <Link key={to} to={to} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                {to.slice(1).charAt(0).toUpperCase() + to.slice(2)}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
          <div className="flex flex-col gap-2">
            {[
              { to: "/privacy-policy", label: "Privacy Policy" },
              { to: "/terms-and-conditions", label: "Terms & Conditions" },
              { to: "/refund-policy", label: "Refund Policy" },
              { to: "/shipping-policy", label: "Shipping Policy" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-4 text-foreground">Contact</h4>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> vancapatina@gmail.com</div>
            <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> +91 8882359695</div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> New Delhi</div>
          </div>
        </div>
      </div>
      <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
        © 2026 Vanca Patina. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
