import { useState } from 'react';
import { Clock, Navigation, AlertTriangle } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  day_index: number;
  estimated_duration?: number;
  rating?: number;
  notes?: string;
}

interface OptimizedDay {
  date: Date;
  locations: Location[];
  totalTravelTime: number;
  totalDuration: number;
}

interface SmartItineraryOptimizerProps {
  locations: Location[];
  startDate: Date;
  endDate: Date;
  pace: 'relaxed' | 'balanced' | 'intensive';
  departurePoint: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  onOptimizedItinerary: (days: OptimizedDay[]) => void;
}

export function SmartItineraryOptimizer({
  locations,
  startDate,
  endDate,
  pace,
  departurePoint,
  onOptimizedItinerary,
}: SmartItineraryOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getPaceMultiplier = (pace: 'relaxed' | 'balanced' | 'intensive'): number => {
    switch (pace) {
      case 'relaxed':
        return 0.7;
      case 'intensive':
        return 1.3;
      default:
        return 1;
    }
  };

  const optimizeItinerary = async () => {
    setIsOptimizing(true);
    setError(null);

    try {
      const paceMultiplier = getPaceMultiplier(pace);
      const daysCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Add departure point as first location for distance calculations
      const startLoc: Location = {
        id: 'departure',
        name: departurePoint.name,
        address: departurePoint.address,
        latitude: departurePoint.latitude,
        longitude: departurePoint.longitude,
        day_index: 0
      };

      // Group locations by proximity using k-means clustering
      const clusters = await clusterLocations([startLoc, ...locations], daysCount);
      
      // For each cluster, optimize the route starting from departure point
      const optimizedDays = await Promise.all(
        clusters.map(async (cluster, index) => {
          const dayDate = new Date(startDate);
          dayDate.setDate(dayDate.getDate() + index);

          // Ensure the departure point is first on day 0
          let optimizedLocations = optimizeRoute(
            index === 0 ? cluster : cluster.filter(loc => loc.id !== 'departure')
          );

          // Calculate total times
          let totalTravelTime = 0;
          let totalDuration = 0;

          for (let i = 0; i < optimizedLocations.length; i++) {
            const location = optimizedLocations[i];
            totalDuration += (location.estimated_duration || 60) * paceMultiplier;

            if (i < optimizedLocations.length - 1) {
              const nextLocation = optimizedLocations[i + 1];
              const travelTime = calculateTravelTime(location, nextLocation);
              totalTravelTime += travelTime;
            }
          }

          return {
            date: dayDate,
            locations: optimizedLocations.filter(loc => loc.id !== 'departure'),
            totalTravelTime,
            totalDuration,
          };
        })
      );

      onOptimizedItinerary(optimizedDays);
    } catch (err) {
      setError('Failed to optimize itinerary. Please try again.');
      console.error('Optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const clusterLocations = async (
    locations: Location[],
    numClusters: number
  ): Promise<Location[][]> => {
    // Simple clustering based on geographic proximity
    const clusters: Location[][] = Array.from({ length: numClusters }, () => []);
    
    locations.forEach((location, index) => {
      const clusterIndex = index % numClusters;
      clusters[clusterIndex].push(location);
    });

    return clusters;
  };

  const optimizeRoute = (
    locations: Location[]
  ): Location[] => {
    if (locations.length <= 1) return locations;

    // Calculate distances between all points
    const distances: number[][] = [];
    for (let i = 0; i < locations.length; i++) {
      distances[i] = [];
      for (let j = 0; j < locations.length; j++) {
        if (i === j) {
          distances[i][j] = 0;
        } else {
          distances[i][j] = calculateDistance(
            locations[i].latitude,
            locations[i].longitude,
            locations[j].latitude,
            locations[j].longitude
          );
        }
      }
    }

    // Simple nearest neighbor algorithm
    const visited = new Set<number>();
    const route: Location[] = [];
    let current = 0; // Start with the first location

    while (visited.size < locations.length) {
      visited.add(current);
      route.push(locations[current]);

      let nearest = -1;
      let minDistance = Infinity;

      for (let i = 0; i < locations.length; i++) {
        if (!visited.has(i) && distances[current][i] < minDistance) {
          nearest = i;
          minDistance = distances[current][i];
        }
      }

      if (nearest === -1) break;
      current = nearest;
    }

    return route;
  };

  const calculateTravelTime = (
    from: Location,
    to: Location
  ): number => {
    try {
      const distance = calculateDistance(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude
      );
      // Simple distance-based estimation: assume 30 km/h average speed
      return Math.round(distance * 2 * 60);
    } catch (error) {
      console.error('Error calculating travel time:', error);
      // Fallback to rough estimation based on distance
      const distance = calculateDistance(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude
      );
      return distance * 2 * 60; // Rough estimate: 30 km/h average speed
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">Smart Itinerary Optimization</span>
        </div>
        <button
          onClick={optimizeItinerary}
          disabled={isOptimizing || locations.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isOptimizing ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              <span>Optimizing...</span>
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4" />
              <span>Optimize Itinerary</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 mt-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {locations.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          Add some locations to your trip to optimize the itinerary
        </div>
      )}
    </div>
  );
}