// QR Code generation utility for restaurant check-in
// Uses a simple approach - in production, you'd use a library like qrcode or qrcode.react

export interface QRCodeData {
  restaurantId: number;
  restaurantName: string;
  timestamp: string;
}

/**
 * Generates a check-in URL for a restaurant
 */
export function generateRestaurantCheckInUrl(restaurantId: number): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}?qr=true&rid=${restaurantId}`;
}

/**
 * Generates a QR code data URL for a restaurant
 * In a real app, this would use a QR code library
 * For now, we'll use a placeholder approach with an API
 */
export async function generateQRCodeDataUrl(restaurantId: number, restaurantName: string): Promise<string> {
  const checkInUrl = generateRestaurantCheckInUrl(restaurantId);
  
  // Using QR Server API as a simple solution (free, no API key needed)
  // In production, you might want to use a library like qrcode to generate client-side
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkInUrl)}`;
  
  return qrApiUrl;
}

/**
 * Parses QR code parameters from URL
 */
export function parseQRCodeFromUrl(): { isQRScan: boolean; restaurantId: number | null } {
  const urlParams = new URLSearchParams(window.location.search);
  const isQRScan = urlParams.get('qr') === 'true';
  const restaurantId = urlParams.get('rid');
  
  return {
    isQRScan,
    restaurantId: restaurantId ? parseInt(restaurantId, 10) : null,
  };
}

/**
 * Downloads a QR code as an image
 */
export async function downloadQRCode(restaurantId: number, restaurantName: string): Promise<void> {
  const qrCodeUrl = await generateQRCodeDataUrl(restaurantId, restaurantName);
  
  // Create a temporary link to download
  const link = document.createElement('a');
  link.href = qrCodeUrl;
  link.download = `${restaurantName.replace(/\s+/g, '_')}_QR_Code.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

