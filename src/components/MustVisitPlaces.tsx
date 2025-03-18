import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface MustVisitPlacesProps {
  places: string[];
  onChange: (places: string[]) => void;
}

export function MustVisitPlaces({ places, onChange }: MustVisitPlacesProps) {
  const [newPlace, setNewPlace] = useState('');

  const handleAddPlace = () => {
    if (newPlace.trim() && !places.includes(newPlace.trim())) {
      onChange([...places, newPlace.trim()]);
      setNewPlace('');
    }
  };

  const handleRemovePlace = (index: number) => {
    onChange(places.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Must-Visit Places</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={newPlace}
          onChange={(e) => setNewPlace(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddPlace()}
          placeholder="Add a must-visit place"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleAddPlace}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4" />
          <span>Add</span>
        </button>
      </div>

      {places.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {places.map((place, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full"
            >
              <span className="text-blue-800">{place}</span>
              <button
                onClick={() => handleRemovePlace(index)}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}