import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Loader2,
  Copy,
  Trash2,
  ExternalLink,
  BarChart,
  User,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { logoutUser } from "../services/auth.service";
import { createUrl, getUserUrls, deleteUrl } from "../services/url.service";
import type { Url } from "../types/url";

const DashboardPage = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [urls, setUrls] = useState<Url[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUrl, setNewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUrls();
  }, []);

  const fetchUrls = async () => {
    try {
      const response = await getUserUrls();
      setUrls(response.data);
    } catch (err) {
      console.error("Failed to fetch URLs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to log out. Please try again.");
    }
  };

  const handleCreateUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;

    try {
      setIsSubmitting(true);
      setError("");
      await createUrl(newUrl);
      setNewUrl("");
      await fetchUrls();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create short URL");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this URL?")) return;

    try {
      await deleteUrl(id);
      setUrls(urls.filter((url) => url._id !== id));
    } catch (err) {
      console.error("Failed to delete URL", err);
      alert("Failed to delete URL");
    }
  };

  const copyToClipboard = (shortCode: string) => {
    const fullUrl = `${import.meta.env.VITE_BASE_URL}/${shortCode}`;
    navigator.clipboard.writeText(fullUrl);
    alert("Copied to clipboard!");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8 pb-4 border-b">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <User size={20} />
          <span className="text-gray-600 font-medium">
            {user?.name || "User"}
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 transition-colors font-medium text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Create New Short URL</h2>
        <form onSubmit={handleCreateUrl} className="flex gap-4">
          <input
            type="url"
            required
            placeholder="https://example.com/very/long/url"
            className="flex-1 border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-black text-white rounded-md font-medium disabled:opacity-50 flex items-center justify-center min-w-30"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              "Shorten"
            )}
          </button>
        </form>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your URLs</h2>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
          </div>
        ) : urls.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            You haven't created any short URLs yet.
          </div>
        ) : (
          <div className="space-y-4">
            {urls.map((url) => (
              <div
                key={url._id}
                className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow"
              >
                <div className="overflow-hidden w-full md:w-auto">
                  <div className="flex items-center gap-2 mb-1">
                    <a
                      href={`${import.meta.env.VITE_BASE_URL}/${url.shortCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-bold text-lg hover:underline flex items-center gap-1"
                    >
                      /{url.shortCode}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p
                    className="text-gray-500 text-sm truncate max-w-md"
                    title={url.originalUrl}
                  >
                    {url.originalUrl}
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <span className="text-sm text-gray-400 mr-4">
                    {new Date(url.createdAt).toLocaleDateString()}
                  </span>

                  <button
                    onClick={() => copyToClipboard(url.shortCode)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => handleDelete(url._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete URL"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>

                  <Link
                    to={`/analytics/${url._id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="View Analytics"
                  >
                    <BarChart className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
