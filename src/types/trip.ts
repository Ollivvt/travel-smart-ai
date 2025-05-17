export interface Trip {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  destination: string;
  userId: string;
  pace: 'relaxed' | 'balanced' | 'intensive';
  mustVisitPlaces: string[];

  accommodation: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  departurePoint: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  returnPoint: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  sameReturnPoint: boolean;
  mustSeeAttractions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  tripId: string;
  dayIndex: number;
  orderIndex: number;
}