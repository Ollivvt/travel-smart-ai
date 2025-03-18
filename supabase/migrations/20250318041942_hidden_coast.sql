/*
  # Add transportation preferences

  1. Changes
    - Add new columns to trips table:
      - `transportation_mode` (text): Primary mode of transportation (public_transit, self_driving)
      - `use_rideshare` (boolean): Whether to include rideshare options
      - `walking_comfort_distance` (integer): Maximum walking distance in meters
      - `avoid_highways` (boolean): Preference for avoiding highways when self-driving
      - `avoid_tolls` (boolean): Preference for avoiding toll roads

  2. Security
    - Existing RLS policies will cover the new columns
*/

ALTER TABLE trips
ADD COLUMN transportation_mode text NOT NULL DEFAULT 'public_transit' CHECK (transportation_mode IN ('public_transit', 'self_driving')),
ADD COLUMN use_rideshare boolean DEFAULT false,
ADD COLUMN walking_comfort_distance integer DEFAULT 1000,
ADD COLUMN avoid_highways boolean DEFAULT false,
ADD COLUMN avoid_tolls boolean DEFAULT false;