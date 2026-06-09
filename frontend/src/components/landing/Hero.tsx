import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="py-24 text-center">
      <h1 className="text-5xl font-bold mb-6">Distributed URL Shortener</h1>

      <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
        Shorten URLs at scale using Redis caching, analytics, rate limiting and
        JWT authentication.
      </p>

      <div className="flex justify-center gap-4">
        <Link
          to="/register"
          className="px-6 py-3 bg-black text-white rounded-md"
        >
          Get Started
        </Link>

        <a
          href="https://github.com/Saumyaketu/Distributed-URL-Shortener"
          target="_blank"
          rel="noreferrer"
          className="px-6 py-3 border rounded-md"
        >
          GitHub
        </a>
      </div>
    </section>
  );
};

export default Hero;
