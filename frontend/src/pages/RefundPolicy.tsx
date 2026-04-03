import PolicyPage from "@/components/PolicyPage";

const sections = [
  {
    title: "Eligibility For Refunds",
    content: [
      "Refund requests are reviewed for orders that arrive damaged, incorrect, materially defective, or are cancelled before dispatch. To help us validate the issue, customers should contact us as soon as possible with order details, photographs, and a short description of the problem.",
      "Because many decorative chemical products are sensitive to handling, storage, and contamination after opening, used or partially consumed items may not be eligible for a refund unless there is a verified manufacturing issue.",
    ],
  },
  {
    title: "Non-Returnable Situations",
    content: [
      "Products may not qualify for refund if the issue is caused by incorrect application, incompatible substrates, poor storage conditions, change of mind after dispatch, or normal variation that was clearly disclosed in product guidance.",
      "Custom, made-to-order, bulk-mixed, or specially sourced items may also be non-refundable unless they arrive damaged or do not match the confirmed order specification.",
    ],
  },
  {
    title: "Request Process",
    content: [
      "Please raise refund concerns through our contact page, email, or phone support with your order number and supporting evidence. We may ask follow-up questions before approving a replacement, store credit, partial refund, or full refund.",
      "Where a physical return is necessary, the item should be sent back only after approval and according to the return instructions shared by our team.",
    ],
  },
  {
    title: "Refund Timelines",
    content: [
      "Once a refund is approved, we begin processing it within a reasonable business window. Final credit timing depends on your original payment method, bank, or payment provider.",
      "If a replacement is more practical than a refund, we may offer that option first so your project is not delayed unnecessarily.",
    ],
  },
  {
    title: "Support Before Purchase",
    content: [
      "If you are unsure which finish, activator, or protective system is right for your project, contact us before ordering. Pre-purchase guidance often prevents avoidable returns and helps ensure a better application outcome.",
    ],
  },
];

const RefundPolicy = () => (
  <PolicyPage
    eyebrow="Orders"
    title="Refund Policy"
    description="The situations in which refunds, replacements, or credits may be issued for products ordered from Vanca Interio Patina."
    lastUpdated="April 1, 2026"
    sections={sections}
  />
);

export default RefundPolicy;
