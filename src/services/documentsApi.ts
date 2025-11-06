const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface DocumentRef {
  fileId: string;
  type: 'image' | 'pdf';
  filename: string;
  contentType: string;
  category: 'license' | 'menu' | 'other';
  menuType?: string;
  version: number;
  uploadedAt: Date;
  isActive: boolean;
}

export interface GroupedDocuments {
  license: DocumentRef[];
  menus: Record<string, DocumentRef[]>;
  other: DocumentRef[];
  all?: DocumentRef[];
}

/**
 * Fetch all documents for a restaurant with version history
 */
export async function fetchRestaurantDocuments(
  restaurantId: string,
  token: string
): Promise<{ documents: GroupedDocuments; all: DocumentRef[] }> {
  const response = await fetch(`${API_URL}/documents/${restaurantId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch documents' }));
    throw new Error(error.error || 'Failed to fetch documents');
  }

  return response.json();
}

/**
 * Fetch only active documents for a restaurant
 */
export async function fetchActiveDocuments(
  restaurantId: string,
  token: string
): Promise<{ documents: DocumentRef[] }> {
  const response = await fetch(`${API_URL}/documents/${restaurantId}/current`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch active documents' }));
    throw new Error(error.error || 'Failed to fetch active documents');
  }

  return response.json();
}

/**
 * Upload a new document
 */
export async function uploadDocument(
  restaurantId: string,
  file: File,
  category: 'license' | 'menu' | 'other',
  menuType: string | undefined,
  token: string
): Promise<{ success: boolean; document: DocumentRef }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (menuType) {
    formData.append('menuType', menuType);
  }

  const response = await fetch(`${API_URL}/documents/${restaurantId}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to upload document' }));
    throw new Error(error.error || 'Failed to upload document');
  }

  return response.json();
}

/**
 * Delete a specific document version
 */
export async function deleteDocument(
  restaurantId: string,
  fileId: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_URL}/documents/${restaurantId}/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete document' }));
    throw new Error(error.error || 'Failed to delete document');
  }

  return response.json();
}

/**
 * Get the download URL for a document
 */
export function getDocumentDownloadUrl(fileId: string): string {
  return `${API_URL}/media/${fileId}`;
}

/**
 * Download a document (opens in new tab)
 */
export function downloadDocument(fileId: string, filename: string): void {
  const url = getDocumentDownloadUrl(fileId);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

