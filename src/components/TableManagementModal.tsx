import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, Minus, Table as TableIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface TableData {
  id: number;
  tableName: string;
  capacity: number;
  isOccupied: boolean;
}

interface TableManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTable: (tableName: string, capacity: number) => void;
  existingTables: TableData[];
}

export function TableManagementModal({ isOpen, onClose, onAddTable, existingTables }: TableManagementModalProps) {
  const [tableName, setTableName] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTableName('');
      setCapacity(4);
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!tableName.trim()) {
      newErrors.tableName = 'Table name is required';
    } else if (tableName.trim().length < 2) {
      newErrors.tableName = 'Table name must be at least 2 characters';
    } else {
      // Check if table name already exists
      const tableExists = existingTables.some(
        table => table.tableName.toLowerCase() === tableName.trim().toLowerCase()
      );
      if (tableExists) {
        newErrors.tableName = 'A table with this name already exists';
      }
    }

    if (capacity < 1 || capacity > 20) {
      newErrors.capacity = 'Capacity must be between 1 and 20';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onAddTable(tableName.trim(), capacity);
    toast.success(`${tableName.trim()} (capacity ${capacity}) has been added`);
    onClose();
  };

  const adjustCapacity = (delta: number) => {
    const newCapacity = Math.max(1, Math.min(20, capacity + delta));
    setCapacity(newCapacity);
  };

  const isFormValid = () => {
    return tableName.trim().length >= 2 && 
           capacity >= 1 && 
           capacity <= 20 && 
           !existingTables.some(table => 
             table.tableName.toLowerCase() === tableName.trim().toLowerCase()
           );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4" style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}>
        <DialogHeader>
          <DialogTitle className="flex items-center" style={{color: '#3C3C3C'}}>
            <TableIcon className="h-5 w-5 mr-2" />
            Add New Table
          </DialogTitle>
          <DialogDescription style={{color: '#3C3C3C'}}>
            Create a new table for your restaurant with a custom name and seating capacity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Table Name */}
          <div className="space-y-2">
            <Label htmlFor="tableName" style={{color: '#3C3C3C'}}>Table Name</Label>
            <Input
              id="tableName"
              type="text"
              placeholder="e.g., Table 1, Corner Booth, Patio A"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="bg-input-background"
              style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
            />
            {errors.tableName && (
              <p className="text-sm text-red-600">{errors.tableName}</p>
            )}
          </div>

          {/* Seating Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity" style={{color: '#3C3C3C'}}>Seating Capacity</Label>
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => adjustCapacity(-1)}
                disabled={capacity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[3rem]">
                <span className="text-lg font-medium" style={{color: '#3C3C3C'}}>{capacity}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => adjustCapacity(1)}
                disabled={capacity >= 20}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500">Maximum number of guests this table can seat</p>
            {errors.capacity && (
              <p className="text-sm text-red-600">{errors.capacity}</p>
            )}
          </div>

          {/* Summary */}
          <div className="p-4 rounded-lg" style={{backgroundColor: '#F8F1C1'}}>
            <p className="text-sm" style={{color: '#3C3C3C'}}>
              <strong>Preview:</strong> "{tableName || 'Table Name'}" will be added with a capacity of {capacity} guests.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 pill-button"
              style={{borderColor: 'rgba(60, 60, 60, 0.3)', color: '#3C3C3C'}}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className="flex-1 pill-button cta-button"
            >
              Add Table
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}