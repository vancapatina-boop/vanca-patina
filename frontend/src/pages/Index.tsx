import { Link } from "react-router-dom";
import { ArrowRight, Shield, Sparkles, Award, Star, Send } from "lucide-react";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-patina.jpg";
import { categories } from "@/data/products";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const Index = () => {
  const { products, loading } = useProducts();

  return (
    <div className="min-h-screen">
    {/* Hero */}
    <section className="relative h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Patina metal finish" width={1920} height={1080} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      </div>
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <span className="text-xs tracking-[0.3em] uppercase text-primary font-semibold">
            Premium Metal Finishes
          </span>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground mt-4 leading-tight">
            Art Meets <span className="text-gradient-copper">Chemistry</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-6 max-w-lg leading-relaxed">
            Transform ordinary metals into extraordinary works of art with our premium patina solutions and decorative chemical finishes.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-8 py-4 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all"
            >
              Explore Products <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/categories"
              className="inline-flex items-center gap-2 px-8 py-4 glass text-foreground font-semibold rounded-lg hover:border-primary/50 transition-all"
            >
              View Categories
            </Link>
          </div>
        </motion.div>
      </div>
    </section>

    {/* Featured Products */}
    <section className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionHeading
          subtitle="Curated Collection"
          title="Featured Products"
          description="Our most popular patina solutions and metal finishing products"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.slice(0, 4).map((product, i) => (
            <motion.div key={product.id} {...fadeUp} transition={{ duration: 0.6, delay: i * 0.1 }}>
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-primary hover:gap-3 transition-all font-semibold"
          >
            View All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>

    {/* Categories */}
    <section className="py-24 bg-card/30">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionHeading subtitle="Browse" title="Our Categories" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, i) => (
            <motion.div key={cat.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
              <Link
                to="/shop"
                className="glass-card p-8 block group hover-glow transition-all"
              >
                <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {cat.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">{cat.description}</p>
                <span className="text-xs text-primary mt-4 inline-block">{cat.count} products →</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Why Choose Us */}
    <section className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionHeading subtitle="Why Us" title="Crafted for Professionals" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Sparkles, title: "Unique Finishes", desc: "One-of-a-kind chemical formulations for effects you can't find anywhere else." },
            { icon: Shield, title: "Premium Quality", desc: "Lab-tested, professional-grade solutions trusted by architects and designers worldwide." },
            { icon: Award, title: "Expert Support", desc: "Dedicated technical support from experienced metal finishing professionals." },
          ].map((item, i) => (
            <motion.div key={item.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.15 }}>
              <div className="glass-card p-8 text-center">
                <div className="w-14 h-14 rounded-full gradient-copper flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Testimonials */}
    <section className="py-24 bg-card/30">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionHeading subtitle="Testimonials" title="Trusted by Professionals" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: "Arjun Mehta", role: "Interior Designer", text: "The patina solutions from Vanca have completely transformed my design projects. The quality is unmatched." },
            { name: "Priya Sharma", role: "Architect", text: "I've been using Vanca products for 3 years. The consistency and finish quality are truly professional-grade." },
            { name: "Ravi Kulkarni", role: "Metal Artist", text: "Finally, a brand that understands the craft. Their Verde Antiqua creates the most beautiful verdigris." },
          ].map((t, i) => (
            <motion.div key={t.name} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
              <div className="glass-card p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-6 italic">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Newsletter */}
    <section className="py-24">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div {...fadeUp} className="glass-card p-12 md:p-16 text-center max-w-3xl mx-auto shimmer">
          <h2 className="text-3xl font-display font-bold text-foreground">Stay Inspired</h2>
          <p className="text-muted-foreground mt-3 mb-8">
            Get exclusive access to new products, tutorials, and design inspiration.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-5 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="px-6 py-3 gradient-copper text-primary-foreground font-semibold rounded-lg hover-glow transition-all flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> Subscribe
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  </div>
  );
};

export default Index;
