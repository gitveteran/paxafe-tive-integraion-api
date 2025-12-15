'use client';

import { useEffect, useState } from 'react';
import { DeviceTable } from '@/components/DeviceTable';
import { DeviceModal } from '@/components/DeviceModal';
import { DeviceState } from '@/types/device';

export default function Home() {
  const [devices, setDevices] = useState<DeviceState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<DeviceState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/devices?limit=50');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const devicesArray = data.data?.devices || data.devices || [];
      
      if (data.success && Array.isArray(devicesArray)) {
        setDevices(devicesArray);
      } else {
        setDevices([]);
        setError(data.message || data.error || 'Failed to fetch devices');
      }
    } catch (err) {
      setDevices([]);
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

  const handleRowClick = (device: DeviceState) => {
    setSelectedDevice(device);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDevice(null);
  };

  if (loading && devices.length === 0) {
    return (
      <main className="min-vh-100 bg-light">
        <div className="container-fluid py-4">
          <div className="container">
            <h1 className="display-5 fw-bold mb-4">Device State Dashboard</h1>
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-3">Loading device states...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-vh-100 bg-light">
        <div className="container-fluid py-4">
          <div className="container">
            <h1 className="display-5 fw-bold mb-4">Device State Dashboard</h1>
            <div className="alert alert-danger" role="alert">
              <h4 className="alert-heading">Error!</h4>
              <p>{error}</p>
              <hr />
              <button className="btn btn-danger" onClick={fetchDevices}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-vh-100 bg-light">
      <div className="container-fluid py-4">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
            <div>
              <h1 className="display-5 fw-bold mb-2">Device State Dashboard</h1>
              <p className="text-muted mb-0">Monitor your Tive IoT devices in real-time</p>
            </div>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <button
                className="btn btn-outline-primary"
                onClick={fetchDevices}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Refresh
                  </>
                )}
              </button>
              <span className="text-muted small">
                Auto-refresh: 30s
              </span>
            </div>
          </div>

          <DeviceTable devices={devices} onRowClick={handleRowClick} />
          
          <DeviceModal 
            device={selectedDevice} 
            isOpen={isModalOpen} 
            onClose={handleCloseModal} 
          />
        </div>
      </div>
    </main>
  );
}
