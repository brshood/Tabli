import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';

interface ResetPasswordModalProps {
  isOpen: boolean;
  email: string | null;
  onAuthenticated?: (user: { name: string; email: string; restaurantId?: string }) => void;
  onClose: () => void;
}

export function ResetPasswordModal({ isOpen, email, onAuthenticated, onClose }: ResetPasswordModalProps) {
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    if (!isOpen) {
      setOtp('');
      setPassword('');
      setConfirm('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const disabled = submitting
    || !email
    || otp.length !== 6
    || !password
    || password !== confirm
    || password.length < 8;

  const handleSubmit = async () => {
    if (!email) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Invalid or expired verification code');
      }

      const data = await res.json();

      if (data.token && data.user) {
        localStorage.setItem('auth_token', data.token);
        toast.success('Verification successful! You are now signed in.');
        onAuthenticated?.({
          name: data.user.name,
          email: data.user.email,
          restaurantId: data.user.restaurantId,
        });
      } else {
        toast.success('Password updated. Please log in.');
      }

      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>Enter the 6-digit code from your email and set a new password.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Verification code</Label>
            <Input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirm password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
            />
          </div>
          <Button
            disabled={disabled}
            onClick={handleSubmit}
            className="pill-button cta-button w-full"
          >
            {submitting ? 'Verifying...' : 'Verify & Sign In'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


