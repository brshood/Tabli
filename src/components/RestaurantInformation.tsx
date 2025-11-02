import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Store, MapPin, Phone, Mail, Clock, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { updateRestaurantInfo, getRestaurantInfo, type RestaurantInfo } from '../services/profileApi';

interface RestaurantInformationProps {
  restaurantId: string;
  token: string;
}

export function RestaurantInformation({ restaurantId, token }: RestaurantInformationProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState<'Al Ain' | 'Abu Dhabi' | 'Dubai'>('Al Ain');
  const [cuisine, setCuisine] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [closingHours, setClosingHours] = useState('');
  const [priceRange, setPriceRange] = useState('$$');
  const [description, setDescription] = useState('');

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
      setPhone(restaurant.phone || '');
      setEmail(restaurant.email || '');
      setCity(restaurant.city || 'Al Ain');
      setCuisine(restaurant.cuisine || '');
      setOpeningHours(restaurant.openingHours || '');
      setClosingHours(restaurant.closingHours || '');
      setPriceRange(restaurant.priceRange || '$$');
      setDescription(restaurant.description || '');
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
          phone,
          email,
          city,
          cuisine,
          openingHours,
          closingHours,
          priceRange,
          description,
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
    </Card>
  );
}

