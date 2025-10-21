import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { QrCode, Download, Printer } from 'lucide-react';
import { generateQRCodeDataUrl, downloadQRCode, generateRestaurantCheckInUrl } from '../utils/qrCodeGenerator';
import { toast } from 'sonner@2.0.3';

interface QRCodeDisplayProps {
  restaurantId: number;
  restaurantName: string;
  qrCodeUrl?: string;
}

export function QRCodeDisplay({ restaurantId, restaurantName, qrCodeUrl: initialQrCodeUrl }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(initialQrCodeUrl || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Generate QR code if not provided
    if (!qrCodeUrl) {
      setIsLoading(true);
      generateQRCodeDataUrl(restaurantId, restaurantName)
        .then(url => {
          setQrCodeUrl(url);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Failed to generate QR code:', err);
          setIsLoading(false);
        });
    }
  }, [restaurantId, restaurantName, qrCodeUrl]);

  const handleDownload = async () => {
    try {
      await downloadQRCode(restaurantId, restaurantName);
      toast.success('QR code downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download QR code');
    }
  };

  const handlePrint = () => {
    if (qrCodeUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print QR Code - ${restaurantName}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  text-align: center;
                }
                h1 {
                  color: #B7410E;
                  margin-bottom: 20px;
                }
                img {
                  max-width: 400px;
                  margin: 20px 0;
                }
                p {
                  color: #3C3C3C;
                  font-size: 18px;
                  margin: 10px;
                }
                .instructions {
                  max-width: 600px;
                  margin-top: 30px;
                  padding: 20px;
                  background: #F5F5F5;
                  border-radius: 10px;
                }
              </style>
            </head>
            <body>
              <h1>${restaurantName}</h1>
              <p style="font-size: 24px; font-weight: bold;">Scan to View Menu & Book</p>
              <img src="${qrCodeUrl}" alt="QR Code" />
              <div class="instructions">
                <p><strong>Instructions for Staff:</strong></p>
                <p>1. Print this QR code and display it at the entrance or on tables</p>
                <p>2. Customers can scan to instantly view your menu and book a table</p>
                <p>3. The QR code links directly to your restaurant profile</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const checkInUrl = generateRestaurantCheckInUrl(restaurantId);

  return (
    <Card className="border-0 card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{color: 'var(--where2go-text)'}}>
          <QrCode className="h-6 w-6" style={{color: 'var(--where2go-accent)'}} />
          Restaurant QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4" style={{backgroundColor: 'var(--where2go-white)'}}>
        <div className="flex flex-col items-center">
          {isLoading ? (
            <div className="w-64 h-64 flex items-center justify-center" style={{backgroundColor: 'var(--where2go-bright-grey)'}}>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: 'var(--where2go-accent)'}}></div>
            </div>
          ) : qrCodeUrl ? (
            <img 
              src={qrCodeUrl} 
              alt={`${restaurantName} QR Code`} 
              className="w-64 h-64 border-4 rounded-xl"
              style={{borderColor: 'var(--where2go-buff)'}}
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center" style={{backgroundColor: 'var(--where2go-bright-grey)'}}>
              <QrCode className="h-16 w-16" style={{color: 'var(--where2go-accent)', opacity: 0.3}} />
            </div>
          )}
        </div>

        <div className="space-y-2 text-center">
          <p className="text-sm font-medium" style={{color: 'var(--where2go-text)'}}>
            Scan this code to check in at {restaurantName}
          </p>
          <p className="text-xs" style={{color: 'var(--where2go-text)', opacity: 0.6}}>
            {checkInUrl}
          </p>
        </div>

        <div className="p-4 rounded-lg" style={{backgroundColor: 'var(--where2go-buff-light)'}}>
          <p className="text-sm font-medium mb-2" style={{color: 'var(--where2go-text)'}}>
            How to use:
          </p>
          <ul className="text-sm space-y-1" style={{color: 'var(--where2go-text)', opacity: 0.8}}>
            <li>• Display this QR code at your entrance or on tables</li>
            <li>• Customers scan it to instantly access your menu</li>
            <li>• They can book a table or join the queue directly</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleDownload} 
            className="flex-1 pill-button"
            variant="outline"
            style={{borderColor: 'var(--where2go-accent)', color: 'var(--where2go-accent)'}}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={handlePrint} 
            className="flex-1 pill-button cta-button"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

