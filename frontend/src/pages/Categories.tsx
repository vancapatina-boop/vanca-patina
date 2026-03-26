import { Link } from "react-router-dom";
import SectionHeading from "@/components/SectionHeading";
import { motion } from "framer-motion";
import { Beaker, Package, Shield, Wrench } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";

const icons = [Beaker, Package, Shield, Wrench];

const Categories = () => {
  const { products, loading, error } = useProducts();

  const categories = Array.from(
    products.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, count]) => ({ name, count }));

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 text-center text-muted-foreground">
        Loading categories...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-16 text-center text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionHeading
          subtitle="Browse"
          title="Product Categories"
          description="Find the perfect solution for your metal finishing project"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                  to="/shop"
                  className="glass-card p-10 block group hover-glow transition-all"
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
                  <span className="text-sm text-primary">{cat.count} products →</span>
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
