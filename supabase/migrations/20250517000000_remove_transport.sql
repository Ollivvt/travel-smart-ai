-- Remove transportation-related columns from trips table
ALTER TABLE trips
DROP COLUMN transportation_mode,
DROP COLUMN use_rideshare,
DROP COLUMN walking_comfort_distance,
DROP COLUMN avoid_highways,
DROP COLUMN avoid_tolls;
