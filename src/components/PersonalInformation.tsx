import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { User, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { updatePersonalInfo, changePassword, type PersonalInfo } from '../services/profileApi';

interface PersonalInformationProps {
  user: {
    name: string;
    email: string;
  };
  token: string;
  onUserUpdate: (user: any) => void;
}

export function PersonalInformation({ user, token, onUserUpdate }: PersonalInformationProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
  }, [user]);

  const handleSaveProfile = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    try {
      setSaving(true);
      const result = await updatePersonalInfo({ name, email }, token);
      toast.success('Profile updated successfully!');
      onUserUpdate(result.user);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword({ currentPassword, newPassword, confirmPassword }, token);
      toast.success('Password changed successfully!');
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Personal Information Card */}
      <Card className="card-shadow border-0 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center" style={{ color: '#2D2D2B' }}>
            <User className="h-6 w-6 mr-2" style={{ color: '#5A5E3E' }} />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" style={{ color: '#2D2D2B' }}>Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              style={{ 
                borderColor: 'rgba(90, 94, 62, 0.3)',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: '#2D2D2B' }}>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#5A5E3E' }} />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="pl-10"
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="pill-button text-white"
              style={{ backgroundColor: '#3F4427' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="card-shadow border-0 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center" style={{ color: '#2D2D2B' }}>
            <Lock className="h-6 w-6 mr-2" style={{ color: '#5A5E3E' }} />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" style={{ color: '#2D2D2B' }}>Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              style={{ 
                borderColor: 'rgba(90, 94, 62, 0.3)',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" style={{ color: '#2D2D2B' }}>New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              style={{ 
                borderColor: 'rgba(90, 94, 62, 0.3)',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" style={{ color: '#2D2D2B' }}>Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              style={{ 
                borderColor: 'rgba(90, 94, 62, 0.3)',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          <Card className="border-0" style={{ backgroundColor: '#F0DC82', opacity: 0.9 }}>
            <CardContent className="p-3">
              <p className="text-xs font-semibold mb-1" style={{ color: '#2D2D2B' }}>Password Requirements:</p>
              <ul className="text-xs space-y-0.5" style={{ color: '#2D2D2B' }}>
                <li>• At least 8 characters long</li>
                <li>• At least one uppercase letter (A-Z)</li>
                <li>• At least one number (0-9)</li>
                <li>• At least one special character (!@#$%^&*)</li>
              </ul>
            </CardContent>
          </Card>

          <div className="pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="pill-button text-white"
              style={{ backgroundColor: '#3F4427' }}
            >
              {changingPassword ? 'Changing Password...' : 'Change Password'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

