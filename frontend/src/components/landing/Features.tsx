import { Shield, BarChart3, Database, TimerReset } from "lucide-react";

const features = [
  {
    title: "Redis Caching",
    icon: Database,
    description: "Fast URL lookup using Redis.",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    description: "Track clicks and visitors.",
  },
  {
    title: "JWT Authentication",
    icon: Shield,
    description: "Secure user authentication.",
  },
  {
    title: "Rate Limiting",
    icon: TimerReset,
    description: "Prevent abuse and spam.",
  },
];

const Features = () => {
  return (
    <section className="py-20">
      <h2 className="text-3xl font-bold text-center mb-12">Features</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <div key={feature.title} className="border rounded-lg p-6">
              <Icon className="mb-4" />

              <h3 className="font-semibold mb-2">{feature.title}</h3>

              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Features;
