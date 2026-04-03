import PolicyPage from "@/components/PolicyPage";

const sections = [
  {
    title: "Use Of The Website",
    content: [
      "By using this website, you agree to use it only for lawful purposes and in a way that does not harm the platform, interfere with other users, or misrepresent your identity, payment details, or order intent.",
      "We may update product pages, pricing, descriptions, availability, or website content at any time without prior notice when needed to reflect inventory, formulation changes, or operational updates.",
    ],
  },
  {
    title: "Orders And Acceptance",
    content: [
      "Submitting an order request does not automatically mean it has been accepted. Orders may be reviewed for stock availability, serviceability, payment verification, or risk checks before final confirmation.",
      "If we cannot fulfill an order, we may cancel it in whole or in part and notify you using the contact details provided during checkout.",
    ],
  },
  {
    title: "Product Usage Responsibility",
    content: [
      "Our decorative chemicals and finishes must be used according to product instructions, safety guidance, and good professional handling practices. Customers are responsible for checking compatibility with their project surfaces, environment, and intended finish before full application.",
      "Variation in metal type, surface preparation, climate, and application technique can affect final results, so sample testing is strongly recommended before production use.",
    ],
  },
  {
    title: "Pricing, Intellectual Property, And Content",
    content: [
      "All prices, offers, and product availability are subject to change without notice. Taxes, delivery charges, or location-based fees may be added at checkout where applicable.",
      "All text, graphics, product content, imagery, branding, and website presentation remain the property of Vanca Interio Patina unless otherwise stated and may not be copied or reused without permission.",
    ],
  },
  {
    title: "Liability And Governing Principles",
    content: [
      "To the maximum extent permitted by law, we are not liable for indirect, incidental, or project-specific losses arising from misuse, delayed application schedules, unsuitable substrate conditions, or third-party courier delays.",
      "Use of the website and all transactions through it are subject to the laws and applicable commercial practices governing our business operations in India.",
    ],
  },
];

const TermsAndConditions = () => (
  <PolicyPage
    eyebrow="Legal"
    title="Terms & Conditions"
    description="The rules, responsibilities, and order terms that apply when customers browse, purchase, and use products from Vanca Interio Patina."
    lastUpdated="April 1, 2026"
    sections={sections}
  />
);

export default TermsAndConditions;
