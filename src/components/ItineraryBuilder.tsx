import React, { useState } from 'react';
import { addDays, differenceInDays } from 'date-fns';
import { DailyItinerary } from './DailyItinerary';
import { LocationSearch } from './LocationSearch';
import { PlacesImport } from './PlacesImport';
import { SmartItineraryOptimizer } from './SmartItineraryOptimizer';
import { AiItineraryGenerator } from './AiItineraryGenerator';
import { Save, Plus, X } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  day_index: number;
  estimated_duration?: number;
  arrival_time?: string;
  rating?: number;
  notes?: string;
}

interface ItineraryBuilderProps {
  tripId: string;
  startDate: Date;
  endDate: Date;
  pace: 'relaxed' | 'balanced' | 'intensive';
  departurePoint: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  onSave: (locations: Location[]) => Promise<void>;
  mustVisitPlaces: string[];
}

interface MustVisitPlace {
  name: string;
  dayIndex: number | 'unknown';
}

export function ItineraryBuilder({
  tripId,
  startDate,
  endDate,
  pace,
  departurePoint,
  onSave,
  mustVisitPlaces: initialMustVisitPlaces,
}: ItineraryBuilderProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | 'unknown'>('unknown');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mustVisitPlaces, setMustVisitPlaces] = useState<MustVisitPlace[]>(
    initialMustVisitPlaces.map(place => ({ name: place, dayIndex: 'unknown' }))
  );

  const tripDays = differenceInDays(endDate, startDate) + 1;

  const handleAddMustVisitPlace = (location: Omit<Location, 'id' | 'day_index'>) => {
    const newPlace: MustVisitPlace = {
      name: location.name,
      dayIndex: selectedDay,
    };
    setMustVisitPlaces(prev => [...prev, newPlace]);
    setError(null);
  };

  const handleRemoveMustVisitPlace = (index: number) => {
    setMustVisitPlaces(prev => prev.filter((_, i) => i !== index));
  };

  const handleDayChange = (index: number, newDay: number | 'unknown') => {
    setMustVisitPlaces(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], dayIndex: newDay };
      return updated;
    });
  };

  const handleAiItineraryGenerated = (aiLocations: any[]) => {
    const newLocations = aiLocations.map(loc => ({
      id: crypto.randomUUID(),
      name: loc.name,
      address: loc.address || '',
      latitude: 0,
      longitude: 0,
      day_index: loc.dayIndex,
      estimated_duration: loc.estimatedDuration,
      arrival_time: loc.bestTimeToVisit,
      notes: loc.description,
    }));
    setLocations(newLocations);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(locations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save itinerary');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Combined Planning Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan Your Itinerary</h2>
        <div className="space-y-6">
          {/* Day Selection and Location Search */}
          <div className="flex gap-4 items-center">
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value === 'unknown' ? 'unknown' : Number(e.target.value))}
              className="block w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="unknown">Any Day</option>
              {Array.from({ length: tripDays }).map((_, index) => (
                <option key={index} value={index}>
                  Day {index + 1}
                </option>
              ))}
            </select>
            <LocationSearch onLocationSelect={handleAddMustVisitPlace} />
          </div>

          {/* Must-Visit Places List */}
          {mustVisitPlaces.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Must-Visit Places</h3>
              <div className="space-y-3">
                {mustVisitPlaces.map((place, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg"
                  >
                    <div className="flex-grow">
                      <p className="font-medium text-gray-900">{place.name}</p>
                    </div>
                    <select
                      value={place.dayIndex}
                      onChange={(e) => handleDayChange(index, e.target.value === 'unknown' ? 'unknown' : Number(e.target.value))}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="unknown">Any Day</option>
                      {Array.from({ length: tripDays }).map((_, dayIndex) => (
                        <option key={dayIndex} value={dayIndex}>
                          Day {dayIndex + 1}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveMustVisitPlace(index)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <PlacesImport onPlacesImport={(places) => {
            const newPlaces = places.map(place => ({
              name: place.name,
              dayIndex: 'unknown' as const
            }));
            setMustVisitPlaces(prev => [...prev, ...newPlaces]);
          }} />

          {/* AI Generation Section */}
          <div className="mt-6">
            <AiItineraryGenerator
              startPoint={departurePoint.name || departurePoint.address}
              endPoint={departurePoint.name || departurePoint.address}
              duration={tripDays}
              pace={pace}
              mustVisitPlaces={mustVisitPlaces.map(place => ({
                name: place.name,
                preferredDay: place.dayIndex === 'unknown' ? null : place.dayIndex
              }))}
              onItineraryGenerated={handleAiItineraryGenerated}
            />
          </div>

          <SmartItineraryOptimizer
            locations={locations}
            startDate={startDate}
            endDate={endDate}
            pace={pace}
            departurePoint={departurePoint}
            onOptimizedItinerary={(optimizedDays) => {
              const newLocations = optimizedDays.flatMap((day, dayIndex) =>
                day.locations.map((location: Location) => ({
                  ...location,
                  day_index: dayIndex,
                }))
              );
              setLocations(newLocations);
            }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Daily Itineraries */}
      <div className="space-y-6">
        {Array.from({ length: tripDays }).map((_, index) => {
          const dayLocations = locations
            .filter((loc) => loc.day_index === index)
            .sort((a, b) => locations.indexOf(a) - locations.indexOf(b));

          return (
            <DailyItinerary
              key={index}
              date={addDays(startDate, index)}
              locations={dayLocations}
              onLocationsChange={(newLocations) => {
                setLocations(prev => {
                  const otherDays = prev.filter(loc => loc.day_index !== index);
                  return [...otherDays, ...newLocations.map(loc => ({ ...loc, day_index: index }))];
                });
              }}
              onLocationRemove={(locationId) => {
                setLocations(prev => prev.filter(loc => loc.id !== locationId));
              }}
            />
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Save className="h-5 w-5" />
          {isSaving ? 'Saving...' : 'Save Itinerary'}
        </button>
      </div>
    </div>
  );
}