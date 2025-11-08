import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Menu, X, Plus, Edit2, Save } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface MenuManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId?: string; // Restaurant ID from staffAuth
}

interface MenuItem {
  name: string;
  category: string;
  description?: string;
  price: string;
}

export function MenuManagementModal({ isOpen, onClose, restaurantId }: MenuManagementModalProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMenuItem, setNewMenuItem] = useState<MenuItem>({
    name: '',
    category: '',
    description: '',
    price: ''
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editMenuItem, setEditMenuItem] = useState<MenuItem>({
    name: '',
    category: '',
    description: '',
    price: ''
  });

  const loadMenu = async () => {
    if (!restaurantId) return;
    
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/menus/${restaurantId}`);
      if (!res.ok) {
        // If menu doesn't exist, start with empty array
        setMenuItems([]);
        return;
      }
      const data = await res.json();
      setMenuItems(data.menu?.items || []);
    } catch (error) {
      console.error('Error loading menu:', error);
      toast.error('Failed to load menu');
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Load menu when modal opens
  useEffect(() => {
    if (isOpen && restaurantId) {
      loadMenu();
    } else if (!isOpen) {
      // Reset form when modal closes
      setNewMenuItem({ name: '', category: '', description: '', price: '' });
      setEditingIndex(null);
      setEditMenuItem({ name: '', category: '', description: '', price: '' });
      setMenuItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, restaurantId]);

  const handleAddMenuItem = () => {
    if (!newMenuItem.name || !newMenuItem.category || !newMenuItem.price) {
      toast.error('Please fill in all required fields (name, category, and price)');
      return;
    }

    setMenuItems([...menuItems, newMenuItem]);
    setNewMenuItem({ name: '', category: '', description: '', price: '' });
    toast.success('Menu item added successfully!');
  };

  const handleEditMenuItem = (index: number) => {
    const item = menuItems[index];
    setEditingIndex(index);
    setEditMenuItem({ ...item });
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    
    if (!editMenuItem.name || !editMenuItem.category || !editMenuItem.price) {
      toast.error('Please fill in all required fields (name, category, and price)');
      return;
    }

    const updatedMenu = [...menuItems];
    updatedMenu[editingIndex] = editMenuItem;
    setMenuItems(updatedMenu);
    
    setEditingIndex(null);
    setEditMenuItem({ name: '', category: '', description: '', price: '' });
    toast.success('Menu item updated successfully!');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditMenuItem({ name: '', category: '', description: '', price: '' });
  };

  const handleRemoveMenuItem = (index: number) => {
    const updatedMenu = menuItems.filter((_, i) => i !== index);
    setMenuItems(updatedMenu);
    toast.success('Menu item removed');
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }
      
      if (!restaurantId) {
        toast.error('Restaurant ID is missing. Please refresh the page.');
        return;
      }

      const res = await fetch(`${API_URL}/menus/${restaurantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: menuItems,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to save menu: ${res.status} ${res.statusText}`);
      }
      
      toast.success('Menu saved successfully! Changes are now visible to customers.');
      onClose();
    } catch (error: any) {
      console.error('Error saving menu:', error);
      toast.error(error.message || 'Failed to save menu. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{backgroundColor: '#F3E5AB'}}>
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center" style={{color: '#2D2D2B'}}>
            <Menu className="h-6 w-6 mr-2" style={{color: '#5A5E3E'}} />
            Menu Management
          </DialogTitle>
          <DialogDescription style={{color: '#2D2D2B'}}>
            Add, edit, or remove items from your restaurant menu.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-0 rounded-2xl card-shadow">
          <CardHeader>
            <CardTitle style={{color: '#2D2D2B'}}>Menu Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Menu Item */}
            <div className="p-4 rounded-2xl" style={{backgroundColor: '#FAF8F2', border: '2px dashed rgba(90, 94, 62, 0.3)'}}>
              <h4 className="font-medium mb-4" style={{color: '#2D2D2B'}}>Add New Menu Item</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <Label style={{color: '#2D2D2B'}}>Item Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={newMenuItem.name}
                    onChange={(e) => setNewMenuItem(prev => ({...prev, name: e.target.value}))}
                    className="rounded-xl"
                    style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                    placeholder="e.g. Margherita Pizza"
                  />
                </div>
                <div>
                  <Label style={{color: '#2D2D2B'}}>Category <span className="text-red-500">*</span></Label>
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
                <Label style={{color: '#2D2D2B'}}>Description</Label>
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
                  <Label style={{color: '#2D2D2B'}}>Price (AED) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={newMenuItem.price}
                    onChange={(e) => setNewMenuItem(prev => ({...prev, price: e.target.value}))}
                    className="rounded-xl"
                    style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAddMenuItem}
                    className="pill-button"
                    style={{backgroundColor: '#3F4427', color: 'white'}}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>
            </div>

            {/* Current Menu Items */}
            <div className="space-y-4">
              <h4 className="font-medium" style={{color: '#2D2D2B'}}>
                Current Menu ({menuItems.length} items)
                {loading && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
              </h4>
              
              {menuItems.map((item, index) => (
                <div key={index} className="p-4 rounded-2xl border" style={{backgroundColor: '#FAF8F2', borderColor: 'rgba(90, 94, 62, 0.2)'}}>
                  {editingIndex === index ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label style={{color: '#2D2D2B'}}>Item Name <span className="text-red-500">*</span></Label>
                          <Input
                            value={editMenuItem.name}
                            onChange={(e) => setEditMenuItem(prev => ({...prev, name: e.target.value}))}
                            className="rounded-xl"
                            style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                          />
                        </div>
                        <div>
                          <Label style={{color: '#2D2D2B'}}>Category <span className="text-red-500">*</span></Label>
                          <Input
                            value={editMenuItem.category}
                            onChange={(e) => setEditMenuItem(prev => ({...prev, category: e.target.value}))}
                            className="rounded-xl"
                            style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                          />
                        </div>
                      </div>
                      <div>
                        <Label style={{color: '#2D2D2B'}}>Description</Label>
                        <Textarea
                          value={editMenuItem.description}
                          onChange={(e) => setEditMenuItem(prev => ({...prev, description: e.target.value}))}
                          className="rounded-xl"
                          style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Label style={{color: '#2D2D2B'}}>Price (AED) <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            value={editMenuItem.price}
                            onChange={(e) => setEditMenuItem(prev => ({...prev, price: e.target.value}))}
                            className="rounded-xl"
                            style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            className="pill-button"
                            style={{backgroundColor: '#3F4427', color: 'white'}}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            className="pill-button"
                            style={{borderColor: '#5B6142', color: '#5B6142'}}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium" style={{color: '#2D2D2B'}}>{item.name}</h5>
                          <Badge className="text-xs" style={{backgroundColor: '#B889A6', color: '#5A5E3E'}}>
                            {item.category}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm mb-2" style={{color: '#2D2D2B'}}>{item.description}</p>
                        )}
                        <p className="font-medium" style={{color: '#5A5E3E'}}>AED {item.price}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditMenuItem(index)}
                          className="pill-button"
                          style={{borderColor: '#5A5E3E', color: '#5A5E3E'}}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
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
                  )}
                </div>
              ))}

              {!loading && menuItems.length === 0 && (
                <div className="text-center py-8" style={{color: '#5B6142'}}>
                  <Menu className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No menu items added yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <DialogFooter className="pt-6 border-t" style={{borderColor: 'rgba(183, 65, 14, 0.2)'}}>
          <Button
            variant="outline"
            onClick={onClose}
            className="pill-button"
            style={{borderColor: '#5B6142', color: '#5B6142'}}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="pill-button"
            style={{backgroundColor: '#3F4427', color: 'white'}}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

