// #13 - In-App Notification System
// Persistent notifications that stay until dismissed

import { useState, useEffect } from 'react';
import { X, Bell, CheckCircle, AlertCircle, Info, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatGSTDate } from '../utils/dateFormat';

export interface InAppNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  persistent?: boolean; // If true, won't auto-dismiss
  actionLabel?: string;
  onAction?: () => void;
}

interface InAppNotificationSystemProps {
  onNotificationClick?: () => void;
}

const STORAGE_KEY = 'tabli_notifications';
const MAX_NOTIFICATIONS = 10;

export function InAppNotificationSystem({ onNotificationClick }: InAppNotificationSystemProps) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load notifications from localStorage on mount and periodically
  useEffect(() => {
    const loadNotifications = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as InAppNotification[];
          // Only keep notifications from last 24 hours
          const now = Date.now();
          const filtered = parsed.filter(n => now - n.timestamp < 24 * 60 * 60 * 1000);
          setNotifications(filtered);
          if (filtered.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
          }
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };

    loadNotifications();
    
    // Reload every 30 seconds to catch notifications added by polling service (avoid rate limiting)
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }, [notifications]);

  // Listen for custom events to add notifications
  useEffect(() => {
    const handleAddNotification = (event: CustomEvent<InAppNotification>) => {
      addNotification(event.detail);
    };

    window.addEventListener('tabli:notification' as any, handleAddNotification);
    return () => {
      window.removeEventListener('tabli:notification' as any, handleAddNotification);
    };
  }, []);

  const addNotification = (notification: InAppNotification) => {
    setNotifications(prev => {
      // Remove duplicates (same title and message)
      const filtered = prev.filter(
        n => !(n.title === notification.title && n.message === notification.message)
      );
      // Add new notification at the beginning
      const updated = [notification, ...filtered];
      // Keep only MAX_NOTIFICATIONS most recent
      return updated.slice(0, MAX_NOTIFICATIONS);
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
    setIsExpanded(false);
  };

  const getIcon = (type: InAppNotification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getColorClasses = (type: InAppNotification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return formatGSTDate(new Date(timestamp));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Notification Bell Button */}
      <div className="relative">
        <Button
          onClick={() => {
            if (onNotificationClick) onNotificationClick();
            setIsExpanded(!isExpanded);
          }}
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
          style={{ backgroundColor: '#5A5E3E' }}
        >
          <Bell className="h-6 w-6 text-white" />
          {notifications.length > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center animate-pulse"
              style={{ backgroundColor: '#EF4444', color: 'white' }}
            >
              {notifications.length}
            </Badge>
          )}
        </Button>

        {/* Notifications Panel */}
        {isExpanded && (
          <div
            className="absolute bottom-16 right-0 w-96 max-w-[calc(100vw-2rem)] max-h-[32rem] overflow-y-auto bg-white rounded-lg shadow-2xl border"
            style={{ borderColor: 'rgba(90, 94, 62, 0.2)', backgroundColor: '#FFFFFF', opacity: 1 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#FFFFFF', opacity: 1 }}>
              <h3 className="font-semibold text-lg" style={{ color: '#2D2D2B' }}>
                Notifications
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-sm"
              >
                Clear All
              </Button>
            </div>

            {/* Notification List */}
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 ${getColorClasses(notification.type)} border-l-4`}
                  style={{ opacity: 1 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 flex-1">
                      {getIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm mb-1">
                          {notification.title}
                        </p>
                        <p className="text-sm opacity-90 whitespace-pre-wrap">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 opacity-60" />
                          <span className="text-xs opacity-60">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        {notification.actionLabel && notification.onAction && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={notification.onAction}
                            className="mt-2 text-xs"
                          >
                            {notification.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNotification(notification.id)}
                      className="shrink-0 h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to dispatch notification events
export function showInAppNotification(notification: Omit<InAppNotification, 'id' | 'timestamp'>) {
  const fullNotification: InAppNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  // Save directly to localStorage to ensure it persists
  try {
    const stored = localStorage.getItem('tabli_notifications');
    const existing = stored ? JSON.parse(stored) : [];
    
    // Check for duplicates (same title and message within last 5 seconds)
    const isDuplicate = existing.some((n: InAppNotification) => 
      n.title === fullNotification.title && 
      n.message === fullNotification.message &&
      (fullNotification.timestamp - n.timestamp) < 5000
    );
    
    if (!isDuplicate) {
      existing.unshift(fullNotification);
      // Keep only last 50 notifications
      const trimmed = existing.slice(0, 50);
      localStorage.setItem('tabli_notifications', JSON.stringify(trimmed));
      console.log('[NOTIFICATION] Saved to localStorage:', fullNotification.title);
    } else {
      console.log('[NOTIFICATION] Duplicate detected, skipping:', fullNotification.title);
    }
  } catch (error) {
    console.error('Failed to save notification to localStorage:', error);
  }

  // Also dispatch event for real-time update
  const event = new CustomEvent('tabli:notification', { detail: fullNotification });
  window.dispatchEvent(event);
}

