import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Plus, Car, Train, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useLoadScript } from '@react-google-maps/api';
import { LocationPicker } from '../components/LocationPicker';

interface Location {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface TripFormData {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  pace: 'relaxed' | 'balanced' | 'intensive';
  transportationMode: 'public_transit' | 'self_driving';
  useRideshare: boolean;
  walkingComfortDistance: number;
  avoidHighways: boolean;
  avoidTolls: boolean;
  departurePoint: Location;
  returnPoint: Location;
  sameReturnPoint: boolean;
}

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"];

export function NewTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [formData, setFormData] = useState<TripFormData>({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    pace: 'balanced',
    transportationMode: 'public_transit',
    useRideshare: false,
    walkingComfortDistance: 1000,
    avoidHighways: false,
    avoidTolls: false,
    departurePoint: {
      name: '',
      address: '',
      latitude: 48.8566,
      longitude: 2.3522,
    },
    returnPoint: {
      name: '',
      address: '',
      latitude: 48.8566,
      longitude: 2.3522,
    },
    sameReturnPoint: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!user) throw new Error('You must be logged in to create a trip');

      const { data, error: tripError } = await supabase
        .from('trips')
        .insert([
          {
            title: formData.title,
            destination: formData.destination,
            start_date: formData.startDate,
            end_date: formData.endDate,
            user_id: user.id,
            pace: formData.pace,
            transportation_mode: formData.transportationMode,
            use_rideshare: formData.useRideshare,
            walking_comfort_distance: formData.walkingComfortDistance,
            avoid_highways: formData.avoidHighways,
            avoid_tolls: formData.avoidTolls,
            departure_point_name: formData.departurePoint.name,
            departure_point_address: formData.departurePoint.address,
            departure_point_latitude: formData.departurePoint.latitude,
            departure_point_longitude: formData.departurePoint.longitude,
            return_point_name: formData.sameReturnPoint ? formData.departurePoint.name : formData.returnPoint.name,
            return_point_address: formData.sameReturnPoint ? formData.departurePoint.address : formData.returnPoint.address,
            return_point_latitude: formData.sameReturnPoint ? formData.departurePoint.latitude : formData.returnPoint.latitude,
            return_point_longitude: formData.sameReturnPoint ? formData.departurePoint.longitude : formData.returnPoint.longitude,
            same_return_point: formData.sameReturnPoint,
          },
        ])
        .select()
        .single();

      if (tripError) throw tripError;
      if (data) {
        navigate(`/trip/${data.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  if (!isLoaded) return <div>Loading maps...</div>;
  if (loadError) return <div>Error loading maps</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="flex items-center justify-center mb-8">
              <Navigation className="h-12 w-12 text-blue-600" />
            </div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-8">
              Plan Your New Trip
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Trip Title
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Summer Vacation 2025"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <LocationPicker
                  label="Departure Point"
                  location={formData.departurePoint}
                  onChange={(location) => {
                    setFormData((prev) => ({
                      ...prev,
                      departurePoint: location,
                      returnPoint: prev.sameReturnPoint ? location : prev.returnPoint,
                    }));
                  }}
                />

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sameReturnPoint"
                    name="sameReturnPoint"
                    checked={formData.sameReturnPoint}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData((prev) => ({
                        ...prev,
                        sameReturnPoint: checked,
                        returnPoint: checked ? prev.departurePoint : prev.returnPoint,
                      }));
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="sameReturnPoint" className="ml-2 block text-sm text-gray-700">
                    Return to departure point
                  </label>
                </div>

                {!formData.sameReturnPoint && (
                  <LocationPicker
                    label="Return Point"
                    location={formData.returnPoint}
                    onChange={(location) => {
                      setFormData((prev) => ({
                        ...prev,
                        returnPoint: location,
                      }));
                    }}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="startDate"
                      id="startDate"
                      required
                      value={formData.startDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      name="endDate"
                      id="endDate"
                      required
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Transportation Preferences</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Primary Transportation Mode
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div
                      className={`flex items-center justify-center p-4 border rounded-lg cursor-pointer ${
                        formData.transportationMode === 'public_transit'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, transportationMode: 'public_transit' }))}
                    >
                      <Train className="h-6 w-6 mr-2" />
                      <span>Public Transit</span>
                    </div>
                    <div
                      className={`flex items-center justify-center p-4 border rounded-lg cursor-pointer ${
                        formData.transportationMode === 'self_driving'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, transportationMode: 'self_driving' }))}
                    >
                      <Car className="h-6 w-6 mr-2" />
                      <span>Self-Driving</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="useRideshare"
                      name="useRideshare"
                      checked={formData.useRideshare}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="useRideshare" className="ml-2 block text-sm text-gray-700">
                      Include rideshare options when available
                    </label>
                  </div>

                  <div>
                    <label htmlFor="walkingComfortDistance" className="block text-sm font-medium text-gray-700">
                      Maximum Walking Distance (meters)
                    </label>
                    <input
                      type="range"
                      id="walkingComfortDistance"
                      name="walkingComfortDistance"
                      min="500"
                      max="5000"
                      step="100"
                      value={formData.walkingComfortDistance}
                      onChange={handleInputChange}
                      className="mt-1 w-full"
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      {formData.walkingComfortDistance} meters
                    </div>
                  </div>

                  {formData.transportationMode === 'self_driving' && (
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="avoidHighways"
                          name="avoidHighways"
                          checked={formData.avoidHighways}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="avoidHighways" className="ml-2 block text-sm text-gray-700">
                          Avoid highways
                        </label>
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="avoidTolls"
                          name="avoidTolls"
                          checked={formData.avoidTolls}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="avoidTolls" className="ml-2 block text-sm text-gray-700">
                          Avoid toll roads
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Creating Trip...' : 'Create Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}