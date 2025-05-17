import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Trip } from '../types/trip';

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  return (
    <Link
      to={`/trip/${trip.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
    >
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{trip.title}</h3>
        <div className="flex items-center text-gray-600 mb-2">
          <MapPin className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">From</span>
            <span>{trip.departurePoint.name || trip.departurePoint.address}</span>
          </div>
        </div>
        <div className="flex items-center text-gray-600 mb-2">
          <MapPin className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">To</span>
            <span>{trip.returnPoint.name || trip.returnPoint.address}</span>
          </div>
        </div>
        <div className="flex items-center text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>
            {format(new Date(trip.startDate), 'MMM d')} -{' '}
            {format(new Date(trip.endDate), 'MMM d, yyyy')}
          </span>
        </div>
      </div>
    </Link>
  );
}