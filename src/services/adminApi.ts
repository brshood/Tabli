const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface AdminRestaurant {
  id: string;
  name: string;
  city: string;
  cuisine: string;
  email?: string;
  phone?: string;
  address?: string;
  locationUrl?: string;
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
  approvalStatus: 'pending' | 'approved' | 'denied';
  approvalNotes?: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface AdminReservationDetail {
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
  mode?: string;
  reservationType?: string;
  queuePosition?: number;
  tableId?: string;
}

export interface AdminRatingDetail {
  id: string;
  value: number;
  comment?: string;
  name?: string;
  email?: string;
  phone?: string;
  showName?: boolean;
  createdAt: string;
}

export interface AdminTableDetail {
  id: string;
  name: string;
  capacity: number;
  status: string;
  currentReservationId?: string;
  createdAt: string;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AdminRestaurantDetails {
  restaurant: AdminRestaurant;
  stats: {
    reservations: number;
    ratings: number;
    tables: number;
    users: number;
  };
}

type RestaurantListParams = {
  page?: number;
  limit?: number;
  search?: string;
};

type ReservationListParams = {
  page?: number;
  limit?: number;
  status?: 'pending' | 'confirmed' | 'seated' | 'cancelled' | 'no_show';
  mode?: 'reserve' | 'waitlist';
};

type RatingListParams = {
  page?: number;
  limit?: number;
  minValue?: number;
};

type TableListParams = {
  page?: number;
  limit?: number;
  status?: 'available' | 'occupied' | 'cleaning';
};

type UserListParams = {
  page?: number;
  limit?: number;
  role?: 'staff';
};

const buildQueryString = (params?: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.append(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

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

export async function getAllRestaurants(params?: RestaurantListParams): Promise<{ restaurants: AdminRestaurant[]; pagination: PaginationMeta }> {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const query = buildQueryString(params);
  const response = await fetch(`${API_URL}/admin/restaurants${query}`, {
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

export async function getRestaurantReservations(id: string, params?: ReservationListParams): Promise<PaginatedResponse<AdminReservationDetail>> {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const query = buildQueryString(params);
  const response = await fetch(`${API_URL}/admin/restaurants/${id}/reservations${query}`, {
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
    throw new Error(error.error || 'Failed to fetch reservations');
  }

  return response.json();
}

export async function getRestaurantRatings(id: string, params?: RatingListParams): Promise<PaginatedResponse<AdminRatingDetail>> {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const query = buildQueryString(params);
  const response = await fetch(`${API_URL}/admin/restaurants/${id}/ratings${query}`, {
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
    throw new Error(error.error || 'Failed to fetch ratings');
  }

  return response.json();
}

export async function getRestaurantTables(id: string, params?: TableListParams): Promise<PaginatedResponse<AdminTableDetail>> {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const query = buildQueryString(params);
  const response = await fetch(`${API_URL}/admin/restaurants/${id}/tables${query}`, {
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
    throw new Error(error.error || 'Failed to fetch tables');
  }

  return response.json();
}

export async function getRestaurantUsers(id: string, params?: UserListParams): Promise<PaginatedResponse<AdminUserDetail>> {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const query = buildQueryString(params);
  const response = await fetch(`${API_URL}/admin/restaurants/${id}/users${query}`, {
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
    throw new Error(error.error || 'Failed to fetch users');
  }

  return response.json();
}

export function isAdminAuthenticated(): boolean {
  return !!localStorage.getItem('admin_token');
}

export function logoutAdmin(): void {
  localStorage.removeItem('admin_token');
}

export async function updateRestaurantApproval(
  id: string,
  status: 'pending' | 'approved' | 'denied',
  notes?: string
): Promise<{ restaurant: AdminRestaurant }> {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/admin/restaurants/${id}/approval`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, notes }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      throw new Error('Session expired. Please login again.');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to update approval status' }));
    throw new Error(error.error || 'Failed to update approval status');
  }

  return response.json();
}

export async function deleteRestaurant(
  id: string
): Promise<{ success: boolean; message: string }> {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/admin/restaurants/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      throw new Error('Session expired. Please login again.');
    }
    const error = await response.json().catch(() => ({ error: 'Failed to delete restaurant' }));
    throw new Error(error.error || 'Failed to delete restaurant');
  }

  return response.json();
}

