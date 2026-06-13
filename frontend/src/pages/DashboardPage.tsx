import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Copy,
  Trash2,
  ExternalLink,
  BarChart,
  QrCode,
} from "lucide-react";
import toast from "react-hot-toast";
import { QRCodeCanvas } from "qrcode.react";

import { createUrl, getUserUrls, deleteUrl } from "../services/url.service";
import type { Url } from "../types/url";

const DashboardPage = () => {
  const [urls, setUrls] = useState<Url[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);

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
      toast.success("URL deleted successfully");
    } catch (err) {
      console.error("Failed to delete URL", err);
      toast.error("Failed to delete URL");
    }
  };

  const copyToClipboard = (shortCode: string) => {
    const fullUrl = `${import.meta.env.VITE_BASE_URL}/${shortCode}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Copied to clipboard!");
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById(
      "qr-code-canvas",
    ) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");

      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = "short-url-qr.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
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
                    onClick={() =>
                      setQrModalUrl(
                        `${import.meta.env.VITE_BASE_URL}/${url.shortCode}`,
                      )
                    }
                    className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                    title="Generate QR Code"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>

                  <Link
                    to={`/analytics/${url._id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="View Analytics"
                  >
                    <BarChart className="h-5 w-5" />
                  </Link>

                  <button
                    onClick={() => handleDelete(url._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete URL"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {qrModalUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4 max-w-sm w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800">Your QR Code</h3>

              <div className="p-4 bg-white border-2 border-gray-100 rounded-xl">
                <QRCodeCanvas
                  value={qrModalUrl}
                  size={200}
                  id="qr-code-canvas"
                  level={"H"}
                />
              </div>

              <p className="text-sm text-gray-500 text-center break-all">
                {qrModalUrl}
              </p>

              <div className="flex w-full gap-3 pt-2">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Download
                </button>
                <button
                  onClick={() => setQrModalUrl(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
