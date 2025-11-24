import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function CancelQueuePage() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not-found'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Parse reservation ID from URL hash query params
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const reservationId = params.get('id');

    if (!reservationId) {
      setStatus('not-found');
      setMessage('Invalid cancellation link. Please check your email for the correct link.');
      return;
    }

    const cancel = async () => {
      try {
        const res = await fetch(`${API_URL}/reservations/${reservationId}/cancel`, {
          method: 'POST',
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (res.status === 404) {
            setStatus('not-found');
            setMessage('This reservation could not be found. It may have already been cancelled or processed.');
          } else {
            throw new Error(errorData.error || 'Failed to cancel');
          }
          return;
        }
        
        setStatus('success');
        setMessage('Your reservation has been cancelled successfully.');
      } catch (error) {
        setStatus('error');
        setMessage('Failed to cancel. Please try again or contact the restaurant directly.');
      }
    };

    cancel();
  }, []);

  const handleReturnHome = () => {
    window.location.href = '#landing';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{backgroundColor: '#F4F1E7'}}>
      <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg" style={{borderColor: 'rgba(45, 45, 43, 0.1)'}}>
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-2" style={{color: '#2D2D2B'}}>Cancelling...</h1>
            <p style={{color: '#4B5563'}}>Please wait while we process your cancellation.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2" style={{color: '#2D2D2B'}}>Cancelled</h1>
            <p className="mb-6" style={{color: '#4B5563'}}>{message}</p>
            <Button 
              onClick={handleReturnHome}
              className="pill-button cta-button"
            >
              Return to Home
            </Button>
          </>
        )}
        
        {(status === 'error' || status === 'not-found') && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2" style={{color: '#2D2D2B'}}>
              {status === 'not-found' ? 'Not Found' : 'Error'}
            </h1>
            <p className="mb-6" style={{color: '#4B5563'}}>{message}</p>
            <Button 
              onClick={handleReturnHome}
              className="pill-button"
              variant="outline"
            >
              Return to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

