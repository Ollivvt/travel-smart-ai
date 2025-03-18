import React from 'react';
import { Plane } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Plan Your Perfect Trip with TripSmart
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create personalized travel itineraries, optimize your routes, and discover the best places to visit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Plane className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Planning</h3>
            <p className="text-gray-600">
              Optimize your daily itineraries based on location and preferences
            </p>
          </div>
          {/* Add more feature cards here */}
        </div>

        <div className="text-center">
          <a
            href="/new-trip"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-blue-700 transition-colors duration-200"
          >
            Start Planning Your Trip
          </a>
        </div>
      </div>
    </div>
  );
}