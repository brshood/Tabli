import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { QrCode, Download, Printer } from 'lucide-react';
import { generateQRCodeDataUrl, downloadQRCode, generateRestaurantProfileUrl } from '../utils/qrCodeGenerator';
import { toast } from 'sonner@2.0.3';
import tabliLogo from '../assets/tabli-logo-new.png';

interface QRCodeDisplayProps {
  restaurantId: string;
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
        // Convert logo to base64 data URL for printing
        const logoImg = new Image();
        logoImg.src = tabliLogo;
        
        logoImg.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback if canvas context is not available
            printWindow.document.write(`
              <html>
                <head>
                  <title>Print QR Code - ${restaurantName}</title>
                  <style>
                    @media print {
                      @page {
                        margin: 20mm;
                      }
                    }
                    body {
                      font-family: Arial, sans-serif;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      min-height: 100vh;
                      margin: 0;
                      text-align: center;
                      position: relative;
                      padding: 40px 20px;
                    }
                    .logo-container {
                      position: absolute;
                      top: 20px;
                      right: 20px;
                    }
                    .logo-container img {
                      height: 60px;
                      width: auto;
                    }
                    h1 {
                      color: #5A5E3E;
                      margin-bottom: 10px;
                      margin-top: 0;
                      font-size: 32px;
                    }
                    .subtitle {
                      color: #2D2D2B;
                      font-size: 20px;
                      font-weight: bold;
                      margin-bottom: 30px;
                    }
                    .qr-code {
                      max-width: 400px;
                      width: 100%;
                      margin: 20px 0;
                    }
                    .customer-instructions {
                      max-width: 500px;
                      margin-top: 30px;
                      padding: 20px;
                      text-align: center;
                    }
                    .customer-instructions p {
                      color: #2D2D2B;
                      font-size: 16px;
                      margin: 8px 0;
                      line-height: 1.5;
                    }
                    .cta {
                      color: #5A5E3E;
                      font-weight: bold;
                      font-size: 18px;
                      margin-top: 15px;
                    }
                  </style>
                </head>
                <body>
                  <div class="logo-container">
                    <img src="${tabliLogo}" alt="Tabli Logo" />
                  </div>
                  <h1>${restaurantName}</h1>
                  <p class="subtitle">Scan to View Menu & Book</p>
                  <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
                  <div class="customer-instructions">
                    <p>Scan this QR code with your phone camera</p>
                    <p>to view our menu and book your table instantly</p>
                    <p class="cta">Book your table next time faster with Tabli</p>
                  </div>
                </body>
              </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.print();
            }, 250);
            return;
          }
          
          canvas.width = logoImg.width;
          canvas.height = logoImg.height;
          ctx.drawImage(logoImg, 0, 0);
          const logoDataUrl = canvas.toDataURL('image/png');
          
          printWindow.document.write(`
            <html>
              <head>
                <title>Print QR Code - ${restaurantName}</title>
                <style>
                  @media print {
                    @page {
                      margin: 20mm;
                    }
                  }
                  body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    text-align: center;
                    position: relative;
                    padding: 40px 20px;
                  }
                  .logo-container {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                  }
                  .logo-container img {
                    height: 60px;
                    width: auto;
                  }
                  h1 {
                    color: #5A5E3E;
                    margin-bottom: 10px;
                    margin-top: 0;
                    font-size: 32px;
                  }
                  .subtitle {
                    color: #2D2D2B;
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 30px;
                  }
                  .qr-code {
                    max-width: 400px;
                    width: 100%;
                    margin: 20px 0;
                  }
                  .customer-instructions {
                    max-width: 500px;
                    margin-top: 30px;
                    padding: 20px;
                    text-align: center;
                  }
                  .customer-instructions p {
                    color: #2D2D2B;
                    font-size: 16px;
                    margin: 8px 0;
                    line-height: 1.5;
                  }
                  .cta {
                    color: #5A5E3E;
                    font-weight: bold;
                    font-size: 18px;
                    margin-top: 15px;
                  }
                </style>
              </head>
              <body>
                <div class="logo-container">
                  <img src="${logoDataUrl}" alt="Tabli Logo" />
                </div>
                <h1>${restaurantName}</h1>
                <p class="subtitle">Scan to View Menu & Book</p>
                <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
                <div class="customer-instructions">
                  <p>Scan this QR code with your phone camera</p>
                  <p>to view our menu and book your table instantly</p>
                  <p class="cta">Book your table next time faster with Tabli</p>
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
          // Small delay to ensure images are loaded before printing
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
        
        logoImg.onerror = () => {
          // Fallback if logo fails to load - use direct import path
          printWindow.document.write(`
            <html>
              <head>
                <title>Print QR Code - ${restaurantName}</title>
                <style>
                  @media print {
                    @page {
                      margin: 20mm;
                    }
                  }
                  body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    text-align: center;
                    position: relative;
                    padding: 40px 20px;
                  }
                  .logo-container {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                  }
                  .logo-container img {
                    height: 60px;
                    width: auto;
                  }
                  h1 {
                    color: #5A5E3E;
                    margin-bottom: 10px;
                    margin-top: 0;
                    font-size: 32px;
                  }
                  .subtitle {
                    color: #2D2D2B;
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 30px;
                  }
                  .qr-code {
                    max-width: 400px;
                    width: 100%;
                    margin: 20px 0;
                  }
                  .customer-instructions {
                    max-width: 500px;
                    margin-top: 30px;
                    padding: 20px;
                    text-align: center;
                  }
                  .customer-instructions p {
                    color: #2D2D2B;
                    font-size: 16px;
                    margin: 8px 0;
                    line-height: 1.5;
                  }
                  .cta {
                    color: #5A5E3E;
                    font-weight: bold;
                    font-size: 18px;
                    margin-top: 15px;
                  }
                </style>
              </head>
              <body>
                <div class="logo-container">
                  <img src="${tabliLogo}" alt="Tabli Logo" />
                </div>
                <h1>${restaurantName}</h1>
                <p class="subtitle">Scan to View Menu & Book</p>
                <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
                <div class="customer-instructions">
                  <p>Scan this QR code with your phone camera</p>
                  <p>to view our menu and book your table instantly</p>
                  <p class="cta">Book your table next time faster with Tabli</p>
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
    }
  };

  const profileUrl = generateRestaurantProfileUrl(restaurantId);

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
            Scan this code to view {restaurantName}'s profile
          </p>
          <p className="text-xs" style={{color: 'var(--where2go-text)', opacity: 0.6}}>
            {profileUrl}
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

