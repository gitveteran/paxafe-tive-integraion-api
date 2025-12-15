'use client';

import { useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { DeviceState } from '@/types/device';
import { formatNumber, formatTimestamp } from '@/lib/utils/format';

interface DeviceModalProps {
  device: DeviceState | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DeviceModal({ device, isOpen, onClose }: DeviceModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!device) return null;

  return (
    <Modal
      show={isOpen}
      onHide={onClose}
      size="xl"
      scrollable
      centered
      backdrop="static"
      keyboard
      className="device-modal"
    >
      <Modal.Header closeButton>
        <div>
          <Modal.Title id="deviceModalLabel" className="mb-1">
            {device.device_id}
          </Modal.Title>
          <p className="text-muted small mb-0 font-monospace">{device.device_imei}</p>
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className="container-fluid">
          <div className="row g-4">
            {/* Sensor Data Section */}
            <div className="col-md-6">
              <h6 className="text-uppercase text-muted fw-bold mb-3">Sensor Data</h6>
              <div className="list-group list-group-flush">
                <DetailRow label="Temperature" value={device.last_temperature !== null ? `${formatNumber(device.last_temperature, 2)}°C` : 'N/A'} />
                <DetailRow label="Humidity" value={device.last_humidity !== null ? `${formatNumber(device.last_humidity, 1)}%` : 'N/A'} />
                <DetailRow label="Light Level" value={device.last_light_level !== null ? `${formatNumber(device.last_light_level, 1)} lux` : 'N/A'} />
                {device.last_accelerometer_x !== null && (
                  <>
                    <hr className="my-2" />
                    <DetailRow label="Accelerometer X" value={formatNumber(device.last_accelerometer_x, 3)} />
                    <DetailRow label="Accelerometer Y" value={formatNumber(device.last_accelerometer_y, 3)} />
                    <DetailRow label="Accelerometer Z" value={formatNumber(device.last_accelerometer_z, 3)} />
                    <DetailRow label="Magnitude" value={formatNumber(device.last_accelerometer_magnitude, 3)} />
                  </>
                )}
              </div>
            </div>

            {/* Location Data Section */}
            <div className="col-md-6">
              <h6 className="text-uppercase text-muted fw-bold mb-3">Location Data</h6>
              <div className="list-group list-group-flush">
                <DetailRow label="Latitude" value={device.last_lat !== null ? formatNumber(device.last_lat, 6) : 'N/A'} />
                <DetailRow label="Longitude" value={device.last_lon !== null ? formatNumber(device.last_lon, 6) : 'N/A'} />
                <DetailRow label="Altitude" value={device.last_altitude !== null ? `${formatNumber(device.last_altitude, 2)}m` : 'N/A'} />
                <DetailRow label="Accuracy" value={device.location_accuracy !== null ? `${device.location_accuracy}m` : 'N/A'} />
                {device.location_accuracy_category && (
                  <div className="d-flex justify-content-between align-items-center py-2">
                    <span className="text-muted small">Accuracy Category</span>
                    <span className={`badge ${getAccuracyBadgeClass(device.location_accuracy_category)}`}>
                      {device.location_accuracy_category}
                    </span>
                  </div>
                )}
                <DetailRow label="Source" value={device.location_source || 'N/A'} />
              </div>
            </div>

            {/* Address Section */}
            {device.address_full_address && (
              <div className="col-12">
                <hr />
                <h6 className="text-uppercase text-muted fw-bold mb-3">Address</h6>
                <div className="row g-3">
                  {device.address_street && (
                    <div className="col-md-6">
                      <DetailRow label="Street" value={device.address_street} />
                    </div>
                  )}
                  {device.address_locality && (
                    <div className="col-md-6">
                      <DetailRow label="City" value={device.address_locality} />
                    </div>
                  )}
                  {device.address_state && (
                    <div className="col-md-6">
                      <DetailRow label="State" value={device.address_state} />
                    </div>
                  )}
                  {device.address_country && (
                    <div className="col-md-6">
                      <DetailRow label="Country" value={device.address_country} />
                    </div>
                  )}
                  {device.address_postal_code && (
                    <div className="col-md-6">
                      <DetailRow label="Postal Code" value={device.address_postal_code} />
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <DetailRow label="Full Address" value={device.address_full_address} />
                </div>
              </div>
            )}

            {/* Device Status Section */}
            <div className="col-12">
              <hr />
              <h6 className="text-uppercase text-muted fw-bold mb-3">Device Status</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  {device.battery_level !== null ? (
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span className="text-muted small">Battery</span>
                      <span className={`badge ${getBatteryBadgeClass(device.battery_level)}`}>
                        {device.battery_level}%
                      </span>
                    </div>
                  ) : (
                    <DetailRow label="Battery" value="N/A" />
                  )}
                </div>
                <div className="col-md-6">
                  <DetailRow label="Cellular Signal" value={device.cellular_dbm !== null ? `${formatNumber(device.cellular_dbm, 1)} dBm` : 'N/A'} />
                </div>
                <div className="col-md-6">
                  <DetailRow label="Network Type" value={device.cellular_network_type || 'N/A'} />
                </div>
                <div className="col-md-6">
                  <DetailRow label="Operator" value={device.cellular_operator || 'N/A'} />
                </div>
                <div className="col-md-6">
                  <DetailRow label="WiFi APs" value={device.wifi_access_points !== null ? device.wifi_access_points.toString() : 'N/A'} />
                </div>
              </div>
            </div>

            {/* Metadata Section */}
            <div className="col-12">
              <hr />
              <h6 className="text-uppercase text-muted fw-bold mb-3">Metadata</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <DetailRow label="Provider" value={device.provider} />
                </div>
                <div className="col-md-6">
                  <DetailRow label="Last Timestamp" value={formatTimestamp(device.last_ts)} />
                </div>
                <div className="col-md-6">
                  <DetailRow label="Last Updated" value={formatTimestamp(new Date(device.updated_at).getTime())} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
      <span className="text-muted small">{label}</span>
      <span className="fw-medium">{value}</span>
    </div>
  );
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
