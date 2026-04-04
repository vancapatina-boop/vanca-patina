import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, Mail, Phone } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";

type PolicySection = {
  title: string;
  content: string[];
};

interface PolicyPageProps {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  sections: PolicySection[];
}

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.55 },
};

const PolicyPage = ({
  eyebrow,
  title,
  description,
  lastUpdated,
  sections,
}: PolicyPageProps) => (
  <div className="min-h-screen pt-24 pb-16">
    <div className="container mx-auto px-4 lg:px-8">
      <SectionHeading
        subtitle={eyebrow}
        title={title}
        description={description}
      />

      <motion.div
        {...fadeUp}
        className="glass-card max-w-5xl mx-auto overflow-hidden"
      >
        <div className="grid lg:grid-cols-[1.1fr_2fr]">
          <aside className="border-b lg:border-b-0 lg:border-r border-border/60 bg-secondary/35 p-8">
            <div className="rounded-2xl border border-border/50 bg-background/40 p-5">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock3 className="h-4 w-4 text-primary" />
                <span>Last updated {lastUpdated}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                If you need help interpreting any of these terms, our team can
                walk you through them before you place an order.
              </p>
            </div>

            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-primary" />
                <span>vancapatina@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-primary" />
                <span>+91 8882359695</span>
              </div>
            </div>

            <div className="mt-8 border-t border-border/50 pt-6">
              <p className="text-xs uppercase tracking-[0.26em] text-primary">
                Related Pages
              </p>
              <div className="mt-4 space-y-3">
                {[
                  { to: "/privacy-policy", label: "Privacy Policy" },
                  { to: "/terms-and-conditions", label: "Terms & Conditions" },
                  { to: "/refund-policy", label: "Refund Policy" },
                  { to: "/shipping-policy", label: "Shipping Policy" },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-4 py-3 text-sm text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <div className="p-8 md:p-10">
            <div className="space-y-8">
              {sections.map((section, index) => (
                <motion.section
                  key={section.title}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: index * 0.06 }}
                  className="rounded-2xl border border-border/40 bg-background/30 p-6"
                >
                  <h3 className="text-xl font-display font-semibold text-foreground">
                    {section.title}
                  </h3>
                  <div className="mt-4 space-y-4">
                    {section.content.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-sm leading-7 text-muted-foreground md:text-[0.97rem]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

export default PolicyPage;
