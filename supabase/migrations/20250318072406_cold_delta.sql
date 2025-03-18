/*
  # Fix arrival_time column type

  1. Changes
    - Modify arrival_time column to accept text instead of time to support flexible time formats
    - This allows for both specific times (HH:MM) and descriptive periods (morning, afternoon, etc.)

  2. Security
    - Maintains existing RLS policies
*/

ALTER TABLE trip_locations
ALTER COLUMN arrival_time TYPE text;