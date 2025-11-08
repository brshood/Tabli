// QR Code generation utility for restaurant profile links
// Uses a simple approach - in production, you'd use a library like qrcode or qrcode.react

export interface QRCodeData {
  restaurantId: string;
  restaurantName: string;
  timestamp: string;
}

/**
 * Generates a restaurant profile URL for a restaurant
 */
export function generateRestaurantProfileUrl(restaurantId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}#restaurant-profile?id=${restaurantId}`;
}

/**
 * Generates a check-in URL for a restaurant (kept for backward compatibility)
 * @deprecated Use generateRestaurantProfileUrl instead
 */
export function generateRestaurantCheckInUrl(restaurantId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}?qr=true&rid=${restaurantId}`;
}

/**
 * Generates a QR code data URL for a restaurant
 * In a real app, this would use a QR code library
 * For now, we'll use a placeholder approach with an API
 */
export async function generateQRCodeDataUrl(restaurantId: string, restaurantName: string): Promise<string> {
  const profileUrl = generateRestaurantProfileUrl(restaurantId);
  
  // Using QR Server API as a simple solution (free, no API key needed)
  // In production, you might want to use a library like qrcode to generate client-side
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(profileUrl)}`;
  
  return qrApiUrl;
}

/**
 * Parses restaurant profile parameters from URL hash
 */
export function parseRestaurantProfileFromUrl(): { restaurantId: string | null } {
  const hash = window.location.hash;
  if (hash.startsWith('#restaurant-profile')) {
    const hashParams = new URLSearchParams(hash.split('?')[1] || '');
    const restaurantId = hashParams.get('id');
    return {
      restaurantId: restaurantId || null,
    };
  }
  return { restaurantId: null };
}

/**
 * Parses QR code parameters from URL (kept for backward compatibility)
 * @deprecated Use parseRestaurantProfileFromUrl for new QR codes
 */
export function parseQRCodeFromUrl(): { isQRScan: boolean; restaurantId: string | null } {
  const urlParams = new URLSearchParams(window.location.search);
  const isQRScan = urlParams.get('qr') === 'true';
  const restaurantId = urlParams.get('rid');
  
  return {
    isQRScan,
    restaurantId: restaurantId || null,
  };
}

/**
 * Downloads a QR code as an image
 */
export async function downloadQRCode(restaurantId: string, restaurantName: string): Promise<void> {
  const qrCodeUrl = await generateQRCodeDataUrl(restaurantId, restaurantName);
  
  // Create a temporary link to download
  const link = document.createElement('a');
  link.href = qrCodeUrl;
  link.download = `${restaurantName.replace(/\s+/g, '_')}_QR_Code.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

