export const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad",
  "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane",
  "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna",
  "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik",
  "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar",
  "Varanasi", "Srinagar", "Aurangabad", "Dhanbad", "Amritsar",
  "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore",
  "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai",
  "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur",
  "Hubli-Dharwad", "Mysore", "Tiruchirappalli", "Bareilly", "Aligarh",
  "Tiruppur", "Gurgaon", "Moradabad", "Jalandhar", "Bhubaneswar",
  "Salem", "Warangal", "Mira-Bhayandar", "Jalgaon", "Guntur",
  "Thiruvananthapuram", "Bhiwandi", "Saharanpur", "Gorakhpur",
  "Bikaner", "Amravati", "Noida", "Jamshedpur", "Bhilai",
  "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar",
  "Dehradun", "Durgapur", "Asansol", "Rourkela", "Nanded",
  "Kolhapur", "Ajmer", "Akola", "Gulbarga", "Jamnagar",
  "Ujjain", "Loni", "Siliguri", "Jhansi", "Ulhasnagar",
  "Jammu", "Sangli-Miraj & Kupwad", "Mangalore", "Erode", "Belgaum",
  "Ambattur", "Tirunelveli", "Malegaon", "Gaya", "Udaipur", "Maheshtala", "Davanagere", "Kozhikode", "Akbarpur"
];


export const CATEGORIES_WITH_SUBS = {
  "Fashion": ["Streetwear", "Luxury", "Ethnic Wear", "Sustainable", "Mens Fashion", "Womens Fashion", "Kids"],
  "Beauty": ["Makeup", "Skincare", "Haircare", "Fragrance", "Nails", "K-Beauty"],
  "Technology": ["Smartphones", "Laptops", "Gaming", "Gadgets", "Coding", "AI"],
  "Food": ["Recipes", "Restaurants", "Street Food", "Healthy", "Baking", "Beverages"],
  "Travel": ["Budget", "Luxury", "Adventure", "Solo", "International", "Domestic", "Backpacking"],
  "Fitness & Health": ["Gym", "Yoga", "Calisthenics", "Running", "CrossFit", "Pilates"],
  "Comedy": ["Standup", "Skits", "Memes", "Parody", "Reactions"],
  "Lifestyle": ["Daily Vlogs", "Minimalism", "Productivity", "Home Decor"],
  "Finance & Investing": ["Stocks", "Crypto", "Personal Finance", "Startups", "Real Estate"],
  "Education": ["UPSC", "JEE/NEET", "Coding", "English Speaking", "Languages"],
  "Music": ["Singing", "Instrumental", "Hip-Hop", "Classical", "Independent"],
  "Art & Design": ["Painting", "Digital Art", "Photography", "Crafts", "Calligraphy"],
  "Parenting": ["Newborn", "Toddler", "Teen", "Mom Vlogs"],
  "Sports": ["Cricket", "Football", "Esports", "Athletics", "Combat"],
  "Gaming": ["BGMI", "Free Fire", "Valorant", "Minecraft", "Game Dev"],
  "Spiritual & Wellness": ["Yoga", "Meditation", "Devotional", "Astrology", "Mental Health", "Nutrition", "Sleep", "Self-care"],
  "Automotive": ["Cars", "Bikes", "EVs", "Reviews"],
  "Books": ["Fiction", "Self-help", "Reviews", "Poetry"],
  "Real Estate": ["Commercial", "Residential", "Rentals"],
  "Business & Startups": ["Entrepreneurship", "Marketing", "SaaS", "E-commerce"],
  "Dance": ["Hip-hop", "Classical", "Contemporary", "Choreography"],
};

export const VALID_NICHES = Object.keys(CATEGORIES_WITH_SUBS);

export const INDIAN_LANGUAGES = [
  "English", "Hindi", "Punjabi", "Bengali", "Telugu", "Tamil", "Marathi", "Gujarati", "Kannada", "Malayalam", "Odia", "Urdu", "Assamese"
];

export const POPULAR_PROFESSIONS = [
  "Content Creator", "YouTuber", "Instagram Creator", "Actor / Model", "Fitness Coach", "Photographer", "Filmmaker", "Fashion Stylist", "Digital Artist", "Musician / Singer", "Educator / Trainer", "Student"
];


export const CITY_TO_STATE = {
  "Mumbai": "Maharashtra", "Delhi": "Delhi", "Bangalore": "Karnataka",
  "Jaipur": "Rajasthan", "Lucknow": "Uttar Pradesh", "Noida": "Uttar Pradesh",
  "Hyderabad": "Telangana", "Chennai": "Tamil Nadu", "Kolkata": "West Bengal",
  "Pune": "Maharashtra", "Ahmedabad": "Gujarat", "Gurgaon": "Haryana",
  "Navi Mumbai": "Maharashtra", "Thane": "Maharashtra", "Faridabad": "Haryana", "Ghaziabad": "Uttar Pradesh",
  "Surat": "Gujarat", "Kanpur": "Uttar Pradesh", "Nagpur": "Maharashtra", "Indore": "Madhya Pradesh",
  "Bhopal": "Madhya Pradesh", "Visakhapatnam": "Andhra Pradesh", "Patna": "Bihar", "Vadodara": "Gujarat",
  "Ludiana": "Punjab", "Agra": "Uttar Pradesh", "Nashik": "Maharashtra", "Meerut": "Uttar Pradesh",
  "Varanasi": "Uttar Pradesh", "Srinagar": "Jammu & Kashmir", "Amritsar": "Punjab", "Allahabad": "Uttar Pradesh",
  "Ranchi": "Jharkhand", "Howrah": "West Bengal", "Coimbatore": "Tamil Nadu", "Jabalpur": "Madhya Pradesh",
  "Gwalior": "Madhya Pradesh", "Vijayawada": "Andhra Pradesh", "Jodhpur": "Rajasthan", "Madurai": "Tamil Nadu",
  "Raipur": "Chhattisgarh", "Kota": "Rajasthan", "Guwahati": "Assam", "Chandigarh": "Chandigarh",
  "Bhubaneswar": "Odisha", "Kochi": "Kerala", "Thiruvananthapuram": "Kerala", "Dehradun": "Uttarakhand"
};

export const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", country: "India" },
  { code: "+1", flag: "🇺🇸", country: "USA / Canada" },
  { code: "+44", flag: "🇬🇧", country: "UK" },
  { code: "+971", flag: "🇦🇪", country: "UAE" },
  { code: "+61", flag: "🇦🇺", country: "Australia" },
  { code: "+65", flag: "🇸🇬", country: "Singapore" },
  { code: "+49", flag: "🇩🇪", country: "Germany" },
  { code: "+33", flag: "🇫🇷", country: "France" },
  { code: "+966", flag: "🇸🇦", country: "Saudi Arabia" },
  { code: "+977", flag: "🇳🇵", country: "Nepal" },
  { code: "+880", flag: "🇧🇩", country: "Bangladesh" },
  { code: "+92", flag: "🇵🇰", country: "Pakistan" },
  { code: "+94", flag: "🇱🇰", country: "Sri Lanka" },
  { code: "+60", flag: "🇲🇾", country: "Malaysia" },
  { code: "+62", flag: "🇮🇩", country: "Indonesia" },
  { code: "+81", flag: "🇯🇵", country: "Japan" },
  { code: "+86", flag: "🇨🇳", country: "China" },
  { code: "+27", flag: "🇿🇦", country: "South Africa" },
];

export const SUPPORT_WHATSAPP_NUMBER = "919950832099";

