import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Users, Table, Clock, CheckCircle, Phone, X, User, BarChart3, Calendar as CalendarIcon, FileText, TrendingUp, TrendingDown, LogOut, Plus, Minus, Trash2, UserPlus, Settings, AlertCircle, Menu } from 'lucide-react';
import { TableManagementModal } from './TableManagementModal';
import { MenuManagementModal } from './MenuManagementModal';
import { QRCodeDisplay } from './QRCodeDisplay';
import { RestaurantProfile } from './RestaurantProfile';
import { toast } from 'sonner@2.0.3';
import { WaveBackground } from './WaveBackground';
import { notifyTableReady, notifyQueuePositionUpdate } from '../services/NotificationService';
import { Calendar } from './ui/calendar';
import { openDailySummaryPdf, generateDailySummary } from '../services/analyticsApi';

interface StaffDashboardProps {
  onNavigate: (page: 'landing' | 'discover' | 'search' | 'staff') => void;
  staffAuth: {
    isAuthenticated: boolean;
    user: { name: string; email: string } | null;
    restaurantId?: string;
    token?: string;
  };
  onLogout: () => void;
  onUserUpdate: (user: any) => void;
}

// Analytics state (live)
type Overview = { total: number; confirmed: number; seated: number; cancelled: number };

export function StaffDashboardWithTabs({ onNavigate, staffAuth, onLogout, onUserUpdate }: StaffDashboardProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [seatedTables, setSeatedTables] = useState<any[]>([]);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [tablesCount, setTablesCount] = useState<number>(0); // Initialize to 0, will be set from DB
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tableManagementModalOpen, setTableManagementModalOpen] = useState(false);
  const [menuManagementModalOpen, setMenuManagementModalOpen] = useState(false);
  const [seatWalkInModalOpen, setSeatWalkInModalOpen] = useState(false);
  const [selectedTableForSeating, setSelectedTableForSeating] = useState<{ id: number; tableName: string; capacity: number } | null>(null);
  const [walkInPartySize, setWalkInPartySize] = useState(2);
  const [walkInCustomerName, setWalkInCustomerName] = useState('');
  const [walkInFormErrors, setWalkInFormErrors] = useState<Record<string, string>>({});
  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [seatedToday, setSeatedToday] = useState<number>(0);
  const [avgWaitMinutes, setAvgWaitMinutes] = useState<number>(0);
  const [overview, setOverview] = useState<Overview>({ total: 0, confirmed: 0, seated: 0, cancelled: 0 });
  const [peakHoursData, setPeakHoursData] = useState<{ time: string; all: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ day: string; total: number; seated: number; waiting: number; cancelled: number; noShow: number }[]>([]);
  const [kpiData, setKpiData] = useState<any>(null);
  const [capacityData, setCapacityData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [dailySummaryDialogOpen, setDailySummaryDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
    timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

  // Replace hardcoded waitlist/seated with live data
  useEffect(() => {
    let timer: any;
    loadReservationsFromDB();
    timer = setInterval(loadReservationsFromDB, 30000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

  // Load tables list for totals and availability
  useEffect(() => {
    if (!staffAuth?.restaurantId) return;
    let timer: any;
    const load = async () => {
      await loadTablesFromDB();
    };
    load(); // Load immediately
    timer = setInterval(loadTablesFromDB, 30000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

  // Load analytics (overview and peak hours)
  useEffect(() => {
    let timer: any;
    const loadAnalytics = async () => {
      try {
        const rid = staffAuth?.restaurantId;
        if (!rid) {
          setAnalyticsLoading(false);
          return;
        }
        
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        
        const q = new URLSearchParams({ restaurantId: rid, range: 'day' });
        const [ovrRes, peakRes, dailyRes, kpiRes, capacityRes] = await Promise.all([
          fetch(`${API_URL}/analytics/overview?${q.toString()}`),
          fetch(`${API_URL}/analytics/peak-hours?${q.toString()}`),
          fetch(`${API_URL}/analytics/daily?restaurantId=${rid}&range=week`),
          fetch(`${API_URL}/analytics/kpis?restaurantId=${rid}`),
          fetch(`${API_URL}/analytics/capacity-realtime?restaurantId=${rid}`)
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
        if (kpiRes.ok) {
          const data = await kpiRes.json();
          setKpiData(data);
        }
        if (capacityRes.ok) {
          const data = await capacityRes.json();
          setCapacityData(data);
        }
        
        setAnalyticsLoading(false);
      } catch (error) {
        console.error('Failed to load analytics:', error);
        setAnalyticsError('Failed to load analytics data. Please try again.');
        setAnalyticsLoading(false);
      }
    };
    loadAnalytics();
    timer = setInterval(loadAnalytics, 60000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

  const markAsNoShow = async (id: number) => {
    const customer = waitlist.find(item => item.id === id);
    if (!customer) return;
    
    const reservationId = (customer as any).reservationId;
    if (!reservationId) {
      toast.error('Invalid reservation data');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'no_show' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark as no-show');
      }
      
      // Success! Refresh data from database
      await loadReservationsFromDB();
      
      toast.error(`${customer.name} marked as no-show`);
    } catch (error: any) {
      console.error('Error marking as no-show:', error);
      toast.error(error.message || 'Failed to mark as no-show');
      
      // Refresh data to ensure UI matches database state
      await loadReservationsFromDB();
    }
  };

  const removeFromWaitlist = async (id: number) => {
    const customer = waitlist.find(item => item.id === id);
    if (!customer) return;
    
    const reservationId = (customer as any).reservationId;
    if (!reservationId) {
      toast.error('Invalid reservation data');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove from waitlist');
      }
      
      // Success! Refresh data from database
      await loadReservationsFromDB();
      
      toast.success('Customer removed from waitlist');
    } catch (error: any) {
      console.error('Error removing from waitlist:', error);
      toast.error(error.message || 'Failed to remove from waitlist');
      
      // Refresh data to ensure UI matches database state
      await loadReservationsFromDB();
    }
  };

  const seatCustomer = async (id: number) => {
    const customer = waitlist.find(item => item.id === id);
    if (!customer) return;
    
    const reservationId = (customer as any).reservationId;
    if (!reservationId) {
      toast.error('Invalid reservation data');
      return;
    }
    
    try {
      // Use the new assign-table endpoint for atomic database updates
      const response = await fetch(`${API_URL}/reservations/${reservationId}/assign-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign table');
      }
      
      const data = await response.json();
      
      // Notify customer
      try {
        await notifyTableReady(
          customer.phone,
          customer.contactMethod,
          'Spice Route'
        );
      } catch (notifyError) {
        console.log('Notification failed but table assigned:', notifyError);
      }
      
      // Success! Refresh data from database
      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
      
      toast.success(`${customer.name} seated at ${data.table.name}`);
    } catch (error: any) {
      console.error('Error seating customer:', error);
      toast.error(error.message || 'Failed to seat customer');
      
      // Refresh data to ensure UI matches database state
      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
    }
  };
  
  // Helper function to reload reservations from database
  const loadReservationsFromDB = async () => {
    try {
      if (!staffAuth?.restaurantId) return;
      
      // Fetch both reservations and tables to properly map table names
      const [resRes, tablesRes] = await Promise.all([
        fetch(`${API_URL}/reservations?${new URLSearchParams({ restaurantId: staffAuth.restaurantId }).toString()}`),
        fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/tables`)
      ]);
      
      if (!resRes.ok) return;
      const resData = await resRes.json();
      const items: any[] = resData.items || [];
      
      console.log('Raw reservation data from API:', JSON.stringify(items.filter(r => r.status === 'seated'), null, 2));
      
      // Detect and auto-fix corrupted seated reservations (seated but no tableId)
      const corruptedSeated = items.filter(r => r.status === 'seated' && !r.leftAt && !r.tableId);
      if (corruptedSeated.length > 0) {
        console.warn('Found corrupted seated reservations (seated status but no tableId):', corruptedSeated);
        console.warn('Auto-fixing corrupted reservations by resetting status to "confirmed"...');
        
        // Auto-fix: reset status to confirmed so they appear in waitlist
        for (const corrupt of corruptedSeated) {
          try {
            await fetch(`${API_URL}/reservations/${corrupt._id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'confirmed' })
            });
            console.log(`Fixed reservation ${corrupt._id}`);
          } catch (err) {
            console.error(`Failed to fix reservation ${corrupt._id}:`, err);
          }
        }
        
        // Reload data after fixes
        if (corruptedSeated.length > 0) {
          const retryRes = await fetch(`${API_URL}/reservations?${new URLSearchParams({ restaurantId: staffAuth.restaurantId }).toString()}`);
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            items.length = 0;
            items.push(...(retryData.items || []));
          }
        }
      }
      
      // Create a map of tableId -> table name
      const tableMap = new Map<string, string>();
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        const tables: any[] = tablesData.items || [];
        console.log('Tables from API:', JSON.stringify(tables, null, 2));
        tables.forEach((t: any) => {
          tableMap.set(t._id, t.name);
        });
      }
      
      // Derive waitlist from database state
      const wl = items
        .filter(r => (r.status === 'pending' || r.status === 'confirmed'))
        .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0))
        .map((r, idx) => ({
          id: idx + 1,
          reservationId: r._id,
          name: r.name || 'Queue Customer',
          partySize: r.partySize || 2,
          waitTime: '—',
          phone: r.phone || '',
          joined: new Date(r.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          contactMethod: (r.contactMethod || 'phone') as any,
          holdTimeExpires: Date.now() + 10 * 60000,
        }));
      setWaitlist(wl);
      
      // Derive seated tables from database state (reservations with leftAt === null)
      // IMPORTANT: Only include reservations that have a valid tableId
      const seated = items
        .filter(r => r.status === 'seated' && !r.leftAt && r.tableId)
        .map((r, idx) => {
          const tableName = r.tableId && tableMap.has(r.tableId) 
            ? tableMap.get(r.tableId)! 
            : 'Table';
          
          console.log('Processing seated reservation:', {
            _id: r._id,
            tableId: r.tableId,
            tableName: tableName,
            name: r.name,
            status: r.status
          });
          
          return {
            id: idx + 1,
            reservationId: r._id,
            tableId: r.tableId,
            table: tableName,
            guests: r.name || 'Seated Party',
            partySize: r.partySize || 2,
            capacity: r.partySize || 4,
            seatedTime: r.seatedAt ? new Date(r.seatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
            duration: '—',
          };
        });
      console.log('Seated tables array:', seated);
      setSeatedTables(seated);
    } catch (error) {
      console.error('Failed to reload reservations:', error);
    }
  };
  
  // Helper function to reload tables from database
  const loadTablesFromDB = async () => {
    try {
      if (!staffAuth?.restaurantId) return;
      const res = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/tables`);
      if (!res.ok) return;
      const data = await res.json();
      const items: any[] = data.items || [];
      
      // Count tables by status for debugging
      const statusCounts = {
        available: items.filter(t => t.status === 'available').length,
        occupied: items.filter(t => t.status === 'occupied').length,
        cleaning: items.filter(t => t.status === 'cleaning').length,
        total: items.length
      };
      console.log('Tables by status:', statusCounts);
      
      setTablesCount(items.length); // Total count of ALL tables
      
      // Derive available tables from database state
      const avail = items
        .filter(t => t.status === 'available')
        .map((t: any) => ({ 
          id: t._id, 
          tableName: t.name, 
          capacity: t.capacity, 
          isOccupied: false 
        }));
      setAvailableTables(avail);
    } catch (error) {
      console.error('Failed to reload tables:', error);
    }
  };

  const checkOutTable = async (id: number) => {
    const table = seatedTables.find(item => item.id === id);
    if (!table) return;
    
    console.log('Checking out table:', table);
    
    let tableId = (table as any).tableId;
    
    // If tableId is missing, try to find it from the tables list using reservationId
    if (!tableId && (table as any).reservationId) {
      console.log('TableId missing, attempting fallback lookup by reservationId:', (table as any).reservationId);
      
      // Try to find the table by matching currentReservationId with our reservationId
      const allCurrentTables = [...availableTables, ...seatedTables];
      const matchingTableFromState = allCurrentTables.find(t => 
        (t as any).currentReservationId === (table as any).reservationId
      );
      
      if (matchingTableFromState) {
        tableId = (matchingTableFromState as any).id || (matchingTableFromState as any).tableId;
        console.log('Found tableId via fallback:', tableId);
      }
      
      // If still not found, fetch from backend
      if (!tableId) {
        try {
          const params = new URLSearchParams({ restaurantId: staffAuth?.restaurantId || '' });
          const res = await fetch(`${API_URL}/tables?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            const matchingTable = (data.items || []).find((t: any) => 
              t.currentReservationId === (table as any).reservationId
            );
            if (matchingTable) {
              tableId = matchingTable._id;
              console.log('Found tableId from backend:', tableId);
            }
          }
        } catch (error) {
          console.error('Failed to lookup tableId from backend:', error);
        }
      }
    }
    
    if (!tableId) {
      console.error('Missing tableId in table object:', table);
      toast.error(`Invalid table data: missing tableId. Reservation: ${(table as any).reservationId || 'unknown'}`);
      
      // Try to refresh data in case it's stale
      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
      return;
    }
    
    try {
      // Use the enhanced checkout endpoint for atomic database updates
      const response = await fetch(`${API_URL}/tables/${tableId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to checkout table');
      }
      
      const data = await response.json();
      
      // Success! Refresh data from database
      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
      
      toast.success(`${table.table} checked out successfully (${data.dwellTimeMinutes} min)`);
    } catch (error: any) {
      console.error('Error checking out table:', error);
      toast.error(error.message || 'Failed to check out table');
      
      // Refresh data to ensure UI matches database state
      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
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

  const openSeatWalkInModal = (tableId: number) => {
    const availableTable = availableTables.find(table => table.id === tableId);
    if (!availableTable) return;
    
    setSelectedTableForSeating(availableTable);
    setWalkInPartySize(2);
    setWalkInCustomerName('');
    setWalkInFormErrors({});
    setSeatWalkInModalOpen(true);
  };

  const validateWalkInForm = () => {
    const errors: Record<string, string> = {};
    
    if (!selectedTableForSeating) {
      errors.table = 'No table selected';
      return false;
    }
    
    if (walkInPartySize < 1 || walkInPartySize > selectedTableForSeating.capacity) {
      errors.partySize = `Party size must be between 1 and ${selectedTableForSeating.capacity}`;
    }
    
    setWalkInFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSeatWalkIn = async () => {
    if (!validateWalkInForm() || !selectedTableForSeating) return;

    const partySize = walkInPartySize;
    const customerName = walkInCustomerName.trim() || 'Walk-in Customer';

    try {
      // 1. Create reservation record for walk-in (proper data recording)
      const createResponse = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: staffAuth.restaurantId,
          mode: 'reserve', // Walk-ins are treated as regular reservations
          name: customerName,
          partySize: partySize,
          contactMethod: 'phone',
          phone: '0000000000' // Placeholder for walk-ins
        })
      });
      
      if (!createResponse.ok) {
        throw new Error('Failed to create reservation record');
      }
      
      const reservationData = await createResponse.json();
      const reservationId = reservationData.reservation._id;
      
      // 2. Immediately assign to the specific table selected by staff
      const assignResponse = await fetch(`${API_URL}/reservations/${reservationId}/assign-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTableForSeating.id // Pass the specific table ID selected by staff
        })
      });
      
      if (!assignResponse.ok) {
        const errorData = await assignResponse.json();
        throw new Error(errorData.error || 'Failed to assign table');
      }
      
      const assignData = await assignResponse.json();
      
      // 3. Refresh all data from database
      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
      
      toast.success(`${customerName} (party of ${partySize}) seated at ${assignData.table.name}`);
      
      // Close modal and reset form
      setSeatWalkInModalOpen(false);
      setSelectedTableForSeating(null);
      setWalkInPartySize(2);
      setWalkInCustomerName('');
    } catch (error: any) {
      console.error('Error seating walk-in:', error);
      toast.error(error.message || 'Failed to seat walk-in customer');
      
      // Refresh data to ensure UI matches database state
      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
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
          <TabsTrigger value="profile" style={{color: 'var(--where2go-accent)'}}>Profile</TabsTrigger>
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
                                onClick={() => openSeatWalkInModal(table.id)}
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
                  <Button 
                    className="pill-button text-white" 
                    style={{backgroundColor: '#B889A6'}}
                    onClick={() => setDailySummaryDialogOpen(true)}
                  >
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
                    onClick={() => setMenuManagementModalOpen(true)}
                    style={{backgroundColor: '#5A5E3E'}}
                  >
                    <Menu className="h-4 w-4 mr-2" />
                    Edit Menu Items
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
            {/* Error Message */}
            {analyticsError && (
              <Card className="border-2 border-red-500 bg-red-50">
                <CardContent className="p-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800">{analyticsError}</p>
                </CardContent>
              </Card>
            )}
            
            {/* Loading State */}
            {analyticsLoading && !kpiData && (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: '#5A5E3E'}}></div>
                <span className="ml-4" style={{color: '#2D2D2B'}}>Loading analytics...</span>
              </div>
            )}
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="card-shadow border-0 rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm mb-1" style={{color: '#2D2D2B'}}>Today's Customers</p>
                      <p className="text-3xl font-bold" style={{color: '#2D2D2B'}}>
                        {kpiData?.todaysCustomers?.value ?? 0}
                      </p>
                      <div className="flex items-center mt-2">
                        {kpiData?.todaysCustomers?.change >= 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1" style={{color: '#5A5E3E'}} />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" style={{color: '#EF4444'}} />
                        )}
                        <span className="text-sm" style={{color: kpiData?.todaysCustomers?.change >= 0 ? '#5A5E3E' : '#EF4444'}}>
                          {kpiData?.todaysCustomers?.change >= 0 ? '+' : ''}{kpiData?.todaysCustomers?.change || 0} vs yesterday
                        </span>
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
                      <p className="text-3xl font-bold" style={{color: '#2D2D2B'}}>
                        {kpiData?.avgWaitTime?.value ?? 0}m
                      </p>
                      <div className="flex items-center mt-2">
                        {kpiData?.avgWaitTime?.change <= 0 ? (
                          <TrendingDown className="h-4 w-4 mr-1" style={{color: '#5A5E3E'}} />
                        ) : (
                          <TrendingUp className="h-4 w-4 mr-1" style={{color: '#EF4444'}} />
                        )}
                        <span className="text-sm" style={{color: kpiData?.avgWaitTime?.change <= 0 ? '#5A5E3E' : '#EF4444'}}>
                          {kpiData?.avgWaitTime?.change >= 0 ? '+' : ''}{kpiData?.avgWaitTime?.change || 0}m vs yesterday
                        </span>
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
                      <p className="text-3xl font-bold" style={{color: '#2D2D2B'}}>
                        {kpiData?.tableTurnover?.value ?? 0}x
                      </p>
                      <div className="flex items-center mt-2">
                        {kpiData?.tableTurnover?.change >= 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1" style={{color: '#5A5E3E'}} />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" style={{color: '#EF4444'}} />
                        )}
                        <span className="text-sm" style={{color: kpiData?.tableTurnover?.change >= 0 ? '#5A5E3E' : '#EF4444'}}>
                          {kpiData?.tableTurnover?.change >= 0 ? '+' : ''}{kpiData?.tableTurnover?.change || 0}x vs yesterday
                        </span>
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
                      <p className="text-3xl font-bold" style={{color: '#2D2D2B'}}>
                        {kpiData?.peakCapacity?.value ?? 0}%
                      </p>
                      <div className="flex items-center mt-2">
                        {kpiData?.peakCapacity?.change >= 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1" style={{color: '#5A5E3E'}} />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" style={{color: '#EF4444'}} />
                        )}
                        <span className="text-sm" style={{color: kpiData?.peakCapacity?.change >= 0 ? '#5A5E3E' : '#EF4444'}}>
                          {kpiData?.peakCapacity?.change >= 0 ? '+' : ''}{kpiData?.peakCapacity?.change || 0}% vs yesterday
                        </span>
                      </div>
                    </div>
                    <div className="rounded-full w-12 h-12 flex items-center justify-center" style={{backgroundColor: '#FAF8F2'}}>
                      <CalendarIcon className="h-6 w-6" style={{color: '#5A5E3E'}} />
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
                  <CardTitle className="text-xl" style={{color: '#2D2D2B'}}>Overview: Seated vs Waiting (Last 7 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-gray-500">
                      <p>No data available for the last 7 days</p>
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyData.map(d => {
                      try {
                        const date = new Date(d.day + 'T00:00:00'); // Add time to avoid timezone issues
                        return {
                          name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
                          seated: d.seated || 0, 
                          waiting: d.waiting || 0
                        };
                      } catch (e) {
                        return {
                          name: d.day, 
                          seated: d.seated || 0, 
                          waiting: d.waiting || 0
                        };
                      }
                    })}>
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
                      <Bar dataKey="seated" fill="#5A5E3E" radius={[4, 4, 0, 0]} name="Seated" />
                      <Bar dataKey="waiting" fill="#B889A6" radius={[4, 4, 0, 0]} name="Waiting" />
                    </BarChart>
                  </ResponsiveContainer>
                  )}
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
                        data={(() => {
                          const total = (capacityData?.total || 0);
                          if (total === 0) {
                            return [{ name: 'No Tables', value: 100, color: '#E7D7C5' }];
                          }
                          return [
                            { name: 'Occupied', value: capacityData?.occupiedPercent || 0, color: '#5A5E3E' },
                            { name: 'Available', value: capacityData?.availablePercent || 0, color: '#B889A6' },
                            { name: 'Cleaning', value: capacityData?.cleaningPercent || 0, color: '#F3C084' }
                          ].filter(entry => entry.value > 0);
                        })()}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {(() => {
                          const total = (capacityData?.total || 0);
                          if (total === 0) {
                            return [<Cell key="no-tables" fill="#E7D7C5" />];
                          }
                          const colors = ['#5A5E3E', '#B889A6', '#F3C084'];
                          return [
                            { name: 'Occupied', color: '#5A5E3E' },
                            { name: 'Available', color: '#B889A6' },
                            { name: 'Cleaning', color: '#F3C084' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ));
                        })()}
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
                {peakHoursData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <p>No data available for today</p>
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={
                    peakHoursData.length === 24
                      ? peakHoursData.map(item => ({ time: item.time, customers: item.all }))
                      : Array.from({ length: 24 }, (_, i) => {
                          const existing = peakHoursData.find(p => {
                            const [hours] = p.time.split(':');
                            return parseInt(hours, 10) === i;
                          });
                          return { 
                            time: `${String(i).padStart(2, '0')}:00`, 
                            customers: existing ? existing.all : 0 
                          };
                        })
                  }>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E7D7C5" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#2D2D2B"
                      interval={2}
                    />
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
                      dataKey="customers" 
                      stroke="#5A5E3E" 
                      strokeWidth={3}
                      name="Customers"
                      dot={{ fill: '#5A5E3E', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 7, fill: '#ffffff', stroke: '#5A5E3E', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="card-shadow border-0 rounded-2xl" style={{background: 'linear-gradient(135deg, #FAF8F2 0%, #E7D7C5 100%)'}}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#5A5E3E'}}>Peak Hour</h3>
                  {peakHoursData.length > 0 && peakHoursData.some(d => d.all > 0) ? (() => {
                    const peak = peakHoursData.reduce((a, b) => (b.all > a.all ? b : a));
                    const [hours, minutes] = peak.time.split(':');
                    const hour24 = parseInt(hours, 10);
                    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                    const ampm = hour24 >= 12 ? 'PM' : 'AM';
                    return (
                      <>
                        <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{hour12}:{minutes} {ampm}</p>
                        <p className="text-sm" style={{color: '#2D2D2B'}}>{peak.all} customers</p>
                      </>
                    );
                  })() : (
                    <p className="text-sm" style={{color: '#2D2D2B'}}>No data</p>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl" style={{background: 'linear-gradient(135deg, #FAF8F2 0%, #E7D7C5 100%)'}}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#5A5E3E'}}>Busiest Day</h3>
                  {dailyData.length > 0 && dailyData.some(d => d.total > 0) ? (() => {
                    const busiest = dailyData.reduce((a, b) => (b.total > a.total ? b : a));
                    try {
                      const date = new Date(busiest.day);
                      const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <>
                          <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{formatted}</p>
                          <p className="text-sm" style={{color: '#2D2D2B'}}>{busiest.total} customers</p>
                        </>
                      );
                    } catch (e) {
                      return (
                        <>
                          <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{busiest.day}</p>
                          <p className="text-sm" style={{color: '#2D2D2B'}}>{busiest.total} customers</p>
                        </>
                      );
                    }
                  })() : (
                    <p className="text-sm" style={{color: '#2D2D2B'}}>No data</p>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-2xl" style={{background: 'linear-gradient(135deg, #FAF8F2 0%, #E7D7C5 100%)'}}>
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2" style={{color: '#5A5E3E'}}>Efficiency Score</h3>
                  {(() => {
                    // Calculate efficiency score based on:
                    // 1. Wait time (lower is better, max 60 min = 0% wait penalty, 0 min = 100% wait score)
                    // 2. Table utilization (seatedToday / tablesCount, higher is better)
                    const waitTimeScore = Math.max(0, Math.min(100, (60 - Math.min(avgWaitMinutes, 60)) / 60 * 100));
                    const utilizationScore = tablesCount > 0 ? Math.min(100, (seatedToday / tablesCount) * 100) : 0;
                    const efficiency = Math.round(waitTimeScore * 0.4 + utilizationScore * 0.6);
                    return (
                      <>
                        <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{efficiency}%</p>
                        <p className="text-sm" style={{color: '#2D2D2B'}}>Based on wait time and utilization</p>
                      </>
                    );
                  })()}
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

          <TabsContent value="profile" className="space-y-8">
            {staffAuth.restaurantId && staffAuth.token && staffAuth.user ? (
              <RestaurantProfile
                user={staffAuth.user}
                restaurantId={staffAuth.restaurantId}
                token={staffAuth.token}
                onUserUpdate={onUserUpdate}
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

      {/* Menu Management Modal */}
      <MenuManagementModal
        isOpen={menuManagementModalOpen}
        onClose={() => setMenuManagementModalOpen(false)}
        restaurantId={staffAuth.restaurantId}
      />

      {/* Seat Walk-In Modal */}
      <Dialog open={seatWalkInModalOpen} onOpenChange={setSeatWalkInModalOpen}>
        <DialogContent className="sm:max-w-md mx-4" style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}>
          <DialogHeader>
            <DialogTitle className="flex items-center" style={{color: '#2D2D2B'}}>
              <UserPlus className="h-5 w-5 mr-2" />
              Seat Walk-In Guest
            </DialogTitle>
            <DialogDescription style={{color: '#2D2D2B'}}>
              {selectedTableForSeating && (
                <>Seating guest at <strong>{selectedTableForSeating.tableName}</strong> (capacity: {selectedTableForSeating.capacity})</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Party Size */}
            <div className="space-y-2">
              <Label htmlFor="partySize" style={{color: '#2D2D2B'}}>
                Party Size <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWalkInPartySize(Math.max(1, walkInPartySize - 1))}
                  className="h-9 w-9 p-0"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="partySize"
                  type="number"
                  min="1"
                  max={selectedTableForSeating?.capacity || 20}
                  value={walkInPartySize}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    const max = selectedTableForSeating?.capacity || 20;
                    setWalkInPartySize(Math.max(1, Math.min(max, value)));
                  }}
                  className="bg-input-background text-center"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const max = selectedTableForSeating?.capacity || 20;
                    setWalkInPartySize(Math.min(max, walkInPartySize + 1));
                  }}
                  className="h-9 w-9 p-0"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                  disabled={walkInPartySize >= (selectedTableForSeating?.capacity || 20)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {walkInFormErrors.partySize && (
                <p className="text-sm text-red-600">{walkInFormErrors.partySize}</p>
              )}
              {selectedTableForSeating && (
                <p className="text-xs" style={{color: '#2D2D2B', opacity: 0.7}}>
                  Maximum capacity: {selectedTableForSeating.capacity} guests
                </p>
              )}
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="customerName" style={{color: '#2D2D2B'}}>
                Customer Name (Optional)
              </Label>
              <Input
                id="customerName"
                type="text"
                placeholder="Enter customer name or leave blank"
                value={walkInCustomerName}
                onChange={(e) => setWalkInCustomerName(e.target.value)}
                className="bg-input-background"
                style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
              />
              <p className="text-xs" style={{color: '#2D2D2B', opacity: 0.7}}>
                If left blank, will default to "Walk-in Customer"
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSeatWalkInModalOpen(false);
                setSelectedTableForSeating(null);
                setWalkInPartySize(2);
                setWalkInCustomerName('');
                setWalkInFormErrors({});
              }}
              style={{borderColor: 'rgba(183, 65, 14, 0.3)', color: '#2D2D2B'}}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSeatWalkIn}
              className="text-white"
              style={{backgroundColor: '#3F4427'}}
            >
              Seat Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Summary Dialog */}
      <Dialog open={dailySummaryDialogOpen} onOpenChange={setDailySummaryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate Daily Summary</DialogTitle>
            <DialogDescription>
              Select a date to generate a daily summary report. The report will open as a PDF in a new tab.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date: Date | undefined) => date && setSelectedDate(date)}
              disabled={(date: Date) => date > new Date()}
              className="rounded-md border"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDailySummaryDialogOpen(false);
                setSelectedDate(new Date());
              }}
              style={{borderColor: 'rgba(183, 65, 14, 0.3)', color: '#2D2D2B'}}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!staffAuth.restaurantId) {
                  toast.error('Restaurant ID not found');
                  return;
                }

                setGeneratingPdf(true);
                try {
                  // Format date as YYYY-MM-DD using local date (not UTC to avoid timezone offset)
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const day = String(selectedDate.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${day}`;
                  
                  // Generate summary first (this ensures data is calculated and stored)
                  await generateDailySummary(staffAuth.restaurantId, dateStr);
                  
                  // Open PDF in new tab
                  openDailySummaryPdf(staffAuth.restaurantId, dateStr);
                  
                  toast.success('Daily summary PDF generated successfully');
                  setDailySummaryDialogOpen(false);
                } catch (error: any) {
                  // Handle "no data" errors specifically
                  const errorData = error.message || 'Failed to generate daily summary';
                  if (errorData.includes('No data available') || errorData.includes('No reservations found') || errorData.includes('did not exist')) {
                    toast.error(errorData);
                  } else {
                    toast.error(errorData || 'Failed to generate daily summary');
                  }
                } finally {
                  setGeneratingPdf(false);
                }
              }}
              disabled={generatingPdf}
              className="text-white"
              style={{backgroundColor: '#3F4427'}}
            >
              {generatingPdf ? 'Generating...' : 'Generate PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}