/*
  # Add trip details columns

  1. Changes
    - Add new columns to trips table:
      - `pace` (text): Trip pace preference (relaxed, balanced, intensive)
      - `accommodation_name` (text): Name of accommodation
      - `accommodation_address` (text): Address of accommodation
      - `accommodation_latitude` (double precision): Latitude of accommodation
      - `accommodation_longitude` (double precision): Longitude of accommodation
      - `must_see_attractions` (text[]): Array of must-see attraction names

  2. Security
    - Existing RLS policies will cover the new columns
*/

ALTER TABLE trips
ADD COLUMN pace text NOT NULL DEFAULT 'balanced' CHECK (pace IN ('relaxed', 'balanced', 'intensive')),
ADD COLUMN accommodation_name text,
ADD COLUMN accommodation_address text,
ADD COLUMN accommodation_latitude double precision,
ADD COLUMN accommodation_longitude double precision,
ADD COLUMN must_see_attractions text[] DEFAULT '{}';