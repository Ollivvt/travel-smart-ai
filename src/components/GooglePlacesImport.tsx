import React, { useState } from 'react';
import { MapPin, Import, Check } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface Place {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  notes?: string;
}

interface GooglePlacesImportProps {
  onPlacesImport: (places: Place[]) => void;
}

export function GooglePlacesImport({ onPlacesImport }: GooglePlacesImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [importedPlaces, setImportedPlaces] = useState<Place[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSuccess = async (token: string) => {
    setIsAuthenticated(true);
    setError(null);
  };

  const handleGoogleError = (error: Error) => {
    setError('Failed to sign in with Google. Please try again.');
    setIsAuthenticated(false);
  };

  const handleImportPlaces = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const placesService = new google.maps.places.PlacesService(
        document.createElement('div')
      );

      const places = await fetchSavedPlaces(placesService);
      setImportedPlaces(places);
      onPlacesImport(places);
    } catch (err) {
      setError('Failed to import places. Please try again.');
      console.error('Error importing places:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSavedPlaces = (service: google.maps.places.PlacesService): Promise<Place[]> => {
    return new Promise((resolve, reject) => {
      service.search(
        {
          query: '',
          type: 'saved',
        } as google.maps.places.TextSearchRequest,
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const places = results.map((place) => ({
              name: place.name || '',
              address: place.formatted_address || '',
              latitude: place.geometry?.location?.lat() || 0,
              longitude: place.geometry?.location?.lng() || 0,
              rating: place.rating,
              notes: '', // User notes would need to be fetched separately
            }));
            resolve(places);
          } else {
            reject(new Error('Failed to fetch places'));
          }
        }
      );
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">Import from Google Maps</span>
        </div>
        
        {!isAuthenticated ? (
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />
        ) : (
          <button
            onClick={handleImportPlaces}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <span>Importing...</span>
            ) : (
              <>
                <Import className="h-4 w-4" />
                <span>Import Places</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {importedPlaces.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Check className="h-4 w-4" />
            <span>{importedPlaces.length} places imported successfully</span>
          </div>
          <ul className="space-y-2">
            {importedPlaces.map((place, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-gray-600"
              >
                <MapPin className="h-4 w-4" />
                <span>{place.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}