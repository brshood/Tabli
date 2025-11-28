import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Menu, X, Star, FileText, Image as ImageIcon, ExternalLink, Download } from 'lucide-react';

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

interface MenuDocument {
  fileId: string;
  filename: string;
  contentType: string;
  type: 'image' | 'pdf';
  menuType: string;
}

export function MenuModal({ isOpen, onClose, restaurantName, restaurantRating, restaurantId, menu: propMenu }: MenuModalProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const [menu, setMenu] = useState<MenuItem[]>(propMenu || []);
  const [menuDocuments, setMenuDocuments] = useState<MenuDocument[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch menu when modal opens if restaurantId is provided and menu prop is not
  useEffect(() => {
    if (isOpen && restaurantId && !propMenu) {
      loadMenu();
    } else if (propMenu) {
      setMenu(propMenu);
      setMenuDocuments([]); // Reset documents when using prop menu
    } else if (!isOpen) {
      setMenu([]);
      setMenuDocuments([]);
    }
  }, [isOpen, restaurantId, propMenu]);

  const loadMenu = async () => {
    if (!restaurantId) {
      console.warn('MenuModal: No restaurantId provided');
      setMenu([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/menus/${restaurantId}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          // Menu doesn't exist yet - this is okay, show empty state
          console.log('MenuModal: Menu not found for restaurant', restaurantId);
          setMenu([]);
        } else {
          console.error('MenuModal: Failed to load menu', res.status, res.statusText);
          setMenu([]);
        }
        return;
      }
      
      const data = await res.json();
      const menuItems = data.menu?.items || [];
      const documents = data.menuDocuments || [];
      
      // Validate menu items have required fields
      const validMenuItems = menuItems.filter((item: any) => 
        item && item.name && item.category && item.price
      );
      
      setMenu(validMenuItems);
      setMenuDocuments(documents);
      
      if (validMenuItems.length !== menuItems.length) {
        console.warn('MenuModal: Filtered out invalid menu items');
      }
    } catch (error) {
      console.error('MenuModal: Error loading menu:', error);
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
          ) : (
            <>
              {/* Show menu documents (PDFs/images) if available */}
              {menuDocuments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4" style={{color: '#2D2D2B'}}>Menu Documents</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menuDocuments.map((doc) => (
                      <Card key={doc.fileId} className="border-0 rounded-2xl card-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              {doc.type === 'pdf' ? (
                                <FileText className="h-8 w-8" style={{color: '#5A5E3E'}} />
                              ) : (
                                <ImageIcon className="h-8 w-8" style={{color: '#5A5E3E'}} />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold mb-1 truncate" style={{color: '#2D2D2B'}}>
                                  {doc.menuType ? doc.menuType.charAt(0).toUpperCase() + doc.menuType.slice(1) + ' Menu' : 'Menu'}
                                </h4>
                                <p className="text-xs text-gray-500 truncate">{doc.filename}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const url = `${API_URL}/media/${doc.fileId}`;
                                window.open(url, '_blank');
                              }}
                              className="ml-2"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Show menu items if available */}
              {categories.length > 0 && (
                <div className={menuDocuments.length > 0 ? "mt-8 pt-8 border-t" : ""} style={menuDocuments.length > 0 ? {borderColor: 'rgba(183, 65, 14, 0.2)'} : {}}>
                  {menuDocuments.length > 0 && (
                    <h3 className="text-xl font-semibold mb-4" style={{color: '#2D2D2B'}}>Menu Items</h3>
                  )}
                  {categories.map((category) => (
                    <div key={category} className="mb-6">
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
                  ))}
                </div>
              )}
              
              {/* Show empty state if no documents and no menu items */}
              {menuDocuments.length === 0 && categories.length === 0 && (
                <div className="text-center py-12">
                  <Menu className="h-16 w-16 mx-auto mb-4 opacity-30" style={{color: '#5A5E3E'}} />
                  <p className="text-lg font-medium" style={{color: '#2D2D2B'}}>No menu available</p>
                  <p className="text-sm mt-2" style={{color: '#5A5E3E'}}>This restaurant hasn't uploaded a menu yet.</p>
                </div>
              )}
            </>
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