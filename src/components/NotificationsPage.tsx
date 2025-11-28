// Enhanced Notifications Page - Shows ALL reservations + full notification history
// Matches email notifications exactly

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Bell, Clock, Users, MapPin, CheckCircle, XCircle, AlertCircle, RefreshCw, X, Loader2, Phone, Mail, ExternalLink, Trash2 } from 'lucide-react';
import { getReservationHistory, updateReservationInHistory, removeReservationFromHistory, type ReservationHistoryItem } from '../services/reservationHistory';
import { forceRefreshReservation } from '../services/reservationPolling';
import { toast } from 'sonner';
import { QueueCountdownTimer } from './QueueCountdownTimer';
import { useLanguage } from './LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface NotificationsPageProps {
  onNavigate: (page: 'landing' | 'discover' | 'search' | 'notifications' | 'restaurant-profile') => void;
  onRestaurantSelect?: (restaurantId: string) => void;
}

interface StoredNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
}

export function NotificationsPage({ onNavigate, onRestaurantSelect }: NotificationsPageProps) {
  const [reservations, setReservations] = useState<ReservationHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<ReservationHistoryItem | null>(null);
  const [queueEstimates, setQueueEstimates] = useState<Record<string, { estimatedWaitMinutes: number; lastFetched: number }>>({});
  const { t } = useLanguage();

  const loadData = async () => {
    setIsRefreshingAll(true);
    try {
      // Load reservations from history
      const history = getReservationHistory();
      
      if (history.length === 0) {
        // No reservations to refresh
        setReservations([]);
        setIsRefreshingAll(false);
        return;
      }
    
      // Fetch latest status for each reservation (sequentially to avoid rate limiting)
      const updated: (ReservationHistoryItem | null)[] = [];
      for (const res of history) {
        try {
          const response = await fetch(`${API_URL}/reservations/${res.reservationId}`);
          if (response.ok) {
            const data = await response.json();
            const serverRes = data.reservation;
            
            // Update with latest data
            const updatedRes = {
              ...res,
              status: serverRes.status,
              queuePosition: serverRes.queuePosition,
              holdUntil: serverRes.holdUntil,
              holdStatus: serverRes.holdStatus,
              leftAt: serverRes.leftAt,
              seatedAt: serverRes.seatedAt,
            };
            
            updateReservationInHistory(res.reservationId, updatedRes);
            updated.push(updatedRes);
          } else if (response.status === 404) {
            // Reservation not found - it was deleted from server
            console.log(`Reservation ${res.reservationId} not found (404) - removing from history`);
            removeReservationFromHistory(res.reservationId);
            updated.push(null); // Filter out this reservation
          } else if (response.status === 429) {
            // Rate limited - stop fetching and keep local copy
            console.warn('Rate limited - keeping local copy');
            updated.push(res);
            // Break the loop to avoid further rate limiting
            for (let i = history.indexOf(res) + 1; i < history.length; i++) {
              updated.push(history[i]);
            }
            break;
          } else {
            updated.push(res);
          }
          
          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to refresh ${res.reservationId}:`, error);
          updated.push(res);
        }
      }
      
      // Filter out null entries (404s that were removed)
      setReservations(updated.filter(r => r !== null) as ReservationHistoryItem[]);

      // Load notifications
      try {
        const stored = localStorage.getItem('tabli_notifications');
        if (stored) {
          const parsed = JSON.parse(stored) as StoredNotification[];
          setNotifications(parsed.sort((a, b) => b.timestamp - a.timestamp));
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to refresh reservations');
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // State to force re-render for live time updates
  const [timeUpdateTick, setTimeUpdateTick] = useState(0);

  // Load data on mount and periodically
  useEffect(() => {
    loadData();
    
    // Refresh every 30 seconds to avoid rate limiting (polling service handles real-time updates)
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Also reload when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Listen for storage events to catch SSE updates
  useEffect(() => {
    const handleStorageChange = () => {
      // Reload data when localStorage changes (SSE updates)
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from SSE updates
    const handleReservationUpdate = () => {
      loadData();
      setTimeUpdateTick(prev => prev + 1); // Force re-render for time displays
    };
    
    window.addEventListener('reservation:updated', handleReservationUpdate as any);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('reservation:updated', handleReservationUpdate as any);
    };
  }, []);

  // Live time ticker - updates every second for countdown displays
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdateTick(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async (reservationId: string) => {
    setRefreshingIds(prev => new Set(prev).add(reservationId));
    try {
      const response = await fetch(`${API_URL}/reservations/${reservationId}`);
      if (response.ok) {
        const data = await response.json();
        const serverRes = data.reservation;
        
        updateReservationInHistory(reservationId, {
          status: serverRes.status,
          queuePosition: serverRes.queuePosition,
          holdUntil: serverRes.holdUntil,
          holdStatus: serverRes.holdStatus,
          leftAt: serverRes.leftAt,
          seatedAt: serverRes.seatedAt,
        });
        
        await loadData();
        toast.success('Status updated');
      } else if (response.status === 404) {
        // Reservation not found - remove from history
        console.log(`Reservation ${reservationId} not found (404) - removing`);
        removeReservationFromHistory(reservationId);
        await loadData();
        toast.info('Reservation no longer exists');
      } else if (response.status === 429) {
        toast.error('Too many requests - please wait a moment');
      } else {
        throw new Error('Failed to fetch');
      }
    } catch (error) {
      toast.error('Failed to refresh status');
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(reservationId);
        return next;
      });
    }
  };

  const handleCancelClick = (reservation: ReservationHistoryItem) => {
    setReservationToCancel(reservation);
    setCancelConfirmOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!reservationToCancel) return;

    setCancelConfirmOpen(false);
    const reservation = reservationToCancel;
    setReservationToCancel(null);

    setCancellingIds(prev => new Set(prev).add(reservation.reservationId));
    try {
      const res = await fetch(`${API_URL}/reservations/${reservation.reservationId}/cancel`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to cancel' }));
        throw new Error(errorData.error || 'Failed to cancel');
      }

      const data = await res.json();
      
      toast.success(data.message || 'Reservation cancelled');
      updateReservationInHistory(reservation.reservationId, { status: 'cancelled' });
      await loadData();
    } catch (error: any) {
      console.error('Cancel reservation error:', error);
      toast.error(error.message || 'Failed to cancel reservation');
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev);
        next.delete(reservation.reservationId);
        return next;
      });
    }
  };

  const handleViewRestaurant = (restaurantId: string) => {
    if (onRestaurantSelect) {
      onRestaurantSelect(restaurantId);
    }
    // Navigate with restaurant ID in URL
    window.location.hash = `#restaurant-profile?id=${restaurantId}`;
  };

  const handleDeleteFromHistory = async (reservationId: string) => {
    try {
      removeReservationFromHistory(reservationId);
      await loadData();
      toast.success('Removed from history');
    } catch (error) {
      console.error('Failed to remove reservation from history:', error);
      toast.error('Failed to remove from history');
    }
  };

  const clearNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    localStorage.setItem('tabli_notifications', JSON.stringify(updated));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    localStorage.setItem('tabli_notifications', JSON.stringify([]));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'seated':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'no_show':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'seated':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'no_show':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatHoldTime = (holdUntil: string) => {
    // Use timeUpdateTick to force re-calculation on every tick
    const _tick = timeUpdateTick;
    
    const now = Date.now();
    const expiry = new Date(holdUntil).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Active = pending or confirmed (not yet seated/cancelled)
  const activeReservations = reservations.filter(r => r.status === 'pending' || r.status === 'confirmed');
  
  // Past = seated, cancelled, or no-show
  // Seated with leftAt = checked out (completed)
  // Seated without leftAt = currently dining
  const pastReservations = reservations.filter(r => r.status === 'seated' || r.status === 'cancelled' || r.status === 'no_show');

  const renderReservationCard = (reservation: ReservationHistoryItem) => {
    const isRefreshing = refreshingIds.has(reservation.reservationId);
    const isCancelling = cancellingIds.has(reservation.reservationId);
    const isActive = reservation.status === 'pending' || reservation.status === 'confirmed';

    return (
      <Card key={reservation.reservationId} className="border-0 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getStatusIcon(reservation.status)}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{reservation.restaurantName}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(reservation.bookedAt).toLocaleDateString()} at {new Date(reservation.bookedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <Badge className={`${getStatusColor(reservation.status)} shrink-0`}>
              {reservation.status.toUpperCase().replace('_', ' ')}
            </Badge>
          </div>

          {/* Queue Position / Hold Timer */}
          {/* HIDDEN: Timer countdown and estimated wait time removed from user view */}
          {/* {reservation.mode === 'waitlist' && reservation.queuePosition && reservation.status === 'pending' && (
            <QueueCountdownTimer
              reservationId={reservation.reservationId}
              restaurantId={reservation.restaurantId}
              queuePosition={reservation.queuePosition}
              partySize={reservation.partySize}
              onPositionUpdate={(newPosition) => {
                updateReservationInHistory(reservation.reservationId, { queuePosition: newPosition });
                // Reload data to reflect the update
                loadData();
              }}
            />
          )} */}

          {reservation.status === 'confirmed' && reservation.holdUntil && reservation.holdStatus === 'active' && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-900">Table Hold</span>
                <span className="text-lg font-bold text-amber-600">{formatHoldTime(reservation.holdUntil)}</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">Arrive within 15 minutes</p>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span>Party of {reservation.partySize}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              {reservation.contactMethod === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              <span className="capitalize">{reservation.contactMethod}</span>
            </div>
            {reservation.name && (
              <div className="flex items-center gap-2 text-gray-600 col-span-2">
                <span className="font-medium">{reservation.name}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewRestaurant(reservation.restaurantId)}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Restaurant
            </Button>
            {isActive && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefresh(reservation.reservationId)}
                  disabled={isRefreshing || isCancelling}
                >
                  {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleCancelClick(reservation)}
                  disabled={isRefreshing || isCancelling}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Cancelling...
                    </>
                  ) : (
                    'Cancel'
                  )}
                </Button>
              </>
            )}
            {!isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteFromHistory(reservation.reservationId)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F1E7' }}>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {reservations.length === 0 ? (
          /* Empty State */
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-12 text-center">
              <Bell className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2 text-gray-700">{t('notifications.empty.title')}</h3>
              <p className="text-gray-500 mb-6">
                {t('notifications.empty.subtitle')}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => onNavigate('discover')} style={{ backgroundColor: '#5A5E3E', color: 'white' }}>
                  Discover Restaurants
                </Button>
                <Button onClick={() => onNavigate('search')} variant="outline">
                  Search Restaurants
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Reservations */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader style={{ backgroundColor: '#EBD3A2', borderBottom: '1px solid #D4B896' }}>
                  <CardTitle className="flex items-center justify-between">
                    <span>My Reservations</span>
                    <Button variant="ghost" size="sm" onClick={loadData} disabled={isRefreshingAll}>
                      <RefreshCw className={`h-4 w-4 ${isRefreshingAll ? 'animate-spin' : ''}`} />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="active">
                        Active ({activeReservations.length})
                      </TabsTrigger>
                      <TabsTrigger value="past">
                        Past ({pastReservations.length})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="active" className="space-y-4">
                      {activeReservations.length > 0 ? (
                        activeReservations.map(renderReservationCard)
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No active reservations</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="past" className="space-y-4">
                      {pastReservations.length > 0 ? (
                        pastReservations.map(renderReservationCard)
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <CheckCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No past reservations</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Notifications */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg sticky top-24 bg-white">
                <CardHeader style={{ backgroundColor: '#EBD3A2', borderBottom: '1px solid #D4B896' }}>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Updates ({notifications.length})
                    </span>
                    {notifications.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllNotifications} className="text-xs">
                        Clear
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="space-y-2">
                      {notifications.slice(0, 20).map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 rounded-lg border bg-white text-sm"
                          style={{ backgroundColor: '#FFFFFF', opacity: 1 }}
                        >
                          <div className="flex items-start gap-2">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <h4 className="font-semibold text-xs">{notification.title}</h4>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearNotification(notification.id)}
                                  className="shrink-0 h-5 w-5 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-gray-600 mb-1">
                                {notification.message}
                              </p>
                              <span className="text-xs text-gray-400">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-400">
                      <Bell className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-xs">No notifications</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: '#FFFFFF', opacity: 1 }}>
          <DialogHeader>
            <DialogTitle style={{ color: '#1F2937' }}>Cancel Reservation?</DialogTitle>
            <DialogDescription style={{ color: '#6B7280' }}>
              {reservationToCancel && (
                <>
                  Are you sure you want to cancel your reservation at <strong>{reservationToCancel.restaurantName}</strong>?
                  <br /><br />
                  This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setCancelConfirmOpen(false);
                setReservationToCancel(null);
              }}
              style={{ borderColor: '#6B7280', color: '#4B5563' }}
            >
              Keep Reservation
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={!reservationToCancel || cancellingIds.has(reservationToCancel.reservationId)}
              style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
            >
              {reservationToCancel && cancellingIds.has(reservationToCancel.reservationId) ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
