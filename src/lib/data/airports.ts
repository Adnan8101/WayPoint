// Static reference data for airport search and detail pages. This is reference
// information (codes, names, locations), not live data. Live arrivals and
// departures come from the flight data provider.

export interface Airport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  timeZone: string;
  lat: number;
  lon: number;
  terminals?: string[];
  popular?: boolean;
}

type Row = [string, string, string, string, string, string, string, number, number, string[]?, boolean?];

const rows: Row[] = [
  ["DEL", "VIDP", "Indira Gandhi International Airport", "New Delhi", "India", "IN", "Asia/Kolkata", 28.5562, 77.1, ["Terminal 1", "Terminal 2", "Terminal 3"], true],
  ["BOM", "VABB", "Chhatrapati Shivaji Maharaj International Airport", "Mumbai", "India", "IN", "Asia/Kolkata", 19.0896, 72.8656, ["Terminal 1", "Terminal 2"], true],
  ["BLR", "VOBL", "Kempegowda International Airport", "Bengaluru", "India", "IN", "Asia/Kolkata", 13.1986, 77.7066, ["Terminal 1", "Terminal 2"], true],
  ["MAA", "VOMM", "Chennai International Airport", "Chennai", "India", "IN", "Asia/Kolkata", 12.9941, 80.1709, undefined, true],
  ["HYD", "VOHS", "Rajiv Gandhi International Airport", "Hyderabad", "India", "IN", "Asia/Kolkata", 17.2403, 78.4294, undefined, true],
  ["CCU", "VECC", "Netaji Subhas Chandra Bose International Airport", "Kolkata", "India", "IN", "Asia/Kolkata", 22.6547, 88.4467, undefined, true],
  ["COK", "VOCI", "Cochin International Airport", "Kochi", "India", "IN", "Asia/Kolkata", 10.152, 76.4019],
  ["AMD", "VAAH", "Sardar Vallabhbhai Patel International Airport", "Ahmedabad", "India", "IN", "Asia/Kolkata", 23.0772, 72.6347],
  ["PNQ", "VAPO", "Pune Airport", "Pune", "India", "IN", "Asia/Kolkata", 18.5821, 73.9197],
  ["GOI", "VOGO", "Dabolim Airport", "Goa", "India", "IN", "Asia/Kolkata", 15.3808, 73.8314],
  ["GOX", "VOGA", "Manohar International Airport", "Mopa, Goa", "India", "IN", "Asia/Kolkata", 15.7444, 73.8606],
  ["JAI", "VIJP", "Jaipur International Airport", "Jaipur", "India", "IN", "Asia/Kolkata", 26.8242, 75.8122],
  ["LKO", "VILK", "Chaudhary Charan Singh International Airport", "Lucknow", "India", "IN", "Asia/Kolkata", 26.7606, 80.8893],
  ["TRV", "VOTV", "Thiruvananthapuram International Airport", "Thiruvananthapuram", "India", "IN", "Asia/Kolkata", 8.4821, 76.9201],
  ["GAU", "VEGT", "Lokpriya Gopinath Bordoloi International Airport", "Guwahati", "India", "IN", "Asia/Kolkata", 26.1061, 91.5859],
  ["PAT", "VEPT", "Jay Prakash Narayan International Airport", "Patna", "India", "IN", "Asia/Kolkata", 25.5913, 85.088],
  ["ATQ", "VIAR", "Sri Guru Ram Dass Jee International Airport", "Amritsar", "India", "IN", "Asia/Kolkata", 31.7096, 74.7973],
  ["IXC", "VICG", "Chandigarh International Airport", "Chandigarh", "India", "IN", "Asia/Kolkata", 30.6735, 76.7885],
  ["NAG", "VANP", "Dr. Babasaheb Ambedkar International Airport", "Nagpur", "India", "IN", "Asia/Kolkata", 21.0922, 79.0472],
  ["VNS", "VEBN", "Lal Bahadur Shastri International Airport", "Varanasi", "India", "IN", "Asia/Kolkata", 25.4524, 82.8593],
  ["BBI", "VEBS", "Biju Patnaik International Airport", "Bhubaneswar", "India", "IN", "Asia/Kolkata", 20.2444, 85.8178],
  ["SXR", "VISR", "Srinagar International Airport", "Srinagar", "India", "IN", "Asia/Kolkata", 33.9871, 74.7742],
  ["IXB", "VEBD", "Bagdogra Airport", "Siliguri", "India", "IN", "Asia/Kolkata", 26.6812, 88.3286],
  ["CCJ", "VOCL", "Calicut International Airport", "Kozhikode", "India", "IN", "Asia/Kolkata", 11.1368, 75.9553],
  ["IXE", "VOML", "Mangaluru International Airport", "Mangaluru", "India", "IN", "Asia/Kolkata", 12.9613, 74.8901],
  ["CJB", "VOCB", "Coimbatore International Airport", "Coimbatore", "India", "IN", "Asia/Kolkata", 11.03, 77.0434],
  ["IDR", "VAID", "Devi Ahilyabai Holkar Airport", "Indore", "India", "IN", "Asia/Kolkata", 22.7218, 75.8011],
  ["VTZ", "VOVZ", "Visakhapatnam Airport", "Visakhapatnam", "India", "IN", "Asia/Kolkata", 17.7212, 83.2245],
  ["DXB", "OMDB", "Dubai International Airport", "Dubai", "United Arab Emirates", "AE", "Asia/Dubai", 25.2532, 55.3657, ["Terminal 1", "Terminal 2", "Terminal 3"], true],
  ["AUH", "OMAA", "Zayed International Airport", "Abu Dhabi", "United Arab Emirates", "AE", "Asia/Dubai", 24.433, 54.6511],
  ["DOH", "OTHH", "Hamad International Airport", "Doha", "Qatar", "QA", "Asia/Qatar", 25.2731, 51.6081],
  ["MCT", "OOMS", "Muscat International Airport", "Muscat", "Oman", "OM", "Asia/Muscat", 23.5933, 58.2844],
  ["RUH", "OERK", "King Khalid International Airport", "Riyadh", "Saudi Arabia", "SA", "Asia/Riyadh", 24.9576, 46.6988],
  ["JED", "OEJN", "King Abdulaziz International Airport", "Jeddah", "Saudi Arabia", "SA", "Asia/Riyadh", 21.6796, 39.1565],
  ["SIN", "WSSS", "Singapore Changi Airport", "Singapore", "Singapore", "SG", "Asia/Singapore", 1.3644, 103.9915, ["Terminal 1", "Terminal 2", "Terminal 3", "Terminal 4"], true],
  ["KUL", "WMKK", "Kuala Lumpur International Airport", "Kuala Lumpur", "Malaysia", "MY", "Asia/Kuala_Lumpur", 2.7456, 101.7099],
  ["BKK", "VTBS", "Suvarnabhumi Airport", "Bangkok", "Thailand", "TH", "Asia/Bangkok", 13.69, 100.7501],
  ["HKG", "VHHH", "Hong Kong International Airport", "Hong Kong", "Hong Kong", "HK", "Asia/Hong_Kong", 22.308, 113.9185],
  ["HND", "RJTT", "Tokyo Haneda Airport", "Tokyo", "Japan", "JP", "Asia/Tokyo", 35.5494, 139.7798],
  ["NRT", "RJAA", "Narita International Airport", "Tokyo", "Japan", "JP", "Asia/Tokyo", 35.772, 140.3929],
  ["ICN", "RKSI", "Incheon International Airport", "Seoul", "South Korea", "KR", "Asia/Seoul", 37.4602, 126.4407],
  ["CMB", "VCBI", "Bandaranaike International Airport", "Colombo", "Sri Lanka", "LK", "Asia/Colombo", 7.1808, 79.8841],
  ["KTM", "VNKT", "Tribhuvan International Airport", "Kathmandu", "Nepal", "NP", "Asia/Kathmandu", 27.6966, 85.3591],
  ["DAC", "VGHS", "Hazrat Shahjalal International Airport", "Dhaka", "Bangladesh", "BD", "Asia/Dhaka", 23.8433, 90.3978],
  ["MLE", "VRMM", "Velana International Airport", "Malé", "Maldives", "MV", "Indian/Maldives", 4.1918, 73.5291],
  ["LHR", "EGLL", "London Heathrow Airport", "London", "United Kingdom", "GB", "Europe/London", 51.47, -0.4543, ["Terminal 2", "Terminal 3", "Terminal 4", "Terminal 5"], true],
  ["CDG", "LFPG", "Paris Charles de Gaulle Airport", "Paris", "France", "FR", "Europe/Paris", 49.0097, 2.5479],
  ["FRA", "EDDF", "Frankfurt Airport", "Frankfurt", "Germany", "DE", "Europe/Berlin", 50.0379, 8.5622],
  ["AMS", "EHAM", "Amsterdam Airport Schiphol", "Amsterdam", "Netherlands", "NL", "Europe/Amsterdam", 52.3105, 4.7683],
  ["IST", "LTFM", "Istanbul Airport", "Istanbul", "Türkiye", "TR", "Europe/Istanbul", 41.2753, 28.7519],
  ["JFK", "KJFK", "John F. Kennedy International Airport", "New York", "United States", "US", "America/New_York", 40.6413, -73.7781, undefined, true],
  ["EWR", "KEWR", "Newark Liberty International Airport", "Newark", "United States", "US", "America/New_York", 40.6895, -74.1745],
  ["ORD", "KORD", "O'Hare International Airport", "Chicago", "United States", "US", "America/Chicago", 41.9742, -87.9073],
  ["SFO", "KSFO", "San Francisco International Airport", "San Francisco", "United States", "US", "America/Los_Angeles", 37.6213, -122.379],
  ["LAX", "KLAX", "Los Angeles International Airport", "Los Angeles", "United States", "US", "America/Los_Angeles", 33.9416, -118.4085],
  ["YYZ", "CYYZ", "Toronto Pearson International Airport", "Toronto", "Canada", "CA", "America/Toronto", 43.6777, -79.6248],
  ["SYD", "YSSY", "Sydney Kingsford Smith Airport", "Sydney", "Australia", "AU", "Australia/Sydney", -33.9399, 151.1753],
];

export const AIRPORTS: Airport[] = rows.map(([iata, icao, name, city, country, countryCode, timeZone, lat, lon, terminals, popular]) => ({
  iata, icao, name, city, country, countryCode, timeZone, lat, lon, terminals, popular,
}));

const byCode = new Map<string, Airport>();
for (const a of AIRPORTS) {
  byCode.set(a.iata, a);
  byCode.set(a.icao, a);
}

export function findAirport(code: string | undefined | null): Airport | undefined {
  return code ? byCode.get(code.toUpperCase()) : undefined;
}

export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: [number, Airport][] = [];
  for (const a of AIRPORTS) {
    let score = 0;
    if (a.iata.toLowerCase() === q || a.icao.toLowerCase() === q) score = 100;
    else if (a.iata.toLowerCase().startsWith(q)) score = 80;
    else if (a.city.toLowerCase().startsWith(q)) score = 70;
    else if (a.name.toLowerCase().includes(q)) score = 50;
    else if (a.city.toLowerCase().includes(q)) score = 40;
    else if (a.country.toLowerCase().startsWith(q)) score = 30;
    if (score) scored.push([score + (a.popular ? 5 : 0), a]);
  }
  return scored.sort((x, y) => y[0] - x[0]).slice(0, limit).map(([, a]) => a);
}
