import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  return (
    <nav className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1.5 py-1">
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
            {isLast || !item.to ? (
              <span className="text-foreground font-semibold truncate max-w-[150px] sm:max-w-xs" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="hover:text-primary transition-colors py-1">
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
