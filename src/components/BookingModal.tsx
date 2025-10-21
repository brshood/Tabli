import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Plus, Minus, Users, Clock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { calculateEstimatedWaitTime } from '../services/NotificationService';
import type { Restaurant } from './RestaurantContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'reserve' | 'waitlist';
  restaurant?: Restaurant;
  onSuccess?: () => void;
}

export function BookingModal({ isOpen, onClose, mode, restaurant, onSuccess }: BookingModalProps) {
  const [partySize, setPartySize] = useState(2);
  const [contactMethod, setContactMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [seatingPreference, setSeatingPreference] = useState<'indoor' | 'outdoor' | 'no-preference'>('no-preference');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const maxHoldTime = restaurant?.maxHoldTime || 10;
  const queuePosition = restaurant?.waitingInLine || 0;
  const estimatedWaitTime = calculateEstimatedWaitTime(queuePosition, restaurant?.averageTableTurnTime);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPartySize(2);
      setContactMethod('phone');
      setPhone('');
      setEmail('');
      setSeatingPreference('no-preference');
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (partySize < 1 || partySize > 12) {
      newErrors.partySize = 'Party size must be between 1 and 12';
    }

    if (contactMethod === 'phone') {
      if (!phone || phone.length < 10) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    } else if (contactMethod === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const payload = {
      type: mode,
      partySize,
      contactMethod,
      seatingPreference,
      ...(contactMethod === 'phone' ? { phone } : { email }),
      restaurantId: restaurant?.id,
      restaurantName: restaurant?.name,
      queuePosition: mode === 'waitlist' ? queuePosition + 1 : undefined,
      timestamp: new Date().toISOString()
    };

    console.log('Booking data:', payload);

    const successMessage = mode === 'reserve'
      ? "Your reservation request has been submitted! We'll contact you shortly with confirmation."
      : "You've been added to the queue! We'll notify you when your table is ready.";

    toast.success(successMessage);
    
    // Call onSuccess callback if provided (to trigger survey)
    if (onSuccess) {
      onSuccess();
    } else {
      onClose();
    }
  };

  const isFormValid = () => {
    if (partySize < 1 || partySize > 12) return false;
    if (contactMethod === 'phone' && (!phone || phone.length < 10)) return false;
    if (contactMethod === 'email' && (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return false;
    return true;
  };

  const adjustPartySize = (delta: number) => {
    const newSize = Math.max(1, Math.min(12, partySize + delta));
    setPartySize(newSize);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 !opacity-100 !bg-white" style={{backgroundColor: '#FFFFFF !important', borderColor: 'var(--where2go-border)', opacity: '1 !important'}}>
        <DialogHeader>
          <DialogTitle style={{color: 'var(--where2go-text)'}}>
            {mode === 'reserve' ? 'Reserve a Table' : 'Stand in Queue'}
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
              <span className="font-bold" style={{color: 'var(--where2go-accent)'}}>{queuePosition}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{color: 'var(--where2go-accent)'}} />
                <span className="text-sm font-medium" style={{color: 'var(--where2go-text)'}}>Estimated wait:</span>
              </div>
              <span className="font-bold" style={{color: 'var(--where2go-accent)'}}>{estimatedWaitTime}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Party Size */}
          <div className="space-y-2">
            <Label htmlFor="partySize" style={{color: 'var(--where2go-text)'}}>Number of party members</Label>
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
            <div className="space-y-3">
              <Label style={{color: 'var(--where2go-text)'}}>Seating preference</Label>
              <RadioGroup
                value={seatingPreference}
                onValueChange={(value: 'indoor' | 'outdoor' | 'no-preference') => setSeatingPreference(value)}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no-preference" id="no-preference" />
                  <Label htmlFor="no-preference" style={{color: 'var(--where2go-text)'}}>No Preference</Label>
                </div>
                {restaurant?.indoorSeating && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="indoor" id="indoor" />
                    <Label htmlFor="indoor" style={{color: 'var(--where2go-text)'}}>Indoor</Label>
                  </div>
                )}
                {restaurant?.outdoorSeating && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outdoor" id="outdoor" />
                    <Label htmlFor="outdoor" style={{color: 'var(--where2go-text)'}}>Outdoor</Label>
                  </div>
                )}
              </RadioGroup>
            </div>
          )}

          {/* Contact Method */}
          <div className="space-y-3">
            <Label style={{color: 'var(--where2go-text)'}}>Contact method</Label>
            <RadioGroup
              value={contactMethod}
              onValueChange={(value: 'phone' | 'email') => setContactMethod(value)}
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="phone" id="phone" />
                <Label htmlFor="phone" style={{color: 'var(--where2go-text)'}}>Phone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" style={{color: 'var(--where2go-text)'}}>Email</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Contact Input */}
          {contactMethod === 'phone' && (
            <div className="space-y-2">
              <Label htmlFor="phoneInput" style={{color: 'var(--where2go-text)'}}>Phone number</Label>
              <Input
                id="phoneInput"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-white"
                style={{borderColor: 'var(--where2go-border)'}}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          )}

          {contactMethod === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="emailInput" style={{color: 'var(--where2go-text)'}}>Email address</Label>
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
          )}

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
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className="flex-1 pill-button cta-button"
            >
              {mode === 'reserve' ? 'Confirm Reservation' : 'Stand in Queue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}