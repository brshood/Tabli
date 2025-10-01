import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Menu, X, Star } from 'lucide-react';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  restaurantRating: number;
}

// Mock menu data - in a real app this would come from the restaurant's settings
const mockMenuData = {
  categories: {
    'Pizza': [
      { name: 'Margherita Pizza', description: 'Fresh tomatoes, mozzarella, and basil', price: 'AED 18' },
      { name: 'Pepperoni Pizza', description: 'Classic pepperoni with mozzarella cheese', price: 'AED 22' },
      { name: 'Quattro Stagioni', description: 'Four seasons pizza with mixed toppings', price: 'AED 26' }
    ],
    'Salads': [
      { name: 'Caesar Salad', description: 'Crisp romaine, parmesan, and house-made croutons', price: 'AED 14' },
      { name: 'Greek Salad', description: 'Fresh vegetables with feta cheese and olives', price: 'AED 16' },
      { name: 'Caprese Salad', description: 'Fresh mozzarella, tomatoes, and basil', price: 'AED 18' }
    ],
    'Pasta': [
      { name: 'Spaghetti Carbonara', description: 'Classic carbonara with pancetta and egg', price: 'AED 24' },
      { name: 'Penne Arrabbiata', description: 'Spicy tomato sauce with garlic and chili', price: 'AED 20' },
      { name: 'Fettuccine Alfredo', description: 'Creamy white sauce with parmesan', price: 'AED 22' }
    ],
    'Desserts': [
      { name: 'Tiramisu', description: 'Classic Italian coffee-flavored dessert', price: 'AED 12' },
      { name: 'Panna Cotta', description: 'Silky smooth vanilla custard with berry sauce', price: 'AED 10' },
      { name: 'Gelato', description: 'Authentic Italian gelato - various flavors', price: 'AED 8' }
    ]
  }
};

export function MenuModal({ isOpen, onClose, restaurantName, restaurantRating }: MenuModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{backgroundColor: '#F3E5AB'}}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl flex items-center" style={{color: '#3C3C3C'}}>
                <Menu className="h-6 w-6 mr-2" style={{color: '#B7410E'}} />
                {restaurantName} Menu
              </DialogTitle>
              <div className="flex items-center mt-2">
                <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                <span className="text-sm font-medium" style={{color: '#3C3C3C'}}>{restaurantRating}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="pill-button"
              style={{borderColor: '#9FA0A0', color: '#9FA0A0'}}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription style={{color: '#3C3C3C'}}>
            Browse our delicious menu items and their prices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 mt-6">
          {Object.entries(mockMenuData.categories).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center mb-4">
                <Badge 
                  className="px-4 py-2 rounded-full text-lg font-medium"
                  style={{backgroundColor: '#B7410E', color: 'white'}}
                >
                  {category}
                </Badge>
              </div>
              
              <div className="grid gap-4">
                {items.map((item, index) => (
                  <Card key={index} className="border-0 rounded-2xl card-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1" style={{color: '#3C3C3C'}}>{item.name}</h4>
                          <p className="text-sm mb-2" style={{color: '#3C3C3C'}}>{item.description}</p>
                        </div>
                        <div className="ml-4">
                          <span className="font-bold" style={{color: '#B7410E'}}>{item.price}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-6 border-t mt-8" style={{borderColor: 'rgba(183, 65, 14, 0.2)'}}>
          <Button
            onClick={onClose}
            className="pill-button"
            style={{backgroundColor: '#B7410E', color: 'white'}}
          >
            Close Menu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}