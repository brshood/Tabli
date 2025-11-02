const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface PersonalInfo {
  name: string;
  email: string;
}

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RestaurantInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  city: 'Al Ain' | 'Abu Dhabi' | 'Dubai';
  cuisine: string;
  openingHours: string;
  closingHours: string;
  priceRange: string;
  description: string;
}

/**
 * Update personal information (name and email)
 */
export async function updatePersonalInfo(
  data: Partial<PersonalInfo>,
  token: string
): Promise<{ success: boolean; user: any }> {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update profile' }));
    throw new Error(error.error || 'Failed to update profile');
  }

  return response.json();
}

/**
 * Change password
 */
export async function changePassword(
  data: PasswordChange,
  token: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/auth/password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to change password' }));
    throw new Error(error.error || 'Failed to change password');
  }

  return response.json();
}

/**
 * Update restaurant information
 */
export async function updateRestaurantInfo(
  restaurantId: string,
  data: Partial<RestaurantInfo>,
  token: string
): Promise<{ item: any }> {
  const response = await fetch(`${API_URL}/restaurants/${restaurantId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update restaurant' }));
    throw new Error(error.error || 'Failed to update restaurant');
  }

  return response.json();
}

/**
 * Update menu type for a specific menu document
 */
export async function updateMenuType(
  restaurantId: string,
  fileId: string,
  newMenuType: string,
  token: string
): Promise<{ success: boolean; message: string; document: any }> {
  const response = await fetch(`${API_URL}/documents/${restaurantId}/menu/${fileId}/type`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ menuType: newMenuType }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update menu type' }));
    throw new Error(error.error || 'Failed to update menu type');
  }

  return response.json();
}

/**
 * Get restaurant information
 */
export async function getRestaurantInfo(
  restaurantId: string
): Promise<any> {
  const response = await fetch(`${API_URL}/restaurants/${restaurantId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch restaurant' }));
    throw new Error(error.error || 'Failed to fetch restaurant');
  }

  return response.json();
}

