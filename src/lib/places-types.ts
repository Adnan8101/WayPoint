// Normalized Google Places / Routes shapes shared by server and UI.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlacePhoto {
  /** Places API resource name, e.g. "places/ChIJ.../photos/AUc..." */
  name: string;
  width?: number;
  height?: number;
  attributions: { name: string; uri?: string }[];
}

export interface PlaceSummary {
  id: string;
  name: string;
  address?: string;
  location?: LatLng;
  rating?: number;
  ratingCount?: number;
  typeLabel?: string;
  types: string[];
  photo?: PlacePhoto;
  mapsUri?: string;
  priceLevel?: string;
}

export interface PlaceReview {
  author: string;
  authorUri?: string;
  authorPhoto?: string;
  rating?: number;
  text?: string;
  relativeTime?: string;
}

export interface PlaceDetails extends PlaceSummary {
  photos: PlacePhoto[];
  reviews: PlaceReview[];
  website?: string;
  phone?: string;
  summary?: string;
  openingHours?: string[];
  openNow?: boolean;
  viewport?: { low: LatLng; high: LatLng };
}

export interface PlaceSuggestion {
  placeId: string;
  main: string;
  secondary?: string;
  types: string[];
}

export type TravelMode = "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";

export interface RouteResult {
  mode: TravelMode;
  distanceMeters: number;
  durationSeconds: number;
  distanceText?: string;
  durationText?: string;
  polyline: string;
}

/** Nearby categories → Places API (New) primary types */
export const NEARBY_CATEGORIES = {
  attractions: { label: "Attractions", types: ["tourist_attraction", "historical_landmark", "museum", "park", "monument"] },
  hotels: { label: "Hotels", types: ["lodging", "hotel", "resort_hotel"] },
  restaurants: { label: "Restaurants", types: ["restaurant", "cafe"] },
  transport: { label: "Transport", types: ["transit_station", "train_station", "bus_station", "subway_station", "taxi_stand", "car_rental"] },
} as const;

export type NearbyCategory = keyof typeof NEARBY_CATEGORIES;

/** Discovery categories for the attractions page → text-search included type */
export const PLACE_CATEGORIES = [
  { id: "tourist_attraction", label: "Tourist attractions" },
  { id: "historical_landmark", label: "Historical landmarks" },
  { id: "museum", label: "Museums" },
  { id: "beach", label: "Beaches" },
  { id: "shopping_mall", label: "Shopping malls" },
  { id: "restaurant", label: "Restaurants" },
  { id: "park", label: "Parks & gardens" },
  { id: "place_of_worship", label: "Religious places" },
  { id: "amusement_park", label: "Entertainment" },
  { id: "transit_station", label: "Transport stations" },
] as const;
