export interface Destination {
  id: string;
  name: string;
  country: string;
  image: string;
  description: string;
  tags: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export const destinations: Destination[] = [
  {
    id: '1',
    name: 'Bali',
    country: 'Indonesia',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4',
    description: 'Tropical paradise with stunning beaches and rich culture',
    tags: ['beach', 'culture', 'nature'],
    coordinates: {
      latitude: -8.409518,
      longitude: 115.188919
    }
  },
  {
    id: '2',
    name: 'Tokyo',
    country: 'Japan',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
    description: 'Futuristic city with rich traditions and amazing food',
    tags: ['city', 'culture', 'food'],
    coordinates: {
      latitude: 35.6762,
      longitude: 139.6503
    }
  },
  {
    id: '3',
    name: 'Paris',
    country: 'France',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
    description: 'City of love, art, and amazing architecture',
    tags: ['city', 'culture', 'romance'],
    coordinates: {
      latitude: 48.8566,
      longitude: 2.3522
    }
  },
  {
    id: '4',
    name: 'New York',
    country: 'USA',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9',
    description: 'The city that never sleeps',
    tags: ['city', 'shopping', 'food'],
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    }
  },
  {
    id: '5',
    name: 'Sydney',
    country: 'Australia',
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9',
    description: 'Beautiful harbor city with amazing beaches',
    tags: ['beach', 'city', 'nature'],
    coordinates: {
      latitude: -33.8688,
      longitude: 151.2093
    }
  },
  {
    id: '6',
    name: 'Cape Town',
    country: 'South Africa',
    image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5',
    description: 'Stunning coastal city with Table Mountain backdrop',
    tags: ['nature', 'beach', 'culture'],
    coordinates: {
      latitude: -33.9249,
      longitude: 18.4241
    }
  },
  {
    id: '7',
    name: 'Barcelona',
    country: 'Spain',
    image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded',
    description: 'Vibrant city with amazing architecture and beaches',
    tags: ['beach', 'culture', 'food'],
    coordinates: {
      latitude: 41.3851,
      longitude: 2.1734
    }
  },
  {
    id: '8',
    name: 'Dubai',
    country: 'UAE',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c',
    description: 'Modern city with luxury shopping and desert adventures',
    tags: ['luxury', 'shopping', 'desert'],
    coordinates: {
      latitude: 25.2048,
      longitude: 55.2708
    }
  },
  {
    id: '9',
    name: 'Santorini',
    country: 'Greece',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff',
    description: 'Stunning white-washed buildings and Mediterranean charm',
    tags: ['beach', 'romance', 'culture'],
    coordinates: {
      latitude: 36.3932,
      longitude: 25.4615
    }
  },
  {
    id: '10',
    name: 'Kyoto',
    country: 'Japan',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e',
    description: 'Ancient temples and traditional Japanese culture',
    tags: ['culture', 'history', 'nature'],
    coordinates: {
      latitude: 35.0116,
      longitude: 135.7681
    }
  },
  {
    id: '11',
    name: 'Maldives',
    country: 'Maldives',
    image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8',
    description: 'Crystal clear waters and overwater bungalows',
    tags: ['beach', 'luxury', 'nature'],
    coordinates: {
      latitude: 3.2028,
      longitude: 73.2207
    }
  },
  {
    id: '12',
    name: 'Venice',
    country: 'Italy',
    image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9',
    description: 'Romantic canals and historic architecture',
    tags: ['romance', 'culture', 'history'],
    coordinates: {
      latitude: 45.4408,
      longitude: 12.3155
    }
  },
  {
    id: '13',
    name: 'Bora Bora',
    country: 'French Polynesia',
    image: 'https://images.unsplash.com/photo-1576872381149-7847515ce5d8',
    description: 'Paradise island with turquoise lagoons',
    tags: ['beach', 'luxury', 'nature'],
    coordinates: {
      latitude: -16.5004,
      longitude: -151.7415
    }
  },
  {
    id: '14',
    name: 'Petra',
    country: 'Jordan',
    image: 'https://images.unsplash.com/photo-1548013146-72479768bada',
    description: 'Ancient city carved into rose-red cliffs',
    tags: ['history', 'culture', 'adventure'],
    coordinates: {
      latitude: 30.3285,
      longitude: 35.4444
    }
  },
  {
    id: '15',
    name: 'Machu Picchu',
    country: 'Peru',
    image: 'https://images.unsplash.com/photo-1526392060635-9d6019884377',
    description: 'Ancient Incan citadel in the Andes Mountains',
    tags: ['history', 'adventure', 'nature'],
    coordinates: {
      latitude: -13.1631,
      longitude: -72.5450
    }
  },
  {
    id: '16',
    name: 'Swiss Alps',
    country: 'Switzerland',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
    description: 'Majestic mountains and pristine lakes',
    tags: ['nature', 'adventure', 'winter'],
    coordinates: {
      latitude: 46.8182,
      longitude: 8.2275
    }
  }
]; 