import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import SectionHeading from "@/components/SectionHeading";
import { motion, AnimatePresence } from "framer-motion";

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Rating", value: "rating" },
];

const Shop = () => {
  const { products, loading, error } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial category from URL params, default to "All"
  const initialCategory = searchParams.get("category") || "All";
  
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedFinish, setSelectedFinish] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Update URL when category changes
  useEffect(() => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (selectedCategory === "All") {
      nextSearchParams.delete("category");
    } else {
      nextSearchParams.set("category", selectedCategory);
    }

    setSearchParams(nextSearchParams, { replace: true });
  }, [selectedCategory, searchParams, setSearchParams]);


  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    return cats;
  }, [products]);

  const finishTypes = useMemo(() => {
    const types = [...new Set(products.map((p) => p.finishType))].filter(Boolean);
    return types;
  }, [products]);

  const filtered = useMemo(() => {
    const result = products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === "All" || p.category === selectedCategory;
      const matchFinish = selectedFinish === "All" || p.finishType === selectedFinish;
      return matchSearch && matchCategory && matchFinish;
    });

    switch (sortBy) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "rating": result.sort((a, b) => b.rating - a.rating); break;
      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        );
    }
    
    return result;
  }, [products, search, selectedCategory, selectedFinish, sortBy]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 lg:px-8">
        <SectionHeading subtitle="Collection" title="Our Products" description="Explore our premium range of patina solutions and metal finishing products" />

        {loading && (
          <div className="flex justify-center items-center py-20 text-xl font-medium animate-pulse text-zinc-400">
            Syncing catalog securely from Database...
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
            <p className="text-red-800 font-semibold">Error Loading Products</p>
            <p className="text-red-600 mt-2">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No products found</p>
            <p className="text-sm mt-2">Check back later for new items</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <>
            {/* Search & Filters bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden flex items-center gap-2 px-4 py-3 glass rounded-lg text-foreground"
              >
                <SlidersHorizontal className="w-4 h-4" /> Filters
              </button>
            </div>

            <div className="flex gap-8">
              {/* Sidebar Filters */}
              <aside className={`${showFilters ? "block" : "hidden"} md:block w-full md:w-56 shrink-0`}>
                <div className="glass-card p-6 space-y-6 sticky top-24">
                  {categories.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 text-sm">Category</h4>
                      <div className="flex flex-col gap-2">
                        {["All", ...categories].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`text-sm text-left px-3 py-1.5 rounded transition-colors ${
                              selectedCategory === cat
                                ? "bg-primary/20 text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {finishTypes.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 text-sm">Finish Type</h4>
                      <div className="flex flex-col gap-2">
                        {["All", ...finishTypes].map((f) => (
                          <button
                            key={f}
                            onClick={() => setSelectedFinish(f)}
                            className={`text-sm text-left px-3 py-1.5 rounded transition-colors ${
                              selectedFinish === f
                                ? "bg-primary/20 text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </aside>

              {/* Product Grid */}
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-6">
                  {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedCategory}-${selectedFinish}-${sortBy}-${search}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {filtered.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </motion.div>
                </AnimatePresence>
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No products match your filters. Try adjusting your search.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Shop;
