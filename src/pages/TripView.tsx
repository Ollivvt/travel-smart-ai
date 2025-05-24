import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Navigation2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Trip } from '../types/trip';
import { ItineraryBuilder, Location } from '../components/ItineraryBuilder';
import { useAuth } from '../contexts/AuthContext';

export function TripView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_locations')
        .select('*')
        .eq('trip_id', id)
        .order('day_index, created_at');

      if (error) throw error;
      
      if (data) {
        const typedLocations = data.map(loc => ({
          id: loc.id,
          name: loc.name,
          address: loc.address,
          latitude: loc.latitude,
          longitude: loc.longitude,
          day_index: loc.day_index,
          estimated_duration: loc.estimated_duration || undefined,
          arrival_time: loc.arrival_time || undefined,
          rating: loc.rating || undefined,
          notes: loc.notes || undefined,
        }));
        setLocations(typedLocations);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchTripAndLocations = async () => {
      try {
        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .single();

        if (tripError) throw tripError;
        if (!tripData) throw new Error('Trip not found');

        setTrip({
          ...tripData,
          startDate: new Date(tripData.start_date),
          endDate: new Date(tripData.end_date),
          userId: tripData.user_id,
          mustVisitPlaces: tripData.must_visit_places || [],
          accommodation: {
            name: tripData.accommodation_name || '',
            address: tripData.accommodation_address || '',
            latitude: tripData.accommodation_latitude,
            longitude: tripData.accommodation_longitude,
          },
          departurePoint: {
            name: tripData.departure_point_name || '',
            address: tripData.departure_point_address || '',
            latitude: tripData.departure_point_latitude || 0,
            longitude: tripData.departure_point_longitude || 0,
          },
          returnPoint: {
            name: tripData.return_point_name || '',
            address: tripData.return_point_address || '',
            latitude: tripData.return_point_latitude || 0,
            longitude: tripData.return_point_longitude || 0,
          },
        });

        await fetchLocations();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    fetchTripAndLocations();
  }, [user, navigate, id]);

  const handleSaveItinerary = async (locationsToSave: Location[]) => {
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // First, get all current locations to identify ones to delete
      const { data: currentLocations } = await supabase
        .from('trip_locations')
        .select('id')
        .eq('trip_id', id);

      const currentIds = new Set(currentLocations?.map(loc => loc.id) || []);
      const newIds = new Set(locationsToSave.map(loc => loc.id));

      // Find IDs to delete (in current but not in new)
      const idsToDelete = Array.from(currentIds).filter(id => !newIds.has(id));

      // Split locations into new and existing
      const [existingLocations, newLocations] = locationsToSave.reduce<[Location[], Location[]]>(
        ([existing, newLocs], loc) => {
          if (currentIds.has(loc.id)) {
            existing.push(loc);
          } else {
            newLocs.push(loc);
          }
          return [existing, newLocs];
        }, 
        [[], []]
      );

      // Delete removed locations
      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('trip_locations')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) throw deleteError;
      }

      // Insert new locations
      if (newLocations.length > 0) {
        const { error: insertError } = await supabase
          .from('trip_locations')
          .insert(
            newLocations.map(loc => ({
              trip_id: id,
              ...loc
            }))
          );

        if (insertError) throw insertError;
      }

      // Update existing locations
      if (existingLocations.length > 0) {
        const { error: updateError } = await supabase
          .from('trip_locations')
          .upsert(
            existingLocations.map(loc => ({
              trip_id: id,
              ...loc,
              // Ensure required fields are set with proper fallbacks
              name: loc.name.trim(),
              address: loc.address?.trim() || loc.name.trim(),
              latitude: typeof loc.latitude === 'number' ? loc.latitude : 0,
              longitude: typeof loc.longitude === 'number' ? loc.longitude : 0,
              day_index: loc.day_index
            })),
            {
              onConflict: 'id',
              ignoreDuplicates: false
            }
          );

        if (updateError) throw updateError;
      }

      // Update local state
      setLocations(locationsToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save itinerary';
      setSaveError(`Error saving itinerary: ${message}`);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading trip details...</div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error || 'Trip not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {saveError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            Itinerary saved successfully!
          </div>
        )}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{trip.title}</h1>
              <div className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">From</span>
                    <span>{trip.departurePoint.name || trip.departurePoint.address}</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-500">To</span>
                    <span>{trip.returnPoint.name || trip.returnPoint.address}</span>
                  </div>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>
                    {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="h-5 w-5 mr-2" />
                  <span className="capitalize">{trip.pace} pace</span>
                </div>
                {trip.accommodation.name && (
                  <div className="flex items-center text-gray-600">
                    <Navigation2 className="h-5 w-5 mr-2" />
                    <span>{trip.accommodation.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ItineraryBuilder
          tripId={trip.id}
          startDate={trip.startDate}
          endDate={trip.endDate}
          pace={trip.pace}
          departurePoint={trip.departurePoint}
          onSave={handleSaveItinerary}
          mustVisitPlaces={trip.mustVisitPlaces}
          initialLocations={locations}
        />
      </div>
    </div>
  );
}