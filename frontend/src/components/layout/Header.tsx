import { Link, useNavigate } from "react-router-dom";
import { User } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { logoutUser } from "../../services/auth.service";

const Header = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      navigate("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <header className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to={user ? "/dashboard" : "/"} className="text-xl font-bold">
          URLShortener
        </Link>

        {!user ? (
          <div className="flex items-center gap-6">
            <Link to="/login">Login</Link>

            <Link
              to="/register"
              className="px-4 py-2 bg-black text-white rounded-md"
            >
              Register
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <User size={20} />
            <span className="text-gray-600">{user.name}</span>

            <button onClick={handleLogout} className="text-red-600">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
