-- CreateTable
CREATE TABLE "raw_webhook_payloads" (
    "id" SERIAL NOT NULL,
    "payload" JSONB NOT NULL,
    "source" VARCHAR(50) NOT NULL DEFAULT 'Tive',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "inngest_event_id" VARCHAR(255),
    "validation_errors" JSONB,
    "processing_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "raw_webhook_payloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry" (
    "id" SERIAL NOT NULL,
    "device_imei" VARCHAR(15) NOT NULL,
    "device_id" VARCHAR(255) NOT NULL,
    "ts" BIGINT NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'Tive',
    "type" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "temperature" DECIMAL(5,2),
    "humidity" DECIMAL(4,1),
    "light_level" DECIMAL(8,1),
    "accelerometer_x" DECIMAL(6,3),
    "accelerometer_y" DECIMAL(6,3),
    "accelerometer_z" DECIMAL(6,3),
    "accelerometer_magnitude" DECIMAL(6,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "device_imei" VARCHAR(15) NOT NULL,
    "device_id" VARCHAR(255) NOT NULL,
    "ts" BIGINT NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'Tive',
    "type" VARCHAR(50) NOT NULL DEFAULT 'Active',
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "altitude" DECIMAL(8,2),
    "location_accuracy" INTEGER,
    "location_accuracy_category" VARCHAR(10),
    "location_source" VARCHAR(50),
    "address_street" TEXT,
    "address_locality" VARCHAR(255),
    "address_state" VARCHAR(100),
    "address_country" VARCHAR(100),
    "address_postal_code" VARCHAR(20),
    "address_full_address" TEXT,
    "battery_level" INTEGER,
    "cellular_dbm" DECIMAL(6,2),
    "cellular_network_type" VARCHAR(50),
    "cellular_operator" VARCHAR(100),
    "wifi_access_points" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_latest" (
    "device_imei" VARCHAR(15) NOT NULL,
    "device_id" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'Tive',
    "last_ts" BIGINT NOT NULL,
    "last_temperature" DECIMAL(5,2),
    "last_humidity" DECIMAL(4,1),
    "last_light_level" DECIMAL(8,1),
    "last_accelerometer_x" DECIMAL(6,3),
    "last_accelerometer_y" DECIMAL(6,3),
    "last_accelerometer_z" DECIMAL(6,3),
    "last_accelerometer_magnitude" DECIMAL(6,3),
    "last_lat" DECIMAL(10,8),
    "last_lon" DECIMAL(11,8),
    "last_altitude" DECIMAL(8,2),
    "location_accuracy" INTEGER,
    "location_accuracy_category" VARCHAR(10),
    "location_source" VARCHAR(50),
    "address_street" TEXT,
    "address_locality" VARCHAR(255),
    "address_state" VARCHAR(100),
    "address_country" VARCHAR(100),
    "address_postal_code" VARCHAR(20),
    "address_full_address" TEXT,
    "battery_level" INTEGER,
    "cellular_dbm" DECIMAL(6,2),
    "cellular_network_type" VARCHAR(50),
    "cellular_operator" VARCHAR(100),
    "wifi_access_points" INTEGER,
    "latest_telemetry_id" INTEGER,
    "latest_location_id" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_latest_pkey" PRIMARY KEY ("device_imei")
);

-- CreateIndex
CREATE INDEX "idx_raw_payloads_status_created" ON "raw_webhook_payloads"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_raw_payloads_source" ON "raw_webhook_payloads"("source");

-- CreateIndex
CREATE INDEX "idx_raw_payloads_inngest_event" ON "raw_webhook_payloads"("inngest_event_id");

-- CreateIndex
CREATE INDEX "idx_telemetry_device_imei" ON "telemetry"("device_imei");

-- CreateIndex
CREATE INDEX "idx_telemetry_timestamp" ON "telemetry"("ts" DESC);

-- CreateIndex
CREATE INDEX "idx_telemetry_device_timestamp" ON "telemetry"("device_imei", "ts" DESC);

-- CreateIndex
CREATE INDEX "idx_telemetry_provider" ON "telemetry"("provider");

-- CreateIndex
CREATE INDEX "idx_location_device_imei" ON "locations"("device_imei");

-- CreateIndex
CREATE INDEX "idx_location_timestamp" ON "locations"("ts" DESC);

-- CreateIndex
CREATE INDEX "idx_location_device_timestamp" ON "locations"("device_imei", "ts" DESC);

-- CreateIndex
CREATE INDEX "idx_location_coordinates" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "idx_location_provider" ON "locations"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "device_latest_latest_telemetry_id_key" ON "device_latest"("latest_telemetry_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_latest_latest_location_id_key" ON "device_latest"("latest_location_id");

-- CreateIndex
CREATE INDEX "idx_device_latest_updated" ON "device_latest"("updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_device_latest_provider" ON "device_latest"("provider");

-- AddForeignKey
ALTER TABLE "device_latest" ADD CONSTRAINT "device_latest_latest_telemetry_id_fkey" FOREIGN KEY ("latest_telemetry_id") REFERENCES "telemetry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_latest" ADD CONSTRAINT "device_latest_latest_location_id_fkey" FOREIGN KEY ("latest_location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
