import PolicyPage from "@/components/PolicyPage";

const sections = [
  {
    title: "Information We Collect",
    content: [
      "We collect the information you share with us when you place an order, create an account, contact our team, or request product guidance. This may include your name, phone number, email address, shipping details, billing details, and order history.",
      "We may also collect limited technical information such as browser type, device details, and basic site usage data so we can improve site performance, troubleshoot issues, and understand how customers move through the store.",
    ],
  },
  {
    title: "How We Use Your Information",
    content: [
      "Your information is used to process orders, coordinate shipping, provide customer support, respond to product questions, send transactional updates, and maintain account security.",
      "We may use your contact details to share important service updates, fulfillment information, or responses to requests you initiated. We do not sell your personal information to third parties.",
    ],
  },
  {
    title: "Payments And Security",
    content: [
      "Payment transactions are handled through the payment services integrated with our storefront. We do not intentionally store full card data on our own systems unless clearly stated at checkout by a certified payment partner.",
      "We apply reasonable administrative and technical safeguards to protect account and order data, but no internet transmission or storage method can be guaranteed to be fully secure.",
    ],
  },
  {
    title: "Sharing And Retention",
    content: [
      "We share only the information needed to operate the business with trusted service providers such as payment processors, shipping partners, website infrastructure vendors, and support tools.",
      "We retain data for as long as it is reasonably needed for order fulfillment, support, tax and accounting records, compliance requirements, and dispute resolution.",
    ],
  },
  {
    title: "Your Choices",
    content: [
      "You may request correction or deletion of personal information that is no longer required for active orders, compliance obligations, or legitimate business needs. You may also contact us to update account details or ask how your information is being used.",
      "By continuing to use this website, you consent to this privacy policy and to reasonable updates made to keep it aligned with business operations and applicable requirements.",
    ],
  },
];

const PrivacyPolicy = () => (
  <PolicyPage
    eyebrow="Privacy"
    title="Privacy Policy"
    description="How Vanca Interio Patina collects, uses, and safeguards customer information across orders, support, and site usage."
    lastUpdated="April 1, 2026"
    sections={sections}
  />
);

export default PrivacyPolicy;
