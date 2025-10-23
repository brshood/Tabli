import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Users, Table, Clock, CheckCircle, Phone, X, User, BarChart3, Calendar, FileText, TrendingUp, TrendingDown, LogOut, Plus, Trash2, UserPlus, Settings, AlertCircle } from 'lucide-react';
import { TableManagementModal } from './TableManagementModal';
import { RestaurantSettingsModal } from './RestaurantSettingsModal';
import { QRCodeDisplay } from './QRCodeDisplay';
import { toast } from 'sonner@2.0.3';
import { WaveBackground } from './WaveBackground';
import { notifyTableReady, notifyQueuePositionUpdate } from '../services/NotificationService';

interface StaffDashboardProps {
  onNavigate: (page: 'landing' | 'discover' | 'search' | 'staff') => void;
  staffAuth: {
    isAuthenticated: boolean;
    user: { name: string; email: string } | null;
  };
  onLogout: () => void;
}

const mockWaitlist = [
  { id: 1, name: "Sarah Johnson", partySize: 4, waitTime: "15 min", phone: "(555) 123-4567", joined: "7:30 PM", contactMethod: 'phone' as const, holdTimeExpires: Date.now() + 600000 },
  { id: 2, name: "Mike Chen", partySize: 2, waitTime: "25 min", phone: "(555) 234-5678", joined: "7:45 PM", contactMethod: 'phone' as const, holdTimeExpires: Date.now() + 1200000 },
  { id: 3, name: "Emily Rodriguez", partySize: 6, waitTime: "35 min", phone: "(555) 345-6789", joined: "8:00 PM", contactMethod: 'phone' as const, holdTimeExpires: Date.now() + 1800000 },
  { id: 4, name: "David Kim", partySize: 3, waitTime: "40 min", phone: "(555) 456-7890", joined: "8:15 PM", contactMethod: 'phone' as const, holdTimeExpires: Date.now() + 2400000 },
  { id: 5, name: "Lisa Park", partySize: 2, waitTime: "45 min", phone: "(555) 567-8901", joined: "8:30 PM", contactMethod: 'phone' as const, holdTimeExpires: Date.now() + 3000000 }
];

const mockSeatedTables = [
  { id: 1, table: "Table 5", guests: "John & Maria Martinez", partySize: 2, seatedTime: "7:15 PM", duration: "45 min", capacity: 4 },
  { id: 2, table: "Table 12", guests: "The Wilson Family", partySize: 4, seatedTime: "6:30 PM", duration: "1h 30m", capacity: 6 },
  { id: 3, table: "Table 8", guests: "Alex Thompson", partySize: 1, seatedTime: "7:45 PM", duration: "15 min", capacity: 2 },
  { id: 4, table: "Table 3", guests: "Jennifer & Tom Davis", partySize: 2, seatedTime: "7:00 PM", duration: "1h", capacity: 4 },
  { id: 5, table: "Table 15", guests: "Corporate Party", partySize: 8, seatedTime: "6:00 PM", duration: "2h", capacity: 10 }
];

// Mock available tables (not currently seated)
const mockAvailableTables = [
  { id: 6, tableName: "Table 1", capacity: 4, isOccupied: false },
  { id: 7, tableName: "Table 2", capacity: 2, isOccupied: false },
  { id: 8, tableName: "Corner Booth", capacity: 6, isOccupied: false },
  { id: 9, tableName: "Patio A", capacity: 4, isOccupied: false },
  { id: 10, tableName: "Bar Counter", capacity: 8, isOccupied: false }
];

// Analytics data
const seatedVsWaitingData = [
  { name: 'Mon', seated: 45, waiting: 12 },
  { name: 'Tue', seated: 38, waiting: 8 },
  { name: 'Wed', seated: 52, waiting: 15 },
  { name: 'Thu', seated: 61, waiting: 22 },
  { name: 'Fri', seated: 78, waiting: 35 },
  { name: 'Sat', seated: 82, waiting: 28 },
  { name: 'Sun', seated: 71, waiting: 18 }
];

const capacityData = [
  { name: 'Occupied', value: 65, color: '#B7410E' },
  { name: 'Available', value: 35, color: '#E8934F' }
];

const peakHoursData = [
  { time: '11 AM', male: 8, female: 7, all: 15 },
  { time: '12 PM', male: 15, female: 13, all: 28 },
  { time: '1 PM', male: 23, female: 19, all: 42 },
  { time: '2 PM', male: 21, female: 17, all: 38 },
  { time: '3 PM', male: 12, female: 10, all: 22 },
  { time: '4 PM', male: 10, female: 8, all: 18 },
  { time: '5 PM', male: 13, female: 11, all: 24 },
  { time: '6 PM', male: 25, female: 20, all: 45 },
  { time: '7 PM', male: 38, female: 30, all: 68 },
  { time: '8 PM', male: 40, female: 32, all: 72 },
  { time: '9 PM', male: 32, female: 26, all: 58 },
  { time: '10 PM', male: 19, female: 16, all: 35 }
];

export function StaffDashboardWithTabs({ onNavigate, staffAuth, onLogout }: StaffDashboardProps) {
  const [waitlist, setWaitlist] = useState(mockWaitlist);
  const [seatedTables, setSeatedTables] = useState(mockSeatedTables);
  const [availableTables, setAvailableTables] = useState(mockAvailableTables);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tableManagementModalOpen, setTableManagementModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const markAsNoShow = (id: number) => {
    const customer = waitlist.find(item => item.id === id);
    if (customer) {
      setWaitlist(prev => prev.filter(item => item.id !== id));
      toast.error(`${customer.name} marked as no-show`);
      console.log('No-show recorded:', customer);
    }
  };

  const removeFromWaitlist = (id: number) => {
    setWaitlist(prev => prev.filter(item => item.id !== id));
    toast.success('Customer removed from waitlist');
  };

  const seatCustomer = async (id: number) => {
    const customer = waitlist.find(item => item.id === id);
    if (customer) {
      // Notify customer
      await notifyTableReady(
        customer.phone,
        customer.contactMethod,
        'Spice Route'
      );
      removeFromWaitlist(id);
      toast.success(`${customer.name} has been notified and seated`);
    }
  };

  const checkOutTable = (id: number) => {
    const table = seatedTables.find(item => item.id === id);
    if (table) {
      setSeatedTables(prev => prev.filter(t => t.id !== id));
      toast.success(`${table.table} checked out successfully`);
    }
  };

  const callNext = () => {
    if (waitlist.length > 0) {
      const nextCustomer = waitlist[0];
      toast.success(`Calling ${nextCustomer.name} - Party of ${nextCustomer.partySize}`);
    } else {
      toast.info('No customers in waitlist');
    }
  };

  const addTable = (tableName: string, capacity: number) => {
    const newTable = {
      id: Math.max(...availableTables.map(t => t.id), ...seatedTables.map(t => t.id)) + 1,
      tableName,
      capacity,
      isOccupied: false
    };
    setAvailableTables(prev => [...prev, newTable]);
  };

  const removeTable = (tableId: number) => {
    // Check if table is currently occupied
    const occupiedTable = seatedTables.find(table => table.id === tableId);
    if (occupiedTable) {
      toast.error('Cannot remove an occupied table. Please check out guests first.');
      return;
    }

    // Remove from available tables
    const tableToRemove = availableTables.find(table => table.id === tableId);
    if (tableToRemove) {
      setAvailableTables(prev => prev.filter(table => table.id !== tableId));
      toast.success(`${tableToRemove.tableName} has been removed`);
    }
  };

  const seatWalkIn = (tableId: number) => {
    const availableTable = availableTables.find(table => table.id === tableId);
    if (availableTable) {
      // Get party size from user
      const partySizeInput = prompt(`Seating walk-in at ${availableTable.tableName}.\nEnter party size (1-${availableTable.capacity}):`);
      const partySize = parseInt(partySizeInput || '1');
      
      if (isNaN(partySize) || partySize < 1 || partySize > availableTable.capacity) {
        toast.error(`Invalid party size. Please enter a number between 1 and ${availableTable.capacity}.`);
        return;
      }

      // Get customer name
      const customerName = prompt('Enter customer name (optional):') || 'Walk-in Customer';

      // Remove from available tables and add to seated tables
      setAvailableTables(prev => prev.filter(table => table.id !== tableId));
      
      const newSeatedTable = {
        id: tableId,
        table: availableTable.tableName,
        guests: customerName,
        partySize: partySize,
        capacity: availableTable.capacity,
        seatedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: '0m'
      };
      
      setSeatedTables(prev => [...prev, newSeatedTable]);
      toast.success(`${customerName} (party of ${partySize}) seated at ${availableTable.tableName}`);
    }
  };

  // Get all tables for the modal (to check for duplicate names)
  const getAllTables = () => {
    const allTables = [
      ...availableTables.map(table => ({
        id: table.id,
        tableName: table.tableName,
        capacity: table.capacity,
        isOccupied: table.isOccupied
      })),
      ...seatedTables.map(table => ({
        id: table.id,
        tableName: table.table,
        capacity: table.capacity || 4, // fallback capacity
        isOccupied: true
      }))
    ];
    return allTables;
  };

  return (
    <div className="min-h-screen relative" style={{backgroundColor: '#F5F5F5'}}>
      {/* Wave Background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='1440' height='800' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,200 Q360,100 720,200 T1440,200 L1440,800 L0,800 Z' fill='%23F0DC82' opacity='0.1'/%3E%3Cpath d='M0,400 Q360,300 720,400 T1440,400 L1440,800 L0,800 Z' fill='%23F0DC82' opacity='0.15'/%3E%3Cpath d='M0,600 Q360,500 720,600 T1440,600 L1440,800 L0,800 Z' fill='%23F0DC82' opacity='0.2'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'bottom',
        backgroundSize: 'cover'
      }}></div>
      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{color: 'var(--where2go-text)'}}>Staff Dashboard</h1>
            <div className="flex items-center mt-2">
              <Badge className="px-3 py-1 rounded-full" style={{backgroundColor: 'var(--where2go-buff)', color: 'var(--where2go-accent)'}}>
                Downtown Location
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span style={{color: 'var(--where2go-accent)'}}>Hello, {staffAuth.user?.name || 'Staff Member'}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSettingsModalOpen(true)}
              className="pill-button"
              style={{borderColor: 'var(--where2go-accent)', color: 'var(--where2go-accent)'}}
              title="Restaurant Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onLogout}
              className="pill-button"
              style={{borderColor: 'var(--where2go-accent)', color: 'var(--where2go-accent)'}}
            >
              <LogOut className="h-4 w-4 mr-1" />
              Log out
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="dashboard" style={{color: 'var(--where2go-accent)'}}>Dashboard</TabsTrigger>
            <TabsTrigger value="analytics" style={{color: 'var(--where2go-accent)'}}>Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8">
            {/* KPI Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="relative">
                {/* Shadow effect square */}
                <div 
                  className="absolute top-2 left-2 rounded-2xl"
                  style={{
                    backgroundColor: '#F0DC82',
                    width: 'calc(100% - 8px)',
                    height: 'calc(100% - 8px)',
                    zIndex: 0,
                    opacity: 0.6
                  }}
                ></div>
                <Card className="card-shadow border-0 rounded-2xl relative" style={{zIndex: 2, backgroundColor: '#FFFFFF'}}>
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: 'var(--where2go-buff)'}}>
                      <Clock className="h-8 w-8" style={{color: 'var(--where2go-accent)'}} />
                    </div>
                    <div className="text-3xl font-bold mb-1" style={{color: 'var(--where2go-text)'}}>{waitlist.length}</div>
                    <div style={{color: 'var(--where2go-text)'}}>People Waiting</div>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                {/* Shadow effect square */}
                <div 
                  className="absolute top-2 left-2 rounded-2xl"
                  style={{
                    backgroundColor: '#F0DC82',
                    width: 'calc(100% - 8px)',
                    height: 'calc(100% - 8px)',
                    zIndex: 0,
                    opacity: 0.6
                  }}
                ></div>
                <Card className="card-shadow border-0 rounded-2xl relative" style={{zIndex: 2, backgroundColor: '#FFFFFF'}}>
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: 'var(--where2go-buff)'}}>
                      <Users className="h-8 w-8" style={{color: 'var(--where2go-accent)'}} />
                    </div>
                    <div className="text-3xl font-bold mb-1" style={{color: 'var(--where2go-text)'}}>{seatedTables.length}</div>
                    <div style={{color: 'var(--where2go-text)'}}>Tables Seated</div>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                {/* Shadow effect square */}
                <div 
                  className="absolute top-2 left-2 rounded-2xl"
                  style={{
                    backgroundColor: '#F0DC82',
                    width: 'calc(100% - 8px)',
                    height: 'calc(100% - 8px)',
                    zIndex: 0,
                    opacity: 0.6
                  }}
                ></div>
                <Card className="card-shadow border-0 rounded-2xl relative" style={{zIndex: 2, backgroundColor: '#FFFFFF'}}>
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: 'var(--where2go-buff)'}}>
                      <Table className="h-8 w-8" style={{color: 'var(--where2go-accent)'}} />
                    </div>
                    <div className="text-3xl font-bold mb-1" style={{color: 'var(--where2go-text)'}}>{seatedTables.length + availableTables.length}</div>
                    <div style={{color: 'var(--where2go-text)'}}>Total Tables</div>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                {/* Shadow effect square */}
                <div 
                  className="absolute top-2 left-2 rounded-2xl"
                  style={{
                    backgroundColor: '#F0DC82',
                    width: 'calc(100% - 8px)',
                    height: 'calc(100% - 8px)',
                    zIndex: 0,
                    opacity: 0.6
                  }}
                ></div>
                <Card className="card-shadow border-0 rounded-2xl relative" style={{zIndex: 2, backgroundColor: '#FFFFFF'}}>
                  <CardContent className="p-6 text-center">
                    <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: 'var(--where2go-buff)'}}>
                      <CheckCircle className="h-8 w-8" style={{color: 'var(--where2go-accent)'}} />
                    </div>
                    <div className="text-3xl font-bold mb-1" style={{color: 'var(--where2go-text)'}}>{availableTables.length}</div>
                    <div style={{color: 'var(--where2go-text)'}}>Available Tables</div>
                  </CardContent>
                </Card>
              </div>
            </div>


            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Waitlist */}
              <Card className="card-shadow border-0 rounded-3xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl flex items-center" style={{color: '#3C3C3C'}}>
                    <Clock className="h-6 w-6 mr-2" style={{color: '#B7410E'}} />
                    Waitlist ({waitlist.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {waitlist.map((customer) => (
                      <div key={customer.id} className="rounded-2xl p-4 border" style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(183, 65, 14, 0.2)'}}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="rounded-full w-10 h-10 flex items-center justify-center mr-3" style={{backgroundColor: '#E8934F'}}>
                              <User className="h-5 w-5" style={{color: '#B7410E'}} />
                            </div>
                            <div>
                              <h4 className="font-semibold" style={{color: '#3C3C3C'}}>{customer.name}</h4>
                              <p className="text-sm" style={{color: '#3C3C3C'}}>Party of {customer.partySize} • Joined {customer.joined}</p>
                            </div>
                          </div>
                          <Badge className="px-2 py-1 rounded-full text-xs" style={{backgroundColor: '#E8934F', color: '#B7410E'}}>
                            {customer.waitTime}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm" style={{color: '#3C3C3C'}}>
                              <Phone className="h-4 w-4 mr-1" />
                              {customer.phone}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => seatCustomer(customer.id)}
                                className="pill-button text-xs text-white"
                                style={{backgroundColor: 'var(--where2go-accent)'}}
                              >
                                Seat Now
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => markAsNoShow(customer.id)}
                                className="pill-button text-xs"
                                style={{borderColor: '#EF4444', color: '#EF4444'}}
                                title="Mark as no-show"
                              >
                                <AlertCircle className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => removeFromWaitlist(customer.id)}
                                className="pill-button text-xs"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {waitlist.length === 0 && (
                      <div className="text-center py-8" style={{color: '#9FA0A0'}}>
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No customers in waitlist</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Currently Seated */}
              <Card className="card-shadow border-0 rounded-3xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl flex items-center" style={{color: '#3C3C3C'}}>
                      <Table className="h-6 w-6 mr-2" style={{color: '#B7410E'}} />
                      Currently Seated ({seatedTables.length})
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setTableManagementModalOpen(true)}
                      className="pill-button text-white h-8 w-8 p-0"
                      style={{backgroundColor: '#B7410E'}}
                      title="Add new table"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-6">
                    {/* Occupied Tables */}
                    <div className="space-y-4 max-h-64 overflow-y-auto">
                      <h5 className="text-sm font-medium uppercase tracking-wide" style={{color: '#3C3C3C'}}>Occupied Tables</h5>
                      {seatedTables.map((table) => (
                        <div key={table.id} className="rounded-2xl p-4 border" style={{backgroundColor: '#F8F1C1', borderColor: 'rgba(183, 65, 14, 0.2)'}}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div className="rounded-full w-10 h-10 flex items-center justify-center mr-3" style={{backgroundColor: '#E8934F'}}>
                                <Table className="h-5 w-5" style={{color: '#B7410E'}} />
                              </div>
                              <div>
                                <h4 className="font-semibold" style={{color: '#3C3C3C'}}>{table.table}</h4>
                                <p className="text-sm" style={{color: '#3C3C3C'}}>{table.guests} • Party of {table.partySize}/{table.capacity}</p>
                              </div>
                            </div>
                            <Badge className="px-2 py-1 rounded-full text-xs" style={{backgroundColor: '#E8934F', color: '#B7410E'}}>
                              {table.duration}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm" style={{color: '#3C3C3C'}}>
                              Seated at {table.seatedTime}
                            </div>
                            
                            <Button 
                              size="sm" 
                              onClick={() => checkOutTable(table.id)}
                              className="pill-button text-xs text-white"
                              style={{backgroundColor: '#B7410E'}}
                            >
                              Check Out
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {seatedTables.length === 0 && (
                        <div className="text-center py-4" style={{color: '#9FA0A0'}}>
                          <Table className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No occupied tables</p>
                        </div>
                      )}
                    </div>

                    {/* Available Tables */}
                    <div className="space-y-4 max-h-32 overflow-y-auto border-t pt-4" style={{borderColor: 'rgba(183, 65, 14, 0.2)'}}>
                      <h5 className="text-sm font-medium uppercase tracking-wide" style={{color: '#3C3C3C'}}>Available Tables</h5>
                      {availableTables.map((table) => (
                        <div key={table.id} className="rounded-2xl p-3 border" style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(183, 65, 14, 0.2)'}}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="rounded-full w-8 h-8 flex items-center justify-center mr-3" style={{backgroundColor: '#E8934F'}}>
                                <Table className="h-4 w-4" style={{color: '#B7410E'}} />
                              </div>
                              <div>
                                <h4 className="font-medium" style={{color: '#3C3C3C'}}>{table.tableName}</h4>
                                <p className="text-xs" style={{color: '#3C3C3C'}}>Capacity: {table.capacity} guests</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => seatWalkIn(table.id)}
                                className="pill-button text-xs h-7 px-2 text-white"
                                style={{backgroundColor: '#B7410E'}}
                                title="Seat walk-in customer"
                              >
                                <UserPlus className="h-3 w-3 mr-1" />
                                Seat
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => removeTable(table.id)}
                                className="pill-button text-xs h-7 w-7 p-0"
                                style={{borderColor: '#D77A61', color: '#D77A61'}}
                                title="Remove table"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {availableTables.length === 0 && (
                        <div className="text-center py-4" style={{color: '#9FA0A0'}}>
                          <Table className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No available tables</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="card-shadow border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl" style={{color: '#3C3C3C'}}>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex flex-wrap gap-4">
                  <Button 
                    className="pill-button text-white"
                    onClick={callNext}
                    style={{backgroundColor: '#B7410E'}}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Call Next in Waitlist
                  </Button>
                  <Button className="pill-button text-white" style={{backgroundColor: '#D4621A'}}>
                    <Table className="h-4 w-4 mr-2" />
                    View Table Layout
                  </Button>
                  <Button className="pill-button text-white" style={{backgroundColor: '#E8934F'}}>
                    <FileText className="h-4 w-4 mr-2" />
                    Daily Summary
                  </Button>
                  <Button 
                    className="pill-button text-white"
                    onClick={() => setActiveTab('analytics')}
                    style={{backgroundColor: '#F3C084'}}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-shadow border-0 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm" style={{color: '#3C3C3C'}} className="mb-1">Today's Customers</p>
                      <p className="text-3xl font-bold" style={{color: '#3C3C3C'}}>247</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 mr-1" style={{color: '#B7410E'}} />
                        <span className="text-sm" style={{color: '#B7410E'}}>+12% vs yesterday</span>
                      </div>
                    </div>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center" style={{backgroundColor: '#F8F1C1'}}>
                      <Users className="h-6 w-6" style={{color: '#B7410E'}} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm mb-1" style={{color: '#3C3C3C'}}>Avg Wait Time</p>
                      <p className="text-3xl font-bold" style={{color: '#3C3C3C'}}>18m</p>
                      <div className="flex items-center mt-2">
                        <TrendingDown className="h-4 w-4 mr-1" style={{color: '#B7410E'}} />
                        <span className="text-sm" style={{color: '#B7410E'}}>-5m vs yesterday</span>
                      </div>
                    </div>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center" style={{backgroundColor: '#F8F1C1'}}>
                      <Clock className="h-6 w-6" style={{color: '#B7410E'}} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm mb-1" style={{color: '#3C3C3C'}}>Table Turnover</p>
                      <p className="text-3xl font-bold" style={{color: '#3C3C3C'}}>3.2x</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 mr-1" style={{color: '#B7410E'}} />
                        <span className="text-sm" style={{color: '#B7410E'}}>+0.3x vs yesterday</span>
                      </div>
                    </div>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center" style={{backgroundColor: '#F8F1C1'}}>
                      <Table className="h-6 w-6" style={{color: '#B7410E'}} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm mb-1" style={{color: '#3C3C3C'}}>Peak Capacity</p>
                      <p className="text-3xl font-bold" style={{color: '#3C3C3C'}}>85%</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 mr-1" style={{color: '#B7410E'}} />
                        <span className="text-sm" style={{color: '#B7410E'}}>+8% vs yesterday</span>
                      </div>
                    </div>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center" style={{backgroundColor: '#F8F1C1'}}>
                      <Calendar className="h-6 w-6" style={{color: '#B7410E'}} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Seated vs Waiting Chart */}
              <Card className="card-shadow border-0 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-xl" style={{color: '#3C3C3C'}}>Weekly Overview: Seated vs Waiting</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={seatedVsWaitingData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3E5AB" />
                      <XAxis dataKey="name" stroke="#3C3C3C" />
                      <YAxis stroke="#3C3C3C" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#F3E5AB', 
                          border: '1px solid #B7410E', 
                          borderRadius: '12px',
                          boxShadow: '0 8px 30px rgba(183, 65, 14, 0.15)'
                        }}
                      />
                      <Bar dataKey="seated" fill="#B7410E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="waiting" fill="#E8934F" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Capacity Pie Chart */}
              <Card className="card-shadow border-0 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-xl" style={{color: '#3C3C3C'}}>Current Capacity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={capacityData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                        labelLine={false}
                      >
                        {capacityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#F3E5AB', 
                          border: '1px solid #B7410E', 
                          borderRadius: '12px',
                          boxShadow: '0 8px 30px rgba(183, 65, 14, 0.15)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Peak Hours Chart */}
            <Card className="card-shadow border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl" style={{color: '#3C3C3C'}}>Today's Peak Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3E5AB" />
                    <XAxis dataKey="time" stroke="#3C3C3C" />
                    <YAxis stroke="#3C3C3C" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#F3E5AB', 
                        border: '1px solid #B7410E', 
                        borderRadius: '12px',
                        boxShadow: '0 8px 30px rgba(183, 65, 14, 0.15)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="male" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Male"
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#ffffff', stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="female" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      name="Female"
                      dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#ffffff', stroke: '#EF4444', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="all" 
                      stroke="#000000" 
                      strokeWidth={3}
                      name="All"
                      dot={{ fill: '#000000', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#ffffff', stroke: '#000000', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="card-shadow border-0 rounded-2xl" style={{background: 'linear-gradient(135deg, #F8F1C1 0%, #F3E5AB 100%)'}}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#B7410E'}}>Peak Hour</h3>
                  <p className="text-3xl font-bold mb-1" style={{color: '#3C3C3C'}}>8:00 PM</p>
                  <p className="text-sm" style={{color: '#3C3C3C'}}>72 customers served</p>
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl" style={{background: 'linear-gradient(135deg, #F8F1C1 0%, #F3E5AB 100%)'}}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#B7410E'}}>Busiest Day</h3>
                  <p className="text-3xl font-bold mb-1" style={{color: '#3C3C3C'}}>Saturday</p>
                  <p className="text-sm" style={{color: '#3C3C3C'}}>82 customers average</p>
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl" style={{background: 'linear-gradient(135deg, #F8F1C1 0%, #F3E5AB 100%)'}}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#B7410E'}}>Efficiency Score</h3>
                  <p className="text-3xl font-bold mb-1" style={{color: '#3C3C3C'}}>94%</p>
                  <p className="text-sm" style={{color: '#3C3C3C'}}>Above industry average</p>
                </CardContent>
              </Card>
            </div>

            {/* QR Code Section - Moved to Bottom */}
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {/* Placeholder for spacing */}
              </div>
              <div>
                <QRCodeDisplay 
                  restaurantId={1} 
                  restaurantName="Spice Route" 
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Table Management Modal */}
      <TableManagementModal
        isOpen={tableManagementModalOpen}
        onClose={() => setTableManagementModalOpen(false)}
        onAddTable={addTable}
        existingTables={getAllTables()}
      />

      {/* Restaurant Settings Modal */}
      <RestaurantSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
}