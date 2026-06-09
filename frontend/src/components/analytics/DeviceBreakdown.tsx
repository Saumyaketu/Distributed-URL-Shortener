type Device = {
  device: string;
  count: number;
};

const DeviceBreakdown = ({ data }: { data: Device[] }) => {
  const total = data.reduce((acc, item) => acc + item.count, 0);

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Device Breakdown</h2>
      <div className="space-y-3">
        {data.length === 0 || total === 0 ? (
          <p className="text-gray-500">No device data yet.</p>
        ) : (
          data.map((item) => (
            <div
              key={item.device}
              className="flex justify-between items-center"
            >
              <span className="text-gray-700">{item.device}</span>
              <span className="font-medium text-gray-900">
                {Math.round((item.count / total) * 100)}%
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeviceBreakdown;
