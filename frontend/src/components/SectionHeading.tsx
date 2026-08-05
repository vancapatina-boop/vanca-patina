import { motion } from "framer-motion";

interface SectionHeadingProps {
  subtitle?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  isPageHeader?: boolean;
}

const SectionHeading = ({ 
  subtitle, 
  title, 
  description, 
  align = "center",
  isPageHeader = false
}: SectionHeadingProps) => {
  const HeadingTag = isPageHeader ? "h1" : "h2";

  return (
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
      <HeadingTag className="text-3xl md:text-4xl font-display font-bold text-foreground mt-2">
        {title}
      </HeadingTag>
      {description && (
        <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">{description}</p>
      )}
    </motion.div>
  );
};

export default SectionHeading;
