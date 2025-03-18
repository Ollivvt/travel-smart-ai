/*
  # Add trip_locations table

  1. New Tables
    - `trip_locations`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `name` (text)
      - `address` (text)
      - `latitude` (double precision)
      - `longitude` (double precision)
      - `day_index` (integer)
      - `estimated_duration` (integer)
      - `arrival_time` (time)
      - `rating` (numeric)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `trip_locations` table
    - Add policies for authenticated users to manage their trip locations
*/

CREATE TABLE IF NOT EXISTS trip_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  day_index integer NOT NULL,
  estimated_duration integer,
  arrival_time time without time zone,
  rating numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own trip locations
CREATE POLICY "Users can read their own trip locations"
  ON trip_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_locations.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Allow users to insert trip locations for their trips
CREATE POLICY "Users can create locations for their trips"
  ON trip_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_locations.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Allow users to update their trip locations
CREATE POLICY "Users can update their trip locations"
  ON trip_locations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_locations.trip_id
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_locations.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Allow users to delete their trip locations
CREATE POLICY "Users can delete their trip locations"
  ON trip_locations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_locations.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER update_trip_locations_updated_at
  BEFORE UPDATE ON trip_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();