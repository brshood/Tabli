import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Restaurant {
  id: number;
  name: string;
  city: 'Al Ain' | 'Abu Dhabi' | 'Dubai';
  cuisine: string;
  phone: string;
  email: string;
  description: string;
  location: string;
  rating: number;
  status: 'available' | 'waitlist';
  waitTime: string | null;
  tablesAvailable: number;
  image: string;
  waitingInLine: number;
  weeklyAverageCustomers: number;
  coverImage?: string | null;
  menu: {
    name: string;
    category: string;
    description: string;
    price: string;
  }[];
  priceRange: string;
  openingHours: string;
  closingHours: string;
  // New fields for Where2Go features
  averageTableTurnTime?: number; // in minutes
  maxHoldTime?: number; // in minutes
  qrCodeUrl?: string; // generated QR code URL
  address?: string; // full address
  indoorSeating?: boolean;
  outdoorSeating?: boolean;
}

interface RestaurantContextType {
  currentRestaurant: Restaurant;
  updateRestaurant: (updates: Partial<Restaurant>) => void;
  allRestaurants: Restaurant[];
  updateRestaurantInList: (id: number, updates: Partial<Restaurant>) => void;
}

const defaultRestaurant: Restaurant = {
  id: 1,
  name: "Downtown Restaurant",
  city: "Dubai",
  cuisine: "Italian",
  phone: "(555) 123-4567",
  email: "info@downtownrestaurant.com",
  description: "A modern dining experience in the heart of the city",
  location: "Downtown, 0.5 miles",
  rating: 4.8,
  status: "available",
  waitTime: null,
  tablesAvailable: 3,
  image: "restaurant-italian",
  waitingInLine: 2,
  weeklyAverageCustomers: 68,
  coverImage: null,
  menu: [
    {
      name: "Margherita Pizza",
      category: "Pizza",
      description: "Fresh tomatoes, mozzarella, and basil",
      price: "18"
    },
    {
      name: "Caesar Salad",
      category: "Salads",
      description: "Crisp romaine, parmesan, and house-made croutons",
      price: "14"
    }
  ],
  priceRange: "$$",
  openingHours: "11:00",
  closingHours: "22:00",
  averageTableTurnTime: 45,
  maxHoldTime: 10,
  address: "123 Downtown Street, Dubai Marina",
  indoorSeating: true,
  outdoorSeating: true
};

// Initialize with mock restaurants data
const initialRestaurants: Restaurant[] = [
  {
    ...defaultRestaurant,
    id: 1,
    name: "Bella Vista Italian",
    location: "Downtown, 0.5 miles",
    city: "Dubai",
    cuisine: "Italian",
    weeklyAverageCustomers: 68,
    address: "123 Downtown Street, Dubai Marina"
  },
  {
    ...defaultRestaurant,
    id: 2,
    name: "Sakura Sushi",
    location: "Marina District, 0.8 miles", 
    city: "Dubai",
    rating: 4.6,
    status: "waitlist",
    waitTime: "15-20 min",
    tablesAvailable: 0,
    cuisine: "Asian",
    image: "sushi-restaurant",
    waitingInLine: 8,
    weeklyAverageCustomers: 45
  },
  {
    ...defaultRestaurant,
    id: 3,
    name: "Green Garden Café",
    location: "Al Jahili Fort Area, 1.2 miles",
    city: "Al Ain",
    rating: 4.4,
    cuisine: "Healthy",
    image: "cafe-healthy",
    waitingInLine: 1,
    weeklyAverageCustomers: 32
  },
  {
    ...defaultRestaurant,
    id: 4,
    name: "Tony's Pizza Corner",
    location: "Corniche Road, 0.3 miles",
    city: "Abu Dhabi",
    rating: 4.7,
    status: "waitlist",
    waitTime: "25-30 min",
    tablesAvailable: 0,
    cuisine: "Pizza",
    image: "pizza-restaurant",
    waitingInLine: 12,
    weeklyAverageCustomers: 78
  },
  {
    ...defaultRestaurant,
    id: 5,
    name: "Ocean Breeze Seafood",
    location: "Jumeirah Beach, 2.1 miles",
    city: "Dubai",
    rating: 4.9,
    cuisine: "Seafood",
    image: "seafood-restaurant",
    waitingInLine: 3,
    weeklyAverageCustomers: 85
  },
  {
    ...defaultRestaurant,
    id: 6,
    name: "Smoky Joe's BBQ",
    location: "Yas Island, 1.5 miles",
    city: "Abu Dhabi",
    rating: 4.5,
    status: "waitlist",
    waitTime: "10-15 min",
    tablesAvailable: 0,
    cuisine: "BBQ",
    image: "bbq-restaurant",
    waitingInLine: 6,
    weeklyAverageCustomers: 42
  },
  {
    ...defaultRestaurant,
    id: 7,
    name: "Al Ain Oasis Café",
    location: "Al Ain Oasis, 0.7 miles",
    city: "Al Ain",
    rating: 4.3,
    cuisine: "Café",
    image: "cafe-restaurant",
    waitingInLine: 2,
    weeklyAverageCustomers: 28
  },
  {
    ...defaultRestaurant,
    id: 8,
    name: "Spice Route Indian",
    location: "Electra Street, 1.1 miles",
    city: "Abu Dhabi",
    rating: 4.6,
    cuisine: "Asian",
    image: "indian-restaurant",
    waitingInLine: 3,
    weeklyAverageCustomers: 56
  },
  {
    ...defaultRestaurant,
    id: 9,
    name: "Desert Pizza Co.",
    location: "Hili Mall Area, 0.9 miles",
    city: "Al Ain",
    rating: 4.5,
    status: "waitlist",
    waitTime: "20-25 min",
    tablesAvailable: 0,
    cuisine: "Pizza",
    image: "pizza-restaurant-2",
    waitingInLine: 7,
    weeklyAverageCustomers: 51
  }
];

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}

interface RestaurantProviderProps {
  children: ReactNode;
}

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant>(defaultRestaurant);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>(initialRestaurants);

  const updateRestaurant = (updates: Partial<Restaurant>) => {
    setCurrentRestaurant(prev => ({ ...prev, ...updates }));
    
    // Also update in the restaurants list if it exists there
    setAllRestaurants(prev => 
      prev.map(restaurant => 
        restaurant.id === currentRestaurant.id 
          ? { ...restaurant, ...updates }
          : restaurant
      )
    );
  };

  const updateRestaurantInList = (id: number, updates: Partial<Restaurant>) => {
    setAllRestaurants(prev => {
      const existingIndex = prev.findIndex(restaurant => restaurant.id === id);
      
      if (existingIndex !== -1) {
        // Update existing restaurant
        return prev.map(restaurant => 
          restaurant.id === id 
            ? { ...restaurant, ...updates }
            : restaurant
        );
      } else {
        // Add new restaurant
        return [...prev, updates as Restaurant];
      }
    });
    
    // If this is the current restaurant, update it too
    if (id === currentRestaurant.id) {
      setCurrentRestaurant(prev => ({ ...prev, ...updates }));
    }
  };

  return (
    <RestaurantContext.Provider value={{
      currentRestaurant,
      updateRestaurant,
      allRestaurants,
      updateRestaurantInList
    }}>
      {children}
    </RestaurantContext.Provider>
  );
}