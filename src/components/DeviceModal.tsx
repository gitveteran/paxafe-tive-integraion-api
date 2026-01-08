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
            {device.deviceId}
          </Modal.Title>
          <p className="text-muted small mb-0 font-monospace">{device.deviceImei}</p>
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className="container-fluid">
          <div className="row g-4">
            {/* Sensor Data Section */}
            <div className="col-md-6">
              <h6 className="text-uppercase text-muted fw-bold mb-3">Sensor Data</h6>
              <div className="list-group list-group-flush">
                <DetailRow label="Temperature" value={device.lastTemperature !== null ? `${formatNumber(device.lastTemperature, 2)}°C` : 'N/A'} />
                <DetailRow label="Humidity" value={device.lastHumidity !== null ? `${formatNumber(device.lastHumidity, 1)}%` : 'N/A'} />
                <DetailRow label="Light Level" value={device.lastLightLevel !== null ? `${formatNumber(device.lastLightLevel, 1)} lux` : 'N/A'} />
                {device.lastAccelerometerX !== null && (
                  <>
                    <hr className="my-2" />
                    <DetailRow label="Accelerometer X" value={formatNumber(device.lastAccelerometerX, 3)} />
                    <DetailRow label="Accelerometer Y" value={formatNumber(device.lastAccelerometerY, 3)} />
                    <DetailRow label="Accelerometer Z" value={formatNumber(device.lastAccelerometerZ, 3)} />
                    <DetailRow label="Magnitude" value={formatNumber(device.lastAccelerometerMagnitude, 3)} />
                  </>
                )}
              </div>
            </div>

            {/* Location Data Section */}
            <div className="col-md-6">
              <h6 className="text-uppercase text-muted fw-bold mb-3">Location Data</h6>
              <div className="list-group list-group-flush">
                <DetailRow label="Latitude" value={device.lastLat !== null ? formatNumber(device.lastLat, 6) : 'N/A'} />
                <DetailRow label="Longitude" value={device.lastLon !== null ? formatNumber(device.lastLon, 6) : 'N/A'} />
                <DetailRow label="Altitude" value={device.lastAltitude !== null ? `${formatNumber(device.lastAltitude, 2)}m` : 'N/A'} />
                <DetailRow label="Accuracy" value={device.locationAccuracy !== null ? `${device.locationAccuracy}m` : 'N/A'} />
                {device.locationAccuracyCategory && (
                  <div className="d-flex justify-content-between align-items-center py-2">
                    <span className="text-muted small">Accuracy Category</span>
                    <span className={`badge ${getAccuracyBadgeClass(device.locationAccuracyCategory)}`}>
                      {device.locationAccuracyCategory}
                    </span>
                  </div>
                )}
                <DetailRow label="Source" value={device.locationSource || 'N/A'} />
              </div>
            </div>

            {/* Address Section */}
            {device.addressFullAddress && (
              <div className="col-12">
                <hr />
                <h6 className="text-uppercase text-muted fw-bold mb-3">Address</h6>
                <div className="row g-3">
                  {device.addressStreet && (
                    <div className="col-md-6">
                      <DetailRow label="Street" value={device.addressStreet} />
                    </div>
                  )}
                  {device.addressLocality && (
                    <div className="col-md-6">
                      <DetailRow label="City" value={device.addressLocality} />
                    </div>
                  )}
                  {device.addressState && (
                    <div className="col-md-6">
                      <DetailRow label="State" value={device.addressState} />
                    </div>
                  )}
                  {device.addressCountry && (
                    <div className="col-md-6">
                      <DetailRow label="Country" value={device.addressCountry} />
                    </div>
                  )}
                  {device.addressPostalCode && (
                    <div className="col-md-6">
                      <DetailRow label="Postal Code" value={device.addressPostalCode} />
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <DetailRow label="Full Address" value={device.addressFullAddress} />
                </div>
              </div>
            )}

            {/* Device Status Section */}
            <div className="col-12">
              <hr />
              <h6 className="text-uppercase text-muted fw-bold mb-3">Device Status</h6>
              <div className="row g-3">
                <div className="col-md-6">
                  {device.batteryLevel !== null ? (
                    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                      <span className="text-muted small">Battery</span>
                      <span className={`badge ${getBatteryBadgeClass(device.batteryLevel)}`}>
                        {device.batteryLevel}%
                      </span>
                    </div>
                  ) : (
                    <DetailRow label="Battery" value="N/A" />
                  )}
                </div>
                <div className="col-md-6">
                  <DetailRow label="Cellular Signal" value={device.cellularDbm !== null ? `${formatNumber(device.cellularDbm, 1)} dBm` : 'N/A'} />
                </div>
                <div className="col-md-6">
                  <DetailRow label="Network Type" value={device.cellularNetworkType || 'N/A'} />
                </div>
                <div className="col-md-6">
                  <DetailRow label="Operator" value={device.cellularOperator || 'N/A'} />
                </div>
                <div className="col-md-6">
                  <DetailRow label="WiFi APs" value={device.wifiAccessPoints !== null ? device.wifiAccessPoints.toString() : 'N/A'} />
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
                  <DetailRow label="Last Timestamp" value={formatTimestamp(device.lastTs)} />
                </div>
                <div className="col-md-6">
                  <DetailRow label="Last Updated" value={formatTimestamp(new Date(device.updatedAt).getTime())} />
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
