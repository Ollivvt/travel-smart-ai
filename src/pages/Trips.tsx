import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plane, Plus, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Trip } from '../types/trip';

export function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchTrips = async () => {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setTrips(data.map((trip: any) => ({
          ...trip,
          startDate: new Date(trip.start_date),
          endDate: new Date(trip.end_date),
          createdAt: new Date(trip.created_at),
          updatedAt: new Date(trip.updated_at),
          userId: trip.user_id,
          mustVisitPlaces: trip.must_visit_places || [],
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trips');
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, [user, navigate]);

  const handleDelete = async (tripId: string) => {
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId);

      if (error) throw error;

      setTrips(trips.filter(trip => trip.id !== tripId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trip');
    }
  };

  const handleRename = async (tripId: string) => {
    if (!editingTrip) return;

    try {
      const { error } = await supabase
        .from('trips')
        .update({ title: editingTrip.title })
        .eq('id', tripId);

      if (error) throw error;

      setTrips(trips.map(trip =>
        trip.id === tripId ? { ...trip, title: editingTrip.title } : trip
      ));
      setEditingTrip(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename trip');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading your trips...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Trips</h1>
          <Link
            to="/new-trip"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Trip
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {trips.length === 0 ? (
          <div className="text-center py-12">
            <Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 mb-6">
              Start planning your next adventure by creating a new trip.
            </p>
            <Link
              to="/new-trip"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Your First Trip
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <div key={trip.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                {editingTrip?.id === trip.id ? (
                  <div className="p-6">
                    <input
                      type="text"
                      value={editingTrip.title}
                      onChange={(e) => setEditingTrip({ ...editingTrip, title: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Trip title"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingTrip(null)}
                        className="px-3 py-1 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRename(trip.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <Link to={`/trip/${trip.id}`} className="block flex-grow">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{trip.title}</h3>
                        <div className="flex items-center text-gray-600 mb-2">
                          <Plane className="h-4 w-4 mr-2" />
                          <span>{trip.destination}</span>
                        </div>
                        <div className="text-gray-600">
                          {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
                        </div>
                      </Link>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingTrip({ id: trip.id, title: trip.title })}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Rename trip"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(trip.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete trip"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
