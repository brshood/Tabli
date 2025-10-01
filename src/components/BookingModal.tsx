import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Plus, Minus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'reserve' | 'waitlist';
}

export function BookingModal({ isOpen, onClose, mode }: BookingModalProps) {
  const [partySize, setPartySize] = useState(2);
  const [contactMethod, setContactMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPartySize(2);
      setContactMethod('phone');
      setPhone('');
      setEmail('');
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
      ...(contactMethod === 'phone' ? { phone } : { email }),
      timestamp: new Date().toISOString()
    };

    console.log('Booking data:', payload);

    const successMessage = mode === 'reserve'
      ? "Your reservation request has been submitted! We'll contact you shortly with confirmation."
      : "You've been added to the waitlist! We'll notify you when your table is ready.";

    toast.success(successMessage);
    onClose();
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
      <DialogContent className="sm:max-w-md mx-4" style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}>
        <DialogHeader>
          <DialogTitle style={{color: '#3C3C3C'}}>
            {mode === 'reserve' ? 'Reserve a Table' : 'Join the Waitlist'}
          </DialogTitle>
          <DialogDescription style={{color: '#3C3C3C'}}>
            {mode === 'reserve' 
              ? 'Complete the form below to request a table reservation. We\'ll contact you to confirm availability.' 
              : 'Join the waitlist and we\'ll notify you when a table becomes available.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Party Size */}
          <div className="space-y-2">
            <Label htmlFor="partySize" style={{color: '#3C3C3C'}}>Number of party members</Label>
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
                <span className="text-lg font-medium" style={{color: '#3C3C3C'}}>{partySize}</span>
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

          {/* Contact Method */}
          <div className="space-y-3">
            <Label style={{color: '#3C3C3C'}}>Contact method</Label>
            <RadioGroup
              value={contactMethod}
              onValueChange={(value: 'phone' | 'email') => setContactMethod(value)}
              className="flex space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="phone" id="phone" />
                <Label htmlFor="phone" style={{color: '#3C3C3C'}}>Phone</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" style={{color: '#3C3C3C'}}>Email</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Contact Input */}
          {contactMethod === 'phone' && (
            <div className="space-y-2">
              <Label htmlFor="phoneInput" style={{color: '#3C3C3C'}}>Phone number</Label>
              <Input
                id="phoneInput"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-input-background"
                style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
            </div>
          )}

          {contactMethod === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="emailInput" style={{color: '#3C3C3C'}}>Email address</Label>
              <Input
                id="emailInput"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input-background"
                style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-4 rounded-lg" style={{backgroundColor: '#F8F1C1'}}>
            <p className="text-sm" style={{color: '#3C3C3C'}}>
              <strong>Important:</strong> When it's your turn to be seated, your table will be held for 10 minutes. 
              If we can't reach you within this time, we'll move to the next party in line.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 pill-button"
              style={{borderColor: 'rgba(60, 60, 60, 0.3)', color: '#3C3C3C'}}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className="flex-1 pill-button cta-button"
            >
              {mode === 'reserve' ? 'Confirm Reservation' : 'Join Waitlist'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}