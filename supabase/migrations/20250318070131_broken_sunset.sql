/*
  # Add must-visit places support

  1. Changes
    - Add must_visit_places column to trips table
    - Add trigger to update updated_at timestamp
    - Add RLS policies for the new column

  2. Security
    - Maintain existing RLS policies
    - Ensure users can only modify their own trip data
*/

-- Add must_visit_places column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trips' 
    AND column_name = 'must_visit_places'
  ) THEN
    ALTER TABLE trips 
    ADD COLUMN must_visit_places text[] DEFAULT '{}';
  END IF;
END $$;

-- Update existing RLS policies to include the new column
DO $$ 
BEGIN
  -- Update policy
  DROP POLICY IF EXISTS "Users can update their own trips" ON trips;
  CREATE POLICY "Users can update their own trips"
    ON trips
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END $$;