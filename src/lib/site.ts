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
      { label: "Flight Status", href: "/flight-status", desc: "Times, gates, delays and live map" },
      { label: "Flight Search", href: "/flight-search", desc: "Flights between airports" },
      { label: "Airports", href: "/airports", desc: "Arrivals and departures" },
    ] as NavItem[],
  },
  {
    label: "Trains",
    items: [
      { label: "PNR Status", href: "/pnr-status", desc: "Booking and berth status" },
      { label: "Running Status", href: "/train-status", desc: "Where your train is now" },
      { label: "Seats", href: "/seats", desc: "Availability, fares, planner, vacant berths" },
      { label: "Between Stations", href: "/trains-between-stations", desc: "Every train on a route" },
      { label: "Train Schedule", href: "/train-schedule", desc: "Timetable, stops and route map" },
      { label: "Railway Stations", href: "/railway-stations", desc: "Live station boards" },
    ] as NavItem[],
  },
] as const;
