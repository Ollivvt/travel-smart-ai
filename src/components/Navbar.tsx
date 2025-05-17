import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Map, Plus, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Compass className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">TripSmart</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/new-trip"
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>Plan New Trip</span>
                </Link>
                <Link
                  to="/trips"
                  className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
                >
                  <Map className="h-4 w-4" />
                  <span>Manage Trips</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-500 hover:text-gray-700 ml-2"
                  title="Sign out"
                >
                  <LogOut className="h-6 w-6" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}