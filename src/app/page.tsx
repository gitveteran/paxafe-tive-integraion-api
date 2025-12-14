'use client';

import { useEffect, useState } from 'react';

interface DeviceState {
  device_imei: string;
  device_id: string;
  provider: string;
  last_ts: number;
  last_temperature: number | null;
  last_lat: number | null;
  last_lon: number | null;
  location_accuracy: number | null;
  location_accuracy_category: string | null;
  location_source: string | null;
  address_full_address: string | null;
  battery_level: number | null;
  cellular_dbm: number | null;
  wifi_access_points: number | null;
  updated_at: string;
}

function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) {
    return 'N/A';
  }
  return num.toFixed(decimals);
}

export default function Home() {
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const response = await fetch('/api/devices?limit=50');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle both response structures (data.data.devices or data.devices)
      const devicesArray = data.data?.devices || data.devices || [];
      
      if (data.success && Array.isArray(devicesArray)) {
        setDevices(devicesArray);
      } else {
        setDevices([]);
        setError(data.message || data.error || 'Failed to fetch devices');
      }
    } catch (err) {
      setDevices([]); // Always ensure devices is an array
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString();
  };

  const getTemperatureColor = (temp: number | null) => {
    if (temp === null) return 'text-gray-500';
    if (temp < 2) return 'text-blue-600';
    if (temp > 8) return 'text-red-600';
    return 'text-green-600';
  };

  const getBatteryColor = (battery: number | null) => {
    if (battery === null) return 'text-gray-500';
    if (battery < 20) return 'text-red-600';
    if (battery < 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getAccuracyBadgeColor = (category: string | null) => {
    switch (category) {
      case 'High': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && devices.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Device State Dashboard</h1>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading device states...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Device State Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchDevices}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Device State Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={fetchDevices}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <span className="text-sm text-gray-500 self-center">
              Auto-refresh: 30s
            </span>
          </div>
        </div>

        {Array.isArray(devices) && devices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No devices found. Send some webhook payloads to see device states.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.isArray(devices) && devices.map((device) => (
              <div
                key={device.device_imei}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                {/* Device Header */}
                <div className="border-b pb-4 mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{device.device_id}</h2>
                  <p className="text-sm text-gray-500 font-mono">{device.device_imei}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Last update: {formatTimestamp(new Date(device.updated_at).getTime())}
                  </p>
                </div>

                {/* Sensor Data */}
                {device.last_temperature !== null && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Sensor Data</h3>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Temperature:</span>
                      <span className={`font-semibold ${getTemperatureColor(device.last_temperature ?? 0)}`}>
                        {formatNumber(device.last_temperature, 2)}°C
                      </span>
                    </div>
                  </div>
                )}

                {/* Location Data */}
                {device.last_lat !== null && device.last_lon !== null && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Location</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Coordinates:</span>
                        <span className="text-xs font-mono">
                          {formatNumber(device.last_lat, 6)}, {formatNumber(device.last_lon, 6)}
                        </span>
                      </div>
                      {device.location_accuracy !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Accuracy:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{device.location_accuracy}m</span>
                            {device.location_accuracy_category && (
                              <span className={`text-xs px-2 py-0.5 rounded ${getAccuracyBadgeColor(device.location_accuracy_category)}`}>
                                {device.location_accuracy_category}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {device.location_source && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Source:</span>
                          <span className="text-sm capitalize">{device.location_source}</span>
                        </div>
                      )}
                      {device.address_full_address && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-500 mb-1">Address:</p>
                          <p className="text-xs text-gray-700">{device.address_full_address}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Device Status */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Device Status</h3>
                  <div className="space-y-2">
                    {device.battery_level !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Battery:</span>
                        <span className={`font-semibold ${getBatteryColor(device.battery_level)}`}>
                          {device.battery_level}%
                        </span>
                      </div>
                    )}
                    {device.cellular_dbm !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Signal:</span>
                        <span className="text-sm">{formatNumber(device.cellular_dbm, 2)} dBm</span>
                      </div>
                    )}
                    {device.wifi_access_points !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">WiFi APs:</span>
                        <span className="text-sm">{device.wifi_access_points}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
