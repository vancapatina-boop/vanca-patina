import React from "react";
import { Link } from "react-router-dom";
import SectionHeading from "@/components/SectionHeading";
import { motion } from "framer-motion";
import { Beaker, Package, Shield, Wrench, Palette, FlaskConical } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";

const icons = [Beaker, Package, Shield, Wrench, Palette, FlaskConical];

const Categories = () => {
  const { products, loading, error } = useProducts();

  console.log("📂 Categories page - products count:", products.length);

  const categories = React.useMemo(() => {
    const counts = products.reduce((acc, p) => {
      const cat = p.category || "General";
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Sort by product count
  }, [products]);

  console.log("📂 All categories:", categories);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 text-center text-muted-foreground">
        <div className="animate-pulse">Loading categories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16 text-center">
        <p className="text-destructive font-semibold">Failed to load categories</p>
        <p className="text-muted-foreground mt-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-16 text-center text-muted-foreground">
        No categories available
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <SEO
        title="Product Categories - Patina & Finishing Solutions"
        description="Browse our decorative metal finishing products by category. Find premium patina solutions, protective coatings, aging chemicals, and professional kits."
        keywords="patina categories, metal finishing solutions, rust aging chemicals, protective metal coatings"
      />
      <div className="container mx-auto px-4 lg:px-8">
        <Breadcrumbs items={[{ label: "Categories" }]} />
        <SectionHeading
          subtitle="Browse"
          title="Product Categories"
          description="Find the perfect solution for your metal finishing project"
          isPageHeader
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {categories.map((cat, i) => {
            const Icon = icons[i % icons.length];
            return (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <Link
                  to={`/shop?category=${encodeURIComponent(cat.name)}`}
                  className="glass-card p-10 block group hover-glow transition-all h-full"
                >
                  <div className="w-16 h-16 rounded-full gradient-copper flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-4">
                    Premium solutions for your projects
                  </p>
                  <span className="text-sm text-primary font-medium">{cat.count} product{cat.count !== 1 ? "s" : ""} →</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;
