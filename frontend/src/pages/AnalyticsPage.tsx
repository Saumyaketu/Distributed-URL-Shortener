import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getUrlAnalytics } from "../services/analytics.service";
import {
  Loader2,
  ArrowLeft,
  BarChart2,
  MonitorSmartphone,
  Globe,
} from "lucide-react";

const AnalyticsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (id) {
          const result = await getUrlAnalytics(id);
          setAnalytics(result);
        }
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-gray-400" />
      </div>
    );
  }

  const allClicks = analytics?.analytics?.recentClicks || [];
  const totalPages = Math.ceil(allClicks.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentClicks = allClicks.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link
        to="/dashboard"
        className="text-blue-600 hover:underline flex items-center gap-2 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <BarChart2 className="h-6 w-6 text-blue-500" /> URL Analytics
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-gray-50 rounded-md border">
            <p className="text-sm text-gray-500 font-medium">Total Clicks</p>
            <p className="text-3xl font-bold text-black">
              {analytics?.analytics?.totalClicks ||
                analytics?.url?.clickCount ||
                0}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border">
            <p className="text-sm text-gray-500 font-medium">Unique Visitors</p>
            <p className="text-3xl font-bold text-black">
              {analytics?.analytics?.uniqueVisitors || 0}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-md border">
            <p className="text-sm text-gray-500 font-medium">Short URL</p>
            <p className="text-sm text-black break-all">
              {analytics?.url?.shortCode
                ? `/${analytics.url.shortCode}`
                : "N/A"}
            </p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">Recent Visits</h2>
        <div className="space-y-3 mb-6">
          {currentClicks.length > 0 ? (
            currentClicks.map((click: any, index: number) => (
              <div
                key={index}
                className="p-4 border rounded-md flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 gap-4"
              >
                <div className="flex flex-col gap-1 overflow-hidden w-full md:w-2/3">
                  <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                    <Globe className="h-4 w-4 text-gray-500" />
                    {click.ipAddress || "Unknown IP"}
                    <span className="text-gray-400 font-normal px-2">•</span>
                    <span className="text-gray-600 font-normal">
                      Referrer: {click.referrer || "Direct"}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 text-xs text-gray-500 truncate"
                    title={click.userAgent}
                  >
                    <MonitorSmartphone className="h-4 w-4" />
                    {click.userAgent || "Unknown Device"}
                  </div>
                </div>

                <div className="text-sm text-gray-500 whitespace-nowrap">
                  {new Date(click.clickedAt).toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No clicks recorded yet.</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-gray-500">
              Showing {startIndex + 1} to{" "}
              {Math.min(startIndex + itemsPerPage, allClicks.length)} of{" "}
              {allClicks.length} entries
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm font-medium flex items-center">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
