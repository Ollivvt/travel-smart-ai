import React, { useRef } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { StandaloneSearchBox } from '@react-google-maps/api';

interface Location {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void;
}

export function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePlacesChanged = () => {
    if (searchBoxRef.current) {
      const places = searchBoxRef.current.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        const location = place.geometry?.location;
        
        if (location) {
          onLocationSelect({
            name: place.name || '',
            address: place.formatted_address || '',
            latitude: location.lat(),
            longitude: location.lng(),
          });

          // Clear the input
          if (inputRef.current) {
            inputRef.current.value = '';
          }
        }
      }
    }
  };

  return (
    <div className="flex-grow">
      <StandaloneSearchBox
        onLoad={ref => searchBoxRef.current = ref}
        onPlacesChanged={handlePlacesChanged}
      >
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for a location to add"
            className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <Plus className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </StandaloneSearchBox>
    </div>
  );
}