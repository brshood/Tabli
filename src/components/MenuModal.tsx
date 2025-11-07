import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Menu, X, Star } from 'lucide-react';

interface MenuItem {
  name: string;
  category: string;
  description?: string;
  price: string;
}

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  restaurantRating: number;
  restaurantId?: string; // Optional: if provided, will fetch menu from API
  menu?: MenuItem[]; // Optional: if provided, will use this instead of fetching
}

export function MenuModal({ isOpen, onClose, restaurantName, restaurantRating, restaurantId, menu: propMenu }: MenuModalProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const [menu, setMenu] = useState<MenuItem[]>(propMenu || []);
  const [loading, setLoading] = useState(false);

  // Fetch menu when modal opens if restaurantId is provided and menu prop is not
  useEffect(() => {
    if (isOpen && restaurantId && !propMenu) {
      loadMenu();
    } else if (propMenu) {
      setMenu(propMenu);
    } else if (!isOpen) {
      setMenu([]);
    }
  }, [isOpen, restaurantId, propMenu]);

  const loadMenu = async () => {
    if (!restaurantId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/menus/${restaurantId}`);
      if (!res.ok) {
        setMenu([]);
        return;
      }
      const data = await res.json();
      setMenu(data.menu?.items || []);
    } catch (error) {
      console.error('Error loading menu:', error);
      setMenu([]);
    } finally {
      setLoading(false);
    }
  };

  // Group menu items by category
  const menuByCategory = menu.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const categories = Object.keys(menuByCategory);
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden" style={{backgroundColor: '#F3E5AB'}}>
        <DialogHeader>
          <div>
            <DialogTitle className="text-2xl flex items-center" style={{color: '#2D2D2B'}}>
              <Menu className="h-6 w-6 mr-2" style={{color: '#5A5E3E'}} />
              {restaurantName} Menu
            </DialogTitle>
            <div className="flex items-center mt-2">
              <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
              <span className="text-sm font-medium" style={{color: '#2D2D2B'}}>{restaurantRating}</span>
            </div>
          </div>
          <DialogDescription style={{color: '#2D2D2B'}}>
            Browse our delicious menu items and their prices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 mt-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium" style={{color: '#2D2D2B'}}>Loading menu...</p>
            </div>
          ) : categories.length > 0 ? (
            categories.map((category) => (
              <div key={category}>
                <div className="flex items-center mb-4">
                  <Badge 
                    className="px-4 py-2 rounded-full text-lg font-medium"
                    style={{backgroundColor: '#3F4427', color: 'white'}}
                  >
                    {category}
                  </Badge>
                </div>
                
                <div className="grid gap-4">
                  {menuByCategory[category].map((item, index) => (
                    <Card key={index} className="border-0 rounded-2xl card-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1" style={{color: '#2D2D2B'}}>{item.name}</h4>
                            {item.description && (
                              <p className="text-sm mb-2" style={{color: '#2D2D2B'}}>{item.description}</p>
                            )}
                          </div>
                          <div className="ml-4">
                            <span className="font-bold" style={{color: '#5A5E3E'}}>
                              {item.price.startsWith('AED') ? item.price : `AED ${item.price}`}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Menu className="h-16 w-16 mx-auto mb-4 opacity-30" style={{color: '#5A5E3E'}} />
              <p className="text-lg font-medium" style={{color: '#2D2D2B'}}>No menu items available</p>
              <p className="text-sm mt-2" style={{color: '#5A5E3E'}}>This restaurant hasn't added menu items yet.</p>
            </div>
          )}
        </div>

        <div className="flex justify-center pt-6 border-t mt-8" style={{borderColor: 'rgba(183, 65, 14, 0.2)'}}>
          <Button
            onClick={onClose}
            className="pill-button"
            style={{backgroundColor: '#3F4427', color: 'white'}}
          >
            Close Menu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}