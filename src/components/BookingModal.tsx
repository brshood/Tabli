import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Minus, Users, Clock, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useLanguage } from './LanguageContext';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
import type { Restaurant } from './RestaurantContext';
import { saveActiveReservation, type ActiveReservation } from '../services/reservationStorage';
import { addReservationToHistory, type ReservationHistoryItem } from '../services/reservationHistory';
import { startReservationSSE } from '../services/reservationSSE';
import { showInAppNotification } from './InAppNotificationSystem';
import { subscribeToPush, requestPermissionAndPrepareSubscription, completeSubscription } from '../services/pushSubscription';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'reserve' | 'waitlist';
  restaurant?: Restaurant;
  onSuccess?: (reservationId?: string, restaurantId?: string) => void;
}

export function BookingModal({ isOpen, onClose, mode, restaurant, onSuccess }: BookingModalProps) {
  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [contactMethod, setContactMethod] = useState<'phone' | 'email'>('email');
  const [countryCode, setCountryCode] = useState('+971');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [email, setEmail] = useState('');
  const [seatingPreference, setSeatingPreference] = useState<'indoor' | 'outdoor' | 'no-preference'>('no-preference');
  const [gender, setGender] = useState<'male' | 'female' | 'prefer-not-to-say'>('prefer-not-to-say');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [liveQueueCount, setLiveQueueCount] = useState<number | null>(restaurant?.waitingInLine ?? null);
  const [estimatedWaitMinutes, setEstimatedWaitMinutes] = useState<number | null>(null);
  const [estimateStatus, setEstimateStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false); // #10 - Loading state
  const [customerNotes, setCustomerNotes] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    indoor: { available: boolean; count: number };
    outdoor: { available: boolean; count: number };
    noPreference: { available: boolean };
  } | null>(null);
  const { t } = useLanguage();
  
  const maxHoldTime = restaurant?.maxHoldTime || 10;
  const queuePosition = restaurant?.waitingInLine || 0;
  const configuredWaitLabel =
    restaurant?.waitTimeDisplayText?.trim() ||
    (typeof restaurant?.waitTimeMinMinutes === 'number' && typeof restaurant?.waitTimeMaxMinutes === 'number'
      ? `${restaurant.waitTimeMinMinutes}-${restaurant.waitTimeMaxMinutes} minutes`
      : null);

  useEffect(() => {
    setLiveQueueCount(restaurant?.waitingInLine ?? null);
  }, [restaurant?.waitingInLine]);

  // Fetch table availability when modal opens and party size changes
  useEffect(() => {
    if (!isOpen || !restaurant || mode !== 'reserve') {
      return;
    }

    const restaurantId = (restaurant as any)?.id || (restaurant as any)?._id;
    if (!restaurantId) {
      return;
    }

    let cancelled = false;

    const fetchAvailability = async () => {
      try {
        const url = new URL(`${API_URL}/tables/availability/${restaurantId}`);
        url.searchParams.set('partySize', String(partySize));

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error('failed_to_fetch_availability');
        }

        const data = await res.json();
        if (cancelled) return;

        setAvailabilityStatus(data);
      } catch (_error) {
        if (cancelled) return;
        console.error('Failed to fetch table availability:', _error);
        // Set default state on error
        setAvailabilityStatus(null);
      }
    };

    fetchAvailability();

    return () => {
      cancelled = true;
    };
  }, [isOpen, restaurant, partySize, mode]);

  useEffect(() => {
    if (!isOpen || mode !== 'waitlist' || !restaurant) {
      return;
    }

    const restaurantId = (restaurant as any)?.id || (restaurant as any)?._id;
    if (!restaurantId) {
      return;
    }

    let cancelled = false;

    const fetchEstimate = async () => {
      try {
        setEstimateStatus('loading');
        const url = new URL(`${API_URL}/queue/${restaurantId}/estimate`);
        url.searchParams.set('partySize', String(partySize));

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error('failed_to_fetch_estimate');
        }

        const data = await res.json();
        if (cancelled) return;

        const estimates = data?.estimates;
        if (typeof estimates?.queueLength === 'number') {
          setLiveQueueCount(estimates.queueLength);
        }
        const next = estimates?.nextPartyEstimate;
        if (typeof next?.estimatedWaitMinutes === 'number') {
          setEstimatedWaitMinutes(next.estimatedWaitMinutes);
        } else {
          setEstimatedWaitMinutes(null);
        }
        setEstimateStatus('idle');
      } catch (_error) {
        if (cancelled) return;
        setEstimateStatus('error');
        setEstimatedWaitMinutes(null);
      }
    };

    fetchEstimate();

    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, restaurant, partySize]);

  const formattedQueueCount = liveQueueCount ?? queuePosition ?? 0;
  const waitLabel = (() => {
    if (estimateStatus === 'loading') return 'Calculating…';
    if (estimateStatus === 'error') return 'N/A';
    if (estimatedWaitMinutes === null) return 'N/A';
    if (estimatedWaitMinutes <= 1) return 'Ready soon';
    return `~${estimatedWaitMinutes} min`;
  })();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPartySize(2);
      setContactMethod('email');
      setCountryCode('+971');
      setPhoneLocal('');
      setEmail('');
      setSeatingPreference('no-preference');
      setGender('prefer-not-to-say');
      setErrors({});
      setAvailabilityStatus(null);
      setCustomerNotes('');
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (partySize < 1 || partySize > 12) {
      newErrors.partySize = 'Party size must be between 1 and 12';
    }

    // Phone is always required
    const numericLocal = phoneLocal.replace(/\D/g, '');
    if (!numericLocal || numericLocal.length < 5) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Email is optional, but if provided, it must be valid
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true); // #10 - Start loading
    
    // CRITICAL for iOS: Request notification permission BEFORE any async operations
    // This must be in the direct user gesture handler
    let permissionGranted = false;
    try {
      permissionGranted = await requestPermissionAndPrepareSubscription();
      if (permissionGranted) {
        console.log('[PUSH] Permission granted, will complete subscription after reservation is created');
      }
    } catch (permError) {
      console.warn('[PUSH] Failed to request permission:', permError);
      // Continue with booking even if permission request fails
    }
    
    try {
      // Create AbortController for timeout handling (especially important on mobile)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let res: Response;
      try {
        res = await fetch(`${API_URL}/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: (restaurant as any)?.id || (restaurant as any)?._id,
            mode,
            name: customerName || undefined,
            partySize,
            contactMethod,
            phone: `${countryCode}${phoneLocal.replace(/\D/g, '').replace(/^0+/, '')}`,
            email: email && email.trim() ? email : undefined,
            gender: gender !== 'prefer-not-to-say' ? gender : undefined,
            seatingPreference: seatingPreference !== 'no-preference' ? seatingPreference : undefined,
            customerNotes: customerNotes.trim() || undefined,
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Check if it's an abort (timeout) or network error
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('network') || fetchError.message?.includes('fetch')) {
          // Network timeout or connection error - request might have succeeded on server
          // Show a message that suggests checking notifications
          console.warn('[RESERVATION] Network error/timeout - reservation may have been created:', fetchError);
          toast.info('Connection issue detected. Your reservation may have been submitted. Please check your notifications to confirm.');
          setIsSubmitting(false);
          return;
        }
        // Re-throw other errors
        throw fetchError;
      }
      
      if (res.status === 409) {
        toast.error('You already have an active reservation at this restaurant');
        setIsSubmitting(false);
        return;
      }
      
      // Try to parse response even if not ok - reservation might still be created
      let data: any = {};
      
      try {
        data = await res.json();
      } catch (parseError) {
        // If JSON parsing fails, always treat it as an error (even if res.ok is true)
        // We cannot proceed without valid response data
        console.error('Failed to parse response JSON:', parseError);
        throw new Error('reservation_failed');
      }
      
      const reservation = data?.reservation;
      const position = reservation?.queuePosition;
      
      // Validate that we have reservation data before proceeding
      // If res.ok is true but no reservation exists, that's an error
      // If res.ok is false but we have reservation data, that's still a success (edge case)
      if (!reservation || !reservation._id) {
        // No valid reservation data found - treat as failure
        if (res.ok) {
          // This is unexpected - API says success but no reservation data
          console.error('API returned success status but no reservation data');
          throw new Error('reservation_failed');
        } else {
          // API returned error status and no reservation data - expected failure
          const errorMessage = data?.error || 'Could not submit request. Please try again.';
          toast.error(errorMessage);
          setIsSubmitting(false);
          return;
        }
      }
      
      // We have valid reservation data - proceed with success flow
      console.log('Reservation created successfully:', reservation._id);
      
      // #13 - Save reservation to localStorage for tracking
      // Note: reservation is guaranteed to exist here due to validation above
      const activeReservation: ActiveReservation = {
          reservationId: reservation._id,
          restaurantId: reservation.restaurantId,
          restaurantName: restaurant?.name || 'Restaurant',
          mode: reservation.mode,
          queuePosition: reservation.queuePosition,
          status: reservation.status,
          contactMethod: reservation.contactMethod,
          email: reservation.email,
          phone: reservation.phone,
          partySize: reservation.partySize,
          name: reservation.name,
          timestamp: Date.now(),
          holdUntil: reservation.holdUntil,
          holdStatus: reservation.holdStatus,
        };
        saveActiveReservation(activeReservation);
        
        // Also add to history for viewing all reservations
        const historyItem: ReservationHistoryItem = {
          ...activeReservation,
          bookedAt: Date.now(),
        };
        addReservationToHistory(historyItem);
        
        // Start SSE connection for real-time updates
        startReservationSSE(activeReservation);
        
        // Complete push notification subscription if permission was granted earlier
        // (Permission was requested before async operations for iOS compatibility)
        if (permissionGranted || (typeof Notification !== 'undefined' && Notification.permission === 'granted')) {
          try {
            await completeSubscription({
              reservationId: reservation._id,
              userId: undefined, // Add user ID if available
            });
            console.log('[PUSH] Subscribed to push notifications for reservation');
          } catch (pushError) {
            console.error('[PUSH] Failed to complete push subscription:', pushError);
            // Don't fail the booking if push subscription fails
          }
        }
        
        // Show in-app notification
        showInAppNotification({
          type: 'success',
          title: mode === 'reserve' ? 'Reservation Submitted!' : 'Added to Queue!',
          message: mode === 'reserve'
            ? `Your reservation at ${restaurant?.name || 'the restaurant'} has been submitted. We'll notify you with updates.`
            : `You're at position #${position || '?'} in the queue at ${restaurant?.name || 'the restaurant'}.`,
          persistent: true,
          actionLabel: 'View Status',
          onAction: () => {
            // This will be handled by the notification system
            window.dispatchEvent(new CustomEvent('tabli:open-status-modal'));
          }
        });
      
      const successMessage =
        mode === 'reserve'
          ? (reservation?.reservationType === 'waitlist'
              ? (typeof position === 'number'
                  ? `You're in the queue! Your position is #${position}. We'll notify you when it's your turn.`
                  : "You've been added to the queue! We'll notify you when your table is ready.")
              : "Your table is reserved! When we notify you, please arrive within about 10–15 minutes.")
          : (typeof position === 'number'
              ? `You're in the queue! Your position is #${position}. When it's your turn, you'll have about 10–15 minutes to arrive after we notify you.`
              : "You've been added to the queue! When it's your turn, you'll have about 10–15 minutes to arrive after we notify you.");
      toast.success(successMessage);
      if (onSuccess) {
        onSuccess(reservation?._id, reservation?.restaurantId);
      } else {
        onClose();
      }
    } catch (error: any) {
      // Only show error for actual failures, not network timeouts (already handled above)
      if (error.name !== 'AbortError' && !error.message?.includes('network') && !error.message?.includes('fetch')) {
        console.error('[RESERVATION] Error submitting reservation:', error);
        const errorMessage = error?.message?.includes('reservation_failed') 
          ? 'Could not submit request. Please try again.'
          : (error?.message || 'Could not submit request. Please try again.');
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false); // #10 - End loading
    }
  };

  const isFormValid = () => {
    if (partySize < 1 || partySize > 12) return false;
    // Phone is required
    if (phoneLocal.replace(/\D/g, '').length < 5) return false;
    // Email is optional, but if provided, it must be valid
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    return true;
  };

  const adjustPartySize = (delta: number) => {
    const newSize = Math.max(1, Math.min(12, partySize + delta));
    setPartySize(newSize);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md mx-4 !opacity-100 !bg-white max-h-[90vh] overflow-y-auto sm:max-h-[85vh]"
        style={{backgroundColor: '#FFFFFF !important', borderColor: 'var(--where2go-border)', opacity: '1 !important'}}
      >
        <DialogHeader>
          <DialogTitle style={{color: 'var(--where2go-text)'}}>
                {mode === 'reserve' ? 'Reserve a Table' : t('action.standInQueue')}
          </DialogTitle>
          <DialogDescription style={{color: 'var(--where2go-text)', opacity: 0.7}}>
            {mode === 'reserve' 
              ? 'Complete the form below to request a table reservation. We\'ll contact you to confirm availability.' 
              : 'Join the queue and we\'ll notify you when a table becomes available.'}
          </DialogDescription>
        </DialogHeader>

        {/* Queue Info for Waitlist Mode */}
        {mode === 'waitlist' && (
          <div className="rounded-xl p-4 space-y-2" style={{backgroundColor: 'var(--where2go-buff-light)', border: '1px solid var(--where2go-border)'}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{color: 'var(--where2go-accent)'}} />
                <span className="text-sm font-medium" style={{color: 'var(--where2go-text)'}}>People ahead:</span>
              </div>
              <span className="font-bold" style={{color: 'var(--where2go-accent)'}}>{formattedQueueCount}</span>
            </div>
            {/* HIDDEN: Estimated wait time removed from user view */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{color: 'var(--where2go-accent)'}} />
                <span className="text-sm font-medium" style={{color: 'var(--where2go-text)'}}>Estimated wait:</span>
              </div>
              <span className="font-bold" style={{color: 'var(--where2go-accent)'}}>{configuredWaitLabel || waitLabel}</span>
            </div>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          {/* Optional Customer Name */}
          <div className="space-y-2">
            <Label htmlFor="custName" className="text-sm sm:text-base" style={{color: 'var(--where2go-text)'}}>Your name (optional)</Label>
            <Input
              id="custName"
              type="text"
              placeholder="Enter your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-white"
              style={{borderColor: 'var(--where2go-border)'}}
            />
          </div>
          {/* Party Size */}
          <div className="space-y-2">
            <Label htmlFor="partySize" className="text-sm sm:text-base" style={{color: 'var(--where2go-text)'}}>Number of party members</Label>
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => adjustPartySize(-1)}
                disabled={partySize <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[3rem]">
                <span className="text-lg font-medium" style={{color: 'var(--where2go-text)'}}>{partySize}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => adjustPartySize(1)}
                disabled={partySize >= 12}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {errors.partySize && (
              <p className="text-sm text-red-600">{errors.partySize}</p>
            )}
          </div>

          {/* Seating Preference */}
          {(restaurant?.indoorSeating || restaurant?.outdoorSeating) && (
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-sm sm:text-base" style={{color: 'var(--where2go-text)'}}>Seating preference</Label>
              <RadioGroup
                value={seatingPreference}
                onValueChange={(value: 'indoor' | 'outdoor' | 'no-preference') => setSeatingPreference(value)}
                className="flex flex-col space-y-2 sm:space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no-preference" id="no-preference" />
                    <Label htmlFor="no-preference" style={{color: 'var(--where2go-text)'}}>No Preference</Label>
                  </div>
                  {mode === 'reserve' && availabilityStatus && (
                    <Badge
                      variant={availabilityStatus.noPreference.available ? "default" : "destructive"}
                      className={availabilityStatus.noPreference.available ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {availabilityStatus.noPreference.available ? "Available" : "Queue for table"}
                    </Badge>
                  )}
                </div>
                {restaurant?.indoorSeating && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="indoor" id="indoor" />
                      <Label htmlFor="indoor" style={{color: 'var(--where2go-text)'}}>Indoor</Label>
                    </div>
                    {mode === 'reserve' && availabilityStatus && (
                      <Badge
                        variant={availabilityStatus.indoor.available ? "default" : "destructive"}
                        className={availabilityStatus.indoor.available ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {availabilityStatus.indoor.available ? "Available" : "Queue for table"}
                      </Badge>
                    )}
                  </div>
                )}
                {restaurant?.outdoorSeating && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="outdoor" id="outdoor" />
                      <Label htmlFor="outdoor" style={{color: 'var(--where2go-text)'}}>Outdoor</Label>
                    </div>
                    {mode === 'reserve' && availabilityStatus && (
                      <Badge
                        variant={availabilityStatus.outdoor.available ? "default" : "destructive"}
                        className={availabilityStatus.outdoor.available ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {availabilityStatus.outdoor.available ? "Available" : "Queue for table"}
                      </Badge>
                    )}
                  </div>
                )}
              </RadioGroup>
            </div>
          )}

          {/* Gender Selection (Optional) */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-sm sm:text-base" style={{color: 'var(--where2go-text)'}}>Gender (Optional)</Label>
            <RadioGroup
              value={gender}
              onValueChange={(value: 'male' | 'female' | 'prefer-not-to-say') => setGender(value)}
              className="flex flex-wrap gap-3 sm:gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male" style={{color: 'var(--where2go-text)'}}>Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female" style={{color: 'var(--where2go-text)'}}>Female</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="prefer-not-to-say" id="prefer-not-to-say" />
                <Label htmlFor="prefer-not-to-say" style={{color: 'var(--where2go-text)'}}>Prefer not to say</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Contact Input - Phone required, email optional */}
          <div className="space-y-4">
            {/* Phone number - Required */}
            <div className="space-y-2">
              <Label htmlFor="phoneInput" className="text-sm sm:text-base" style={{color: 'var(--where2go-text)'}}>
                Phone number <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-[110px] bg-white" style={{borderColor: 'var(--where2go-border)'}}>
                    <SelectValue placeholder="+971" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+971">UAE +971</SelectItem>
                    <SelectItem value="+966">Saudi Arabia +966</SelectItem>
                    <SelectItem value="+974">Qatar +974</SelectItem>
                    <SelectItem value="+973">Bahrain +973</SelectItem>
                    <SelectItem value="+968">Oman +968</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  id="phoneInput"
                  type="tel"
                  placeholder="Enter phone number"
                  value={phoneLocal}
                  onChange={(e) => setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  className="bg-white flex-1"
                  style={{borderColor: 'var(--where2go-border)'}}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Email - Optional */}
            <div className="space-y-2">
              <Label htmlFor="emailInput" className="text-sm sm:text-base" style={{color: 'var(--where2go-text)'}}>
                Email address <span className="text-gray-400 text-xs">(optional)</span>
              </Label>
              <Input
                id="emailInput"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white"
                style={{borderColor: 'var(--where2go-border)'}}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Optional note for staff */}
          <div className="space-y-2">
            <Label htmlFor="queueNotes" className="text-sm sm:text-base" style={{color: 'var(--where2go-text)'}}>
              Note for the restaurant <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </Label>
            <Textarea
              id="queueNotes"
              placeholder="Allergies, occasion, seating needs…"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value.slice(0, 500))}
              className="bg-white min-h-[80px] resize-y"
              style={{borderColor: 'var(--where2go-border)'}}
              maxLength={500}
            />
          </div>

          {/* Disclaimer */}
          <div className="p-4 rounded-lg" style={{backgroundColor: 'var(--where2go-buff-light)', border: '1px solid var(--where2go-border)'}}>
            <p className="text-sm" style={{color: 'var(--where2go-text)'}}>
              <strong>Important:</strong> When it's your turn to be seated, your table will be held for {maxHoldTime} minutes. 
              If we can't reach you within this time, we'll move to the next party in line.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 pill-button"
              style={{borderColor: 'var(--where2go-border)', color: 'var(--where2go-text)'}}
            >
              {t('action.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid() || isSubmitting}
              className="flex-1 pill-button cta-button"
              style={mode === 'waitlist' ? {
                backgroundColor: '#000000',
                color: '#FFFFFF',
                borderColor: '#000000'
              } : {}}
              >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {mode === 'reserve' ? t('action.confirm') : t('action.standInQueue')}
                </>
              ) : (
                mode === 'reserve' ? t('action.confirm') : t('action.standInQueue')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}