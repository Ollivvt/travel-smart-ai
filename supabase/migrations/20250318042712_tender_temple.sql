/*
  # Add departure and return points to trips

  1. New Columns
    - `departure_point_name` (text) - Name of the departure location
    - `departure_point_address` (text) - Address of the departure location
    - `departure_point_latitude` (double precision) - Latitude of departure point
    - `departure_point_longitude` (double precision) - Longitude of departure point
    - `return_point_name` (text) - Name of the return location
    - `return_point_address` (text) - Address of the return location
    - `return_point_latitude` (double precision) - Latitude of return point
    - `return_point_longitude` (double precision) - Longitude of return point
    - `same_return_point` (boolean) - Whether return point is same as departure
*/

ALTER TABLE trips
ADD COLUMN departure_point_name text,
ADD COLUMN departure_point_address text,
ADD COLUMN departure_point_latitude double precision,
ADD COLUMN departure_point_longitude double precision,
ADD COLUMN return_point_name text,
ADD COLUMN return_point_address text,
ADD COLUMN return_point_latitude double precision,
ADD COLUMN return_point_longitude double precision,
ADD COLUMN same_return_point boolean DEFAULT true;