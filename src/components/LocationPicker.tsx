import React, { useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { GoogleMap, Marker, StandaloneSearchBox } from '@react-google-maps/api';

interface Location {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface LocationPickerProps {
  label: string;
  location: Location;
  onChange: (location: Location) => void;
  className?: string;
}

export function LocationPicker({ label, location, onChange, className = '' }: LocationPickerProps) {
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);

  const handlePlacesChanged = () => {
    if (searchBoxRef.current) {
      const places = searchBoxRef.current.getPlaces();
      if (places && places.length > 0) {
        const place = places[0];
        const location = place.geometry?.location;
        
        if (location) {
          onChange({
            name: place.name || '',
            address: place.formatted_address || '',
            latitude: location.lat(),
            longitude: location.lng(),
          });
        }
      }
    }
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const geocoder = new google.maps.Geocoder();
      const latLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      
      geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          onChange({
            name: results[0].formatted_address || '',
            address: results[0].formatted_address || '',
            latitude: latLng.lat,
            longitude: latLng.lng,
          });
        }
      });
    }
  }, [onChange]);

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      <div className="space-y-4">
        <StandaloneSearchBox
          onLoad={ref => searchBoxRef.current = ref}
          onPlacesChanged={handlePlacesChanged}
        >
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={location.address}
              onChange={(e) => onChange({ ...location, address: e.target.value })}
              placeholder="Search for a location"
              className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </StandaloneSearchBox>

        <div className="h-48 w-full rounded-lg overflow-hidden">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={{ lat: location.latitude || 48.8566, lng: location.longitude || 2.3522 }}
            zoom={13}
            onClick={handleMapClick}
            options={{
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              zoomControl: true,
            }}
          >
            {location.latitude && location.longitude && (
              <Marker position={{ lat: location.latitude, lng: location.longitude }} />
            )}
          </GoogleMap>
        </div>
      </div>
    </div>
  );
}