import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

interface ResetPasswordModalProps {
  isOpen: boolean;
  token: string | null;
  onClose: () => void;
}

export function ResetPasswordModal({ isOpen, token, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setConfirm('');
      setSubmitting(false);
    }
  }, [isOpen]);

  const disabled = submitting || !password || password !== confirm || (password && password.length < 8);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>Reset your password</DialogTitle>
          <DialogDescription>Enter a new password for your account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div className="space-y-2">
            <Label>Confirm password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
          </div>
          <Button
            disabled={disabled}
            onClick={async () => {
              try {
                setSubmitting(true);
                const res = await fetch(`${API_URL}/auth/reset-password`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token, password })
                });
                if (!res.ok) throw new Error('failed');
                // remove token from URL
                const url = new URL(window.location.href);
                url.searchParams.delete('token');
                window.history.replaceState({}, '', url.toString());
                onClose();
              } catch {
                // simple alert for now
                alert('Failed to reset password. Please try again.');
              } finally {
                setSubmitting(false);
              }
            }}
            className="pill-button cta-button w-full"
          >
            {submitting ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


