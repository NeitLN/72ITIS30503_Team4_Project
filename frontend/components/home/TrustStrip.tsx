import { Container } from '../ui/Container';

export const TrustStrip = () => {
  const highlights = [
    {
      title: "Verified Sellers",
      description: "Buy with confidence from trusted community members.",
      icon: "🛡️"
    },
    {
      title: "Condition Labels",
      description: "Complete transparency on every item's condition.",
      icon: "🏷️"
    },
    {
      title: "Local Brands",
      description: "Discover the best of Vietnamese streetwear.",
      icon: "🇻🇳"
    },
    {
      title: "VNĐ Pricing",
      description: "No hidden conversion fees. Pay in local currency.",
      icon: "💳"
    }
  ];

  return (
    <section className="border-b bg-gray-50 py-10">
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
          {highlights.map((item, i) => (
            <div key={i} className={`flex flex-col items-center text-center ${i !== 0 ? 'pt-8 sm:pt-0 sm:pl-8' : ''}`}>
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
