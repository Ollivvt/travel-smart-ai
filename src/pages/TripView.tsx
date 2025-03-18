import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Navigation2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Trip } from '../types/trip';
import { ItineraryBuilder } from '../components/ItineraryBuilder';
import { MustVisitPlaces } from '../components/MustVisitPlaces';
import { useAuth } from '../contexts/AuthContext';

export function TripView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mustVisitPlaces, setMustVisitPlaces] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchTrip = async () => {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Trip not found');

        setTrip({
          ...data,
          startDate: new Date(data.start_date),
          endDate: new Date(data.end_date),
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          userId: data.user_id,
          mustVisitPlaces: data.must_visit_places || [],
          accommodation: {
            name: data.accommodation_name || '',
            address: data.accommodation_address || '',
            latitude: data.accommodation_latitude,
            longitude: data.accommodation_longitude,
          },
          departurePoint: {
            name: data.departure_point_name || '',
            address: data.departure_point_address || '',
            latitude: data.departure_point_latitude || 0,
            longitude: data.departure_point_longitude || 0,
          },
          returnPoint: {
            name: data.return_point_name || '',
            address: data.return_point_address || '',
            latitude: data.return_point_latitude || 0,
            longitude: data.return_point_longitude || 0,
          },
        });

        setMustVisitPlaces(data.must_visit_places || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id, user, navigate]);

  const handleSaveItinerary = async (locations: any[]) => {
    try {
      const { error } = await supabase
        .from('trip_locations')
        .upsert(
          locations.map((loc) => ({
            trip_id: id,
            ...loc,
          }))
        );

      if (error) throw error;
    } catch (err) {
      throw new Error('Failed to save itinerary');
    }
  };

  const handleMustVisitPlacesChange = async (places: string[]) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ must_visit_places: places })
        .eq('id', id);

      if (error) throw error;
      setMustVisitPlaces(places);
    } catch (err) {
      setError('Failed to update must-visit places');
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
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{trip.title}</h1>
              <div className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{trip.destination}</span>
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

        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <MustVisitPlaces
              places={mustVisitPlaces}
              onChange={handleMustVisitPlacesChange}
            />
          </div>

          <ItineraryBuilder
            tripId={trip.id}
            startDate={trip.startDate}
            endDate={trip.endDate}
            pace={trip.pace}
            departurePoint={trip.departurePoint}
            onSave={handleSaveItinerary}
            mustVisitPlaces={mustVisitPlaces}
          />
        </div>
      </div>
    </div>
  );
}