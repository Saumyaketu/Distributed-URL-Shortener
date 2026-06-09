type Referrer = {
  source: string;
  count: number;
};

const ReferrerBreakdown = ({ data }: { data: Referrer[] }) => {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Top Referrers</h2>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="text-gray-500">No referrer data yet.</p>
        ) : (
          data.map((item) => (
            <div
              key={item.source}
              className="flex justify-between items-center"
            >
              <span className="text-gray-700">{item.source}</span>
              <span className="font-medium bg-blue-100 text-blue-800 py-1 px-2 rounded-md">
                {item.count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReferrerBreakdown;
