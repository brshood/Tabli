import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Upload, Image, Menu, Settings, Save, X, Lock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useRestaurant } from './RestaurantContext';

interface RestaurantSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const cuisineOptions = [
  'Italian', 'Asian', 'Pizza', 'Café', 'Healthy', 'Seafood', 'BBQ', 'Mexican', 'Indian', 'Chinese', 'Japanese', 'Lebanese', 'French', 'American'
];

const cityOptions: ('Al Ain' | 'Abu Dhabi' | 'Dubai')[] = ['Al Ain', 'Abu Dhabi', 'Dubai'];

export function RestaurantSettingsModal({ isOpen, onClose }: RestaurantSettingsModalProps) {
  const { currentRestaurant, updateRestaurant } = useRestaurant();
  const [activeTab, setActiveTab] = useState('profile');
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    category: '',
    description: '',
    price: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSaveSettings = () => {
    // Update the restaurant data in context
    updateRestaurant({
      name: currentRestaurant.name,
      city: currentRestaurant.city,
      cuisine: currentRestaurant.cuisine,
      phone: currentRestaurant.phone,
      email: currentRestaurant.email,
      description: currentRestaurant.description,
      coverImage: currentRestaurant.coverImage,
      menu: currentRestaurant.menu,
      priceRange: currentRestaurant.priceRange,
      openingHours: currentRestaurant.openingHours,
      closingHours: currentRestaurant.closingHours
    });
    
    toast.success('Restaurant settings saved successfully! Changes are now visible to customers.');
    onClose();
  };

  const handlePasswordChange = () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }
    
    // In a real app, you'd validate the current password with the backend
    toast.success('Password changed successfully!');
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleCoverImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you'd upload to a server and get back a URL
      const reader = new FileReader();
      reader.onload = (e) => {
        updateRestaurant({
          coverImage: e.target?.result as string
        });
      };
      reader.readAsDataURL(file);
      toast.success('Cover image uploaded successfully!');
    }
  };

  const handleAddMenuItem = () => {
    if (newMenuItem.name && newMenuItem.category && newMenuItem.price) {
      updateRestaurant({
        menu: [...currentRestaurant.menu, newMenuItem]
      });
      setNewMenuItem({ name: '', category: '', description: '', price: '' });
      toast.success('Menu item added successfully!');
    } else {
      toast.error('Please fill in all required fields');
    }
  };

  const handleRemoveMenuItem = (index: number) => {
    updateRestaurant({
      menu: currentRestaurant.menu.filter((_, i) => i !== index)
    });
    toast.success('Menu item removed');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{backgroundColor: '#F3E5AB'}}>
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center" style={{color: '#3C3C3C'}}>
            <Settings className="h-6 w-6 mr-2" style={{color: '#B7410E'}} />
            Restaurant Settings
          </DialogTitle>
          <DialogDescription style={{color: '#3C3C3C'}}>
            Manage your restaurant profile, cover image, menu, and general settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="profile" className="flex items-center">
              <Settings className="h-4 w-4 mr-1" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="cover" className="flex items-center">
              <Image className="h-4 w-4 mr-1" />
              Cover Image
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center">
              <Menu className="h-4 w-4 mr-1" />
              Menu
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Lock className="h-4 w-4 mr-1" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Restaurant Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="border-0 rounded-2xl card-shadow">
              <CardHeader>
                <CardTitle style={{color: '#3C3C3C'}}>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" style={{color: '#3C3C3C'}}>Restaurant Name</Label>
                    <Input
                      id="name"
                      value={currentRestaurant.name}
                      onChange={(e) => updateRestaurant({ name: e.target.value })}
                      className="rounded-xl"
                      style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city" style={{color: '#3C3C3C'}}>City</Label>
                    <Select 
                      value={currentRestaurant.city} 
                      onValueChange={(value: 'Al Ain' | 'Abu Dhabi' | 'Dubai') => updateRestaurant({ city: value })}
                    >
                      <SelectTrigger className="rounded-xl" style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent style={{backgroundColor: '#F3E5AB'}}>
                        {cityOptions.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cuisine" style={{color: '#3C3C3C'}}>Cuisine Type</Label>
                    <Select 
                      value={currentRestaurant.cuisine} 
                      onValueChange={(value) => updateRestaurant({ cuisine: value })}
                    >
                      <SelectTrigger className="rounded-xl" style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}>
                        <SelectValue placeholder="Select cuisine type" />
                      </SelectTrigger>
                      <SelectContent style={{backgroundColor: '#F3E5AB'}}>
                        {cuisineOptions.map((cuisine) => (
                          <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priceRange" style={{color: '#3C3C3C'}}>Price Range</Label>
                    <Select 
                      value={currentRestaurant.priceRange} 
                      onValueChange={(value) => updateRestaurant({ priceRange: value })}
                    >
                      <SelectTrigger className="rounded-xl" style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}>
                        <SelectValue placeholder="Select price range" />
                      </SelectTrigger>
                      <SelectContent style={{backgroundColor: '#F3E5AB'}}>
                        <SelectItem value="$">$ - Budget Friendly</SelectItem>
                        <SelectItem value="$">$ - Moderate</SelectItem>
                        <SelectItem value="$$">$$ - Upscale</SelectItem>
                        <SelectItem value="$$">$$ - Fine Dining</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" style={{color: '#3C3C3C'}}>Description</Label>
                  <Textarea
                    id="description"
                    value={currentRestaurant.description}
                    onChange={(e) => updateRestaurant({ description: e.target.value })}
                    className="rounded-xl"
                    style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                    rows={3}
                    placeholder="Tell customers about your restaurant..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 rounded-2xl card-shadow">
              <CardHeader>
                <CardTitle style={{color: '#3C3C3C'}}>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" style={{color: '#3C3C3C'}}>Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={currentRestaurant.phone}
                      onChange={(e) => updateRestaurant({ phone: e.target.value })}
                      className="rounded-xl"
                      style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" style={{color: '#3C3C3C'}}>Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={currentRestaurant.email}
                      onChange={(e) => updateRestaurant({ email: e.target.value })}
                      className="rounded-xl"
                      style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                      placeholder="restaurant@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="openingHours" style={{color: '#3C3C3C'}}>Opening Time</Label>
                    <Input
                      id="openingHours"
                      type="time"
                      value={currentRestaurant.openingHours}
                      onChange={(e) => updateRestaurant({ openingHours: e.target.value })}
                      className="rounded-xl"
                      style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                    />
                  </div>
                  <div>
                    <Label htmlFor="closingHours" style={{color: '#3C3C3C'}}>Closing Time</Label>
                    <Input
                      id="closingHours"
                      type="time"
                      value={currentRestaurant.closingHours}
                      onChange={(e) => updateRestaurant({ closingHours: e.target.value })}
                      className="rounded-xl"
                      style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cover Image Tab */}
          <TabsContent value="cover" className="space-y-6">
            <Card className="border-0 rounded-2xl card-shadow">
              <CardHeader>
                <CardTitle style={{color: '#3C3C3C'}}>Restaurant Cover Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentRestaurant.coverImage ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={currentRestaurant.coverImage}
                        alt="Restaurant cover"
                        className="w-full h-64 object-cover rounded-2xl card-shadow"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateRestaurant({ coverImage: null })}
                        className="absolute top-4 right-4 pill-button"
                        style={{backgroundColor: '#F3E5AB', borderColor: '#D77A61', color: '#D77A61'}}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:border-solid transition-all"
                    style={{borderColor: 'rgba(183, 65, 14, 0.3)', backgroundColor: '#F8F1C1'}}
                    onClick={() => document.getElementById('cover-upload')?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4" style={{color: '#B7410E'}} />
                    <h3 className="text-lg font-medium mb-2" style={{color: '#3C3C3C'}}>Upload Cover Image</h3>
                    <p style={{color: '#3C3C3C'}}>Click to browse or drag and drop your restaurant's cover photo</p>
                    <p className="text-sm mt-2" style={{color: '#9FA0A0'}}>Recommended: 1200x600px, JPG or PNG</p>
                  </div>
                )}

                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleCoverImageUpload}
                  className="hidden"
                />

                <div className="flex justify-center">
                  <Button
                    onClick={() => document.getElementById('cover-upload')?.click()}
                    className="pill-button"
                    style={{backgroundColor: '#B7410E', color: 'white'}}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {currentRestaurant.coverImage ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Menu Tab */}
          <TabsContent value="menu" className="space-y-6">
            <Card className="border-0 rounded-2xl card-shadow">
              <CardHeader>
                <CardTitle style={{color: '#3C3C3C'}}>Menu Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Menu Item */}
                <div className="p-4 rounded-2xl" style={{backgroundColor: '#F8F1C1', border: '2px dashed rgba(183, 65, 14, 0.3)'}}>
                  <h4 className="font-medium mb-4" style={{color: '#3C3C3C'}}>Add New Menu Item</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label style={{color: '#3C3C3C'}}>Item Name</Label>
                      <Input
                        value={newMenuItem.name}
                        onChange={(e) => setNewMenuItem(prev => ({...prev, name: e.target.value}))}
                        className="rounded-xl"
                        style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                        placeholder="e.g. Margherita Pizza"
                      />
                    </div>
                    <div>
                      <Label style={{color: '#3C3C3C'}}>Category</Label>
                      <Input
                        value={newMenuItem.category}
                        onChange={(e) => setNewMenuItem(prev => ({...prev, category: e.target.value}))}
                        className="rounded-xl"
                        style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                        placeholder="e.g. Pizza, Salads, Desserts"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label style={{color: '#3C3C3C'}}>Description</Label>
                    <Textarea
                      value={newMenuItem.description}
                      onChange={(e) => setNewMenuItem(prev => ({...prev, description: e.target.value}))}
                      className="rounded-xl"
                      style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                      placeholder="Brief description of the dish"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label style={{color: '#3C3C3C'}}>Price (AED)</Label>
                      <Input
                        type="number"
                        value={newMenuItem.price}
                        onChange={(e) => setNewMenuItem(prev => ({...prev, price: e.target.value}))}
                        className="rounded-xl"
                        style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleAddMenuItem}
                        className="pill-button"
                        style={{backgroundColor: '#B7410E', color: 'white'}}
                      >
                        Add Item
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Current Menu Items */}
                <div className="space-y-4">
                  <h4 className="font-medium" style={{color: '#3C3C3C'}}>Current Menu ({currentRestaurant.menu.length} items)</h4>
                  {currentRestaurant.menu.map((item, index) => (
                    <div key={index} className="p-4 rounded-2xl border" style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(183, 65, 14, 0.2)'}}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium" style={{color: '#3C3C3C'}}>{item.name}</h5>
                            <Badge className="text-xs" style={{backgroundColor: '#E8934F', color: '#B7410E'}}>
                              {item.category}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm mb-2" style={{color: '#3C3C3C'}}>{item.description}</p>
                          )}
                          <p className="font-medium" style={{color: '#B7410E'}}>AED {item.price}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMenuItem(index)}
                          className="pill-button"
                          style={{borderColor: '#D77A61', color: '#D77A61'}}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {currentRestaurant.menu.length === 0 && (
                    <div className="text-center py-8" style={{color: '#9FA0A0'}}>
                      <Menu className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No menu items added yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border-0 rounded-2xl card-shadow">
              <CardHeader>
                <CardTitle style={{color: '#3C3C3C'}}>Change Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword" style={{color: '#3C3C3C'}}>Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
                    className="rounded-xl"
                    style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                    placeholder="Enter your current password"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="newPassword" style={{color: '#3C3C3C'}}>New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                      className="rounded-xl"
                      style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" style={{color: '#3C3C3C'}}>Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({...prev, confirmPassword: e.target.value}))}
                      className="rounded-xl"
                      style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl" style={{backgroundColor: '#F8F1C1', border: '1px solid rgba(183, 65, 14, 0.2)'}}>
                  <h5 className="font-medium mb-2" style={{color: '#3C3C3C'}}>Password Requirements:</h5>
                  <ul className="text-sm space-y-1" style={{color: '#3C3C3C'}}>
                    <li>• At least 6 characters long</li>
                    <li>• Must contain both letters and numbers</li>
                    <li>• Cannot be the same as your current password</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handlePasswordChange}
                    className="pill-button"
                    style={{backgroundColor: '#B7410E', color: 'white'}}
                    disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t" style={{borderColor: 'rgba(183, 65, 14, 0.2)'}}>
          <Button
            variant="outline"
            onClick={onClose}
            className="pill-button"
            style={{borderColor: '#9FA0A0', color: '#9FA0A0'}}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveSettings}
            className="pill-button"
            style={{backgroundColor: '#B7410E', color: 'white'}}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}