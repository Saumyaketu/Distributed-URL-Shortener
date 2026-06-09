import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import Footer from "../components/landing/Footer";

const LandingPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-6">
      <Hero />
      <Features />
      <Footer />
    </div>
  );
};

export default LandingPage;
