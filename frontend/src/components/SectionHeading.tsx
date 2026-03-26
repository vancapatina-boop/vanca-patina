import { motion } from "framer-motion";

interface SectionHeadingProps {
  subtitle?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

const SectionHeading = ({ subtitle, title, description, align = "center" }: SectionHeadingProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className={`mb-12 ${align === "center" ? "text-center" : "text-left"}`}
  >
    {subtitle && (
      <span className="text-xs tracking-[0.3em] uppercase text-primary font-semibold">
        {subtitle}
      </span>
    )}
    <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-2">
      {title}
    </h2>
    {description && (
      <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">{description}</p>
    )}
  </motion.div>
);

export default SectionHeading;
