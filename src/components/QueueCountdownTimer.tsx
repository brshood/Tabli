import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface QueueCountdownTimerProps {
  reservationId: string;
  restaurantId: string;
  queuePosition: number;
  partySize: number;
  onPositionUpdate?: (newPosition: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function QueueCountdownTimer({ 
  reservationId, 
  restaurantId, 
  queuePosition, 
  partySize,
  onPositionUpdate 
}: QueueCountdownTimerProps) {
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now());

  // Initial fetch and periodic refresh (every 60 seconds)
  useEffect(() => {
    let cancelled = false;

    const fetchEstimate = async () => {
      if (cancelled) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const url = new URL(`${API_URL}/queue/${restaurantId}/estimate`);
        url.searchParams.set('partySize', String(partySize));

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error('Failed to fetch estimate');
        }

        const data = await res.json();
        const estimates = data?.estimates;
        
        if (cancelled) return;
        
        if (estimates?.queueEstimates) {
          // Find estimate for this reservation
          const reservationEstimate = estimates.queueEstimates.find(
            (est: any) => est.reservationId === reservationId
          );
          
          if (reservationEstimate) {
            const waitMinutes = reservationEstimate.estimatedWaitMinutes || 0;
            const estimatedSeatTime = reservationEstimate.estimatedSeatTime;
            
            setEstimatedWaitMinutes(waitMinutes);
            
            // Calculate seconds remaining until estimated seat time
            if (estimatedSeatTime) {
              const seatTime = new Date(estimatedSeatTime).getTime();
              const now = Date.now();
              const secondsRemaining = Math.max(0, Math.floor((seatTime - now) / 1000));
              setCountdownSeconds(secondsRemaining);
            } else {
              // Fallback to minutes * 60
              setCountdownSeconds(waitMinutes * 60);
            }
            
            // Check if position changed
            if (reservationEstimate.queuePosition !== queuePosition && onPositionUpdate) {
              onPositionUpdate(reservationEstimate.queuePosition);
            }
          } else {
            // Use nextPartyEstimate as fallback
            const nextEstimate = estimates?.nextPartyEstimate;
            if (nextEstimate?.estimatedWaitMinutes) {
              const waitMinutes = nextEstimate.estimatedWaitMinutes || 0;
              setEstimatedWaitMinutes(waitMinutes);
              
              if (nextEstimate.estimatedSeatTime) {
                const seatTime = new Date(nextEstimate.estimatedSeatTime).getTime();
                const now = Date.now();
                const secondsRemaining = Math.max(0, Math.floor((seatTime - now) / 1000));
                setCountdownSeconds(secondsRemaining);
              } else {
                setCountdownSeconds(waitMinutes * 60);
              }
            }
          }
        }
        
        setLastFetchTime(Date.now());
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to fetch queue estimate:', err);
        setError('Unable to calculate wait time');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchEstimate();
    const interval = setInterval(fetchEstimate, 60000); // Refresh estimate every minute
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [restaurantId, partySize, reservationId, queuePosition, onPositionUpdate]);

  // Countdown timer - updates every second
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev === null || prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds]);

  // Format countdown display
  const formatCountdown = () => {
    if (isLoading) return 'Calculating...';
    if (error) return error;
    if (countdownSeconds === null || countdownSeconds === 0) return 'Ready soon';
    
    const minutes = Math.floor(countdownSeconds / 60);
    const seconds = countdownSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-900">Queue Position</span>
        <span className="text-xl font-bold text-blue-600">#{queuePosition}</span>
      </div>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">Estimated wait:</span>
        <span className="text-lg font-bold text-blue-600">{formatCountdown()}</span>
      </div>
      {estimatedWaitMinutes !== null && estimatedWaitMinutes > 0 && (
        <p className="text-xs text-blue-700 mt-1">
          Approximately {estimatedWaitMinutes} {estimatedWaitMinutes === 1 ? 'minute' : 'minutes'} remaining
        </p>
      )}
    </div>
  );
}

