const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface AdminRestaurant {
  id: string;
  name: string;
  city: string;
  cuisine: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  openingHours?: string;
  closingHours?: string;
  priceRange?: string;
  menu?: Array<{
    name: string;
    category: string;
    description?: string;
    price: string;
  }>;
  mediaRefs?: Array<{
    fileId: string;
    type: 'image' | 'pdf';
    filename: string;
    contentType: string;
    category: 'license' | 'menu' | 'profile-picture' | 'other';
    menuType?: string;
    version: number;
    uploadedAt: string;
    isActive: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
  reservationCount: number;
  ratingCount: number;
  tableCount: number;
  userCount: number;
}

export interface AdminRestaurantDetails {
  restaurant: AdminRestaurant;
  reservations: Array<{
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    partySize: number;
    status: string;
    requestedAt: string;
    confirmedAt?: string;
    seatedAt?: string;
    leftAt?: string;
    cancelledAt?: string;
  }>;
  ratings: Array<{
    id: string;
    value: number;
    comment?: string;
    name?: string;
    email?: string;
    phone?: string;
    showName?: boolean;
    createdAt: string;
  }>;
  tables: Array<{
    id: string;
    name: string;
    capacity: number;
    status: string;
    currentReservationId?: string;
    createdAt: string;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

export async function loginAdmin(username: string, password: string): Promise<{ success: boolean; token: string }> {
  const response = await fetch(`${API_URL}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  if (data.success && data.token) {
    localStorage.setItem('admin_token', data.token);
    return data;
  }
  throw new Error('Invalid response from server');
}

export async function getAllRestaurants(): Promise<{ restaurants: AdminRestaurant[] }> {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/admin/restaurants`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      throw new Error('Session expired. Please login again.');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch restaurants');
  }

  return response.json();
}

export async function getRestaurantDetails(id: string): Promise<AdminRestaurantDetails> {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/admin/restaurants/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      throw new Error('Session expired. Please login again.');
    }
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch restaurant details');
  }

  return response.json();
}

export function isAdminAuthenticated(): boolean {
  return !!localStorage.getItem('admin_token');
}

export function logoutAdmin(): void {
  localStorage.removeItem('admin_token');
}

