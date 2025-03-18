import React, { useState, useRef } from 'react';
import { MapPin, Import, Check, X, FileText, Link, Upload } from 'lucide-react';

interface Place {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  notes?: string;
}

interface PlacesImportProps {
  onPlacesImport: (places: Place[]) => void;
}

export function PlacesImport({ onPlacesImport }: PlacesImportProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [placesList, setPlacesList] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importMethod, setImportMethod] = useState<'text' | 'file' | 'url'>('text');
  const [url, setUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileRead(file);
    }
  };

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      setPlacesList(text);
      setImportMethod('text');
    };
    reader.readAsText(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileRead(file);
    }
  };

  const handleUrlImport = async () => {
    try {
      setError(null);
      // Here you would typically fetch and parse the URL content
      // For now, we'll just show an error since we can't access external URLs
      setError('Direct URL import is not supported. Please copy and paste the content instead.');
    } catch (err) {
      setError('Failed to import from URL. Please try copying and pasting the content instead.');
    }
  };

  const handleImport = async () => {
    try {
      setError(null);
      const places = placesList
        .split('\n')
        .filter(line => line.trim())
        .map(place => {
          const [name, address = ''] = place.split('|').map(s => s.trim());
          return {
            name,
            address,
            latitude: 0,
            longitude: 0,
            notes: '',
          };
        });

      if (places.length === 0) {
        setError('Please enter at least one place');
        return;
      }

      const geocoder = new google.maps.Geocoder();
      const geocodedPlaces = await Promise.all(
        places.map(async (place) => {
          try {
            const response = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
              geocoder.geocode(
                { address: place.address || place.name },
                (results, status) => {
                  if (status === 'OK' && results) {
                    resolve(results);
                  } else {
                    reject(new Error(`Geocoding failed for ${place.name}`));
                  }
                }
              );
            });

            const location = response[0].geometry.location;
            return {
              ...place,
              address: place.address || response[0].formatted_address,
              latitude: location.lat(),
              longitude: location.lng(),
            };
          } catch (error) {
            console.error(`Failed to geocode ${place.name}:`, error);
            return place;
          }
        })
      );

      onPlacesImport(geocodedPlaces);
      setPlacesList('');
      setUrl('');
      setIsExpanded(false);
    } catch (err) {
      setError('Failed to process places. Please check your input format.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">Import Places</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? (
            <X className="h-5 w-5" />
          ) : (
            <Import className="h-5 w-5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setImportMethod('text')}
              className={`px-4 py-2 -mb-px ${
                importMethod === 'text'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="h-4 w-4 inline-block mr-2" />
              Text
            </button>
            <button
              onClick={() => setImportMethod('file')}
              className={`px-4 py-2 -mb-px ${
                importMethod === 'file'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="h-4 w-4 inline-block mr-2" />
              File
            </button>
            <button
              onClick={() => setImportMethod('url')}
              className={`px-4 py-2 -mb-px ${
                importMethod === 'url'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Link className="h-4 w-4 inline-block mr-2" />
              URL
            </button>
          </div>

          {importMethod === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your places (one per line)
              </label>
              <div className="text-xs text-gray-500 mb-2">
                Format: Place Name | Address (address is optional)
                <br />
                Example:
                <br />
                Eiffel Tower | Champ de Mars, 5 Avenue Anatole France, 75007 Paris
                <br />
                Louvre Museum
              </div>
              <textarea
                value={placesList}
                onChange={(e) => setPlacesList(e.target.value)}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your places here..."
              />
            </div>
          )}

          {importMethod === 'file' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".txt,.csv"
                className="hidden"
              />
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop a text file here, or
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Browse files
              </button>
            </div>
          )}

          {importMethod === 'url' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter URL to import places from
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/places"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleUrlImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Import
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600">
              {error}
            </div>
          )}

          {(importMethod === 'text' || placesList) && (
            <div className="flex justify-end">
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Import className="h-4 w-4" />
                <span>Import Places</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}