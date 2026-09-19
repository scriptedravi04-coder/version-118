export interface LocationItem {
  id: string;
  name: string;
  type: 'state' | 'city' | 'union_territory' | 'country' | 'global_city' | 'region';
  state?: string;
  country: string;
}

export const INDIAN_STATES: string[] = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

export const INDIAN_UNION_TERRITORIES: string[] = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

export const ALL_INDIAN_STATES_AND_UTS: string[] = [
  ...INDIAN_STATES,
  ...INDIAN_UNION_TERRITORIES
];

export const GLOBAL_METROS: { name: string; country: string }[] = [
  { name: "Dubai", country: "United Arab Emirates" },
  { name: "Abu Dhabi", country: "United Arab Emirates" },
  { name: "Singapore", country: "Singapore" },
  { name: "London", country: "United Kingdom" },
  { name: "New York", country: "United States" },
  { name: "Los Angeles", country: "United States" },
  { name: "San Francisco", country: "United States" },
  { name: "Toronto", country: "Canada" },
  { name: "Vancouver", country: "Canada" },
  { name: "Sydney", country: "Australia" },
  { name: "Melbourne", country: "Australia" },
  { name: "Berlin", country: "Germany" },
  { name: "Paris", country: "France" },
  { name: "Amsterdam", country: "Netherlands" },
  { name: "Zurich", country: "Switzerland" },
  { name: "Tokyo", country: "Japan" },
  { name: "Seoul", country: "South Korea" },
  { name: "Bangkok", country: "Thailand" },
  { name: "Bali", country: "Indonesia" },
  { name: "Kuala Lumpur", country: "Malaysia" },
  { name: "Doha", country: "Qatar" },
  { name: "Riyadh", country: "Saudi Arabia" },
  { name: "Hong Kong", country: "Hong Kong" }
];

export const COMPREHENSIVE_INDIAN_CITIES: { city: string; state: string }[] = [
  // Himachal Pradesh
  { city: "Shimla", state: "Himachal Pradesh" },
  { city: "Manali", state: "Himachal Pradesh" },
  { city: "Dharamshala", state: "Himachal Pradesh" },
  { city: "Solan", state: "Himachal Pradesh" },
  { city: "Mandi", state: "Himachal Pradesh" },
  { city: "Kullu", state: "Himachal Pradesh" },
  { city: "Bilaspur (HP)", state: "Himachal Pradesh" },
  { city: "Hamirpur", state: "Himachal Pradesh" },
  { city: "Una", state: "Himachal Pradesh" },
  { city: "Chamba", state: "Himachal Pradesh" },
  { city: "Kangra", state: "Himachal Pradesh" },
  { city: "Palampur", state: "Himachal Pradesh" },
  { city: "Paonta Sahib", state: "Himachal Pradesh" },
  { city: "Nahan", state: "Himachal Pradesh" },
  { city: "Baddi", state: "Himachal Pradesh" },
  { city: "Dalhousie", state: "Himachal Pradesh" },
  { city: "Kasauli", state: "Himachal Pradesh" },

  // Jammu & Kashmir & Ladakh
  { city: "Srinagar", state: "Jammu and Kashmir" },
  { city: "Jammu", state: "Jammu and Kashmir" },
  { city: "Anantnag", state: "Jammu and Kashmir" },
  { city: "Baramulla", state: "Jammu and Kashmir" },
  { city: "Udhampur", state: "Jammu and Kashmir" },
  { city: "Kathua", state: "Jammu and Kashmir" },
  { city: "Sopore", state: "Jammu and Kashmir" },
  { city: "Pahalgam", state: "Jammu and Kashmir" },
  { city: "Gulmarg", state: "Jammu and Kashmir" },
  { city: "Katra", state: "Jammu and Kashmir" },
  { city: "Leh", state: "Ladakh" },
  { city: "Kargil", state: "Ladakh" },

  // Uttarakhand
  { city: "Dehradun", state: "Uttarakhand" },
  { city: "Haridwar", state: "Uttarakhand" },
  { city: "Rishikesh", state: "Uttarakhand" },
  { city: "Roorkee", state: "Uttarakhand" },
  { city: "Haldwani", state: "Uttarakhand" },
  { city: "Nainital", state: "Uttarakhand" },
  { city: "Mussoorie", state: "Uttarakhand" },
  { city: "Rudrapur", state: "Uttarakhand" },
  { city: "Kashipur", state: "Uttarakhand" },
  { city: "Almora", state: "Uttarakhand" },
  { city: "Pithoragarh", state: "Uttarakhand" },
  { city: "Ranikhet", state: "Uttarakhand" },

  // Karnataka
  { city: "Bengaluru", state: "Karnataka" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Mysuru", state: "Karnataka" },
  { city: "Mysore", state: "Karnataka" },
  { city: "Mangaluru", state: "Karnataka" },
  { city: "Mangalore", state: "Karnataka" },
  { city: "Hubballi-Dharwad", state: "Karnataka" },
  { city: "Belagavi", state: "Karnataka" },
  { city: "Belgaum", state: "Karnataka" },
  { city: "Kalaburagi", state: "Karnataka" },
  { city: "Gulbarga", state: "Karnataka" },
  { city: "Davanagere", state: "Karnataka" },
  { city: "Ballari", state: "Karnataka" },
  { city: "Bellary", state: "Karnataka" },
  { city: "Shivamogga", state: "Karnataka" },
  { city: "Tumakuru", state: "Karnataka" },
  { city: "Udupi", state: "Karnataka" },
  { city: "Manipal", state: "Karnataka" },
  { city: "Chikmagalur", state: "Karnataka" },
  { city: "Hassan", state: "Karnataka" },
  { city: "Bidar", state: "Karnataka" },
  { city: "Madikeri (Coorg)", state: "Karnataka" },

  // Kerala
  { city: "Kochi", state: "Kerala" },
  { city: "Cochin", state: "Kerala" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Trivandrum", state: "Kerala" },
  { city: "Kozhikode", state: "Kerala" },
  { city: "Calicut", state: "Kerala" },
  { city: "Thrissur", state: "Kerala" },
  { city: "Kollam", state: "Kerala" },
  { city: "Palakkad", state: "Kerala" },
  { city: "Alappuzha", state: "Kerala" },
  { city: "Alleppey", state: "Kerala" },
  { city: "Kannur", state: "Kerala" },
  { city: "Kottayam", state: "Kerala" },
  { city: "Malappuram", state: "Kerala" },
  { city: "Munnar", state: "Kerala" },
  { city: "Wayanad", state: "Kerala" },
  { city: "Varkala", state: "Kerala" },

  // Maharashtra
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Thane", state: "Maharashtra" },
  { city: "Navi Mumbai", state: "Maharashtra" },
  { city: "Nashik", state: "Maharashtra" },
  { city: "Kalyan-Dombivli", state: "Maharashtra" },
  { city: "Vasai-Virar", state: "Maharashtra" },
  { city: "Aurangabad", state: "Maharashtra" },
  { city: "Chhatrapati Sambhajinagar", state: "Maharashtra" },
  { city: "Solapur", state: "Maharashtra" },
  { city: "Kolhapur", state: "Maharashtra" },
  { city: "Amravati", state: "Maharashtra" },
  { city: "Nanded", state: "Maharashtra" },
  { city: "Sangli", state: "Maharashtra" },
  { city: "Jalgaon", state: "Maharashtra" },
  { city: "Akola", state: "Maharashtra" },
  { city: "Latur", state: "Maharashtra" },
  { city: "Dhule", state: "Maharashtra" },
  { city: "Ahmednagar", state: "Maharashtra" },
  { city: "Chandrapur", state: "Maharashtra" },
  { city: "Panvel", state: "Maharashtra" },
  { city: "Pimpri-Chinchwad", state: "Maharashtra" },
  { city: "Mira-Bhayandar", state: "Maharashtra" },
  { city: "Satara", state: "Maharashtra" },
  { city: "Shirdi", state: "Maharashtra" },
  { city: "Mahabaleshwar", state: "Maharashtra" },
  { city: "Alibaug", state: "Maharashtra" },

  // Delhi NCR
  { city: "Delhi", state: "Delhi" },
  { city: "New Delhi", state: "Delhi" },
  { city: "Delhi NCR", state: "Delhi" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Greater Noida", state: "Uttar Pradesh" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Gurugram", state: "Haryana" },
  { city: "Gurgaon", state: "Haryana" },
  { city: "Faridabad", state: "Haryana" },

  // Uttar Pradesh
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Prayagraj", state: "Uttar Pradesh" },
  { city: "Allahabad", state: "Uttar Pradesh" },
  { city: "Meerut", state: "Uttar Pradesh" },
  { city: "Bareilly", state: "Uttar Pradesh" },
  { city: "Aligarh", state: "Uttar Pradesh" },
  { city: "Moradabad", state: "Uttar Pradesh" },
  { city: "Saharanpur", state: "Uttar Pradesh" },
  { city: "Gorakhpur", state: "Uttar Pradesh" },
  { city: "Jhansi", state: "Uttar Pradesh" },
  { city: "Muzaffarnagar", state: "Uttar Pradesh" },
  { city: "Mathura", state: "Uttar Pradesh" },
  { city: "Ayodhya", state: "Uttar Pradesh" },
  { city: "Firozabad", state: "Uttar Pradesh" },
  { city: "Vrindavan", state: "Uttar Pradesh" },

  // Rajasthan
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Udaipur", state: "Rajasthan" },
  { city: "Kota", state: "Rajasthan" },
  { city: "Bikaner", state: "Rajasthan" },
  { city: "Ajmer", state: "Rajasthan" },
  { city: "Bhilwara", state: "Rajasthan" },
  { city: "Alwar", state: "Rajasthan" },
  { city: "Bharatpur", state: "Rajasthan" },
  { city: "Sikar", state: "Rajasthan" },
  { city: "Pali", state: "Rajasthan" },
  { city: "Sri Ganganagar", state: "Rajasthan" },
  { city: "Jaisalmer", state: "Rajasthan" },
  { city: "Mount Abu", state: "Rajasthan" },
  { city: "Pushkar", state: "Rajasthan" },

  // Gujarat
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Surat", state: "Gujarat" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Baroda", state: "Gujarat" },
  { city: "Rajkot", state: "Gujarat" },
  { city: "Bhavnagar", state: "Gujarat" },
  { city: "Jamnagar", state: "Gujarat" },
  { city: "Junagadh", state: "Gujarat" },
  { city: "Gandhinagar", state: "Gujarat" },
  { city: "Anand", state: "Gujarat" },
  { city: "Navsari", state: "Gujarat" },
  { city: "Morbi", state: "Gujarat" },
  { city: "Nadiad", state: "Gujarat" },
  { city: "Bharuch", state: "Gujarat" },
  { city: "Mehsana", state: "Gujarat" },
  { city: "Bhuj", state: "Gujarat" },
  { city: "Vapi", state: "Gujarat" },
  { city: "Valsad", state: "Gujarat" },
  { city: "Porbandar", state: "Gujarat" },
  { city: "Himatnagar", state: "Gujarat" },

  // Tamil Nadu
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Tiruchirappalli", state: "Tamil Nadu" },
  { city: "Trichy", state: "Tamil Nadu" },
  { city: "Salem", state: "Tamil Nadu" },
  { city: "Tirunelveli", state: "Tamil Nadu" },
  { city: "Tiruppur", state: "Tamil Nadu" },
  { city: "Vellore", state: "Tamil Nadu" },
  { city: "Erode", state: "Tamil Nadu" },
  { city: "Thoothukudi", state: "Tamil Nadu" },
  { city: "Thanjavur", state: "Tamil Nadu" },
  { city: "Nagercoil", state: "Tamil Nadu" },
  { city: "Kancheepuram", state: "Tamil Nadu" },
  { city: "Hosur", state: "Tamil Nadu" },
  { city: "Ooty", state: "Tamil Nadu" },
  { city: "Kodaikanal", state: "Tamil Nadu" },
  { city: "Rameswaram", state: "Tamil Nadu" },

  // Telangana
  { city: "Hyderabad", state: "Telangana" },
  { city: "Warangal", state: "Telangana" },
  { city: "Nizamabad", state: "Telangana" },
  { city: "Karimnagar", state: "Telangana" },
  { city: "Ramagundam", state: "Telangana" },
  { city: "Khammam", state: "Telangana" },
  { city: "Mahbubnagar", state: "Telangana" },
  { city: "Nalgonda", state: "Telangana" },
  { city: "Siddipet", state: "Telangana" },

  // Andhra Pradesh
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Vizag", state: "Andhra Pradesh" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Guntur", state: "Andhra Pradesh" },
  { city: "Nellore", state: "Andhra Pradesh" },
  { city: "Kurnool", state: "Andhra Pradesh" },
  { city: "Rajahmundry", state: "Andhra Pradesh" },
  { city: "Tirupati", state: "Andhra Pradesh" },
  { city: "Kakinada", state: "Andhra Pradesh" },
  { city: "Kadapa", state: "Andhra Pradesh" },
  { city: "Anantapur", state: "Andhra Pradesh" },
  { city: "Vizianagaram", state: "Andhra Pradesh" },
  { city: "Eluru", state: "Andhra Pradesh" },
  { city: "Ongole", state: "Andhra Pradesh" },

  // West Bengal
  { city: "Kolkata", state: "West Bengal" },
  { city: "Howrah", state: "West Bengal" },
  { city: "Durgapur", state: "West Bengal" },
  { city: "Asansol", state: "West Bengal" },
  { city: "Siliguri", state: "West Bengal" },
  { city: "Bardhaman", state: "West Bengal" },
  { city: "Kharagpur", state: "West Bengal" },
  { city: "Haldia", state: "West Bengal" },
  { city: "Darjeeling", state: "West Bengal" },
  { city: "Kalimpong", state: "West Bengal" },
  { city: "Malda", state: "West Bengal" },

  // Punjab & Chandigarh & Haryana
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Ludhiana", state: "Punjab" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Jalandhar", state: "Punjab" },
  { city: "Patiala", state: "Punjab" },
  { city: "Bathinda", state: "Punjab" },
  { city: "Mohali", state: "Punjab" },
  { city: "Hoshiarpur", state: "Punjab" },
  { city: "Pathankot", state: "Punjab" },
  { city: "Panipat", state: "Haryana" },
  { city: "Ambala", state: "Haryana" },
  { city: "Rohtak", state: "Haryana" },
  { city: "Hisar", state: "Haryana" },
  { city: "Karnal", state: "Haryana" },
  { city: "Sonipat", state: "Haryana" },
  { city: "Panchkula", state: "Haryana" },
  { city: "Yamunanagar", state: "Haryana" },

  // Madhya Pradesh & Chhattisgarh
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Jabalpur", state: "Madhya Pradesh" },
  { city: "Gwalior", state: "Madhya Pradesh" },
  { city: "Ujjain", state: "Madhya Pradesh" },
  { city: "Sagar", state: "Madhya Pradesh" },
  { city: "Dewas", state: "Madhya Pradesh" },
  { city: "Satna", state: "Madhya Pradesh" },
  { city: "Ratlam", state: "Madhya Pradesh" },
  { city: "Rewa", state: "Madhya Pradesh" },
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Bhilai", state: "Chhattisgarh" },
  { city: "Bilaspur (CG)", state: "Chhattisgarh" },
  { city: "Korba", state: "Chhattisgarh" },
  { city: "Durg", state: "Chhattisgarh" },

  // Bihar & Jharkhand
  { city: "Patna", state: "Bihar" },
  { city: "Gaya", state: "Bihar" },
  { city: "Bhagalpur", state: "Bihar" },
  { city: "Muzaffarpur", state: "Bihar" },
  { city: "Purnia", state: "Bihar" },
  { city: "Darbhanga", state: "Bihar" },
  { city: "Bihar Sharif", state: "Bihar" },
  { city: "Arrah", state: "Bihar" },
  { city: "Begusarai", state: "Bihar" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Jamshedpur", state: "Jharkhand" },
  { city: "Dhanbad", state: "Jharkhand" },
  { city: "Bokaro", state: "Jharkhand" },
  { city: "Deoghar", state: "Jharkhand" },
  { city: "Hazaribagh", state: "Jharkhand" },

  // Odisha
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Cuttack", state: "Odisha" },
  { city: "Rourkela", state: "Odisha" },
  { city: "Berhampur", state: "Odisha" },
  { city: "Sambalpur", state: "Odisha" },
  { city: "Puri", state: "Odisha" },
  { city: "Balasore", state: "Odisha" },

  // Goa
  { city: "Panaji", state: "Goa" },
  { city: "Goa", state: "Goa" },
  { city: "Margao", state: "Goa" },
  { city: "Vasco da Gama", state: "Goa" },
  { city: "Mapusa", state: "Goa" },
  { city: "Ponda", state: "Goa" },
  { city: "Calangute", state: "Goa" },
  { city: "Candolim", state: "Goa" },
  { city: "Anjuna", state: "Goa" },

  // North East States
  { city: "Guwahati", state: "Assam" },
  { city: "Silchar", state: "Assam" },
  { city: "Dibrugarh", state: "Assam" },
  { city: "Jorhat", state: "Assam" },
  { city: "Tezpur", state: "Assam" },
  { city: "Shillong", state: "Meghalaya" },
  { city: "Imphal", state: "Manipur" },
  { city: "Aizawl", state: "Mizoram" },
  { city: "Kohima", state: "Nagaland" },
  { city: "Dimapur", state: "Nagaland" },
  { city: "Gangtok", state: "Sikkim" },
  { city: "Agartala", state: "Tripura" },
  { city: "Itanagar", state: "Arunachal Pradesh" },

  // Union Territories
  { city: "Puducherry", state: "Puducherry" },
  { city: "Pondicherry", state: "Puducherry" },
  { city: "Port Blair", state: "Andaman and Nicobar Islands" },
  { city: "Daman", state: "Dadra and Nagar Haveli and Daman and Diu" },
  { city: "Diu", state: "Dadra and Nagar Haveli and Daman and Diu" },
  { city: "Silvassa", state: "Dadra and Nagar Haveli and Daman and Diu" }
];

export const PAN_INDIA_LOCATIONS: string[] = [
  "Pan India",
  ...ALL_INDIAN_STATES_AND_UTS,
  ...COMPREHENSIVE_INDIAN_CITIES.map(c => c.city),
  ...GLOBAL_METROS.map(g => g.name)
];

export function searchLocations(query: string, limit: number = 15): Array<{
  name: string;
  type: string;
  state?: string;
  country: string;
  display: string;
}> {
  const q = (query || "").trim().toLowerCase();
  if (!q) {
    const topPopular = [
      { name: "Pan India", type: "Region", country: "India", display: "Pan India (All Regions)" },
      { name: "Himachal Pradesh", type: "State", country: "India", display: "Himachal Pradesh (State)" },
      { name: "Delhi NCR", type: "State/Region", state: "Delhi", country: "India", display: "Delhi NCR (Metro)" },
      { name: "Mumbai", type: "City", state: "Maharashtra", country: "India", display: "Mumbai, Maharashtra" },
      { name: "Bengaluru", type: "City", state: "Karnataka", country: "India", display: "Bengaluru, Karnataka" },
      { name: "Hyderabad", type: "City", state: "Telangana", country: "India", display: "Hyderabad, Telangana" },
      { name: "Chandigarh", type: "Union Territory", country: "India", display: "Chandigarh (UT)" },
      { name: "Jaipur", type: "City", state: "Rajasthan", country: "India", display: "Jaipur, Rajasthan" },
      { name: "Goa", type: "State", country: "India", display: "Goa (State)" },
      { name: "Jammu and Kashmir", type: "Union Territory", country: "India", display: "Jammu and Kashmir (UT)" },
      { name: "Karnataka", type: "State", country: "India", display: "Karnataka (State)" },
      { name: "Kerala", type: "State", country: "India", display: "Kerala (State)" },
      { name: "Maharashtra", type: "State", country: "India", display: "Maharashtra (State)" },
      { name: "Dubai", type: "Global City", country: "UAE", display: "Dubai, United Arab Emirates" },
      { name: "London", type: "Global City", country: "UK", display: "London, United Kingdom" }
    ];
    return topPopular.slice(0, limit);
  }

  const results: Array<{
    name: string;
    type: string;
    state?: string;
    country: string;
    display: string;
    score: number;
  }> = [];

  const seen = new Set<string>();

  if ("pan india".includes(q) || q === "pan" || q === "india") {
    results.push({
      name: "Pan India",
      type: "Region",
      country: "India",
      display: "Pan India (All Regions)",
      score: q.startsWith("pan") ? 100 : 80
    });
    seen.add("pan india");
  }

  for (const st of ALL_INDIAN_STATES_AND_UTS) {
    const stLower = st.toLowerCase();
    const isUT = INDIAN_UNION_TERRITORIES.includes(st);
    if (stLower.includes(q)) {
      const score = stLower.startsWith(q) ? 95 : 75;
      results.push({
        name: st,
        type: isUT ? "Union Territory" : "State",
        country: "India",
        display: `${st} (${isUT ? "Union Territory" : "State"})`,
        score
      });
      seen.add(stLower);
    }
  }

  for (const item of COMPREHENSIVE_INDIAN_CITIES) {
    const cityLower = item.city.toLowerCase();
    const stateLower = item.state.toLowerCase();
    
    if (seen.has(cityLower)) continue;

    if (cityLower.includes(q) || stateLower.includes(q)) {
      let score = 50;
      if (cityLower.startsWith(q)) score = 90;
      else if (cityLower.includes(q)) score = 70;
      else if (stateLower.startsWith(q)) score = 65;

      results.push({
        name: item.city,
        type: "City",
        state: item.state,
        country: "India",
        display: `${item.city}, ${item.state}`,
        score
      });
      seen.add(cityLower);
    }
  }

  for (const g of GLOBAL_METROS) {
    const nameLower = g.name.toLowerCase();
    const countryLower = g.country.toLowerCase();
    if (seen.has(nameLower)) continue;

    if (nameLower.includes(q) || countryLower.includes(q)) {
      const score = nameLower.startsWith(q) ? 85 : 60;
      results.push({
        name: g.name,
        type: "Global City",
        country: g.country,
        display: `${g.name}, ${g.country}`,
        score
      });
      seen.add(nameLower);
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map(({ score, ...rest }) => rest);
}
