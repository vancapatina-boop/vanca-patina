import { motion } from "framer-motion";
import SectionHeading from "@/components/SectionHeading";
import heroImage from "@/assets/hero-patina.jpg";
import SEO from "@/components/SEO";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const About = () => (
  <div className="min-h-screen pt-24 pb-16">
    <SEO
      title="About Us - Our Story"
      description="Learn about Vanca Patina, India's leading brand for decorative metal aging solutions, patina chemicals, finishing kits, and protective coatings."
      keywords="about vanca patina, vanca interio, metal restoration solutions, patina chemicals india"
    />
    <div className="container mx-auto px-4 lg:px-8">
      <SectionHeading subtitle="Our Story" title="About Vanca Patina" isPageHeader />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto mb-24">
        <motion.div {...fadeUp}>
          <div className="glass-card overflow-hidden">
            <img src={heroImage} alt="Copper patina finish" loading="lazy" width={1920} height={1080} className="w-full h-80 object-cover" />
          </div>
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
          <h3 className="text-2xl font-display font-bold text-foreground mb-4">Where Chemistry Meets Artistry</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Founded with a passion for transforming ordinary metals into extraordinary works of art, Vanca Patina has become India's leading brand for decorative chemical solutions.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Our premium patina chemicals, finishing kits, and protective coatings are trusted by interior designers, architects, artists, and metal workers across the country.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Every product is meticulously formulated in our lab and tested for consistency, safety, and stunning visual results. We believe that the beauty of aged metal shouldn't take decades — it should be accessible to every creative professional.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Vanca Patina is a brand of Vanca Interio, dedicated to premium metal finishing products including metal polish, patina chemicals, and restoration solutions. Our mission is to provide high-quality products for professionals, manufacturers, and hobbyists.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {[
          { stat: "500+", label: "Projects Completed" },
          { stat: "50+", label: "Product Formulations" },
          { stat: "1000+", label: "Happy Professionals" },
        ].map((item, i) => (
          <motion.div key={item.label} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}>
            <div className="glass-card p-8 text-center">
              <p className="text-4xl font-display font-bold text-gradient-copper">{item.stat}</p>
              <p className="text-sm text-muted-foreground mt-2">{item.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

export default About;
