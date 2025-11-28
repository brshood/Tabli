import { useState, useEffect, useCallback, useRef } from 'react';
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
  const hasReachedZeroRef = useRef(false);
  const countdownRef = useRef<number | null>(null);
  const queuePositionRef = useRef(queuePosition);
  const prevQueuePositionRef = useRef<number | undefined>(queuePosition);
  const lastFetchTimeRef = useRef<number>(0);

  // Update refs when props change
  useEffect(() => {
    countdownRef.current = countdownSeconds;
  }, [countdownSeconds]);

  useEffect(() => {
    queuePositionRef.current = queuePosition;
  }, [queuePosition]);

  // Function to fetch estimate and update countdown
  const fetchEstimate = useCallback(async (forceRefresh: boolean = false) => {
    // Only fetch if countdown is at 0/null OR if it's a forced refresh (initial load)
    const currentCountdown = countdownRef.current;
    if (!forceRefresh && currentCountdown !== null && currentCountdown > 0 && !hasReachedZeroRef.current) {
      return; // Don't interrupt the countdown
    }
    
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
      
      if (estimates?.queueEstimates) {
        // Find estimate for this reservation
        const reservationEstimate = estimates.queueEstimates.find(
          (est: any) => est.reservationId === reservationId
        );
        
        if (reservationEstimate) {
          const waitMinutes = reservationEstimate.estimatedWaitMinutes || 0;
          const estimatedSeatTime = reservationEstimate.estimatedSeatTime;
          const newQueuePosition = reservationEstimate.queuePosition;
          
          setEstimatedWaitMinutes(waitMinutes);
          
          // Calculate seconds remaining until estimated seat time
          if (estimatedSeatTime) {
            const seatTime = new Date(estimatedSeatTime).getTime();
            const now = Date.now();
            const secondsRemaining = Math.max(0, Math.floor((seatTime - now) / 1000));
            setCountdownSeconds(secondsRemaining);
            // Reset ref when setting new countdown value
            hasReachedZeroRef.current = secondsRemaining === 0;
          } else {
            // Fallback to minutes * 60
            const totalSeconds = waitMinutes * 60;
            setCountdownSeconds(totalSeconds);
            // Reset ref when setting new countdown value
            hasReachedZeroRef.current = totalSeconds === 0;
          }
          
          // Only call onPositionUpdate if position actually changed
          if (prevQueuePositionRef.current !== undefined && 
              newQueuePosition !== prevQueuePositionRef.current && 
              onPositionUpdate) {
            onPositionUpdate(newQueuePosition);
          }
          prevQueuePositionRef.current = newQueuePosition;
          lastFetchTimeRef.current = Date.now();
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
              // Reset ref when setting new countdown value
              hasReachedZeroRef.current = secondsRemaining === 0;
            } else {
              const totalSeconds = waitMinutes * 60;
              setCountdownSeconds(totalSeconds);
              // Reset ref when setting new countdown value
              hasReachedZeroRef.current = totalSeconds === 0;
            }
          }
          lastFetchTimeRef.current = Date.now();
        }
      }
    } catch (err) {
      console.error('Failed to fetch queue estimate:', err);
      setError('Unable to calculate wait time');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, partySize, reservationId, onPositionUpdate]); // Removed queuePosition from deps

  // Initial fetch on mount or when reservationId changes
  useEffect(() => {
    prevQueuePositionRef.current = queuePosition;
    fetchEstimate(true);
  }, [reservationId, fetchEstimate]); // Include fetchEstimate but it's now stable

  // Handle queue position changes - only refetch if position actually changed and countdown is at 0
  useEffect(() => {
    // Only refetch if position changed AND countdown is at 0/null
    if (prevQueuePositionRef.current !== undefined && 
        prevQueuePositionRef.current !== queuePosition) {
      // Position changed - but only refetch if countdown is already at 0
      if (countdownRef.current === null || countdownRef.current <= 0) {
        // Don't refetch if we just fetched recently (within last 5 seconds)
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
        if (timeSinceLastFetch > 5000) {
          fetchEstimate(true);
        }
      }
    }
    prevQueuePositionRef.current = queuePosition;
  }, [queuePosition, fetchEstimate]);

  // Periodic refresh - only when countdown is at 0
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if countdown has reached zero
      if (countdownRef.current === null || countdownRef.current <= 0) {
        fetchEstimate(true);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [fetchEstimate]);

  // Countdown timer - updates every second
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev === null || prev <= 1) {
          // When countdown reaches 0, check if we need to fetch new estimate
          const wasNotZero = prev !== null && prev > 0;
          if (wasNotZero && !hasReachedZeroRef.current) {
            hasReachedZeroRef.current = true;
            // Immediately fetch new estimate when countdown reaches zero
            fetchEstimate(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdownSeconds, fetchEstimate]);

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

