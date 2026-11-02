// Static reference data for major Indian Railway stations: codes, names and
// approximate coordinates (for search and map display). Not live data. Any
// valid station code also works in searches even if it is not listed here.

export interface Station {
  code: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  popular?: boolean;
}

type Row = [string, string, string, string, number, number, boolean?];

const rows: Row[] = [
  ["NDLS", "New Delhi", "New Delhi", "Delhi", 28.643, 77.2194, true],
  ["DLI", "Delhi Junction", "Delhi", "Delhi", 28.661, 77.2276],
  ["NZM", "Hazrat Nizamuddin", "Delhi", "Delhi", 28.5884, 77.2533, true],
  ["ANVT", "Anand Vihar Terminal", "Delhi", "Delhi", 28.6502, 77.3152],
  ["CSMT", "Chhatrapati Shivaji Maharaj Terminus", "Mumbai", "Maharashtra", 18.9398, 72.8355, true],
  ["MMCT", "Mumbai Central", "Mumbai", "Maharashtra", 18.969, 72.8205, true],
  ["LTT", "Lokmanya Tilak Terminus", "Mumbai", "Maharashtra", 19.0688, 72.8908],
  ["BDTS", "Bandra Terminus", "Mumbai", "Maharashtra", 19.0626, 72.8411],
  ["TNA", "Thane", "Thane", "Maharashtra", 19.186, 72.975],
  ["KYN", "Kalyan Junction", "Kalyan", "Maharashtra", 19.236, 73.13],
  ["HWH", "Howrah Junction", "Howrah", "West Bengal", 22.5839, 88.3426, true],
  ["SDAH", "Sealdah", "Kolkata", "West Bengal", 22.5678, 88.371],
  ["KOAA", "Kolkata", "Kolkata", "West Bengal", 22.603, 88.383],
  ["SHM", "Shalimar", "Howrah", "West Bengal", 22.553, 88.317],
  ["MAS", "Chennai Central", "Chennai", "Tamil Nadu", 13.0827, 80.2757, true],
  ["MS", "Chennai Egmore", "Chennai", "Tamil Nadu", 13.078, 80.2614],
  ["SBC", "KSR Bengaluru City Junction", "Bengaluru", "Karnataka", 12.9781, 77.5697, true],
  ["YPR", "Yesvantpur Junction", "Bengaluru", "Karnataka", 13.0237, 77.5503],
  ["SMVB", "SMVT Bengaluru", "Bengaluru", "Karnataka", 12.9934, 77.6619],
  ["SC", "Secunderabad Junction", "Secunderabad", "Telangana", 17.4337, 78.5016, true],
  ["HYB", "Hyderabad Deccan", "Hyderabad", "Telangana", 17.3926, 78.4677],
  ["KCG", "Kacheguda", "Hyderabad", "Telangana", 17.3895, 78.4995],
  ["PUNE", "Pune Junction", "Pune", "Maharashtra", 18.5289, 73.8744, true],
  ["ADI", "Ahmedabad Junction", "Ahmedabad", "Gujarat", 23.0263, 72.601, true],
  ["ST", "Surat", "Surat", "Gujarat", 21.2054, 72.8406],
  ["BRC", "Vadodara Junction", "Vadodara", "Gujarat", 22.3108, 73.181],
  ["JP", "Jaipur Junction", "Jaipur", "Rajasthan", 26.9196, 75.7878, true],
  ["AII", "Ajmer Junction", "Ajmer", "Rajasthan", 26.456, 74.638],
  ["KOTA", "Kota Junction", "Kota", "Rajasthan", 25.2125, 75.872],
  ["JU", "Jodhpur Junction", "Jodhpur", "Rajasthan", 26.284, 73.023],
  ["BKN", "Bikaner Junction", "Bikaner", "Rajasthan", 28.02, 73.315],
  ["LKO", "Lucknow Charbagh", "Lucknow", "Uttar Pradesh", 26.8317, 80.9218, true],
  ["CNB", "Kanpur Central", "Kanpur", "Uttar Pradesh", 26.4539, 80.351],
  ["PRYJ", "Prayagraj Junction", "Prayagraj", "Uttar Pradesh", 25.4449, 81.8263],
  ["BSB", "Varanasi Junction", "Varanasi", "Uttar Pradesh", 25.3268, 82.987],
  ["DDU", "Pt. Deen Dayal Upadhyaya Junction", "Chandauli", "Uttar Pradesh", 25.2777, 83.1196],
  ["GKP", "Gorakhpur Junction", "Gorakhpur", "Uttar Pradesh", 26.759, 83.3803],
  ["AGC", "Agra Cantt", "Agra", "Uttar Pradesh", 27.1585, 77.99],
  ["MTJ", "Mathura Junction", "Mathura", "Uttar Pradesh", 27.48, 77.68],
  ["JHS", "Virangana Lakshmibai Jhansi Junction", "Jhansi", "Uttar Pradesh", 25.4467, 78.5654],
  ["GWL", "Gwalior Junction", "Gwalior", "Madhya Pradesh", 26.2167, 78.183],
  ["BPL", "Bhopal Junction", "Bhopal", "Madhya Pradesh", 23.2669, 77.4126],
  ["RKMP", "Rani Kamalapati", "Bhopal", "Madhya Pradesh", 23.2226, 77.4392],
  ["ET", "Itarsi Junction", "Itarsi", "Madhya Pradesh", 22.6142, 77.7621],
  ["INDB", "Indore Junction", "Indore", "Madhya Pradesh", 22.7176, 75.8678],
  ["UJN", "Ujjain Junction", "Ujjain", "Madhya Pradesh", 23.182, 75.774],
  ["NGP", "Nagpur Junction", "Nagpur", "Maharashtra", 21.152, 79.0886],
  ["NK", "Nashik Road", "Nashik", "Maharashtra", 19.948, 73.842],
  ["AWB", "Chhatrapati Sambhajinagar", "Chhatrapati Sambhajinagar", "Maharashtra", 19.863, 75.313],
  ["SUR", "Solapur", "Solapur", "Maharashtra", 17.666, 75.893],
  ["PNBE", "Patna Junction", "Patna", "Bihar", 25.6026, 85.1376, true],
  ["MFP", "Muzaffarpur Junction", "Muzaffarpur", "Bihar", 26.117, 85.39],
  ["BGP", "Bhagalpur", "Bhagalpur", "Bihar", 25.244, 86.984],
  ["GHY", "Guwahati", "Guwahati", "Assam", 26.1817, 91.751],
  ["NJP", "New Jalpaiguri", "Siliguri", "West Bengal", 26.6833, 88.4433],
  ["KGP", "Kharagpur Junction", "Kharagpur", "West Bengal", 22.34, 87.325],
  ["ASN", "Asansol Junction", "Asansol", "West Bengal", 23.688, 86.975],
  ["DHN", "Dhanbad Junction", "Dhanbad", "Jharkhand", 23.792, 86.43],
  ["RNC", "Ranchi Junction", "Ranchi", "Jharkhand", 23.346, 85.3389],
  ["TATA", "Tatanagar Junction", "Jamshedpur", "Jharkhand", 22.769, 86.203],
  ["R", "Raipur Junction", "Raipur", "Chhattisgarh", 21.258, 81.629],
  ["BBS", "Bhubaneswar", "Bhubaneswar", "Odisha", 20.2669, 85.8432],
  ["PURI", "Puri", "Puri", "Odisha", 19.8098, 85.8253],
  ["BZA", "Vijayawada Junction", "Vijayawada", "Andhra Pradesh", 16.5181, 80.6197],
  ["VSKP", "Visakhapatnam Junction", "Visakhapatnam", "Andhra Pradesh", 17.7225, 83.2897],
  ["TPTY", "Tirupati", "Tirupati", "Andhra Pradesh", 13.628, 79.419],
  ["TVC", "Thiruvananthapuram Central", "Thiruvananthapuram", "Kerala", 8.4875, 76.9525],
  ["ERS", "Ernakulam Junction", "Kochi", "Kerala", 9.9688, 76.2899],
  ["CBE", "Coimbatore Junction", "Coimbatore", "Tamil Nadu", 10.9963, 76.9668],
  ["MDU", "Madurai Junction", "Madurai", "Tamil Nadu", 9.9192, 78.11],
  ["MYS", "Mysuru Junction", "Mysuru", "Karnataka", 12.316, 76.645],
  ["UBL", "SSS Hubballi Junction", "Hubballi", "Karnataka", 15.348, 75.149],
  ["MAQ", "Mangaluru Central", "Mangaluru", "Karnataka", 12.8636, 74.8432],
  ["MAO", "Madgaon Junction", "Madgaon", "Goa", 15.2667, 73.9667],
  ["CDG", "Chandigarh", "Chandigarh", "Chandigarh", 30.7037, 76.8197],
  ["UMB", "Ambala Cantt Junction", "Ambala", "Haryana", 30.3381, 76.8288],
  ["ASR", "Amritsar Junction", "Amritsar", "Punjab", 31.6328, 74.8673],
  ["JAT", "Jammu Tawi", "Jammu", "Jammu & Kashmir", 32.7059, 74.88],
  ["SVDK", "Shri Mata Vaishno Devi Katra", "Katra", "Jammu & Kashmir", 32.9725, 74.933],
  ["DDN", "Dehradun", "Dehradun", "Uttarakhand", 30.3165, 78.0322],
  ["HW", "Haridwar Junction", "Haridwar", "Uttarakhand", 29.9471, 78.1614],
];

export const STATIONS: Station[] = rows.map(([code, name, city, state, lat, lon, popular]) => ({
  code, name, city, state, lat, lon, popular,
}));

const byCode = new Map(STATIONS.map((s) => [s.code, s]));

export function findStation(code: string | undefined | null): Station | undefined {
  return code ? byCode.get(code.toUpperCase()) : undefined;
}

export function searchStations(query: string, limit = 8): Station[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: [number, Station][] = [];
  for (const s of STATIONS) {
    const code = s.code.toLowerCase();
    let score = 0;
    if (code === q) score = 100;
    else if (code.startsWith(q)) score = 70;
    else if (s.name.toLowerCase().startsWith(q)) score = 65;
    else if (s.city.toLowerCase().startsWith(q)) score = 60;
    else if (s.name.toLowerCase().includes(q)) score = 45;
    else if (s.state.toLowerCase().startsWith(q)) score = 20;
    if (score) scored.push([score + (s.popular ? 5 : 0), s]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, s]) => s);
}

export const POPULAR_TRAINS = [
  { number: "12951", name: "Mumbai Rajdhani Express" },
  { number: "12301", name: "Howrah Rajdhani Express" },
  { number: "12002", name: "Bhopal Shatabdi Express" },
  { number: "22436", name: "Vande Bharat Express (NDLS–BSB)" },
  { number: "12627", name: "Karnataka Express" },
  { number: "12621", name: "Tamil Nadu Express" },
];
