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

export function ItineraryBuilder({
  tripId,
  startDate,
  endDate,
  pace,
  departurePoint,
  onSave,
  mustVisitPlaces,
}: ItineraryBuilderProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tripDays = differenceInDays(endDate, startDate) + 1;

  const handleAddLocation = (location: Omit<Location, 'id' | 'day_index'>) => {
    const newLocation: Location = {
      ...location,
      id: crypto.randomUUID(),
      day_index: selectedDay,
    };
    setLocations((prev) => [...prev, newLocation]);
    setError(null);
  };

  const handleImportedPlaces = (places: Omit<Location, 'id' | 'day_index'>[]) => {
    const newLocations = places.map((place) => ({
      ...place,
      id: crypto.randomUUID(),
      day_index: selectedDay,
    }));
    setLocations((prev) => [...prev, ...newLocations]);
    setError(null);
  };

  const handleLocationRemove = (locationId: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== locationId));
  };

  const handleLocationsChange = (dayIndex: number, dayLocations: Location[]) => {
    setLocations((prev) => {
      const otherDays = prev.filter((loc) => loc.day_index !== dayIndex);
      return [...otherDays, ...dayLocations.map(loc => ({ ...loc, day_index: dayIndex }))];
    });
  };

  const handleOptimizedItinerary = (optimizedDays: any[]) => {
    const newLocations = optimizedDays.flatMap((day, dayIndex) =>
      day.locations.map((location: Location) => ({
        ...location,
        day_index: dayIndex,
        estimated_duration: Math.round((location.estimated_duration || 60) * (day.totalDuration / day.locations.length)),
      }))
    );
    setLocations(newLocations);
  };

  const handleAiItineraryGenerated = (aiLocations: any[]) => {
    const newLocations = aiLocations.map(loc => ({
      id: crypto.randomUUID(),
      name: loc.name,
      address: loc.address || '',
      latitude: 0, // Will be updated by geocoding
      longitude: 0, // Will be updated by geocoding
      day_index: loc.dayIndex,
      estimated_duration: loc.estimatedDuration, // Using AI's duration estimate in minutes
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
      {/* AI Itinerary Generation Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Trip Planning</h2>
        <AiItineraryGenerator
          startPoint={departurePoint.name || departurePoint.address}
          endPoint={departurePoint.name || departurePoint.address}
          duration={tripDays}
          pace={pace}
          mustVisitPlaces={mustVisitPlaces}
          onItineraryGenerated={handleAiItineraryGenerated}
        />
      </div>

      {/* Manual Planning Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan Your Itinerary</h2>
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="block w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {Array.from({ length: tripDays }).map((_, index) => (
                <option key={index} value={index}>
                  Day {index + 1}
                </option>
              ))}
            </select>
            <LocationSearch onLocationSelect={handleAddLocation} />
          </div>
          
          <PlacesImport onPlacesImport={handleImportedPlaces} />

          <SmartItineraryOptimizer
            locations={locations}
            startDate={startDate}
            endDate={endDate}
            pace={pace}
            departurePoint={departurePoint}
            onOptimizedItinerary={handleOptimizedItinerary}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

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
              onLocationsChange={(newLocations) => handleLocationsChange(index, newLocations)}
              onLocationRemove={handleLocationRemove}
            />
          );
        })}
      </div>

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