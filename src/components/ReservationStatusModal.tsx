// #13 - Reservation Status Modal
// Shows real-time status of user's active reservation

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Clock, Users, CheckCircle, XCircle, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { ActiveReservation } from '../services/reservationStorage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface ReservationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: ActiveReservation;
  onReservationUpdate: (updates: Partial<ActiveReservation>) => void;
  onReservationComplete: () => void;
}

export function ReservationStatusModal({
  isOpen,
  onClose,
  reservation,
  onReservationUpdate,
  onReservationComplete
}: ReservationStatusModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Update time remaining for hold expiry
  useEffect(() => {
    if (!reservation.holdUntil) {
      setTimeRemaining('');
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(reservation.holdUntil!).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [reservation.holdUntil]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/reservations/${reservation.reservationId}`);
      if (!res.ok) throw new Error('Failed to fetch reservation');
      
      const data = await res.json();
      const updated = data?.reservation;

      if (!updated) {
        throw new Error('Invalid response: reservation data missing');
      }

      // Update local state
      onReservationUpdate({
        status: updated.status,
        queuePosition: updated.queuePosition,
        holdUntil: updated.holdUntil,
        holdStatus: updated.holdStatus,
      });

      // Check if reservation is complete
      if (updated.status === 'seated' || updated.status === 'cancelled' || updated.status === 'no_show') {
        onReservationComplete();
        onClose();
        
        if (updated.status === 'seated') {
          toast.success('Enjoy your meal!');
        } else if (updated.status === 'cancelled') {
          toast.info('Your reservation has been cancelled');
        }
      } else {
        toast.success('Status updated');
      }
    } catch (error) {
      toast.error('Failed to refresh status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your reservation?')) {
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch(`${API_URL}/reservations/${reservation.reservationId}/cancel`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Failed to cancel reservation');

      toast.success('Reservation cancelled successfully');
      onReservationComplete();
      onClose();
    } catch (error) {
      toast.error('Failed to cancel reservation');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusInfo = () => {
    switch (reservation.status) {
      case 'pending':
        return {
          icon: <Clock className="h-6 w-6 text-yellow-600" />,
          title: 'Waiting in Queue',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        };
      case 'confirmed':
        return {
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          title: 'Table Ready!',
          color: 'bg-green-100 text-green-800 border-green-300',
        };
      case 'seated':
        return {
          icon: <CheckCircle className="h-6 w-6 text-blue-600" />,
          title: 'Seated',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      case 'cancelled':
        return {
          icon: <XCircle className="h-6 w-6 text-red-600" />,
          title: 'Cancelled',
          color: 'bg-red-100 text-red-800 border-red-300',
        };
      default:
        return {
          icon: <AlertCircle className="h-6 w-6 text-gray-600" />,
          title: 'Unknown Status',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 !opacity-100 !bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {statusInfo.icon}
            {statusInfo.title}
          </DialogTitle>
          <DialogDescription>
            Track your reservation at {reservation.restaurantName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Badge */}
          <div className={`p-4 rounded-lg border ${statusInfo.color}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Status</span>
              <Badge className={statusInfo.color}>
                {reservation.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Queue Position */}
          {reservation.mode === 'waitlist' && reservation.queuePosition && reservation.status === 'pending' && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Queue Position</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">#{reservation.queuePosition}</span>
              </div>
            </div>
          )}

          {/* Hold Timer */}
          {reservation.status === 'confirmed' && reservation.holdUntil && reservation.holdStatus === 'active' && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-300">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="font-semibold text-amber-900">Table Hold</span>
                </div>
                <span className="text-xl font-bold text-amber-600">{timeRemaining}</span>
              </div>
              <p className="text-sm text-amber-700">
                Please arrive within 15 minutes to secure your table
              </p>
            </div>
          )}

          {/* Reservation Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Restaurant</span>
              <span className="font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {reservation.restaurantName}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Party Size</span>
              <span className="font-medium flex items-center gap-1">
                <Users className="h-4 w-4" />
                {reservation.partySize}
              </span>
            </div>
            {reservation.name && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Name</span>
                <span className="font-medium">{reservation.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Mode</span>
              <Badge variant="outline">
                {reservation.mode === 'reserve' ? 'Reservation' : 'Waitlist'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading || isCancelling}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh Status'
            )}
          </Button>
          {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isLoading || isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Reservation'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

