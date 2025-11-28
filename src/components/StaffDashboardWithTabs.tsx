import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Users, Table, Clock, CheckCircle, Phone, X, User, Calendar as CalendarIcon, FileText, TrendingUp, TrendingDown, LogOut, Plus, Minus, Trash2, UserPlus, Settings, AlertCircle, Menu, Mail, Loader2 } from 'lucide-react';
import { TableManagementModal } from './TableManagementModal';
import { MenuManagementModal } from './MenuManagementModal';
import { RestaurantProfile } from './RestaurantProfile';
import { toast } from 'sonner';
import { WaveBackground } from './WaveBackground';
import { notifyTableReady, notifyQueuePositionUpdate } from '../services/NotificationService';
import { Calendar } from './ui/calendar';
import { openDailySummaryPdf, generateDailySummary } from '../services/analyticsApi';
import { useRestaurant } from './RestaurantContext';
import { estimateWaitTimes } from '../utils/waitTimeEstimator';
import { startStaffSSE, stopStaffSSE } from '../services/staffSSE';

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
  onRestaurantDeleted: () => void;
}

// Analytics state (live)
type Overview = { total: number; confirmed: number; seated: number; cancelled: number };

const formatWaitBadge = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes <= 0) return 'Ready now';
  if (minutes <= 5) return '≈5 min';
  if (minutes <= 10) return '≈10 min';
  if (minutes <= 15) return '≈15 min';
  return `≈${minutes} min`;
};

export function StaffDashboardWithTabs({ onNavigate, staffAuth, onLogout, onUserUpdate, onRestaurantDeleted }: StaffDashboardProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const { allRestaurants } = useRestaurant();
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
  const [dailyData, setDailyData] = useState<{ day: string; total: number; reservations: number; walkIns: number; cancelled?: number; noShow?: number }[]>([]);
  const [kpiData, setKpiData] = useState<any>(null);
  const [capacityData, setCapacityData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [dailySummaryDialogOpen, setDailySummaryDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [guestSelectionModalOpen, setGuestSelectionModalOpen] = useState(false);
  const [phoneDisplayModalOpen, setPhoneDisplayModalOpen] = useState(false);
  const [selectedGuestForCall, setSelectedGuestForCall] = useState<{ name: string; phone: string; reservationId: string } | null>(null);
  const [clearQueueDialogOpen, setClearQueueDialogOpen] = useState(false);
  const [tableSeatingDialogOpen, setTableSeatingDialogOpen] = useState(false);
  const [tableCustomerSelectionOpen, setTableCustomerSelectionOpen] = useState(false);
  const [tableEditDialogOpen, setTableEditDialogOpen] = useState(false);
  const [selectedTableForEdit, setSelectedTableForEdit] = useState<{ id: string; name: string; capacity: number } | null>(null);
  const [tableEditName, setTableEditName] = useState('');
  const [tableEditCapacity, setTableEditCapacity] = useState(4);
  const [customerSearchFilter, setCustomerSearchFilter] = useState('');
  const [checkingInIds, setCheckingInIds] = useState<Set<number>>(new Set());
  const [seatingIds, setSeatingIds] = useState<Set<number>>(new Set());
  const [checkingOutIds, setCheckingOutIds] = useState<Set<number>>(new Set());

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
    // Poll every 5 seconds to quickly reflect table status changes
    timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

  // Replace hardcoded waitlist/seated with live data
  useEffect(() => {
    let timer: any;
    loadReservationsFromDB();
    // Poll every 5 seconds to quickly reflect customer cancellations and status changes
    timer = setInterval(loadReservationsFromDB, 5000);
    return () => clearInterval(timer);
  }, [API_URL, staffAuth?.restaurantId]);

  // Setup SSE connection for real-time staff notifications
  // Note: This must be after loadReservationsFromDB and loadTablesFromDB are defined
  // We'll add this effect after those function definitions

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
        body: JSON.stringify({ status: 'cancelled', cancellationReason: 'staff_removed' })
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

  // Check in customer - starts 15-minute hold
  const checkInCustomer = async (id: number) => {
    const customer = waitlist.find(item => item.id === id);
    if (!customer) return;
    
    const reservationId = (customer as any).reservationId;
    if (!reservationId) {
      toast.error('Invalid reservation data');
      return;
    }
    
    // Set loading state
    setCheckingInIds(prev => new Set(prev).add(id));
    
    try {
      // Update status to 'confirmed' which triggers the 15-minute hold
      const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check in customer');
      }
      
      // Refresh data
      await loadReservationsFromDB();
      
      toast.success(`${customer.name} checked in! Table will be held for 15 minutes. Email notification sent.`, {
        duration: 5000
      });
    } catch (error: any) {
      console.error('Error checking in customer:', error);
      toast.error(error.message || 'Failed to check in customer');
      await loadReservationsFromDB();
    } finally {
      // Clear loading state
      setCheckingInIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
    
    // Set loading state
    setSeatingIds(prev => new Set(prev).add(id));
    
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
    } finally {
      // Clear loading state
      setSeatingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };
  
  // Helper function to reload reservations from database
  const loadReservationsFromDB = async () => {
    try {
      if (!staffAuth?.restaurantId) return;
      
      // Fetch both reservations and tables to properly map table names
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const [resRes, tablesRes] = await Promise.all([
        fetch(`${API_URL}/reservations?${new URLSearchParams({ restaurantId: staffAuth.restaurantId, _t: timestamp.toString() }).toString()}`),
        fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/tables`)
      ]);
      
      if (!resRes.ok) return;
      const resData = await resRes.json();
      const items: any[] = resData.items || [];
      
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
        tables.forEach((t: any) => {
          tableMap.set(t._id, t.name);
        });
      }
      
      // Derive waitlist from database state
      const filteredItems = items
        .filter(r => (r.status === 'pending' || r.status === 'confirmed'))
        .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
      
      // #7 - Deduplicate by email/phone (keep most recent per unique contact)
      const seenContacts = new Map<string, any>();
      const deduplicatedItems = [];
      
      for (const r of filteredItems) {
        const contactKey = r.email || r.phone || `unnamed-${r._id}`;
        
        if (!seenContacts.has(contactKey)) {
          seenContacts.set(contactKey, r);
          deduplicatedItems.push(r);
        } else {
          // Keep the most recent reservation
          const existing = seenContacts.get(contactKey);
          const existingTime = new Date(existing.requestedAt).getTime();
          const currentTime = new Date(r.requestedAt).getTime();
          
          if (currentTime > existingTime) {
            // Replace with more recent
            const index = deduplicatedItems.findIndex(item => item._id === existing._id);
            if (index !== -1) {
              deduplicatedItems[index] = r;
              seenContacts.set(contactKey, r);
            }
          }
        }
      }
      
      const wl = deduplicatedItems.map((r, idx) => ({
        id: idx + 1,
        reservationId: r._id,
        name: r.name || 'Queue Customer',
        partySize: r.partySize || 2,
        waitTime: '—',
        phone: r.phone || '',
        email: r.email || '',
        joined: new Date(r.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contactMethod: (r.contactMethod || 'phone') as any,
        gender: r.gender,
        seatingPreference: r.seatingPreference,
        calledAt: r.calledAt ? new Date(r.calledAt) : null,
        reservationType: r.reservationType,
        holdTimeExpires: Date.now() + 10 * 60000,
        status: r.status, // Include status to show appropriate buttons
        holdUntil: r.holdUntil ? new Date(r.holdUntil) : null,
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

  // Setup SSE connection for real-time staff notifications
  // Placed after loadReservationsFromDB and loadTablesFromDB are defined
  useEffect(() => {
    if (!staffAuth?.restaurantId) return;

    // Helper to refresh all data
    const refreshAllData = async () => {
      await Promise.all([loadReservationsFromDB(), loadTablesFromDB()]);
    };

    // Start SSE connection with callback to refresh data on events
    startStaffSSE(staffAuth.restaurantId, refreshAllData);

    // Cleanup: stop SSE when component unmounts or restaurantId changes
    return () => {
      stopStaffSSE();
    };
  }, [staffAuth?.restaurantId]);

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
    
    // Set loading state
    setCheckingOutIds(prev => new Set(prev).add(id));
    
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
    } finally {
      // Clear loading state
      setCheckingOutIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const openGuestSelectionModal = () => {
    if (waitlist.length === 0) {
      toast.info('No customers in waitlist');
      return;
    }
    setGuestSelectionModalOpen(true);
  };

  const handleInviteGuest = async (customer: any) => {
    try {
      const reservationId = customer.reservationId;
      if (!reservationId) {
        toast.error('Invalid reservation data');
        return;
      }

      // Get restaurant name for email
      const restaurantRes = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}`);
      const restaurantData = await restaurantRes.json();
      const restaurantName = restaurantData.item?.name || 'the restaurant';

      if (customer.contactMethod === 'email' && customer.email) {
        // Send email notification
        const emailResponse = await fetch(`${API_URL}/reservations/${reservationId}/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Your table at ${restaurantName} is ready! Please come to the host stand.`,
            subject: 'Your table is ready'
          })
        });

        if (emailResponse.ok) {
          toast.success(`Email sent to ${customer.name}`);
          setGuestSelectionModalOpen(false);
        } else {
          const errorData = await emailResponse.json();
          throw new Error(errorData.error || 'Failed to send email');
        }
      } else if (customer.contactMethod === 'phone' && customer.phone) {
        // Display phone number for staff to call
        setSelectedGuestForCall({
          name: customer.name,
          phone: customer.phone,
          reservationId: reservationId
        });
        setPhoneDisplayModalOpen(true);
        setGuestSelectionModalOpen(false);
      } else {
        toast.error('No contact information available for this guest');
      }
    } catch (error: any) {
      console.error('Error inviting guest:', error);
      toast.error(error.message || 'Failed to invite guest');
    }
  };

  const markAsCalled = async () => {
    if (!selectedGuestForCall) return;
    
    try {
      const response = await fetch(`${API_URL}/reservations/${selectedGuestForCall.reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calledAt: new Date().toISOString() })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark as called');
      }
      
      toast.success(`Marked ${selectedGuestForCall.name} as called`);
      setPhoneDisplayModalOpen(false);
      setSelectedGuestForCall(null);
      
      // Refresh data to show updated status
      await loadReservationsFromDB();
    } catch (error: any) {
      console.error('Error marking as called:', error);
      toast.error(error.message || 'Failed to mark as called');
    }
  };

  const toggleCalledStatus = async (reservationId: string, currentlyCalled: boolean) => {
    try {
      const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calledAt: currentlyCalled ? null : new Date().toISOString() })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update called status');
      }
      
      toast.success(currentlyCalled ? 'Unmarked as called' : 'Marked as called');
      
      // Refresh data to show updated status
      await loadReservationsFromDB();
    } catch (error: any) {
      console.error('Error toggling called status:', error);
      toast.error(error.message || 'Failed to update called status');
    }
  };

  const handleClearQueue = async () => {
    try {
      if (!staffAuth.restaurantId) {
        toast.error('Restaurant ID not found');
        return;
      }
      
      const response = await fetch(`${API_URL}/maintenance/zero/${staffAuth.restaurantId}`, { 
        method: 'POST' 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear queue');
      }
      
      const data = await response.json();
      const clearedCount = data.count || 0;
      
      // Wait a moment for the database update to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Refresh all data - force a fresh fetch
      await loadReservationsFromDB();
      
      toast.success(`Queue cleared successfully. ${clearedCount} ${clearedCount === 1 ? 'reservation' : 'reservations'} cancelled.`);
      setClearQueueDialogOpen(false);
    } catch (error: any) {
      console.error('Error clearing queue:', error);
      toast.error(error.message || 'Failed to clear queue');
    }
  };

  const handleAutoAssignTable = async () => {
    try {
      if (!staffAuth.restaurantId) {
        toast.error('Restaurant ID not found');
        return;
      }

      // Find first customer in waitlist who fits any available table
      const fittingCustomer = waitlist.find(customer => {
        return availableTables.some(table => customer.partySize <= table.capacity);
      });

      if (!fittingCustomer) {
        toast.info('No customers in waitlist can fit any available table');
        return;
      }

      // Find best fitting table (smallest table that fits)
      const fittingTable = availableTables
        .filter(table => fittingCustomer.partySize <= table.capacity)
        .sort((a, b) => a.capacity - b.capacity)[0];

      if (!fittingTable) {
        toast.error('No suitable table found');
        return;
      }

      // Call assign-table endpoint with specific table
      const response = await fetch(`${API_URL}/reservations/${fittingCustomer.reservationId}/assign-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: fittingTable.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign table');
      }

      const data = await response.json();
      toast.success(`${fittingCustomer.name} seated at ${data.table.name}`);

      // Refresh data
      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
    } catch (error: any) {
      console.error('Error auto-assigning table:', error);
      toast.error(error.message || 'Failed to auto-assign table');
    }
  };

  // Check if auto-assign is possible
  const canAutoAssign = waitlist.some(customer => 
    availableTables.some(table => customer.partySize <= table.capacity)
  );

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

  const openTableSeatingDialog = (tableId: number) => {
    const table = availableTables.find(t => t.id === tableId);
    if (table) {
      setSelectedTableForSeating({ id: tableId, tableName: table.tableName, capacity: table.capacity });
      setTableSeatingDialogOpen(true);
    }
  };

  const handleAutoAssignFromWaitlist = async () => {
    if (!selectedTableForSeating) return;

    // Find first customer in waitlist who fits this table
    const fittingCustomer = waitlist.find(customer => 
      customer.partySize <= selectedTableForSeating.capacity
    );

    if (!fittingCustomer) {
      toast.info('No customers in waitlist can fit this table');
      setTableSeatingDialogOpen(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/reservations/${fittingCustomer.reservationId}/assign-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: selectedTableForSeating.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign table');
      }

      const data = await response.json();
      toast.success(`${fittingCustomer.name} seated at ${data.table.name}`);
      setTableSeatingDialogOpen(false);

      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
    } catch (error: any) {
      console.error('Error auto-assigning from waitlist:', error);
      toast.error(error.message || 'Failed to auto-assign table');
    }
  };

  const handleSeatCustomerFromWaitlist = async (customer: any) => {
    if (!selectedTableForSeating) return;

    try {
      const response = await fetch(`${API_URL}/reservations/${customer.reservationId}/assign-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: selectedTableForSeating.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign table');
      }

      const data = await response.json();
      toast.success(`${customer.name} seated at ${data.table.name}`);
      setTableCustomerSelectionOpen(false);
      setTableSeatingDialogOpen(false);

      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB()
      ]);
    } catch (error: any) {
      console.error('Error seating customer:', error);
      toast.error(error.message || 'Failed to seat customer');
    }
  };

  const handleEditTable = async () => {
    if (!selectedTableForEdit || !staffAuth.restaurantId) return;

    if (tableEditName.trim().length === 0) {
      toast.error('Table name cannot be empty');
      return;
    }

    if (tableEditCapacity < 1) {
      toast.error('Table capacity must be at least 1');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/tables/${selectedTableForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tableEditName.trim(),
          capacity: tableEditCapacity
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update table');
      }

      toast.success('Table updated successfully');
      setTableEditDialogOpen(false);
      await loadTablesFromDB();
    } catch (error: any) {
      console.error('Error editing table:', error);
      toast.error(error.message || 'Failed to update table');
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

  // Get customers who fit the selected table
  const getFittingCustomers = () => {
    if (!selectedTableForSeating) return [];
    return waitlist
      .filter(customer => customer.partySize <= selectedTableForSeating.capacity)
      .filter(customer => {
        if (!customerSearchFilter) return true;
        const searchLower = customerSearchFilter.toLowerCase();
        return (
          customer.name?.toLowerCase().includes(searchLower) ||
          customer.phone?.includes(searchLower) ||
          customer.email?.toLowerCase().includes(searchLower)
        );
      });
  };

  const canAutoAssignFromTable = selectedTableForSeating && 
    waitlist.some(customer => customer.partySize <= selectedTableForSeating.capacity);

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
            {/* Quick Actions */}
            <Card className="card-shadow border-0 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl" style={{color: '#2D2D2B'}}>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <div className="flex flex-wrap gap-4">
                  <Button 
                    className="pill-button text-white"
                    onClick={openGuestSelectionModal}
                    style={{backgroundColor: '#3F4427'}}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Select the Guest from the Waitlist
                  </Button>
                  <Button 
                    className="pill-button text-white"
                    onClick={handleAutoAssignTable}
                    disabled={!canAutoAssign}
                    style={{
                      backgroundColor: canAutoAssign ? '#5A5E3E' : '#9FA0A0',
                      cursor: canAutoAssign ? 'pointer' : 'not-allowed'
                    }}
                  >
                    <Table className="h-4 w-4 mr-2" />
                    Auto-Assign Table
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
                    onClick={() => setMenuManagementModalOpen(true)}
                    style={{backgroundColor: '#5A5E3E'}}
                  >
                    <Menu className="h-4 w-4 mr-2" />
                    Edit Menu Items
                  </Button>
                    <Button 
                      className="pill-button text-white"
                      style={{backgroundColor: '#B7410E'}}
                      onClick={() => setClearQueueDialogOpen(true)}
                    >
                      Clear Queue
                    </Button>
                </div>
              </CardContent>
            </Card>

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


            {/* Full Width Stacked Layout */}
            <div className="space-y-8">
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
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold" style={{color: '#2D2D2B'}}>{customer.name}</h4>
                                {customer.reservationType && (
                                  <Badge 
                                    className="px-2 py-0.5 rounded-full text-xs"
                                    style={{
                                      backgroundColor: customer.reservationType === 'reserved' ? '#3F4427' : '#B889A6',
                                      color: '#FFFFFF'
                                    }}
                                  >
                                    {customer.reservationType === 'reserved' ? 'Reserved Table' : 'Joined Waitlist'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm" style={{color: '#2D2D2B'}}>Party of {customer.partySize} • Joined {customer.joined}</p>
                            </div>
                          </div>
                          <Badge className="px-2 py-1 rounded-full text-xs" style={{backgroundColor: '#B889A6', color: '#5A5E3E'}}>
                            {customer.waitTime}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          {/* Contact Information */}
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1 text-sm" style={{color: '#2D2D2B'}}>
                              {customer.email && (
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-1" />
                                  {customer.email}
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-1" />
                                  {customer.phone}
                                </div>
                              )}
                              {!customer.email && !customer.phone && (
                                <span className="text-gray-400">No contact info</span>
                              )}
                            </div>
                            
                            <div className="flex gap-2">
                              {(customer as any).status === 'pending' ? (
                                <Button 
                                  size="sm" 
                                  onClick={() => checkInCustomer(customer.id)}
                                  disabled={checkingInIds.has(customer.id)}
                                  className="pill-button text-xs text-white"
                                  style={{backgroundColor: '#B8860B'}}
                                  title="Check in customer - starts 15 minute hold"
                                >
                                  {checkingInIds.has(customer.id) ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Checking In...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Check In
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <>
                                  <Button 
                                    size="sm" 
                                    onClick={() => seatCustomer(customer.id)}
                                    disabled={seatingIds.has(customer.id)}
                                    className="pill-button text-xs text-white"
                                    style={{backgroundColor: '#3F4427'}}
                                    title="Customer checked in - assign table"
                                  >
                                    {seatingIds.has(customer.id) ? (
                                      <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Seating...
                                      </>
                                    ) : (
                                      'Seat Now'
                                    )}
                                  </Button>
                                  {(customer as any).holdUntil && (
                                    <Badge 
                                      className="px-2 py-1 text-xs"
                                      style={{backgroundColor: '#FEF3C7', color: '#92400E'}}
                                    >
                                      Hold: {new Date((customer as any).holdUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Badge>
                                  )}
                                </>
                              )}
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
                          
                          {/* Preferences */}
                          {(customer.gender || customer.seatingPreference) && (
                            <div className="flex flex-wrap gap-3 text-xs" style={{color: '#5A5E3E'}}>
                              {customer.gender && (
                                <span>
                                  Gender: {customer.gender === 'prefer-not-to-say' ? 'Prefer not to say' : customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1)}
                                </span>
                              )}
                              {customer.seatingPreference && (
                                <span>
                                  Seating: {customer.seatingPreference === 'no-preference' ? 'No preference' : customer.seatingPreference.charAt(0).toUpperCase() + customer.seatingPreference.slice(1)}
                                </span>
                              )}
                            </div>
                          )}
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

              {/* Tables Management - Combined Currently Seated and Available Tables */}
              <Card className="card-shadow border-0 rounded-3xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl flex items-center" style={{color: '#2D2D2B'}}>
                      <Table className="h-6 w-6 mr-2" style={{color: '#5A5E3E'}} />
                      Tables
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
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Half - Currently Seated */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium uppercase tracking-wide flex items-center" style={{color: '#2D2D2B'}}>
                        <Table className="h-4 w-4 mr-2" />
                        Currently Seated ({seatedTables.length})
                      </h5>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
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
                                disabled={checkingOutIds.has(table.id)}
                                className="pill-button text-xs text-white"
                                style={{backgroundColor: '#3F4427'}}
                              >
                                {checkingOutIds.has(table.id) ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Checking Out...
                                  </>
                                ) : (
                                  'Check Out'
                                )}
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
                    </div>

                    {/* Right Half - Available Tables */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium uppercase tracking-wide flex items-center" style={{color: '#2D2D2B'}}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Available Tables ({availableTables.length})
                      </h5>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
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
                                  onClick={() => openTableSeatingDialog(table.id)}
                                  className="pill-button text-xs h-7 px-2 text-white"
                                  style={{backgroundColor: '#3F4427'}}
                                  title="Seat customer at this table"
                                >
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Seat
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedTableForEdit({ id: table.id, name: table.tableName, capacity: table.capacity });
                                    setTableEditName(table.tableName);
                                    setTableEditCapacity(table.capacity);
                                    setTableEditDialogOpen(true);
                                  }}
                                  className="pill-button text-xs h-7 w-7 p-0"
                                  style={{borderColor: '#5A5E3E', color: '#5A5E3E'}}
                                  title="Edit table"
                                >
                                  <Settings className="h-3 w-3" />
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
                  </div>
                </CardContent>
              </Card>
            </div>
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
              {/* Reservations vs Walk-ins Chart */}
              <Card className="card-shadow border-0 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-xl" style={{color: '#2D2D2B'}}>Overview: Reservations vs Walk-ins (Last 7 Days)</CardTitle>
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
                          reservations: d.reservations || 0, 
                          walkIns: d.walkIns || 0
                        };
                      } catch (e) {
                        return {
                          name: d.day, 
                          reservations: d.reservations || 0, 
                          walkIns: d.walkIns || 0
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
                      <Bar dataKey="reservations" fill="#5A5E3E" radius={[4, 4, 0, 0]} name="Reservations" />
                      <Bar dataKey="walkIns" fill="#B889A6" radius={[4, 4, 0, 0]} name="Walk-ins" />
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
            <div className="grid md:grid-cols-2 gap-6">
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
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-8">
            {staffAuth.restaurantId && staffAuth.token && staffAuth.user ? (
              <RestaurantProfile
                user={staffAuth.user}
                restaurantId={staffAuth.restaurantId}
                token={staffAuth.token}
                onUserUpdate={onUserUpdate}
                onRestaurantDeleted={() => {
                  toast.success('Your restaurant has been deleted. You have been signed out.');
                  onRestaurantDeleted();
                }}
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

      {/* Guest Selection Modal */}
      <Dialog open={guestSelectionModalOpen} onOpenChange={setGuestSelectionModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Guest from Waitlist</DialogTitle>
            <DialogDescription>
              Choose a guest to invite. An email will be sent or a phone number will be displayed based on their contact method.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {waitlist.length === 0 ? (
              <p className="text-center py-8" style={{color: '#9FA0A0'}}>No customers in waitlist</p>
            ) : (
              waitlist.map((customer) => (
                <div
                  key={customer.id}
                  className="p-4 rounded-lg border"
                  style={{borderColor: 'rgba(183, 65, 14, 0.2)', backgroundColor: '#FEFEFE'}}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5" style={{color: '#5A5E3E'}} />
                        <h4 className="font-semibold" style={{color: '#2D2D2B'}}>
                          {customer.name}
                        </h4>
                      </div>
                      <div className="space-y-1 text-sm" style={{color: '#2D2D2B'}}>
                        <div>Party of {customer.partySize}</div>
                        <div className="flex flex-col gap-1">
                          {customer.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              <span>{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {!customer.email && !customer.phone && (
                            <span className="text-gray-400">No contact info</span>
                          )}
                        </div>
                        {customer.gender && (
                          <div>
                            Gender: {customer.gender === 'prefer-not-to-say' ? 'Prefer not to say' : customer.gender.charAt(0).toUpperCase() + customer.gender.slice(1)}
                          </div>
                        )}
                        {customer.seatingPreference && (
                          <div>
                            Seating: {customer.seatingPreference === 'no-preference' ? 'No preference' : customer.seatingPreference.charAt(0).toUpperCase() + customer.seatingPreference.slice(1)}
                          </div>
                        )}
                        <div className="text-xs" style={{color: '#9FA0A0'}}>
                          Joined {customer.joined}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {customer.calledAt ? (
                        <>
                          <div className="text-xs text-center" style={{color: '#5A5E3E'}}>
                            <div className="font-semibold">Called</div>
                            <div className="text-xs opacity-70">
                              {new Date(customer.calledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <Button
                            onClick={() => toggleCalledStatus(customer.reservationId, true)}
                            variant="outline"
                            size="sm"
                            className="pill-button text-xs"
                            style={{borderColor: '#5A5E3E', color: '#5A5E3E'}}
                          >
                            Unmark
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleInviteGuest(customer)}
                          className="pill-button text-white text-sm"
                          style={{backgroundColor: '#3F4427'}}
                          disabled={!customer.email && !customer.phone}
                        >
                          Invite
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGuestSelectionModalOpen(false)}
              style={{borderColor: 'rgba(183, 65, 14, 0.3)', color: '#2D2D2B'}}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Display Modal */}
      <Dialog open={phoneDisplayModalOpen} onOpenChange={setPhoneDisplayModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Call Guest</DialogTitle>
            <DialogDescription>
              Contact information for the selected guest
            </DialogDescription>
          </DialogHeader>
          {selectedGuestForCall && (
            <div className="py-6">
              <div className="text-center space-y-4">
                <div>
                  <User className="h-12 w-12 mx-auto mb-2" style={{color: '#5A5E3E'}} />
                  <h3 className="text-lg font-semibold" style={{color: '#2D2D2B'}}>
                    {selectedGuestForCall.name}
                  </h3>
                </div>
                <div className="p-4 rounded-lg" style={{backgroundColor: '#F5F5F5'}}>
                  <Phone className="h-6 w-6 mx-auto mb-2" style={{color: '#3F4427'}} />
                  <a
                    href={`tel:${selectedGuestForCall.phone}`}
                    className="text-2xl font-bold block hover:opacity-80 transition-opacity"
                    style={{color: '#3F4427'}}
                  >
                    {selectedGuestForCall.phone}
                  </a>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPhoneDisplayModalOpen(false);
                setSelectedGuestForCall(null);
              }}
              style={{borderColor: 'rgba(183, 65, 14, 0.3)', color: '#2D2D2B'}}
            >
              Close
            </Button>
            {selectedGuestForCall && (
              <>
                <Button
                  onClick={() => {
                    window.location.href = `tel:${selectedGuestForCall.phone}`;
                  }}
                  className="pill-button text-white"
                  style={{backgroundColor: '#3F4427'}}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button
                  onClick={markAsCalled}
                  className="pill-button text-white"
                  style={{backgroundColor: '#5A5E3E'}}
                >
                  Mark as Called
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Queue Confirmation Dialog */}
      <Dialog open={clearQueueDialogOpen} onOpenChange={setClearQueueDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{color: '#2D2D2B'}}>
              Clear Queue
            </DialogTitle>
            <DialogDescription className="text-base pt-2" style={{color: '#5A5E3E'}}>
              Are you sure you want to clear the entire waitlist? This will cancel all pending and confirmed reservations in the queue.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg border" style={{borderColor: 'rgba(183, 65, 14, 0.2)', backgroundColor: '#FFF9F0'}}>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5" style={{color: '#B7410E'}} />
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1" style={{color: '#2D2D2B'}}>
                    This action cannot be undone
                  </p>
                  <p className="text-xs" style={{color: '#5A5E3E'}}>
                    All customers in the waitlist will be notified that their spot has been cancelled. 
                    {waitlist.length > 0 && (
                      <span className="font-semibold"> {waitlist.length} {waitlist.length === 1 ? 'customer' : 'customers'} will be affected.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setClearQueueDialogOpen(false)}
              className="pill-button"
              style={{borderColor: 'rgba(183, 65, 14, 0.3)', color: '#2D2D2B'}}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearQueue}
              className="pill-button text-white"
              style={{backgroundColor: '#B7410E'}}
            >
              Yes, Clear Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Seating Dialog */}
      <Dialog open={tableSeatingDialogOpen} onOpenChange={setTableSeatingDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Seat at {selectedTableForSeating?.tableName}</DialogTitle>
            <DialogDescription>
              Choose how to seat a customer at this table (capacity: {selectedTableForSeating?.capacity} guests)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {canAutoAssignFromTable && (
              <Button
                onClick={handleAutoAssignFromWaitlist}
                className="pill-button text-white w-full"
                style={{backgroundColor: '#5A5E3E'}}
              >
                <Table className="h-4 w-4 mr-2" />
                Auto-Assign from Waitlist
              </Button>
            )}
            {canAutoAssignFromTable && (
              <Button
                onClick={() => {
                  setTableCustomerSelectionOpen(true);
                  setCustomerSearchFilter('');
                }}
                className="pill-button text-white w-full"
                style={{backgroundColor: '#3F4427'}}
              >
                <Users className="h-4 w-4 mr-2" />
                Select Customer Manually
              </Button>
            )}
            <Button
              onClick={() => {
                setTableSeatingDialogOpen(false);
                if (selectedTableForSeating) {
                  openSeatWalkInModal(selectedTableForSeating.id);
                }
              }}
              className="pill-button text-white w-full"
              style={{backgroundColor: '#B889A6'}}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Seat Walk-In Guest
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTableSeatingDialogOpen(false)}
              style={{borderColor: 'rgba(183, 65, 14, 0.3)', color: '#2D2D2B'}}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Selection for Table Modal */}
      <Dialog open={tableCustomerSelectionOpen} onOpenChange={setTableCustomerSelectionOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Customer for {selectedTableForSeating?.tableName}</DialogTitle>
            <DialogDescription>
              Select a customer from the waitlist to seat at this table (capacity: {selectedTableForSeating?.capacity} guests)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Search by name, phone, or email..."
              value={customerSearchFilter}
              onChange={(e) => setCustomerSearchFilter(e.target.value)}
              className="mb-4"
            />
            <div className="space-y-3">
              {getFittingCustomers().length === 0 ? (
                <p className="text-center py-8" style={{color: '#9FA0A0'}}>
                  {customerSearchFilter ? 'No matching customers found' : 'No customers in waitlist fit this table'}
                </p>
              ) : (
                getFittingCustomers().map((customer) => (
                  <div
                    key={customer.id}
                    className="p-4 rounded-lg border"
                    style={{borderColor: 'rgba(183, 65, 14, 0.2)', backgroundColor: '#FEFEFE'}}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-5 w-5" style={{color: '#5A5E3E'}} />
                          <h4 className="font-semibold" style={{color: '#2D2D2B'}}>
                            {customer.name}
                          </h4>
                          {customer.reservationType && (
                            <Badge 
                              className="px-2 py-0.5 rounded-full text-xs"
                              style={{
                                backgroundColor: customer.reservationType === 'reserved' ? '#3F4427' : '#B889A6',
                                color: '#FFFFFF'
                              }}
                            >
                              {customer.reservationType === 'reserved' ? 'Reserved' : 'Waitlist'}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm" style={{color: '#2D2D2B'}}>
                          <div>Party of {customer.partySize}</div>
                          <div className="flex flex-col gap-1">
                            {customer.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                            {!customer.email && !customer.phone && (
                              <span className="text-gray-400">No contact info</span>
                            )}
                          </div>
                          <div className="text-xs" style={{color: '#9FA0A0'}}>
                            Joined {customer.joined}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSeatCustomerFromWaitlist(customer)}
                        className="pill-button text-white text-sm"
                        style={{backgroundColor: '#3F4427'}}
                      >
                        Seat
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTableCustomerSelectionOpen(false);
                setCustomerSearchFilter('');
              }}
              style={{borderColor: 'rgba(183, 65, 14, 0.3)', color: '#2D2D2B'}}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Edit Dialog */}
      <Dialog open={tableEditDialogOpen} onOpenChange={setTableEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
            <DialogDescription>
              Update table information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tableEditName">Table Name</Label>
              <Input
                id="tableEditName"
                value={tableEditName}
                onChange={(e) => setTableEditName(e.target.value)}
                placeholder="Table name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tableEditCapacity">Capacity</Label>
              <Input
                id="tableEditCapacity"
                type="number"
                min="1"
                value={tableEditCapacity}
                onChange={(e) => setTableEditCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                placeholder="Number of guests"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTableEditDialogOpen(false);
                setSelectedTableForEdit(null);
              }}
              style={{borderColor: 'rgba(183, 65, 14, 0.3)', color: '#2D2D2B'}}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditTable}
              className="pill-button text-white"
              style={{backgroundColor: '#3F4427'}}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}