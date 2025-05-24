import React, { useState, useEffect } from 'react';
import { addDays, differenceInDays } from 'date-fns';
import { DailyItinerary } from './DailyItinerary';
import { LocationSearch } from './LocationSearch';
import { PlacesImport } from './PlacesImport';
import { SmartItineraryOptimizer } from './SmartItineraryOptimizer';
import { AiItineraryGenerator } from './AiItineraryGenerator';
import { Save, Plus, X, Check } from 'lucide-react';

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  day_index: number;
  trip_id?: string;  // Optional in frontend since it's added during save
  estimated_duration?: number;
  arrival_time?: string;
  rating?: number;
  notes?: string;
  travelTimeToNext?: number;  // UI-only field
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
  initialLocations?: Location[]; // Add this line
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
  initialLocations = [], // Add default value
}: ItineraryBuilderProps) {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [selectedDay, setSelectedDay] = useState<number | 'unknown'>('unknown');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [mustVisitPlaces, setMustVisitPlaces] = useState<MustVisitPlace[]>(
    initialMustVisitPlaces.map(place => ({ name: place, dayIndex: 'unknown' }))
  );

  // Only update locations from initialLocations on first load
  useEffect(() => {
    if (isFirstLoad) {
      console.log('Initial load - setting locations:', initialLocations);
      setLocations(initialLocations);
      setIsFirstLoad(false);
    }
  }, [initialLocations, isFirstLoad]);

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

  const handleDropLocation = (locationId: string, targetDate: Date) => {
    const targetDayIndex = differenceInDays(targetDate, startDate);
  
    setLocations(prev =>
      prev.map(loc =>
        loc.id === locationId ? {
          ...loc,
          day_index: targetDayIndex,
          // Preserve all other fields
          name: loc.name,
          address: loc.address || loc.name,  // Ensure address is set
          latitude: loc.latitude,
          longitude: loc.longitude,
          estimated_duration: loc.estimated_duration,
          arrival_time: loc.arrival_time,
          rating: loc.rating,
          notes: loc.notes,
          travelTimeToNext: loc.travelTimeToNext
        } : loc
      )
    );
  };  

  const handleAiItineraryGenerated = (aiLocations: any[]) => {
    const existingLocationMap = new Map(locations.map(loc => [loc.name, loc]));
    
    const newLocations = aiLocations.map(loc => {
      const existingLocation = existingLocationMap.get(loc.name);
      return {
        // If we have an existing location with this name, use its ID and data
        ...(existingLocation || {
          id: crypto.randomUUID(),
          latitude: 0,
          longitude: 0,
        }),
        name: loc.name,
        address: loc.address || loc.name,  // Ensure address is never empty
        day_index: loc.dayIndex,
        latitude: existingLocation?.latitude || 0,  // Default to 0 if no coordinates
        longitude: existingLocation?.longitude || 0,
        estimated_duration: loc.estimatedDuration,
        arrival_time: loc.bestTimeToVisit,
        notes: loc.description,
        travelTimeToNext: loc.travelTimeToNext,
      };
    });
    setLocations(newLocations);
  };

  const handleOptimizedItinerary = (optimizedDays: any) => {
    const existingLocationMap = new Map(locations.map(loc => [loc.id, loc]));
    
    const newLocations = optimizedDays.flatMap((day: any, dayIndex: number) =>
      day.locations.map((location: any) => {
        // Preserve existing location data
        const existingLocation = existingLocationMap.get(location.id);
        return {
          ...(existingLocation || location),
          name: location.name || existingLocation?.name,
          address: location.address || existingLocation?.address || location.name,  // Fallback to name if no address
          latitude: location.latitude || existingLocation?.latitude || 0,
          longitude: location.longitude || existingLocation?.longitude || 0,
          day_index: dayIndex,
          // Preserve these fields if they existed
          estimated_duration: existingLocation?.estimated_duration,
          arrival_time: existingLocation?.arrival_time,
          rating: existingLocation?.rating,
          notes: existingLocation?.notes
        };
      })
    );
    setLocations(newLocations);
  };

  // Remove unused function

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Basic validation
      if (locations.length === 0) {
        throw new Error('Please add at least one location to the itinerary before saving');
      }

      // Validate required fields and day indices
      for (const loc of locations) {
        const issues: string[] = [];
        
        if (!loc.name?.trim()) {
          issues.push('Name is required');
        }
        if (!loc.address?.trim()) {
          issues.push('Address is required');
        }
        if (typeof loc.latitude !== 'number' || isNaN(loc.latitude)) {
          issues.push('Valid latitude is required');
        }
        if (typeof loc.longitude !== 'number' || isNaN(loc.longitude)) {
          issues.push('Valid longitude is required');
        }
        if (typeof loc.day_index !== 'number' || loc.day_index < 0 || loc.day_index >= tripDays) {
          issues.push(`Day index must be between 0 and ${tripDays - 1}`);
        }

        if (issues.length > 0) {
          throw new Error(
            `Invalid data for location "${loc.name || 'Unnamed'}":\n` +
            issues.map(issue => `- ${issue}`).join('\n')
          );
        }
      }

      // Remove UI-only fields and ensure all required fields are set
      const locationsToSave = locations.map(({ travelTimeToNext, ...location }) => ({
        ...location,
        trip_id: tripId,
        // Ensure required fields are set with proper fallbacks
        name: location.name.trim(),
        address: location.address?.trim() || location.name.trim(),
        latitude: typeof location.latitude === 'number' ? location.latitude : 0,
        longitude: typeof location.longitude === 'number' ? location.longitude : 0,
        day_index: location.day_index
      }));

      console.log('Saving locations:', locationsToSave);

      await onSave(locationsToSave);
      
      // Update local state to match saved version while preserving UI-only fields
      const updatedLocations = locationsToSave.map(savedLoc => {
        const originalLoc = locations.find(loc => loc.id === savedLoc.id);
        return {
          ...savedLoc,
          // Keep UI-specific fields from the original location
          travelTimeToNext: originalLoc?.travelTimeToNext,
        };
      });
      
      // Update local state with the saved version
      setLocations(updatedLocations);
      setSaveSuccess(true);
      
      // Reset save success state after a delay
      const timeoutId = setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
      
      // Cleanup timeout on component unmount or next save
      return () => clearTimeout(timeoutId);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save itinerary');
      throw err;
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
            onOptimizedItinerary={handleOptimizedItinerary}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          Itinerary saved successfully!
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
                  // Preserve existing location data while updating day_index
                  const updatedLocations = newLocations.map(loc => {
                    const existingLocation = prev.find(existing => existing.id === loc.id);
                    return {
                      ...(existingLocation || loc),
                      day_index: index
                    };
                  });
                  return [...otherDays, ...updatedLocations];
                });
              }}
              onLocationRemove={(locationId) => {
                setLocations(prev => prev.filter(loc => loc.id !== locationId));
              }}
              onDropLocation={handleDropLocation}
            />
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || saveSuccess}
          className={`flex items-center gap-2 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${
            saveSuccess 
              ? 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500' 
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          } disabled:opacity-50`}
        >
          {saveSuccess ? (
            <>
              <Check className="h-5 w-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              {isSaving ? 'Saving...' : 'Save Itinerary'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}