import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface Restaurant {
  id: string; // MongoDB ObjectId
  name: string;
  city: 'Al Ain' | 'Abu Dhabi' | 'Dubai';
  cuisine: string;
  phone: string;
  email: string;
  description: string;
  location: string;
  locationUrl?: string | null;
  rating: number;
  ratingCount?: number;
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
  featuredMenuItems?: {
    name: string;
    description?: string;
    price?: string;
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
  updateRestaurantInList: (id: string, updates: Partial<Restaurant>) => void;
}

const defaultRestaurant: Restaurant = {
  id: "default-1",
  name: "Downtown Restaurant",
  city: "Dubai",
  cuisine: "Italian",
  phone: "(555) 123-4567",
  email: "info@downtownrestaurant.com",
  description: "A modern dining experience in the heart of the city",
  location: "Downtown, 0.5 miles",
  locationUrl: '',
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
  featuredMenuItems: [],
  priceRange: "$$",
  openingHours: "11:00",
  closingHours: "22:00",
  averageTableTurnTime: 45,
  maxHoldTime: 10,
  address: "123 Downtown Street, Dubai Marina",
  indoorSeating: true,
  outdoorSeating: true
};

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
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/restaurants`);
        if (!res.ok) return;
        const { items } = await res.json();
        const mapped: Restaurant[] = (items || []).map((r: any) => {
          // Format wait time as average if data exists
          let waitTime: string | null = null;
          if (r.avgWaitTime !== null && r.avgWaitTime !== undefined) {
            waitTime = `~${r.avgWaitTime} min`;
          }
          
          return {
            id: r._id || r.id,
            name: r.name,
            city: r.city,
            cuisine: r.cuisine,
            phone: r.phone || '',
            email: r.email || '',
            description: r.description || '',
            location: r.address || '',
            locationUrl: r.locationUrl || '',
            rating: r.ratingSummary?.average ?? 0,
            ratingCount: r.ratingSummary?.count ?? 0,
            status: (r.availableTables && r.availableTables > 0) ? 'available' : 'waitlist',
            waitTime: waitTime,
            tablesAvailable: r.availableTables || 0,
            image: 'restaurant-generic',
            waitingInLine: r.waitingInLine || 0,
            weeklyAverageCustomers: 0,
            coverImage: r.imageUrl ? `${API_URL}${r.imageUrl}` : null,
            menu: r.menu || [],
            featuredMenuItems: r.featuredMenuItems || [],
            priceRange: r.priceRange || '$$',
            openingHours: r.openingHours || '09:00',
            closingHours: r.closingHours || '22:00',
            averageTableTurnTime: 45,
            maxHoldTime: 10,
            address: r.address || '',
            indoorSeating: true,
            outdoorSeating: true,
          };
        });
        if (!cancelled) {
          setAllRestaurants(mapped);
          setCurrentRestaurant(mapped.length ? mapped[0] : defaultRestaurant);
        }
      } catch (error) {
        // Failed to load restaurants from API
        console.error('Failed to load restaurants:', error);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  const updateRestaurantInList = (id: string, updates: Partial<Restaurant>) => {
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
        return [...prev, { ...updates, id } as Restaurant];
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