import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Users, Table, Clock, CheckCircle, Phone, X, User, BarChart3, Calendar, FileText, TrendingUp, TrendingDown, LogOut, Plus, Trash2, UserPlus, Settings, AlertCircle } from 'lucide-react';
import { TableManagementModal } from './TableManagementModal';
import { RestaurantSettingsModal } from './RestaurantSettingsModal';
import { QRCodeDisplay } from './QRCodeDisplay';
import { DocumentsManagement } from './DocumentsManagement';
import { toast } from 'sonner@2.0.3';
import { WaveBackground } from './WaveBackground';
import { notifyTableReady, notifyQueuePositionUpdate } from '../services/NotificationService';

interface StaffDashboardProps {
  onNavigate: (page: 'landing' | 'discover' | 'search' | 'staff') => void;
  staffAuth: {
    isAuthenticated: boolean;
    user: { name: string; email: string } | null;
    restaurantId?: string;
    token?: string;
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

// Analytics state (live)
type Overview = { total: number; confirmed: number; seated: number; cancelled: number };

export function StaffDashboardWithTabs({ onNavigate, staffAuth, onLogout }: StaffDashboardProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const [waitlist, setWaitlist] = useState(mockWaitlist);
  const [seatedTables, setSeatedTables] = useState(mockSeatedTables);
  const [availableTables, setAvailableTables] = useState(mockAvailableTables);
  const [tablesCount, setTablesCount] = useState<number>(mockAvailableTables.length + mockSeatedTables.length);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tableManagementModalOpen, setTableManagementModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [seatedToday, setSeatedToday] = useState<number>(0);
  const [avgWaitMinutes, setAvgWaitMinutes] = useState<number>(0);
  const [overview, setOverview] = useState<Overview>({ total: 0, confirmed: 0, seated: 0, cancelled: 0 });
  const [peakHoursData, setPeakHoursData] = useState<{ time: string; all: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ day: string; total: number; seated: number }[]>([]);

  useEffect(() => {
    let timer: any;
    const load = async () => {
      try {
        if (!staffAuth?.restaurantId) return;
        const res = await fetch(`${API_URL}/dashboard/${staffAuth.restaurantId}/summary`);
        if (!res.ok) return;
        const data = await res.json();
        setWaitingCount(data.waiting || 0);
        setSeatedToday(data.seatedToday || 0);
        setAvgWaitMinutes(data.avgWaitMinutes || 0);
      } catch {}
    };
    load();
    timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

  // Replace hardcoded waitlist/seated with live data
  useEffect(() => {
    let timer: any;
    const loadReservations = async () => {
      try {
        if (!staffAuth?.restaurantId) return;
        const params = new URLSearchParams({ restaurantId: staffAuth.restaurantId });
        const res = await fetch(`${API_URL}/reservations?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        const items: any[] = data.items || [];
        const wl = items
          .filter(r => r.mode === 'waitlist' && (r.status === 'pending' || r.status === 'confirmed'))
          .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0))
          .map((r, idx) => ({
            id: idx + 1,
            name: r.name || 'Queue Customer',
            partySize: r.partySize || 2,
            waitTime: '—',
            phone: r.phone || '',
            joined: new Date(r.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            contactMethod: (r.contactMethod || 'phone') as any,
            holdTimeExpires: Date.now() + 10 * 60000,
          }));
        setWaitlist(wl);
        // Optionally: expose pending reservations separately in future
        const seated = items
          .filter(r => r.status === 'seated')
          .map((r, idx) => ({
            id: idx + 1,
            table: r.tableId ? `Table ${String(r.tableId).slice(-2)}` : 'Table',
            guests: 'Seated Party',
            partySize: r.partySize || 2,
            capacity: r.partySize || 4,
            seatedTime: r.seatedAt ? new Date(r.seatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            duration: '—',
          }));
        setSeatedTables(seated);
      } catch {}
    };
    loadReservations();
    timer = setInterval(loadReservations, 20000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

  // Load tables list for totals and availability
  useEffect(() => {
    let timer: any;
    const loadTables = async () => {
      try {
        if (!staffAuth?.restaurantId) return;
        const res = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/tables`);
        if (!res.ok) return;
        const data = await res.json();
        const items: any[] = data.items || [];
        setTablesCount(items.length);
        const avail = items
          .filter(t => t.status === 'available')
          .map((t: any) => ({ id: t._id, tableName: t.name, capacity: t.capacity, isOccupied: false }));
        setAvailableTables(avail);
      } catch {}
    };
    loadTables();
    timer = setInterval(loadTables, 20000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

  // Load analytics (overview and peak hours)
  useEffect(() => {
    let timer: any;
    const loadAnalytics = async () => {
      try {
        const rid = staffAuth?.restaurantId;
        if (!rid) return;
        const q = new URLSearchParams({ restaurantId: rid, range: 'day' });
        const [ovrRes, peakRes, dailyRes] = await Promise.all([
          fetch(`${API_URL}/analytics/overview?${q.toString()}`),
          fetch(`${API_URL}/analytics/peak-hours?${q.toString()}`),
          fetch(`${API_URL}/analytics/daily?restaurantId=${rid}&range=week`)
        ]);
        if (ovrRes.ok) {
          const { totals } = await ovrRes.json();
          setOverview({ total: totals?.total || 0, confirmed: totals?.confirmed || 0, seated: totals?.seated || 0, cancelled: totals?.cancelled || 0 });
        }
        if (peakRes.ok) {
          const { items } = await peakRes.json();
          const mapped = (items || []).map((i: any) => ({ time: `${String(i._id).padStart(2,'0')}:00`, all: i.count || 0 }));
          setPeakHoursData(mapped);
        }
        if (dailyRes.ok) {
          const { items } = await dailyRes.json();
          setDailyData(items || []);
        }
      } catch {}
    };
    loadAnalytics();
    timer = setInterval(loadAnalytics, 30000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

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

  const addTable = async (tableName: string, capacity: number) => {
    try {
      if (!staffAuth.restaurantId) return;
      await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tableName, capacity })
      });
      // Refresh tables
      const res = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/tables`);
      if (res.ok) {
        const data = await res.json();
        const items: any[] = data.items || [];
        setTablesCount(items.length);
        const avail = items
          .filter(t => t.status === 'available')
          .map((t: any) => ({ id: t._id, tableName: t.name, capacity: t.capacity, isOccupied: false }));
        setAvailableTables(avail);
      }
    } catch {}
  };

  const removeTable = async (tableId: any) => {
    // Check if table is currently occupied
    const occupiedTable = seatedTables.find(table => table.id === tableId);
    if (occupiedTable) {
      toast.error('Cannot remove an occupied table. Please check out guests first.');
      return;
    }

    try {
      await fetch(`${API_URL}/tables/${tableId}`, { method: 'DELETE' });
      // Refresh tables
      if (!staffAuth.restaurantId) return;
      const res = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/tables`);
      if (res.ok) {
        const data = await res.json();
        const items: any[] = data.items || [];
        setTablesCount(items.length);
        const avail = items
          .filter(t => t.status === 'available')
          .map((t: any) => ({ id: t._id, tableName: t.name, capacity: t.capacity, isOccupied: false }));
        setAvailableTables(avail);
        toast.success('Table removed');
      }
    } catch {
      toast.error('Failed to remove table');
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
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="dashboard" style={{color: 'var(--where2go-accent)'}}>Dashboard</TabsTrigger>
            <TabsTrigger value="analytics" style={{color: 'var(--where2go-accent)'}}>Analytics</TabsTrigger>
            <TabsTrigger value="documents" style={{color: 'var(--where2go-accent)'}}>Documents</TabsTrigger>
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
                    <div className="text-3xl font-bold mb-1" style={{color: 'var(--where2go-text)'}}>{waitingCount}</div>
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
                    <div className="text-3xl font-bold mb-1" style={{color: 'var(--where2go-text)'}}>{seatedToday}</div>
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
                    <div className="text-3xl font-bold mb-1" style={{color: 'var(--where2go-text)'}}>{tablesCount}</div>
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
                  <CardTitle className="text-2xl flex items-center" style={{color: '#2D2D2B'}}>
                    <Clock className="h-6 w-6 mr-2" style={{color: '#5A5E3E'}} />
                    Waitlist ({waitlist.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {waitlist.map((customer) => (
                      <div key={customer.id} className="rounded-2xl p-4 border" style={{backgroundColor: '#FAF8F2', borderColor: 'rgba(90, 94, 62, 0.2)'}}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="rounded-full w-10 h-10 flex items-center justify-center mr-3" style={{backgroundColor: '#B889A6'}}>
                              <User className="h-5 w-5" style={{color: '#5A5E3E'}} />
                            </div>
                            <div>
                              <h4 className="font-semibold" style={{color: '#2D2D2B'}}>{customer.name}</h4>
                              <p className="text-sm" style={{color: '#2D2D2B'}}>Party of {customer.partySize} • Joined {customer.joined}</p>
                            </div>
                          </div>
                          <Badge className="px-2 py-1 rounded-full text-xs" style={{backgroundColor: '#B889A6', color: '#5A5E3E'}}>
                            {customer.waitTime}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm" style={{color: '#2D2D2B'}}>
                              <Phone className="h-4 w-4 mr-1" />
                              {customer.phone}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => seatCustomer(customer.id)}
                                className="pill-button text-xs text-white"
                                style={{backgroundColor: '#3F4427'}}
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
                    <CardTitle className="text-2xl flex items-center" style={{color: '#2D2D2B'}}>
                      <Table className="h-6 w-6 mr-2" style={{color: '#5A5E3E'}} />
                      Currently Seated ({seatedTables.length})
                    </CardTitle>
                    <Button
                      size="sm"
                      onClick={() => setTableManagementModalOpen(true)}
                      className="pill-button text-white h-8 w-8 p-0"
                      style={{backgroundColor: '#3F4427'}}
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
                      <h5 className="text-sm font-medium uppercase tracking-wide" style={{color: '#2D2D2B'}}>Occupied Tables</h5>
                      {seatedTables.map((table) => (
                        <div key={table.id} className="rounded-2xl p-4 border" style={{backgroundColor: '#FAF8F2', borderColor: 'rgba(90, 94, 62, 0.2)'}}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div className="rounded-full w-10 h-10 flex items-center justify-center mr-3" style={{backgroundColor: '#B889A6'}}>
                                <Table className="h-5 w-5" style={{color: '#5A5E3E'}} />
                              </div>
                              <div>
                                <h4 className="font-semibold" style={{color: '#2D2D2B'}}>{table.table}</h4>
                                <p className="text-sm" style={{color: '#2D2D2B'}}>{table.guests} • Party of {table.partySize}/{table.capacity}</p>
                              </div>
                            </div>
                            <Badge className="px-2 py-1 rounded-full text-xs" style={{backgroundColor: '#B889A6', color: '#5A5E3E'}}>
                              {table.duration}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm" style={{color: '#2D2D2B'}}>
                              Seated at {table.seatedTime}
                            </div>
                            
                            <Button 
                              size="sm" 
                              onClick={() => checkOutTable(table.id)}
                              className="pill-button text-xs text-white"
                              style={{backgroundColor: '#3F4427'}}
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
                      <h5 className="text-sm font-medium uppercase tracking-wide" style={{color: '#2D2D2B'}}>Available Tables</h5>
                      {availableTables.map((table) => (
                        <div key={table.id} className="rounded-2xl p-3 border" style={{backgroundColor: '#E7D7C5', borderColor: 'rgba(90, 94, 62, 0.2)'}}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="rounded-full w-8 h-8 flex items-center justify-center mr-3" style={{backgroundColor: '#B889A6'}}>
                                <Table className="h-4 w-4" style={{color: '#5A5E3E'}} />
                              </div>
                              <div>
                                <h4 className="font-medium" style={{color: '#2D2D2B'}}>{table.tableName}</h4>
                                <p className="text-xs" style={{color: '#2D2D2B'}}>Capacity: {table.capacity} guests</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => seatWalkIn(table.id)}
                                className="pill-button text-xs h-7 px-2 text-white"
                                style={{backgroundColor: '#3F4427'}}
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
                <CardTitle className="text-xl" style={{color: '#2D2D2B'}}>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex flex-wrap gap-4">
                  <Button 
                    className="pill-button text-white"
                    onClick={callNext}
                    style={{backgroundColor: '#3F4427'}}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Call Next in Waitlist
                  </Button>
                  <Button className="pill-button text-white" style={{backgroundColor: '#B6683B'}}>
                    <Table className="h-4 w-4 mr-2" />
                    View Table Layout
                  </Button>
                  <Button className="pill-button text-white" style={{backgroundColor: '#B889A6'}}>
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
                    <Button 
                      className="pill-button text-white"
                      style={{backgroundColor: '#B7410E'}}
                      onClick={async () => {
                        try {
                          if (!staffAuth.restaurantId) return;
                          await fetch(`${API_URL}/maintenance/zero/${staffAuth.restaurantId}`, { method: 'POST' });
                          // Refresh KPIs next tick
                          alert('Queue cleared for this restaurant.');
                        } catch {
                          alert('Failed to clear queue.');
                        }
                      }}
                    >
                      Clear Queue
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
                      <p className="text-sm mb-1" style={{color: '#2D2D2B'}}>Today's Customers</p>
                      <p className="text-3xl font-bold" style={{color: '#2D2D2B'}}>{overview.total}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 mr-1" style={{color: '#5A5E3E'}} />
                        <span className="text-sm" style={{color: '#5A5E3E'}}>vs yesterday (weekly)</span>
                      </div>
                    </div>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center" style={{backgroundColor: '#FAF8F2'}}>
                      <Users className="h-6 w-6" style={{color: '#5A5E3E'}} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm mb-1" style={{color: '#2D2D2B'}}>Avg Wait Time</p>
                      <p className="text-3xl font-bold" style={{color: '#2D2D2B'}}>18m</p>
                      <div className="flex items-center mt-2">
                        <TrendingDown className="h-4 w-4 mr-1" style={{color: '#5A5E3E'}} />
                        <span className="text-sm" style={{color: '#5A5E3E'}}>-5m vs yesterday</span>
                      </div>
                    </div>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center" style={{backgroundColor: '#FAF8F2'}}>
                      <Clock className="h-6 w-6" style={{color: '#5A5E3E'}} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm mb-1" style={{color: '#2D2D2B'}}>Table Turnover</p>
                      <p className="text-3xl font-bold" style={{color: '#2D2D2B'}}>3.2x</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 mr-1" style={{color: '#5A5E3E'}} />
                        <span className="text-sm" style={{color: '#5A5E3E'}}>+0.3x vs yesterday</span>
                      </div>
                    </div>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center" style={{backgroundColor: '#FAF8F2'}}>
                      <Table className="h-6 w-6" style={{color: '#5A5E3E'}} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm mb-1" style={{color: '#2D2D2B'}}>Peak Capacity</p>
                      <p className="text-3xl font-bold" style={{color: '#2D2D2B'}}>85%</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 mr-1" style={{color: '#5A5E3E'}} />
                        <span className="text-sm" style={{color: '#5A5E3E'}}>+8% vs yesterday</span>
                      </div>
                    </div>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center" style={{backgroundColor: '#FAF8F2'}}>
                      <Calendar className="h-6 w-6" style={{color: '#5A5E3E'}} />
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
                  <CardTitle className="text-xl" style={{color: '#2D2D2B'}}>Overview: Seated vs Waiting</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={
                      (dailyData.length ? dailyData : [{ day: new Date().toISOString().slice(0,10), total: overview.total, seated: overview.seated }])
                        .map(d => ({ name: d.day.slice(5), seated: d.seated, waiting: Math.max(d.total - d.seated, 0) }))
                    }>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E7D7C5" />
                      <XAxis dataKey="name" stroke="#2D2D2B" />
                      <YAxis stroke="#2D2D2B" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#E7D7C5', 
                          border: '1px solid #5A5E3E', 
                          borderRadius: '12px',
                          boxShadow: '0 8px 30px rgba(90, 94, 62, 0.15)'
                        }}
                      />
                      <Bar dataKey="seated" fill="#5A5E3E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="waiting" fill="#B889A6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Capacity Pie Chart */}
              <Card className="card-shadow border-0 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-xl" style={{color: '#2D2D2B'}}>Current Capacity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Occupied', value: Math.max(tablesCount - availableTables.length, 0), color: '#5A5E3E' },
                          { name: 'Available', value: availableTables.length, color: '#B889A6' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                        labelLine={false}
                      >
                        {[
                          { name: 'Occupied', color: '#5A5E3E' },
                          { name: 'Available', color: '#B889A6' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#E7D7C5', 
                          border: '1px solid #5A5E3E', 
                          borderRadius: '12px',
                          boxShadow: '0 8px 30px rgba(90, 94, 62, 0.15)'
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
                <CardTitle className="text-xl" style={{color: '#2D2D2B'}}>Today's Peak Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={peakHoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7D7C5" />
                    <XAxis dataKey="time" stroke="#2D2D2B" />
                    <YAxis stroke="#2D2D2B" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#E7D7C5', 
                        border: '1px solid #5A5E3E', 
                        borderRadius: '12px',
                        boxShadow: '0 8px 30px rgba(90, 94, 62, 0.15)'
                      }}
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
              <Card className="card-shadow border-0 rounded-2xl" style={{background: 'linear-gradient(135deg, #FAF8F2 0%, #E7D7C5 100%)'}}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#5A5E3E'}}>Peak Hour</h3>
                  {peakHoursData.length ? (
                    <>
                      <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{peakHoursData.reduce((a,b)=> (b.all > a.all? b : a)).time}</p>
                      <p className="text-sm" style={{color: '#2D2D2B'}}>{peakHoursData.reduce((a,b)=> (b.all > a.all? b : a)).all} customers</p>
                    </>
                  ) : (
                    <p className="text-sm" style={{color: '#2D2D2B'}}>No data</p>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl" style={{background: 'linear-gradient(135deg, #FAF8F2 0%, #E7D7C5 100%)'}}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#5A5E3E'}}>Busiest Day</h3>
                  {dailyData.length ? (
                    <>
                      <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{new Date(dailyData.reduce((a,b)=> (b.total > a.total? b : a)).day).toLocaleDateString()}</p>
                      <p className="text-sm" style={{color: '#2D2D2B'}}>{dailyData.reduce((a,b)=> (b.total > a.total? b : a)).total} customers</p>
                    </>
                  ) : (
                    <p className="text-sm" style={{color: '#2D2D2B'}}>No data</p>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl" style={{background: 'linear-gradient(135deg, #FAF8F2 0%, #E7D7C5 100%)'}}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#5A5E3E'}}>Efficiency Score</h3>
                  <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{Math.max(0, Math.min(100, Math.round((100 - avgWaitMinutes) * 0.6 + (tablesCount ? (seatedToday / tablesCount) * 40 : 0))))}%</p>
                  <p className="text-sm" style={{color: '#2D2D2B'}}>Based on wait time and turnover</p>
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

          <TabsContent value="documents" className="space-y-8">
            {staffAuth.restaurantId && staffAuth.token ? (
              <DocumentsManagement 
                restaurantId={staffAuth.restaurantId}
                token={staffAuth.token}
              />
            ) : (
              <div className="text-center py-12">
                <p style={{ color: '#9FA0A0' }}>Restaurant information not available. Please log in again.</p>
              </div>
            )}
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