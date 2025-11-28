import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Store, MapPin, Phone, Mail, Clock, DollarSign, FileText, Plus, Trash2, Link2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { updateRestaurantInfo, getRestaurantInfo, type RestaurantInfo, deleteRestaurantAccount } from '../services/profileApi';

interface RestaurantInformationProps {
  restaurantId: string;
  token: string;
  onRestaurantDeleted?: () => void;
}

export function RestaurantInformation({ restaurantId, token, onRestaurantDeleted }: RestaurantInformationProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState<'Al Ain' | 'Abu Dhabi' | 'Dubai'>('Al Ain');
  const [cuisine, setCuisine] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [closingHours, setClosingHours] = useState('');
  const [priceRange, setPriceRange] = useState('$$');
  const [description, setDescription] = useState('');
  const [featuredItems, setFeaturedItems] = useState<Array<{ name: string; description: string; price: string }>>([]);

  useEffect(() => {
    loadRestaurantInfo();
  }, [restaurantId]);

  const loadRestaurantInfo = async () => {
    try {
      setLoading(true);
      const result = await getRestaurantInfo(restaurantId);
      const restaurant = result.item;
      
      setName(restaurant.name || '');
      setAddress(restaurant.address || '');
      setLocationUrl(restaurant.locationUrl || '');
      setPhone(restaurant.phone || '');
      setEmail(restaurant.email || '');
      setCity(restaurant.city || 'Al Ain');
      setCuisine(restaurant.cuisine || '');
      setOpeningHours(restaurant.openingHours || '');
      setClosingHours(restaurant.closingHours || '');
      setPriceRange(restaurant.priceRange || '$$');
      setDescription(restaurant.description || '');
      setFeaturedItems(
        (restaurant.featuredMenuItems || []).map((item: any) => ({
          name: item.name || '',
          description: item.description || '',
          price: item.price || '',
        }))
      );
    } catch (error: any) {
      toast.error(error.message || 'Failed to load restaurant information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Restaurant name is required');
      return;
    }

    try {
      setSaving(true);
      await updateRestaurantInfo(
        restaurantId,
        {
          name,
          address,
          locationUrl: locationUrl.trim() ? locationUrl.trim() : null,
          phone,
          email,
          city,
          cuisine,
          openingHours,
          closingHours,
          priceRange,
          description,
          featuredMenuItems: featuredItems
            .filter((item) => item.name.trim())
            .map((item) => ({
              name: item.name.trim(),
              description: item.description.trim(),
              price: item.price.trim(),
            })),
        },
        token
      );
      toast.success('Restaurant information updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update restaurant information');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRestaurant = async () => {
    try {
      setDeleting(true);
      await deleteRestaurantAccount(restaurantId, token);
      toast.success('Restaurant profile deleted');
      onRestaurantDeleted?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete restaurant');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#B7410E' }}></div>
          <p style={{ color: '#2D2D2B' }}>Loading restaurant information...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="card-shadow border-0 rounded-3xl">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center" style={{ color: '#2D2D2B' }}>
          <Store className="h-6 w-6 mr-2" style={{ color: '#5A5E3E' }} />
          Restaurant Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="restaurantName" style={{ color: '#2D2D2B' }}>Restaurant Name *</Label>
            <Input
              id="restaurantName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter restaurant name"
              style={{ 
                borderColor: 'rgba(90, 94, 62, 0.3)',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city" style={{ color: '#2D2D2B' }}>City *</Label>
            <Select value={city} onValueChange={(value: any) => setCity(value)}>
              <SelectTrigger 
                id="city"
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Al Ain">Al Ain</SelectItem>
                <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                <SelectItem value="Dubai">Dubai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" style={{ color: '#2D2D2B' }}>Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#5A5E3E' }} />
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter restaurant address"
              className="pl-10"
              style={{ 
                borderColor: 'rgba(90, 94, 62, 0.3)',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationUrl" style={{ color: '#2D2D2B' }}>Location Link</Label>
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#5A5E3E' }} />
            <Input
              id="locationUrl"
              type="url"
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="pl-10"
              style={{ 
                borderColor: 'rgba(90, 94, 62, 0.3)',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Share a Google Maps or website link so guests can navigate to your restaurant with one tap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" style={{ color: '#2D2D2B' }}>Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#5A5E3E' }} />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="pl-10"
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="restaurantEmail" style={{ color: '#2D2D2B' }}>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#5A5E3E' }} />
              <Input
                id="restaurantEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter restaurant email"
                className="pl-10"
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cuisine" style={{ color: '#2D2D2B' }}>Cuisine Type</Label>
            <Input
              id="cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="e.g., Italian, Asian, Pizza"
              style={{ 
                borderColor: 'rgba(90, 94, 62, 0.3)',
                backgroundColor: '#FFFFFF'
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceRange" style={{ color: '#2D2D2B' }}>Price Range</Label>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger 
                id="priceRange"
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <SelectValue placeholder="Select price range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="$">$ (Budget)</SelectItem>
                <SelectItem value="$$">$$ (Moderate)</SelectItem>
                <SelectItem value="$$$">$$$ (Upscale)</SelectItem>
                <SelectItem value="$$$$">$$$$ (Fine Dining)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="openingHours" style={{ color: '#2D2D2B' }}>Opening Hours</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#5A5E3E' }} />
              <Input
                id="openingHours"
                type="time"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                className="pl-10"
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="closingHours" style={{ color: '#2D2D2B' }}>Closing Hours</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#5A5E3E' }} />
              <Input
                id="closingHours"
                type="time"
                value={closingHours}
                onChange={(e) => setClosingHours(e.target.value)}
                className="pl-10"
                style={{ 
                  borderColor: 'rgba(90, 94, 62, 0.3)',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" style={{ color: '#2D2D2B' }}>Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell customers about your restaurant..."
            rows={4}
            style={{ 
              borderColor: 'rgba(90, 94, 62, 0.3)',
              backgroundColor: '#FFFFFF'
            }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label style={{ color: '#2D2D2B' }}>Featured Menu Items</Label>
            <Button
              type="button"
              variant="outline"
              className="pill-button"
              style={{ borderColor: 'rgba(90, 94, 62, 0.3)', color: '#2D2D2B' }}
              onClick={() => {
                if (featuredItems.length >= 6) {
                  toast.error('You can highlight up to 6 featured items.');
                  return;
                }
                setFeaturedItems([...featuredItems, { name: '', description: '', price: '' }]);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Featured Item
            </Button>
          </div>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Highlight signature dishes to display on your public profile. Leave the list empty if you don’t want to feature specific items.
          </p>
          <div className="space-y-4">
            {featuredItems.length === 0 && (
              <div className="p-4 rounded-xl border" style={{ borderColor: 'rgba(90, 94, 62, 0.2)', backgroundColor: '#F9FAFB' }}>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  No featured items yet. Use the “Add Featured Item” button to showcase your signature dishes.
                </p>
              </div>
            )}
            {featuredItems.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border space-y-3"
                style={{ borderColor: 'rgba(90, 94, 62, 0.2)', backgroundColor: '#FFFFFF' }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold" style={{ color: '#2D2D2B' }}>
                    Featured Item #{index + 1}
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setFeaturedItems(featuredItems.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label style={{ color: '#2D2D2B' }}>Item name *</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => {
                        const updated = [...featuredItems];
                        updated[index] = { ...updated[index], name: e.target.value };
                        setFeaturedItems(updated);
                      }}
                      placeholder="e.g. Truffle Risotto"
                      style={{ borderColor: 'rgba(90, 94, 62, 0.3)', backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label style={{ color: '#2D2D2B' }}>Price</Label>
                    <Input
                      value={item.price}
                      onChange={(e) => {
                        const updated = [...featuredItems];
                        updated[index] = { ...updated[index], price: e.target.value };
                        setFeaturedItems(updated);
                      }}
                      placeholder="e.g. AED 75"
                      style={{ borderColor: 'rgba(90, 94, 62, 0.3)', backgroundColor: '#FFFFFF' }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label style={{ color: '#2D2D2B' }}>Short description</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...featuredItems];
                      updated[index] = { ...updated[index], description: e.target.value };
                      setFeaturedItems(updated);
                    }}
                    placeholder="What makes this item special?"
                    style={{ borderColor: 'rgba(90, 94, 62, 0.3)', backgroundColor: '#FFFFFF' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="pill-button text-white"
            style={{ backgroundColor: '#3F4427' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
      <div className="border rounded-2xl p-6 mt-8" style={{ borderColor: 'rgba(183, 65, 14, 0.2)', backgroundColor: '#FFFBF5' }}>
        <div className="flex items-center mb-4">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
          <h3 className="text-lg font-semibold" style={{ color: '#B7410E' }}>Danger zone</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: '#9B2C2C' }}>
          Deleting your restaurant will permanently remove your data, reservations, documents, and staff accounts. This action cannot be undone.
        </p>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive">
              Delete restaurant profile
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete restaurant profile?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove your restaurant, reservations, documents, media, and staff logins. You will need to sign up again and go through approval to return to Tabli.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRestaurant} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete restaurant'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}

