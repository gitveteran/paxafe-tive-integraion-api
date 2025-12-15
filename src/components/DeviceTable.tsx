'use client';

import { DeviceState } from '@/types/device';
import { formatNumber, formatTimestamp } from '@/lib/utils/format';

interface DeviceTableProps {
  devices: DeviceState[];
  onRowClick: (device: DeviceState) => void;
}

export function DeviceTable({ devices, onRowClick }: DeviceTableProps) {
  if (devices.length === 0) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <p className="text-muted mb-0">No devices found. Send some webhook payloads to see device states.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover table-striped mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">Device</th>
                <th scope="col">Temperature</th>
                <th scope="col">Location</th>
                <th scope="col">Battery</th>
                <th scope="col">Signal</th>
                <th scope="col">Last Update</th>
                <th scope="col" className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.device_imei}
                  onClick={() => onRowClick(device)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(device);
                    }
                  }}
                  aria-label={`View details for device ${device.device_id}`}
                >
                  <td>
                    <div>
                      <div className="fw-semibold">{device.device_id}</div>
                      <div className="text-muted small font-monospace">{device.device_imei}</div>
                    </div>
                  </td>
                  <td>
                    {device.last_temperature !== null ? (
                      <span className={`badge ${getTemperatureBadgeClass(device.last_temperature)}`}>
                        {formatNumber(device.last_temperature, 2)}°C
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </td>
                  <td>
                    {device.last_lat !== null && device.last_lon !== null ? (
                      <div>
                        <div className="small">
                          {formatNumber(device.last_lat, 4)}, {formatNumber(device.last_lon, 4)}
                        </div>
                        {device.location_accuracy_category && (
                          <span className={`badge ${getAccuracyBadgeClass(device.location_accuracy_category)} mt-1`}>
                            {device.location_accuracy_category}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </td>
                  <td>
                    {device.battery_level !== null ? (
                      <span className={`badge ${getBatteryBadgeClass(device.battery_level)}`}>
                        {device.battery_level}%
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </td>
                  <td>
                    {device.cellular_dbm !== null ? (
                      <span className="small">
                        {formatNumber(device.cellular_dbm, 1)} dBm
                      </span>
                    ) : (
                      <span className="text-muted">N/A</span>
                    )}
                  </td>
                  <td className="text-muted small">
                    {formatTimestamp(new Date(device.updated_at).getTime())}
                  </td>
                  <td className="text-end">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(device);
                      }}
                      aria-label="View details"
                    >
                      <i className="bi bi-eye me-1"></i> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getTemperatureBadgeClass(temp: number): string {
  if (temp < -20 || temp > 30) return 'bg-danger';
  if (temp < 2 || temp > 8) return 'bg-warning text-dark';
  return 'bg-success';
}

function getBatteryBadgeClass(battery: number): string {
  if (battery < 20) return 'bg-danger';
  if (battery < 50) return 'bg-warning text-dark';
  return 'bg-success';
}

function getAccuracyBadgeClass(category: string): string {
  if (category === 'High') return 'bg-success';
  if (category === 'Medium') return 'bg-warning text-dark';
  return 'bg-danger';
}
