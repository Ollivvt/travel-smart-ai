import React from 'react';
import { Clock, MapPin, Trash2, GripVertical, Star, Car } from 'lucide-react';
import { format } from 'date-fns';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  estimated_duration?: number;
  arrival_time?: string;
  rating?: number;
  notes?: string;
}

interface DailyItineraryProps {
  date: Date;
  locations: Location[];
  onLocationsChange: (locations: Location[]) => void;
  onLocationRemove: (locationId: string) => void;
  onDropLocation: (locationId: string, targetDate: Date) => void;
}

export function DailyItinerary({
  date,
  locations,
  onLocationsChange,
  onLocationRemove,
  onDropLocation,
}: DailyItineraryProps) {
  const handleDragStart = (id: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Required for dropping
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId) {
      onDropLocation(draggedId, date);
    }
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const updated = [...locations];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    onLocationsChange(updated);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {format(date, 'EEEE, MMMM d')}
      </h3>

      <div
        className="space-y-6"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {locations.map((location, index) => (
          <div
            key={location.id}
            draggable
            onDragStart={handleDragStart(location.id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (e.currentTarget !== e.target) return;
              const draggingId = e.dataTransfer.getData('text/plain');
              if (draggingId && draggingId !== location.id) {
                const fromIndex = locations.findIndex((l) => l.id === draggingId);
                if (fromIndex !== -1) {
                  handleReorder(fromIndex, index);
                }
              }
            }}
            className="space-y-4"
          >
            {/* Location Card */}
            <div className="bg-white rounded-lg shadow-md">
              {/* Header */}
              <div className="flex items-center p-4 border-b border-gray-100">
                <div className="text-gray-400 hover:text-gray-600 cursor-grab mr-3">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-grow">
                  <h4 className="text-lg font-medium text-gray-900">{location.name}</h4>
                  {location.address && (
                    <div className="flex items-center text-sm text-gray-600 mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{location.address}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {location.rating && (
                    <div className="flex items-center text-yellow-500">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="ml-1 text-sm">{location.rating}</span>
                    </div>
                  )}
                  <button
                    onClick={() => onLocationRemove(location.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 bg-gray-50">
                <div className="space-y-3">
                  {location.arrival_time && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Best time to visit: {location.arrival_time}</span>
                    </div>
                  )}
                  {location.estimated_duration && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Recommended duration: {Math.round(location.estimated_duration / 60)} hours</span>
                    </div>
                  )}
                  {location.notes && (
                    <div className="text-sm text-gray-700 mt-2 border-t border-gray-200 pt-3">
                      {location.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Timeline to next */}
            {index < locations.length - 1 && (
              <div className="relative pl-8 py-2">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="relative flex items-center">
                  <div className="absolute -left-6 p-1.5 bg-white border-2 border-gray-200 rounded-full">
                    <Car className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="ml-4 bg-gray-50 px-4 py-2 rounded-lg text-sm text-gray-600">
                    <div className="font-medium">To {locations[index + 1].name}</div>
                    <div className="text-gray-500">
                      {(() => {
                        const text = location.notes?.toLowerCase() || '';
                        const timePattern = /(\d+)[-–—](\d+)\s*min/i;
                        const approxPattern = /approx\.\s*([\d-–—]+\s*(?:min|hour|hr))/i;
                        const drivePattern = /(?:drive|travel|trip)\s*(?:time|is|of)?\s*([\d-–—]+\s*(?:min|hour|hr))/i;

                        const timeMatch = text.match(timePattern);
                        if (timeMatch) return `~${timeMatch[1]}-${timeMatch[2]} min travel time`;

                        const approxMatch = text.match(approxPattern);
                        if (approxMatch) return `~${approxMatch[1]} travel time`;

                        const driveMatch = text.match(drivePattern);
                        if (driveMatch) return `~${driveMatch[1]} travel time`;

                        if (text.includes('min') || text.includes('hour')) return 'Travel time varies with traffic';
                        return 'Travel time varies with traffic';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {locations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No locations added for this day. Use the search box above to add locations.
          </div>
        )}
      </div>
    </div>
  );
}
