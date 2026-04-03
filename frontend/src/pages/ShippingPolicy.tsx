import PolicyPage from "@/components/PolicyPage";

const sections = [
  {
    title: "Order Processing",
    content: [
      "Orders are typically processed after payment confirmation and basic verification checks. Dispatch timelines can vary depending on product availability, order size, packaging requirements, and destination serviceability.",
      "Business days exclude Sundays, public holidays, and exceptional closures required for maintenance, inventory reconciliation, or courier disruptions.",
    ],
  },
  {
    title: "Delivery Timelines",
    content: [
      "Estimated delivery windows are shared for convenience and should be treated as good-faith timelines rather than guaranteed delivery commitments. Remote locations, weather conditions, local restrictions, or carrier backlogs can extend transit times.",
      "If your project depends on a strict deadline, please contact us before ordering so we can confirm the best available dispatch option.",
    ],
  },
  {
    title: "Shipping Charges And Coverage",
    content: [
      "Shipping charges, if applicable, are calculated based on order size, package weight, destination, and courier availability. Some products may require special handling because of liquid content, packaging standards, or transport restrictions.",
      "We reserve the right to contact you if additional freight, handling, or documentation requirements apply to your location or the products selected.",
    ],
  },
  {
    title: "Tracking And Delivery Issues",
    content: [
      "When tracking is available, we share shipment details after dispatch so you can monitor progress. If a package appears delayed, lost, or damaged in transit, please notify us promptly so we can coordinate with the courier.",
      "Customers should inspect delivered packages as early as possible and report visible transit damage with photographs to support any claim or replacement review.",
    ],
  },
  {
    title: "Address Accuracy",
    content: [
      "Customers are responsible for providing complete and accurate shipping information. Delays, re-shipping costs, or failed deliveries caused by incorrect address or contact details may be chargeable.",
      "If an order needs urgent correction after placement, contact us immediately and we will do our best to update it before dispatch.",
    ],
  },
];

const ShippingPolicy = () => (
  <PolicyPage
    eyebrow="Delivery"
    title="Shipping Policy"
    description="How Vanca Interio Patina processes, dispatches, and supports deliveries for chemical finishes, patina products, and related orders."
    lastUpdated="April 1, 2026"
    sections={sections}
  />
);

export default ShippingPolicy;
