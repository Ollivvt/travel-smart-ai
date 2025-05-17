import { Link } from 'react-router-dom';
import {
  Plane,
  Map,
  Calendar,
  Clock,
  Navigation,
  Bot,
  Share2,
  Shield,
} from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold mb-8">
              Plan Your Perfect Trip with AI-Powered Intelligence
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Create personalized travel itineraries, optimize routes, and discover hidden gems with our smart travel planning platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/new-trip"
                className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-md text-lg font-medium hover:bg-blue-50 transition-colors"
              >
                <Plane className="h-5 w-5" />
                Plan Your Trip
              </Link>
              <Link
                to="/trips"
                className="inline-flex items-center justify-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-md text-lg font-medium hover:bg-blue-600 transition-colors"
              >
                <Map className="h-5 w-5" />
                View Your Trips
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Smart Features for Smart Travelers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Bot className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI-Powered Planning</h3>
            <p className="text-gray-600">
              Let our AI create the perfect itinerary based on your preferences, must-visit places, and travel style.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Clock className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
            <p className="text-gray-600">
              Optimize your daily schedule with intelligent timing suggestions and route planning.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Navigation className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Route Optimization</h3>
            <p className="text-gray-600">
              Get the most efficient routes between locations to save time and maximize your experience.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Calendar className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Flexible Planning</h3>
            <p className="text-gray-600">
              Easily adjust your plans with drag-and-drop scheduling and real-time updates.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Share2 className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Trip Sharing</h3>
            <p className="text-gray-600">
              Share your itineraries with travel companions and collaborate on trip planning.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Shield className="h-10 w-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Travel Smart</h3>
            <p className="text-gray-600">
              Get travel tips, weather alerts, and local recommendations for a worry-free journey.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Create your first trip and experience the future of travel planning.
            </p>
            <Link
              to="/new-trip"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-md text-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plane className="h-5 w-5" />
              Start Planning Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}