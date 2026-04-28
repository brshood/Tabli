import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Users, Table, Clock, CheckCircle, Phone, PhoneCall, X, User, Calendar as CalendarIcon, FileText, TrendingUp, TrendingDown, LogOut, Plus, Minus, UserPlus, Settings, AlertCircle, Menu, Mail, Loader2, Bell, Home, Trees, Store } from 'lucide-react';
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
import { subscribeToPush, getNotificationPermission, isPushSupported } from '../services/pushSubscription';
import { formatGSTTime, formatGSTDateShort, formatGSTDateTime } from '../utils/dateFormat';

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
  const [selectedTableForEdit, setSelectedTableForEdit] = useState<{ id: string; name: string; capacity: number; location?: 'indoor' | 'outdoor' } | null>(null);
  const [tableEditName, setTableEditName] = useState('');
  const [tableEditCapacity, setTableEditCapacity] = useState(4);
  const [tableEditLocation, setTableEditLocation] = useState<'indoor' | 'outdoor'>('indoor');
  const [customerSearchFilter, setCustomerSearchFilter] = useState('');
  const [checkingInIds, setCheckingInIds] = useState<Set<number>>(new Set());
  const [seatingIds, setSeatingIds] = useState<Set<number>>(new Set());
  const [checkingOutIds, setCheckingOutIds] = useState<Set<number>>(new Set());
  const [seatingWalkIn, setSeatingWalkIn] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [indoorFull, setIndoorFull] = useState(false);
  const [outdoorFull, setOutdoorFull] = useState(false);
  const [closedForCustomers, setClosedForCustomers] = useState(false);
  const [callNextDialogOpen, setCallNextDialogOpen] = useState(false);
  const [callNextCustomer, setCallNextCustomer] = useState<any>(null);
  const [callNextLoading, setCallNextLoading] = useState(false);
  const [calledQueue, setCalledQueue] = useState<any[]>([]);
  const [reservedBookings, setReservedBookings] = useState<any[]>([]);
  const isRestaurantClosed = closedForCustomers;

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
      } catch (error) {
        console.error('Failed to load dashboard summary:', error);
      }
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

  // Load availability override on mount when auth is ready (also refreshed on SSE)
  useEffect(() => {
    if (!staffAuth?.restaurantId || !staffAuth?.token) return;
    loadAvailabilityOverride();
  }, [API_URL, staffAuth?.restaurantId, staffAuth?.token]);

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

  const toggleIndoorFull = async () => {
    if (!staffAuth?.restaurantId || !staffAuth?.token) return;
    const next = !indoorFull;
    try {
      const res = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/availability-override`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffAuth.token}`,
        },
        body: JSON.stringify({ indoorFull: next }),
      });
      if (res.ok) {
        setIndoorFull(next);
        toast.success(next ? 'Indoor marked full' : 'Indoor has space');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update indoor');
    }
  };

  const toggleOutdoorFull = async () => {
    if (!staffAuth?.restaurantId || !staffAuth?.token) return;
    const next = !outdoorFull;
    try {
      const res = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/availability-override`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffAuth.token}`,
        },
        body: JSON.stringify({ outdoorFull: next }),
      });
      if (res.ok) {
        setOutdoorFull(next);
        toast.success(next ? 'Outdoor marked full' : 'Outdoor has space');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update outdoor');
    }
  };

  const toggleRestaurantClosed = async () => {
    if (!staffAuth?.restaurantId || !staffAuth?.token) return;
    const nextClosed = !closedForCustomers;
    try {
      const res = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/availability-override`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffAuth.token}`,
        },
        body: JSON.stringify({ closedForCustomers: nextClosed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update restaurant status');
      }
      setClosedForCustomers(nextClosed);
      toast.success(nextClosed ? 'Restaurant marked as closed for customers' : 'Restaurant open for customers');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update restaurant status');
    }
  };

  const openCallNextDialog = async () => {
    // Event-driven: refresh data on button click before picking first eligible
    const [wl, override] = await Promise.all([
      loadReservationsFromDB(),
      loadAvailabilityOverride(),
    ]);
    const indoorVal = override?.indoorFull ?? indoorFull;
    const outdoorVal = override?.outdoorFull ?? outdoorFull;
    const next = getFirstEligibleFromData(wl, indoorVal, outdoorVal);
    if (!next) {
      if (wl.length === 0) toast.info('No customers in queue');
      else toast.info('No one available to call right now');
      return;
    }
    setCallNextCustomer(next);
    setCallNextDialogOpen(true);
  };

  const handleCallNextConfirm = async () => {
    if (!callNextCustomer || !staffAuth?.restaurantId) return;
    setCallNextLoading(true);
    try {
      const res = await fetch(`${API_URL}/reservations/${callNextCustomer.reservationId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Your table is ready! We'll hold it for you for about 10-15 minutes. See you soon!`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send notification');
      }
      const result = await res.json();
      const viaLabel = result.via === 'email_and_sms' ? 'Email & SMS' : result.via === 'email' ? 'Email' : 'SMS';
      toast.success(`${viaLabel} sent to ${callNextCustomer.name}`);
      setCallNextDialogOpen(false);
      setCallNextCustomer(null);
      await loadReservationsFromDB();
    } catch (e: any) {
      toast.error(e.message || 'Failed to send SMS');
    } finally {
      setCallNextLoading(false);
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
  const loadReservationsFromDB = async (): Promise<any[]> => {
    try {
      if (!staffAuth?.restaurantId) return [];
      
      const timestamp = new Date().getTime();
      const resRes = await fetch(`${API_URL}/reservations?${new URLSearchParams({ restaurantId: staffAuth.restaurantId, _t: timestamp.toString() }).toString()}`);
      if (!resRes.ok) return [];
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

      // Queue (waitlist): not yet called; FCFS by requestedAt. Reserved table requests are listed separately.
      const pendingStatuses = (r: any) => r.status === 'pending' || r.status === 'confirmed';

      const reservedRows = items
        .filter(r => pendingStatuses(r) && r.reservationType === 'reserved')
        .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());

      const calledRows = items
        .filter(r =>
          pendingStatuses(r) &&
          r.reservationType !== 'reserved' &&
          r.calledAt &&
          !r.arrivedAt
        )
        .sort((a, b) => new Date(a.calledAt).getTime() - new Date(b.calledAt).getTime());

      const queueCandidates = items
        .filter(r =>
          pendingStatuses(r) &&
          r.reservationType !== 'reserved' &&
          !r.calledAt
        )
        .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());

      // Deduplicate by email/phone — keep earliest join (first come first served)
      const emailToReservation = new Map<string, any>();
      const phoneToReservation = new Map<string, any>();
      const deduplicatedItems: any[] = [];

      const removeFromMaps = (item: any) => {
        if (item?.email) emailToReservation.delete(item.email);
        if (item?.phone && item.phone !== '0000000000') phoneToReservation.delete(item.phone);
      };
      const addToMaps = (item: any) => {
        if (item?.email) emailToReservation.set(item.email, item);
        if (item?.phone && item.phone !== '0000000000') phoneToReservation.set(item.phone, item);
      };

      for (const r of queueCandidates) {
        const existingByEmail = r.email ? emailToReservation.get(r.email) : undefined;
        const existingByPhone = (r.phone && r.phone !== '0000000000') ? phoneToReservation.get(r.phone) : undefined;
        const existing = existingByEmail || existingByPhone;

        if (!existing) {
          deduplicatedItems.push(r);
          addToMaps(r);
        } else {
          const existingTime = new Date(existing.requestedAt).getTime();
          const currentTime = new Date(r.requestedAt).getTime();
          if (currentTime < existingTime) {
            const index = deduplicatedItems.findIndex(item => item._id === existing._id);
            if (index !== -1) {
              removeFromMaps(existing);
              deduplicatedItems[index] = r;
              addToMaps(r);
            }
          }
        }
      }

      const mapRow = (r: any, idx: number, orderNum: number) => ({
        id: idx + 1,
        orderIndex: orderNum,
        reservationId: r._id,
        name: r.name || 'Queue Customer',
        partySize: r.partySize || 2,
        waitTime: '—',
        phone: r.phone || '',
        email: r.email || '',
        joined: formatGSTTime(r.requestedAt),
        requestedAt: r.requestedAt ? new Date(r.requestedAt).getTime() : 0,
        contactMethod: (r.contactMethod || 'phone') as any,
        gender: r.gender,
        seatingPreference: r.seatingPreference,
        calledAt: r.calledAt ? new Date(r.calledAt) : null,
        reservationType: r.reservationType,
        holdTimeExpires: Date.now() + 10 * 60000,
        status: r.status,
        holdUntil: r.holdUntil ? new Date(r.holdUntil) : null,
        customerNotes: (r.customerNotes || '').trim(),
      });

      const wl = deduplicatedItems.map((r, idx) => mapRow(r, idx, idx + 1));
      setWaitlist(wl);

      setCalledQueue(
        calledRows.map((r, idx) => ({
          ...mapRow(r, idx, idx + 1),
          calledAtLabel: r.calledAt ? formatGSTTime(r.calledAt) : '—',
        }))
      );

      setReservedBookings(
        reservedRows.map((r, idx) => mapRow(r, idx, idx + 1))
      );

      return wl;
    } catch (error) {
      console.error('Failed to reload reservations:', error);
    }
    return [];
  };

  const getFirstEligibleFromData = (
    wl: any[],
    indoorFullVal: boolean,
    outdoorFullVal: boolean
  ): any => {
    if (wl.length === 0) return null;
    const sorted = [...wl].sort((a, b) => (a.requestedAt || 0) - (b.requestedAt || 0));
    // When both sections are full, still call the next guest in line (FCFS); they are notified to wait for a table.
    if (indoorFullVal && outdoorFullVal) return sorted[0] ?? null;
    if (indoorFullVal) {
      return sorted.find((c) => c.seatingPreference === 'outdoor' || c.seatingPreference === 'no-preference' || !c.seatingPreference) ?? sorted[0] ?? null;
    }
    if (outdoorFullVal) {
      return sorted.find((c) => c.seatingPreference === 'indoor' || c.seatingPreference === 'no-preference' || !c.seatingPreference) ?? sorted[0] ?? null;
    }
    return sorted[0] ?? null;
  };

  const markCustomerArrived = async (reservationId: string, name: string) => {
    try {
      const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrivedAt: new Date().toISOString() }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to mark arrival');
      }
      await loadReservationsFromDB();
      toast.success(`${name} marked as arrived`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to mark arrival');
    }
  };

  const removeCalledGuest = async (reservationId: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from the called list? This cancels their waitlist entry.`)) return;
    try {
      const response = await fetch(`${API_URL}/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancellationReason: 'called_list_cleared',
          calledAt: null,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to remove guest');
      }
      await loadReservationsFromDB();
      toast.success(`Removed ${name} from called list`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove guest');
    }
  };

  const resendCalledNotification = async (reservationId: string, name: string) => {
    try {
      const res = await fetch(`${API_URL}/reservations/${reservationId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to resend SMS');
      }
      toast.success(`Resent call notification to ${name}`);
      await loadReservationsFromDB();
    } catch (e: any) {
      toast.error(e.message || 'Failed to resend notification');
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
          location: t.location || 'indoor',
          isOccupied: false 
        }));
      setAvailableTables(avail);
    } catch (error) {
      console.error('Failed to reload tables:', error);
    }
  };

  const loadAvailabilityOverride = async (): Promise<{ indoorFull: boolean; outdoorFull: boolean; closedForCustomers: boolean } | null> => {
    if (!staffAuth?.restaurantId || !staffAuth?.token) return null;
    try {
      const res = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/availability-override`, {
        headers: { Authorization: `Bearer ${staffAuth.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const indoor = data.indoorFull ?? false;
        const outdoor = data.outdoorFull ?? false;
        const closed = data.closedForCustomers ?? false;
        setIndoorFull(indoor);
        setOutdoorFull(outdoor);
        setClosedForCustomers(closed);
        return { indoorFull: indoor, outdoorFull: outdoor, closedForCustomers: closed };
      }
    } catch (e) {
      console.error('Failed to load availability override:', e);
    }
    return null;
  };

  // Setup SSE connection for real-time staff notifications
  useEffect(() => {
    if (!staffAuth?.restaurantId) return;

    const refreshAllData = async () => {
      await Promise.all([
        loadReservationsFromDB(),
        loadTablesFromDB(),
        loadAvailabilityOverride(),
      ]);
    };

    // Start SSE connection with callback to refresh data on events
    startStaffSSE(staffAuth.restaurantId, refreshAllData);

    // Initial load (event-driven: no periodic polling for tables/availability)
    refreshAllData();

    // Cleanup: stop SSE when component unmounts or restaurantId changes
    return () => {
      stopStaffSSE();
    };
  }, [staffAuth?.restaurantId]);

  // Check notification permission status and show prompt if needed
  useEffect(() => {
    if (!staffAuth?.restaurantId) return;

    // Check if push notifications are supported
    if (!isPushSupported()) {
      setNotificationPermission(null);
      return;
    }

    // Check current permission status
    const permission = getNotificationPermission();
    setNotificationPermission(permission);

    // Show prompt if permission hasn't been granted yet
    if (permission === 'default') {
      setShowNotificationPrompt(true);
    } else if (permission === 'granted') {
      // If permission is granted, automatically subscribe (no user gesture needed after first grant)
      const autoSubscribe = async () => {
        try {
          await subscribeToPush({ restaurantId: staffAuth.restaurantId });
          console.log('[PUSH:STAFF] Successfully subscribed to push notifications for restaurant');
        } catch (error) {
          console.warn('[PUSH:STAFF] Failed to subscribe to push notifications:', error);
        }
      };
      autoSubscribe();
    }
  }, [staffAuth?.restaurantId]);

  // Manual handler for enabling notifications (requires user gesture for iOS)
  const handleEnableNotifications = async () => {
    if (!staffAuth?.restaurantId) return;

    setEnablingNotifications(true);
    try {
      await subscribeToPush({ restaurantId: staffAuth.restaurantId });
      const permission = getNotificationPermission();
      setNotificationPermission(permission);
      setShowNotificationPrompt(false);
      toast.success('Notifications enabled! You will receive alerts when customers reserve tables.');
    } catch (error: any) {
      console.error('[PUSH:STAFF] Failed to enable notifications:', error);
      const permission = getNotificationPermission();
      setNotificationPermission(permission);
      
      if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable it in your browser settings.');
      } else {
        toast.error(error.message || 'Failed to enable notifications');
      }
    } finally {
      setEnablingNotifications(false);
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
    
    // Set loading state
    setCheckingOutIds(prev => new Set(prev).add(id));
    
    const reservationId = (table as any).reservationId;
    
    try {
      // Try checkout by table ID first
      let response = await fetch(`${API_URL}/tables/${tableId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      // If table not found (404), try checkout by reservation ID
      if (!response.ok && response.status === 404 && reservationId) {
        console.log('Table not found, trying checkout by reservation ID:', reservationId);
        response = await fetch(`${API_URL}/tables/checkout-by-reservation/${reservationId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
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
      
      toast.success(`${table.table || 'Table'} checked out successfully (${data.dwellTimeMinutes || 0} min)`);
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

  const addTable = async (tableName: string, capacity: number, location: 'indoor' | 'outdoor' = 'indoor') => {
    try {
      if (!staffAuth.restaurantId) return;
      await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tableName, capacity, location })
      });
      // Refresh tables
      const res = await fetch(`${API_URL}/restaurants/${staffAuth.restaurantId}/tables`);
      if (res.ok) {
        const data = await res.json();
        const items: any[] = data.items || [];
        setTablesCount(items.length);
        const avail = items
          .filter(t => t.status === 'available')
          .map((t: any) => ({ id: t._id, tableName: t.name, capacity: t.capacity, location: t.location || 'indoor', isOccupied: false }));
        setAvailableTables(avail);
      }
    } catch (error) {
      console.error('Failed to add table:', error);
      toast.error('Failed to add table. Please try again.');
    }
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
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Failed to assign table' };
        }
        throw new Error(errorData.error || 'Failed to assign table');
      }

      const data = await response.json();
      if (!data?.table?.name) {
        throw new Error('Invalid response from server');
      }
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
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Failed to assign table' };
        }
        throw new Error(errorData.error || 'Failed to assign table');
      }

      const data = await response.json();
      if (!data?.table?.name) {
        throw new Error('Invalid response from server');
      }
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
          capacity: tableEditCapacity,
          location: tableEditLocation
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
    if (!validateWalkInForm() || !selectedTableForSeating || seatingWalkIn) return;

    const partySize = walkInPartySize;
    const customerName = walkInCustomerName.trim() || 'Walk-in Customer';

    setSeatingWalkIn(true);
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
          phone: '0000000000', // Placeholder for walk-ins
          email: 'walkin@tabli.app' // Placeholder email for walk-ins (required by schema)
        })
      });
      
      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create reservation record');
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
        const errorData = await assignResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to assign table to reservation');
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
    } finally {
      setSeatingWalkIn(false);
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
            {/* Two-column: Left = Queue, Right = Buttons */}
            <div className="grid md:grid-cols-2 gap-6 min-h-[400px]">
              {/* Left: Queue Panel */}
              <Card className="card-shadow border-0 rounded-3xl flex flex-col">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl flex items-center" style={{color: '#2D2D2B'}}>
                    <Clock className="h-6 w-6 mr-2" style={{color: '#5A5E3E'}} />
                    Queue — first come, first served ({waitlist.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 flex-1 flex flex-col min-h-0">
                  <div className="space-y-4 flex-1 overflow-y-auto min-h-[300px] max-h-[500px]">
                    {waitlist.map((customer) => (
                      <div key={customer.id} className="rounded-2xl p-4 border" style={{backgroundColor: '#FAF8F2', borderColor: 'rgba(90, 94, 62, 0.2)'}}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className="rounded-full w-10 h-10 flex items-center justify-center mr-3" style={{backgroundColor: '#B889A6'}}>
                              <User className="h-5 w-5" style={{color: '#5A5E3E'}} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold" style={{color: '#2D2D2B'}}>
                                  <span className="text-[#5A5E3E] mr-1">{customer.orderIndex}.</span>
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
                                <span className="flex items-center">
                                  {customer.seatingPreference === 'indoor' && <Home className="h-3 w-3 mr-1" />}
                                  {customer.seatingPreference === 'outdoor' && <Trees className="h-3 w-3 mr-1" />}
                                  {customer.seatingPreference === 'no-preference' ? 'Any seating' : customer.seatingPreference.charAt(0).toUpperCase() + customer.seatingPreference.slice(1)}
                                </span>
                              )}
                            </div>
                          )}
                          {customer.customerNotes ? (
                            <p className="text-xs mt-2 p-2 rounded-lg" style={{ backgroundColor: 'rgba(184, 137, 166, 0.15)', color: '#2D2D2B' }}>
                              <span className="font-medium">Note: </span>{customer.customerNotes}
                            </p>
                          ) : null}
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

              {/* Right: Indoor/Outdoor toggle buttons + Call Next */}
              <div className="flex flex-col gap-4 h-full">
                <div className="flex gap-4 flex-1 min-h-0">
                  <Button
                    variant="outline"
                    className="flex-1 flex flex-col items-center justify-center gap-3 py-10 px-6 text-xl rounded-2xl transition-all min-h-[180px]"
                    style={indoorFull ? { backgroundColor: '#5A5E3E', color: 'white', borderColor: '#5A5E3E' } : { backgroundColor: '#E8E4DC', borderColor: 'rgba(90, 94, 62, 0.35)', color: '#2D2D2B' }}
                    onClick={toggleIndoorFull}
                  >
                    <Home className="h-12 w-12" />
                    <span className="font-semibold">Indoor</span>
                    <span className="text-base opacity-90">{indoorFull ? 'Full' : 'Has space'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 flex flex-col items-center justify-center gap-3 py-10 px-6 text-xl rounded-2xl transition-all min-h-[180px]"
                    style={outdoorFull ? { backgroundColor: '#5A5E3E', color: 'white', borderColor: '#5A5E3E' } : { backgroundColor: '#E8E4DC', borderColor: 'rgba(90, 94, 62, 0.35)', color: '#2D2D2B' }}
                    onClick={toggleOutdoorFull}
                  >
                    <Trees className="h-12 w-12" />
                    <span className="font-semibold">Outdoor</span>
                    <span className="text-base opacity-90">{outdoorFull ? 'Full' : 'Has space'}</span>
                  </Button>
                </div>
                <Button
                  className="pill-button text-white w-full py-6 text-lg"
                  style={{ backgroundColor: '#3F4427' }}
                  onClick={openCallNextDialog}
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Call Next in Line
                </Button>
                <Button
                  variant="outline"
                  className="w-full py-6 text-lg rounded-2xl"
                  style={isRestaurantClosed ? { backgroundColor: '#7F1D1D', color: '#fff', borderColor: '#7F1D1D' } : { borderColor: 'rgba(127, 29, 29, 0.5)', color: '#7F1D1D' }}
                  onClick={toggleRestaurantClosed}
                >
                  <Store className="h-5 w-5 mr-2" />
                  {isRestaurantClosed ? 'Reopen Restaurant' : 'Close Restaurant'}
                </Button>
              </div>
            </div>

            {/* Called — awaiting arrival & pending reservations */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="card-shadow border-0 rounded-3xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2" style={{ color: '#2D2D2B' }}>
                    <Phone className="h-5 w-5" style={{ color: '#5A5E3E' }} />
                    Called — please arrive ({calledQueue.length})
                  </CardTitle>
                  <p className="text-sm" style={{ color: '#6b6b6b' }}>
                    Guests notified to come. Tap ✓ when they arrive. Entries older than 14 days clear automatically; tap ✕ to remove one manually.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[280px] overflow-y-auto">
                  {calledQueue.map((c) => (
                    <div
                      key={c.reservationId}
                      className="flex items-center justify-between gap-3 rounded-2xl p-3 border"
                      style={{ backgroundColor: '#FAF8F2', borderColor: 'rgba(90, 94, 62, 0.2)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate flex items-center gap-1.5" style={{ color: '#2D2D2B' }}>
                          <Phone className="h-3.5 w-3.5 shrink-0" style={{ color: '#5A5E3E' }} />
                          <span>{c.orderIndex}. {c.name}</span>
                        </div>
                        <div className="text-xs mt-1" style={{ color: '#5A5E3E' }}>
                          Called {c.calledAtLabel} · {c.phone || c.email || '—'}
                        </div>
                        {c.customerNotes ? (
                          <p className="text-xs mt-1" style={{ color: '#2D2D2B' }}>
                            Note: {c.customerNotes}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full h-10 w-10 p-0"
                          style={{ borderColor: 'rgba(90, 94, 62, 0.35)', color: '#5A5E3E' }}
                          title="Resend call SMS"
                          onClick={() => resendCalledNotification(c.reservationId, c.name)}
                        >
                          <PhoneCall className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full h-10 w-10 p-0"
                          style={{ borderColor: 'rgba(90, 94, 62, 0.35)', color: '#5A5E3E' }}
                          title="Remove from called list"
                          onClick={() => removeCalledGuest(c.reservationId, c.name)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-full h-10 w-10 p-0 text-lg"
                          style={{ backgroundColor: '#3F4427', color: '#fff' }}
                          title="Mark arrived"
                          onClick={() => markCustomerArrived(c.reservationId, c.name)}
                        >
                          ✓
                        </Button>
                      </div>
                    </div>
                  ))}
                  {calledQueue.length === 0 && (
                    <p className="text-sm text-center py-6" style={{ color: '#9FA0A0' }}>
                      No one has been called yet. Use &quot;Call Next in Line&quot; to notify the next guest.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="card-shadow border-0 rounded-3xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2" style={{ color: '#2D2D2B' }}>
                    <Users className="h-5 w-5" style={{ color: '#5A5E3E' }} />
                    Pending table reservations ({reservedBookings.length})
                  </CardTitle>
                  <p className="text-sm" style={{ color: '#6b6b6b' }}>
                    Numbered order of guests who booked when a table was available.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[280px] overflow-y-auto">
                  {reservedBookings.map((c) => (
                    <div
                      key={c.reservationId}
                      className="rounded-2xl p-3 border"
                      style={{ backgroundColor: '#FAF8F2', borderColor: 'rgba(90, 94, 62, 0.2)' }}
                    >
                      <div className="font-semibold" style={{ color: '#2D2D2B' }}>
                        {c.orderIndex}. {c.name}
                      </div>
                      <p className="text-sm mt-1" style={{ color: '#2D2D2B' }}>
                        Party of {c.partySize} · {c.phone || c.email || '—'}
                      </p>
                      {c.customerNotes ? (
                        <p className="text-xs mt-2 p-2 rounded-lg" style={{ backgroundColor: 'rgba(63, 68, 39, 0.08)' }}>
                          Note: {c.customerNotes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {reservedBookings.length === 0 && (
                    <p className="text-sm text-center py-6" style={{ color: '#9FA0A0' }}>
                      No pending table reservations.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Call Next confirmation dialog */}
            <Dialog open={callNextDialogOpen} onOpenChange={setCallNextDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Call Next in Line</DialogTitle>
                  <DialogDescription>
                    {callNextCustomer && (
                      <>
                        Send notification to <strong>{callNextCustomer.name}</strong> (party of {callNextCustomer.partySize}).
                        {' '}Contact: <strong>{callNextCustomer.phone || callNextCustomer.email || '—'}</strong>.
                        {' '}They will be told their table is ready and to arrive within about 10–15 minutes.
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCallNextDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCallNextConfirm} disabled={callNextLoading} style={{ backgroundColor: '#3F4427' }}>
                    {callNextLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : 'Send SMS'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                        if (!d.day) {
                          return {
                            name: 'Invalid Date', 
                            reservations: d.reservations || 0, 
                            walkIns: d.walkIns || 0
                          };
                        }
                        const date = new Date(d.day + 'T00:00:00'); // Add time to avoid timezone issues
                        if (isNaN(date.getTime())) {
                          return {
                            name: d.day, 
                            reservations: d.reservations || 0, 
                            walkIns: d.walkIns || 0
                          };
                        }
                        return {
                          name: formatGSTDateShort(date), 
                          reservations: d.reservations || 0, 
                          walkIns: d.walkIns || 0
                        };
                      } catch (e) {
                        return {
                          name: d.day || 'Invalid Date', 
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
                      if (!busiest.day) {
                        return (
                          <>
                            <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>N/A</p>
                            <p className="text-sm" style={{color: '#2D2D2B'}}>{busiest.total} customers</p>
                          </>
                        );
                      }
                      const date = new Date(busiest.day);
                      if (isNaN(date.getTime())) {
                        return (
                          <>
                            <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{busiest.day}</p>
                            <p className="text-sm" style={{color: '#2D2D2B'}}>{busiest.total} customers</p>
                          </>
                        );
                      }
                      const formatted = formatGSTDateShort(date);
                      return (
                        <>
                          <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{formatted}</p>
                          <p className="text-sm" style={{color: '#2D2D2B'}}>{busiest.total} customers</p>
                        </>
                      );
                    } catch (e) {
                      return (
                        <>
                          <p className="text-3xl font-bold mb-1" style={{color: '#2D2D2B'}}>{busiest.day || 'N/A'}</p>
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

      {/* Removed: Seat Walk-In, Daily Summary, Guest Selection, Phone Display, Clear Queue, Table Seating, Table Edit modals */}

      {/* Clear Queue - removed */}

    </div>
  );
}