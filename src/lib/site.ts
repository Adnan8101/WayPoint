export const SITE = {
  name: "WayPoint",
  tagline: "Flight status, train running status and PNR in one place",
  url: process.env.SITE_URL ?? "http://localhost:3000",
};

export interface NavItem {
  label: string;
  href: string;
  desc: string;
}

export const NAV = [
  { label: "Home", href: "/" },
  {
    label: "Flights",
    items: [
      { label: "Flight Status", href: "/flight-status", desc: "Times, gates and delays" },
      { label: "Flight Tracker", href: "/flight-tracker", desc: "Live position on a map" },
      { label: "Flight Search", href: "/flight-search", desc: "Flights between airports" },
      { label: "Airports", href: "/airports", desc: "Arrivals and departures" },
    ] as NavItem[],
  },
  {
    label: "Trains",
    items: [
      { label: "PNR Status", href: "/pnr-status", desc: "Booking and berth status" },
      { label: "Running Status", href: "/train-status", desc: "Where your train is now" },
      { label: "Journey Planner", href: "/planner", desc: "Seats on your date, nearby dates or a change" },
      { label: "Seats & Fare", href: "/seat-availability", desc: "Availability calendar, every fare" },
      { label: "Vacant Berths", href: "/chart-vacancy", desc: "Free berths after charting" },
      { label: "Between Stations", href: "/trains-between-stations", desc: "Every train on a route" },
      { label: "Cancelled Trains", href: "/cancelled-trains", desc: "Today's cancellations" },
      { label: "Train Schedule", href: "/train-schedule", desc: "Full station timetable" },
      { label: "Train Route", href: "/train-route", desc: "Stops, distances, map" },
      { label: "Railway Stations", href: "/railway-stations", desc: "Live station boards" },
    ] as NavItem[],
  },
  { label: "Travel Info", href: "/travel-information" },
] as const;
