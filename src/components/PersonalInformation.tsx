import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User, Mail, Lock, Phone, X } from 'lucide-react';
import { toast } from 'sonner';
import { updatePersonalInfo, changePassword, type PersonalInfo } from '../services/profileApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface PersonalInformationProps {
  user: {
    name: string;
    email: string;
  };
  token: string;
  restaurantId: string;
  onUserUpdate: (user: any) => void;
}

export function PersonalInformation({ user, token, restaurantId, onUserUpdate }: PersonalInformationProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Notification phone state
  const [notificationPhones, setNotificationPhones] = useState<string[]>([]);
  const [activeNotificationPhone, setActiveNotificationPhone] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('+971');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [loadingPhones, setLoadingPhones] = useState(true);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
  }, [user]);

  // Fetch notification phone settings
  useEffect(() => {
    const fetchNotificationPhones = async () => {
      try {
        setLoadingPhones(true);
        const res = await fetch(`${API_URL}/restaurants/${restaurantId}/notification-phones`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setNotificationPhones(data.notificationPhones || []);
          setActiveNotificationPhone(data.activeNotificationPhone || null);
        }
      } catch (error) {
        console.error('Failed to fetch notification phones:', error);
      } finally {
        setLoadingPhones(false);
      }
    };

    if (restaurantId && token) {
      fetchNotificationPhones();
    }
  }, [restaurantId, token]);

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

  // Staff often type the country code (or a leading 0) even though it's in the picker.
  // Strip both so we never build a number like +9719715012345.
  const toLocalDigits = (raw: string) => {
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    const cc = countryCode.replace(/\D/g, '');
    while (digits.startsWith(cc)) digits = digits.slice(cc.length);
    return digits.replace(/^0+/, '');
  };

  const handleSaveNotificationPhone = async () => {
    const localDigits = toLocalDigits(phoneLocal);
    if (localDigits.length < 7) {
      toast.error('Please enter a valid phone number');
      return;
    }

    const fullPhone = `${countryCode}${localDigits}`;
    
    try {
      setSavingPhone(true);
      const res = await fetch(`${API_URL}/restaurants/${restaurantId}/notification-phone`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save notification phone');
      }

      setNotificationPhones(data.notificationPhones || []);
      setActiveNotificationPhone(data.activeNotificationPhone || null);
      setPhoneLocal('');
      toast.success('Notification phone saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save notification phone');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSelectExistingPhone = async (phone: string) => {
    try {
      setSavingPhone(true);
      const res = await fetch(`${API_URL}/restaurants/${restaurantId}/notification-phone`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        throw new Error('Failed to update notification phone');
      }

      const data = await res.json();
      setActiveNotificationPhone(data.activeNotificationPhone || null);
      toast.success('Notification phone updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update notification phone');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSendTestSms = async () => {
    try {
      setTestingSms(true);
      const res = await fetch(`${API_URL}/restaurants/${restaurantId}/notification-phone/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test SMS');
      }

      toast.success(`Test SMS sent to ${data.sentTo || activeNotificationPhone}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test SMS');
    } finally {
      setTestingSms(false);
    }
  };

  const handleRemovePhone = async (phone: string) => {
    try {
      const res = await fetch(`${API_URL}/restaurants/${restaurantId}/notification-phone/${encodeURIComponent(phone)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to remove phone');
      }

      const data = await res.json();
      setNotificationPhones(data.notificationPhones || []);
      setActiveNotificationPhone(data.activeNotificationPhone || null);
      toast.success('Phone removed from history');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove phone');
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

      {/* SMS Notification Phone Card */}
      <Card className="card-shadow border-0 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center" style={{ color: '#2D2D2B' }}>
            <Phone className="h-6 w-6 mr-2" style={{ color: '#5A5E3E' }} />
            SMS Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm" style={{ color: '#5A5E3E' }}>
            Receive SMS notifications when customers make reservations or join the queue.
          </p>

          {/* Active phone display */}
          {activeNotificationPhone && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#F0F4E8', border: '1px solid rgba(90, 94, 62, 0.3)' }}>
              <p className="text-sm font-medium" style={{ color: '#2D2D2B' }}>
                Currently receiving notifications at:
              </p>
              <p className="text-lg font-semibold" style={{ color: '#3F4427' }}>
                {activeNotificationPhone}
              </p>
              <Button
                onClick={handleSendTestSms}
                disabled={testingSms}
                variant="outline"
                className="mt-2"
                style={{ borderColor: 'rgba(90, 94, 62, 0.4)', color: '#3F4427' }}
              >
                {testingSms ? 'Sending...' : 'Send test SMS'}
              </Button>
            </div>
          )}

          {/* Previous phones dropdown */}
          {notificationPhones.length > 0 && (
            <div className="space-y-2">
              <Label style={{ color: '#2D2D2B' }}>Select from previous numbers</Label>
              <div className="space-y-2">
                {notificationPhones.map((phone) => (
                  <div 
                    key={phone} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                    style={{ border: '1px solid rgba(90, 94, 62, 0.2)' }}
                  >
                    <button
                      onClick={() => handleSelectExistingPhone(phone)}
                      disabled={savingPhone}
                      className="flex-1 text-left px-2 py-1 rounded"
                      style={{ 
                        color: phone === activeNotificationPhone ? '#3F4427' : '#2D2D2B',
                        fontWeight: phone === activeNotificationPhone ? 600 : 400,
                      }}
                    >
                      {phone}
                      {phone === activeNotificationPhone && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#5A5E3E', color: 'white' }}>
                          Active
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemovePhone(phone)}
                      className="p-1 rounded hover:bg-red-100"
                      title="Remove from history"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new phone */}
          <div className="space-y-2">
            <Label style={{ color: '#2D2D2B' }}>Add new notification number</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-[120px]" style={{ borderColor: 'rgba(90, 94, 62, 0.3)', backgroundColor: '#FFFFFF' }}>
                  <SelectValue placeholder="+971" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="+971">UAE +971</SelectItem>
                  <SelectItem value="+966">KSA +966</SelectItem>
                  <SelectItem value="+974">Qatar +974</SelectItem>
                  <SelectItem value="+973">Bahrain +973</SelectItem>
                  <SelectItem value="+968">Oman +968</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="tel"
                placeholder="Phone number"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 15))}
                maxLength={15}
                className="flex-1"
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSaveNotificationPhone}
              disabled={savingPhone || toLocalDigits(phoneLocal).length < 7}
              className="pill-button text-white"
              style={{ backgroundColor: '#3F4427' }}
            >
              {savingPhone ? 'Saving...' : 'Save Notification Phone'}
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
