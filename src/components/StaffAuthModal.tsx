import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Eye, EyeOff, Check, Upload, FileText } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';

interface StaffAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: { name: string; email: string }, restaurantData?: any) => void;
}

const cuisineOptions = [
  'Italian', 'Asian', 'Pizza', 'Café', 'Healthy', 'Seafood', 'BBQ', 'Mexican', 'Indian', 'Chinese', 'Japanese', 'Lebanese', 'French', 'American'
];

const cityOptions: ('Al Ain' | 'Abu Dhabi' | 'Dubai')[] = ['Al Ain', 'Abu Dhabi', 'Dubai'];

export function StaffAuthModal({ isOpen, onClose, onAuthSuccess }: StaffAuthModalProps) {
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  
  // Restaurant signup information
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantCity, setRestaurantCity] = useState<'Al Ain' | 'Abu Dhabi' | 'Dubai' | ''>('');
  const [restaurantCuisine, setRestaurantCuisine] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  
  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Reset forms when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('login');
      setLoginEmail('');
      setLoginPassword('');
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setRestaurantName('');
      setRestaurantCity('');
      setRestaurantCuisine('');
      setRestaurantPhone('');
      setRestaurantAddress('');
      setLicenseNumber('');
      setLicenseFile(null);
      setForgotEmail('');
      setResetSent(false);
      setErrors({});
      setShowPassword(false);
    }
  }, [isOpen]);

  const authRequest = async (payload: any) => {
    // Placeholder for authentication request
    console.log('Auth request:', payload);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful authentication
    return {
      success: true,
      user: {
        name: payload.type === 'login' ? 'Staff Member' : payload.name,
        email: payload.email
      }
    };
  };

  const validateLogin = () => {
    const newErrors: Record<string, string> = {};
    
    if (!loginEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      newErrors.loginEmail = 'Please enter a valid email address';
    }
    
    if (!loginPassword || loginPassword.length < 6) {
      newErrors.loginPassword = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors: Record<string, string> = {};
    
    // Personal information validation
    if (!signupName || signupName.trim().length < 2) {
      newErrors.signupName = 'Please enter your full name';
    }
    
    if (!signupEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) {
      newErrors.signupEmail = 'Please enter a valid email address';
    }
    
    if (!signupPassword || signupPassword.length < 6) {
      newErrors.signupPassword = 'Password must be at least 6 characters';
    }

    // Restaurant information validation
    if (!restaurantName || restaurantName.trim().length < 2) {
      newErrors.restaurantName = 'Please enter restaurant name';
    }

    if (!restaurantCity) {
      newErrors.restaurantCity = 'Please select a city';
    }

    if (!restaurantCuisine) {
      newErrors.restaurantCuisine = 'Please select cuisine type';
    }

    if (!restaurantPhone || restaurantPhone.trim().length < 10) {
      newErrors.restaurantPhone = 'Please enter a valid phone number';
    }

    if (!restaurantAddress || restaurantAddress.trim().length < 5) {
      newErrors.restaurantAddress = 'Please enter restaurant address';
    }

    // License validation
    if (!licenseNumber || licenseNumber.trim().length < 3) {
      newErrors.licenseNumber = 'Please enter license number';
    }

    if (!licenseFile) {
      newErrors.licenseFile = 'Please upload license document';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;
    
    setIsLoading(true);
    try {
      const result = await authRequest({
        type: 'login',
        email: loginEmail,
        password: loginPassword
      });
      
      if (result.success) {
        toast.success('Welcome back!');
        onAuthSuccess(result.user);
        onClose();
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateSignup()) return;
    
    setIsLoading(true);
    try {
      const result = await authRequest({
        type: 'signup',
        name: signupName.trim(),
        email: signupEmail,
        password: signupPassword
      });
      
      if (result.success) {
        // Create restaurant data for the new signup
        const restaurantData = {
          name: restaurantName.trim(),
          city: restaurantCity,
          cuisine: restaurantCuisine,
          phone: restaurantPhone.trim(),
          email: signupEmail,
          description: `Welcome to ${restaurantName.trim()}! We're excited to serve you.`,
          location: `${restaurantAddress.trim()}, ${restaurantCity}`,
          rating: 4.0, // Starting rating
          status: 'available' as const,
          waitTime: null,
          tablesAvailable: 5, // Default tables
          priceRange: '$', // Default price range
          openingHours: '09:00',
          closingHours: '22:00',
          image: 'restaurant-generic',
          waitingInLine: 0,
          weeklyAverageCustomers: 25, // Starting average
          coverImage: null,
          menu: [
            {
              name: 'House Special',
              category: 'Specials',
              description: 'Our signature dish',
              price: '25'
            }
          ],
          licenseNumber: licenseNumber.trim(),
          licenseFile: licenseFile ? URL.createObjectURL(licenseFile) : null
        };

        toast.success('Restaurant account created successfully!');
        onAuthSuccess(result.user, restaurantData);
        onClose();
      }
    } catch (error) {
      toast.error('Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLicenseFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a PDF or image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setLicenseFile(file);
      setErrors(prev => ({ ...prev, licenseFile: '' }));
      toast.success('License document uploaded successfully');
    }
  };

  const validateForgotPassword = () => {
    const newErrors: Record<string, string> = {};
    
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      newErrors.forgotEmail = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async () => {
    if (!validateForgotPassword()) return;
    
    setIsLoading(true);
    try {
      // Simulate API call for password reset
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResetSent(true);
      toast.success('Password reset instructions sent to your email!');
    } catch (error) {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setActiveTab('login');
    setResetSent(false);
    setForgotEmail('');
    setErrors({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg mx-4 max-h-[90vh] overflow-hidden" style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}>
        <DialogHeader>
          <DialogTitle style={{color: '#3C3C3C'}}>Staff Access</DialogTitle>
          <DialogDescription style={{color: '#3C3C3C'}}>
            Log in to your staff account or create a new restaurant account to access the staff dashboard.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full mb-6 ${activeTab === 'forgot' ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {activeTab !== 'forgot' && (
              <>
                <TabsTrigger value="login" style={{color: '#B7410E'}}>Log in</TabsTrigger>
                <TabsTrigger value="signup" style={{color: '#B7410E'}}>Sign up</TabsTrigger>
              </>
            )}
            {activeTab === 'forgot' && (
              <div className="text-center py-2">
                <span style={{color: '#B7410E', fontWeight: '500'}}>Reset Password</span>
              </div>
            )}
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginEmail" style={{color: '#3C3C3C'}}>Email</Label>
              <Input
                id="loginEmail"
                type="email"
                placeholder="your.email@restaurant.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="bg-input-background"
                style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
              />
              {errors.loginEmail && (
                <p className="text-sm text-red-600">{errors.loginEmail}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="loginPassword" style={{color: '#3C3C3C'}}>Password</Label>
              <div className="relative">
                <Input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="bg-input-background pr-10"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.loginPassword && (
                <p className="text-sm text-red-600">{errors.loginPassword}</p>
              )}
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full pill-button cta-button"
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </Button>

            <div className="text-center mt-4">
              <Button
                variant="link"
                onClick={() => setActiveTab('forgot')}
                className="text-sm px-0"
                style={{color: '#B7410E'}}
              >
                Forgot your password?
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 max-h-80 overflow-y-auto pr-2">
            {/* Personal Information Section */}
            <div className="space-y-4 p-4 rounded-xl" style={{backgroundColor: '#F8F1C1', border: '1px solid rgba(183, 65, 14, 0.2)'}}>
              <h4 className="font-medium" style={{color: '#3C3C3C'}}>Personal Information</h4>
              
              <div className="space-y-2">
                <Label htmlFor="signupName" style={{color: '#3C3C3C'}}>Full Name</Label>
                <Input
                  id="signupName"
                  type="text"
                  placeholder="Your full name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                {errors.signupName && (
                  <p className="text-sm text-red-600">{errors.signupName}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signupEmail" style={{color: '#3C3C3C'}}>Email</Label>
                  <Input
                    id="signupEmail"
                    type="email"
                    placeholder="your.email@restaurant.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="bg-input-background"
                    style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                  />
                  {errors.signupEmail && (
                    <p className="text-sm text-red-600">{errors.signupEmail}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword" style={{color: '#3C3C3C'}}>Password</Label>
                  <div className="relative">
                    <Input
                      id="signupPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password (6+ characters)"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="bg-input-background pr-10"
                      style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.signupPassword && (
                    <p className="text-sm text-red-600">{errors.signupPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Restaurant Information Section */}
            <div className="space-y-4 p-4 rounded-xl" style={{backgroundColor: '#F8F1C1', border: '1px solid rgba(183, 65, 14, 0.2)'}}>
              <h4 className="font-medium" style={{color: '#3C3C3C'}}>Restaurant Information</h4>
              
              <div className="space-y-2">
                <Label htmlFor="restaurantName" style={{color: '#3C3C3C'}}>Restaurant Name</Label>
                <Input
                  id="restaurantName"
                  type="text"
                  placeholder="Your restaurant name"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                {errors.restaurantName && (
                  <p className="text-sm text-red-600">{errors.restaurantName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurantCity" style={{color: '#3C3C3C'}}>City</Label>
                  <Select value={restaurantCity} onValueChange={(value: 'Al Ain' | 'Abu Dhabi' | 'Dubai') => setRestaurantCity(value)}>
                    <SelectTrigger className="bg-input-background" style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent style={{backgroundColor: '#F3E5AB'}}>
                      {cityOptions.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.restaurantCity && (
                    <p className="text-sm text-red-600">{errors.restaurantCity}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restaurantCuisine" style={{color: '#3C3C3C'}}>Cuisine Type</Label>
                  <Select value={restaurantCuisine} onValueChange={setRestaurantCuisine}>
                    <SelectTrigger className="bg-input-background" style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}>
                      <SelectValue placeholder="Select cuisine" />
                    </SelectTrigger>
                    <SelectContent style={{backgroundColor: '#F3E5AB'}}>
                      {cuisineOptions.map((cuisine) => (
                        <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.restaurantCuisine && (
                    <p className="text-sm text-red-600">{errors.restaurantCuisine}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurantPhone" style={{color: '#3C3C3C'}}>Phone Number</Label>
                <Input
                  id="restaurantPhone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={restaurantPhone}
                  onChange={(e) => setRestaurantPhone(e.target.value)}
                  className="bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                {errors.restaurantPhone && (
                  <p className="text-sm text-red-600">{errors.restaurantPhone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="restaurantAddress" style={{color: '#3C3C3C'}}>Address</Label>
                <Input
                  id="restaurantAddress"
                  type="text"
                  placeholder="Street address, area"
                  value={restaurantAddress}
                  onChange={(e) => setRestaurantAddress(e.target.value)}
                  className="bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                {errors.restaurantAddress && (
                  <p className="text-sm text-red-600">{errors.restaurantAddress}</p>
                )}
              </div>
            </div>

            {/* License Information Section */}
            <div className="space-y-4 p-4 rounded-xl" style={{backgroundColor: '#F8F1C1', border: '1px solid rgba(183, 65, 14, 0.2)'}}>
              <h4 className="font-medium" style={{color: '#3C3C3C'}}>License Information</h4>
              
              <div className="space-y-2">
                <Label htmlFor="licenseNumber" style={{color: '#3C3C3C'}}>License Number</Label>
                <Input
                  id="licenseNumber"
                  type="text"
                  placeholder="Business license number"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                {errors.licenseNumber && (
                  <p className="text-sm text-red-600">{errors.licenseNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseFile" style={{color: '#3C3C3C'}}>License Document</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('licenseFile')?.click()}
                      className="pill-button flex-1"
                      style={{borderColor: '#B7410E', color: '#B7410E'}}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {licenseFile ? 'Change File' : 'Upload License'}
                    </Button>
                  </div>
                  
                  <input
                    id="licenseFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleLicenseFileUpload}
                    className="hidden"
                  />
                  
                  {licenseFile && (
                    <div className="flex items-center gap-2 p-2 rounded-lg" style={{backgroundColor: '#F3E5AB'}}>
                      <FileText className="h-4 w-4" style={{color: '#B7410E'}} />
                      <span className="text-sm" style={{color: '#3C3C3C'}}>{licenseFile.name}</span>
                    </div>
                  )}
                  
                  {errors.licenseFile && (
                    <p className="text-sm text-red-600">{errors.licenseFile}</p>
                  )}
                  
                  <p className="text-xs" style={{color: '#9FA0A0'}}>
                    Upload PDF or image file (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSignup}
              disabled={isLoading}
              className="w-full pill-button cta-button"
            >
              {isLoading ? 'Creating restaurant account...' : 'Create Restaurant Account'}
            </Button>
          </TabsContent>

          <TabsContent value="forgot" className="space-y-4">
            {!resetSent ? (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium mb-2" style={{color: '#3C3C3C'}}>
                    Reset Your Password
                  </h3>
                  <p className="text-sm" style={{color: '#3C3C3C'}}>
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="forgotEmail" style={{color: '#3C3C3C'}}>Email Address</Label>
                  <Input
                    id="forgotEmail"
                    type="email"
                    placeholder="your.email@restaurant.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="bg-input-background"
                    style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                  />
                  {errors.forgotEmail && (
                    <p className="text-sm text-red-600">{errors.forgotEmail}</p>
                  )}
                </div>

                <Button
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className="w-full pill-button cta-button"
                >
                  {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
                </Button>

                <div className="text-center">
                  <Button
                    variant="link"
                    onClick={handleBackToLogin}
                    className="text-sm px-0"
                    style={{color: '#B7410E'}}
                  >
                    ← Back to login
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4" style={{backgroundColor: '#F8F1C1'}}>
                  <Check className="w-8 h-8" style={{color: '#B7410E'}} />
                </div>
                
                <h3 className="text-lg font-medium" style={{color: '#3C3C3C'}}>
                  Check Your Email
                </h3>
                
                <p className="text-sm" style={{color: '#3C3C3C'}}>
                  We've sent password reset instructions to <strong>{forgotEmail}</strong>
                </p>
                
                <div className="p-4 rounded-xl" style={{backgroundColor: '#F8F1C1', border: '1px solid rgba(183, 65, 14, 0.2)'}}>
                  <p className="text-sm" style={{color: '#3C3C3C'}}>
                    <strong>Next steps:</strong>
                  </p>
                  <ul className="text-sm mt-2 space-y-1" style={{color: '#3C3C3C'}}>
                    <li>1. Check your email inbox</li>
                    <li>2. Click the reset link in the email</li>
                    <li>3. Create a new password</li>
                    <li>4. Log in with your new password</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleBackToLogin}
                    className="w-full pill-button"
                    variant="outline"
                    style={{borderColor: '#B7410E', color: '#B7410E'}}
                  >
                    Back to Login
                  </Button>
                  
                  <Button
                    variant="link"
                    onClick={() => {
                      setResetSent(false);
                      setForgotEmail('');
                      setErrors({});
                    }}
                    className="text-sm w-full"
                    style={{color: '#9FA0A0'}}
                  >
                    Didn't receive the email? Try again
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}