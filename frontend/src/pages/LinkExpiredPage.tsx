import { Link } from "react-router-dom";
import { Clock, Home } from "lucide-react";

const LinkExpiredPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-orange-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900">Link Expired</h1>

        <p className="text-gray-500 text-lg">
          Oops! The creator of this short link set an expiration date, and that
          time has passed.
        </p>

        <div className="pt-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            <Home className="w-5 h-5" />
            Go to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LinkExpiredPage;
