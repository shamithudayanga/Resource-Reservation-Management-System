-- Enable btree_gist extension for PostgreSQL exclusion constraint with ranges
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ROOM', 'EQUIPMENT', 'VEHICLE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable resources
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resources_name_key" ON "resources"("name");

-- CreateTable reservations
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "booked_by" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "start_time" TIMESTAMPTZ(6) NOT NULL,
    "end_time" TIMESTAMPTZ(6) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- Foreign Key
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Normal Composite Index for lookups
CREATE INDEX "reservations_resource_id_start_time_end_time_idx" ON "reservations"("resource_id", "start_time", "end_time");

-- CRITICAL BUSINESS RULES & CONSTRAINTS:
-- 1. Check constraint: end_time must be strictly after start_time
ALTER TABLE "reservations" 
ADD CONSTRAINT "check_end_time_after_start_time" 
CHECK ("end_time" > "start_time");

-- 2. PostgreSQL Exclusion Constraint: prevent overlapping CONFIRMED reservations for the same resource
-- [) represents closed-open interval: [start, end)
ALTER TABLE "reservations"
ADD CONSTRAINT "no_overlapping_confirmed_reservations"
EXCLUDE USING gist (
  "resource_id" WITH =,
  tstzrange("start_time", "end_time", '[)') WITH &&
)
WHERE ("status" = 'CONFIRMED');
