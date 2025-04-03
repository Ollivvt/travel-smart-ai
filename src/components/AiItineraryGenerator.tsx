import React, { useState } from 'react';
import { Wand2, Loader2, AlertTriangle, Info } from 'lucide-react';
import { generateItinerary } from '../lib/google-ai';

interface Location {
  name: string;
  description?: string;
  estimatedDuration: number;
  bestTimeToVisit?: string;
  dayIndex: number;
}

interface PreferredPlace {
  name: string;
  preferredDay: number | null;
}

interface AiItineraryGeneratorProps {
  startPoint: string;
  endPoint: string;
  duration: number;
  pace: 'relaxed' | 'balanced' | 'intensive';
  mustVisitPlaces: PreferredPlace[];
  onItineraryGenerated: (locations: Location[]) => void;
}

export function AiItineraryGenerator({
  startPoint,
  endPoint,
  duration,
  pace,
  mustVisitPlaces,
  onItineraryGenerated
}: AiItineraryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuotaError, setShowQuotaError] = useState(false);
  const [showConfigError, setShowConfigError] = useState(false);

  const handleGenerate = async () => {
    if (mustVisitPlaces.length === 0) {
      setError('Please add at least one must-visit place before generating an itinerary');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setShowQuotaError(false);
    setShowConfigError(false);

    try {
      const itinerary = await generateItinerary(
        startPoint,
        endPoint,
        duration,
        mustVisitPlaces,
        pace
      );
      onItineraryGenerated(itinerary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate itinerary';
      
      if (errorMessage.includes('API key')) {
        setShowConfigError(true);
      } else if (errorMessage.includes('limit reached') || errorMessage.includes('quota')) {
        setShowQuotaError(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (showConfigError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3 text-red-600 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-medium">Configuration Error</h3>
        </div>
        <p className="text-red-600 text-sm">
          The AI feature is not properly configured. Please continue with manual planning.
        </p>
      </div>
    );
  }

  if (showQuotaError) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-3 text-amber-600 mb-2">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-medium">AI Generation Temporarily Unavailable</h3>
        </div>
        <p className="text-amber-600 text-sm">
          The AI itinerary generation is currently unavailable due to high demand. 
          Please try again later or continue with manual planning.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3 text-blue-700">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-medium">AI Itinerary Generation</h3>
            <p className="text-sm text-blue-600">
              Our AI will create an optimized itinerary considering:
            </p>
            <ul className="text-sm text-blue-600 list-disc list-inside ml-2">
              <li>Your preferred days for specific locations</li>
              <li>Geographic proximity to minimize travel time</li>
              <li>Best times to visit each location</li>
              <li>Your preferred travel pace ({pace})</li>
              <li>Logical day-to-day progression</li>
              <li>Travel times between locations</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isGenerating || mustVisitPlaces.length === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Generating Your Perfect Itinerary...</span>
          </>
        ) : (
          <>
            <Wand2 className="h-5 w-5" />
            <span>Generate AI Itinerary</span>
          </>
        )}
      </button>

      {!isGenerating && mustVisitPlaces.length === 0 && (
        <p className="text-sm text-gray-500 text-center">
          Add some must-visit places above to generate an AI itinerary
        </p>
      )}
    </div>
  );
}