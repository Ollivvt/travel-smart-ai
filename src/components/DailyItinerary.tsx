import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
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
}

export function DailyItinerary({ date, locations, onLocationsChange, onLocationRemove }: DailyItineraryProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(locations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onLocationsChange(items);
  };

  // Create a stable droppable ID that doesn't change on re-render
  const droppableId = React.useMemo(() => {
    return `day-${format(date, 'yyyyMMdd')}`;
  }, [date]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {format(date, 'EEEE, MMMM d')}
      </h3>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-6"
            >
              {locations.map((location, index) => (
                <Draggable
                  key={location.id}
                  draggableId={location.id}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="space-y-4"
                    >
                      {/* Location Card */}
                      <div className={`bg-white rounded-lg shadow-md ${
                        snapshot.isDragging ? 'ring-2 ring-blue-500' : ''
                      }`}>
                        {/* Header with drag handle */}
                        <div className="flex items-center p-4 border-b border-gray-100">
                          <div
                            {...provided.dragHandleProps}
                            className="text-gray-400 hover:text-gray-600 cursor-grab mr-3"
                          >
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

                        {/* Details section */}
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

                      {/* Transportation Timeline */}
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
                                {locations[index].notes?.toLowerCase().includes('approx') || 
                                 locations[index].notes?.toLowerCase().includes('min') || 
                                 locations[index].notes?.toLowerCase().includes('hour') ?
                                  // Extract travel time information from notes
                                  (() => {
                                    const text = locations[index].notes || '';
                                    // Try different patterns
                                    const timePattern = /(\d+)[-–—](\d+)\s*min/i;
                                    const approxPattern = /approx\.\s*([\d-–—]+\s*(?:min|hour|hr))/i;
                                    const drivePattern = /(?:drive|travel|trip)\s*(?:time|is|of)?\s*([\d-–—]+\s*(?:min|hour|hr))/i;
                                    
                                    // Check for explicit time patterns
                                    const timeMatch = text.match(timePattern);
                                    if (timeMatch) {
                                      return `~${timeMatch[1]}-${timeMatch[2]} min travel time`;
                                    }
                                    
                                    // Check for approx patterns
                                    const approxMatch = text.match(approxPattern);
                                    if (approxMatch) {
                                      return `~${approxMatch[1]} travel time`;
                                    }
                                    
                                    // Check for drive time patterns
                                    const driveMatch = text.match(drivePattern);
                                    if (driveMatch) {
                                      return `~${driveMatch[1]} travel time`;
                                    }
                                    
                                    // If contains "min" or "hour" but no specific pattern matched
                                    if (text.toLowerCase().includes('min') || 
                                        text.toLowerCase().includes('hour')) {
                                      return 'Travel time varies with traffic';
                                    }
                                    
                                    return 'Travel time varies with traffic';
                                  })() :
                                  'Travel time varies with traffic'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {locations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No locations added for this day. Use the search box above to add locations.
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}