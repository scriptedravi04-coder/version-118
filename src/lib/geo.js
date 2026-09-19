export const CITIES_DATA = {
  "lucknow": { lat: 26.8467, lng: 80.9462 },
  "jaipur": { lat: 26.9124, lng: 75.7873 },
  "delhi": { lat: 28.7041, lng: 77.1025 },
  "new delhi": { lat: 28.6139, lng: 77.2090 },
  "noida": { lat: 28.5355, lng: 77.3910 },
  "greater noida": { lat: 28.4744, lng: 77.5040 },
  "ghaziabad": { lat: 28.6692, lng: 77.4538 },
  "gurugram": { lat: 28.4595, lng: 77.0266 },
  "gurgaon": { lat: 28.4595, lng: 77.0266 },
  "faridabad": { lat: 28.4089, lng: 77.3178 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "bangalore": { lat: 12.9716, lng: 77.5946 },
  "hyderabad": { lat: 17.3850, lng: 78.4867 },
  "ahmedabad": { lat: 23.0225, lng: 72.5714 },
  "chennai": { lat: 13.0827, lng: 80.2707 },
  "kolkata": { lat: 22.5726, lng: 88.3639 },
  "surat": { lat: 21.1702, lng: 72.8311 },
  "pune": { lat: 18.5204, lng: 73.8567 },
  "kanpur": { lat: 26.4499, lng: 80.3319 },
  "nagpur": { lat: 21.1458, lng: 79.0882 },
  "indore": { lat: 22.7196, lng: 75.8577 },
  "thane": { lat: 19.2183, lng: 72.9781 },
  "bhopal": { lat: 23.2599, lng: 77.4126 },
  "visakhapatnam": { lat: 17.6868, lng: 83.2185 },
  "vizag": { lat: 17.6868, lng: 83.2185 },
  "patna": { lat: 25.5941, lng: 85.1376 },
  "vadodara": { lat: 22.3072, lng: 73.1812 },
  "agra": { lat: 27.1767, lng: 78.0081 },
  "varanasi": { lat: 25.3176, lng: 82.9739 },
  "ranchi": { lat: 23.3441, lng: 85.3096 },
  "chandigarh": { lat: 30.7333, lng: 76.7794 },
  "kochi": { lat: 9.9312, lng: 76.2673 },
  "trivandrum": { lat: 8.5241, lng: 76.9366 },
  "dehradun": { lat: 30.3165, lng: 78.0322 },
  "allahabad": { lat: 25.4358, lng: 81.8463 },
  "ajmer": { lat: 26.4499, lng: 74.6399 },
  "pushkar": { lat: 26.4886, lng: 74.5509 },
  "alwar": { lat: 27.5530, lng: 76.6346 },
  "sikar": { lat: 27.6094, lng: 75.1398 },
  "jodhpur": { lat: 26.2389, lng: 73.0243 },
  "udaipur": { lat: 24.5854, lng: 73.7125 },
  "mathura": { lat: 27.4924, lng: 77.6737 },
  "agra": { lat: 27.1767, lng: 78.0081 },
  "meerut": { lat: 28.9845, lng: 77.7064 },
  "panipat": { lat: 29.3909, lng: 76.9635 },
  "rohtak": { lat: 28.8955, lng: 76.6066 },
};

export const getDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1); 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return Math.round(R * c); // Distance in km
};

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

export const geocodeCity = async (cityName) => {
  if (!cityName) return null;
  const name = cityName.toLowerCase().trim();
  
  if (CITIES_DATA[name]) return CITIES_DATA[name];

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(name)}&countrycodes=in&format=json&limit=1`);
    const data = await res.json();
    if (data && data.length > 0) {
      const result = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      return result;
    }
  } catch (e) {
    console.error("Geocoding failed for", name, e);
  }
  return null;
};
