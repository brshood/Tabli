import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Transition } from 'motion';
import { LandingPage } from './components/LandingPage';
import { DiscoverPage } from './components/DiscoverPage';
import { CustomerSearchPage } from './components/CustomerSearchPage';
import { RestaurantProfilePage } from './components/RestaurantProfilePage';
import { StaffDashboardWithTabs } from './components/StaffDashboardWithTabs';
import { StaffAuthModal } from './components/StaffAuthModal';
import { AdminPanel } from './components/AdminPanel';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Search, Compass, Users, HelpCircle, Bell } from 'lucide-react';
import tabliLogo from './assets/tabli-logo-new.png';
import { HelpContactModal } from './components/HelpContactModal';
import { Toaster } from './components/ui/sonner';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { toast } from 'sonner';
import { WaveBackground } from './components/WaveBackground';
import { RestaurantProvider, useRestaurant, type Restaurant } from './components/RestaurantContext';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { LanguageToggle } from './components/LanguageToggle';
import { parseQRCodeFromUrl, generateQRCodeDataUrl, parseRestaurantProfileFromUrl } from './utils/qrCodeGenerator';
import { CancelQueuePage } from './components/CancelQueuePage';
import { InAppNotificationSystem } from './components/InAppNotificationSystem';
import { ReservationStatusModal } from './components/ReservationStatusModal';
import { NotificationsPage } from './components/NotificationsPage';
import { getActiveReservation, updateActiveReservation, clearActiveReservation, type ActiveReservation } from './services/reservationStorage';
import { startReservationSSE, stopReservationSSE } from './services/reservationSSE';
import { notificationService } from './services/NotificationService';

type Page = 'landing' | 'discover' | 'search' | 'staff' | 'restaurant-profile' | 'admin' | 'cancel-queue' | 'cancel-reservation' | 'notifications';

interface StaffUser {
  name: string;
  email: string;
}

interface StaffAuth {
  isAuthenticated: boolean;
  user: StaffUser | null;
  restaurantId?: string;
  token?: string;
}

const LAUNCH_COUNTDOWN_TARGET = new Date('2025-12-12T00:00:00Z').getTime();

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

const getCountdownParts = (totalSeconds: number): CountdownParts => {
  const safeValue = Math.max(0, totalSeconds);
  const days = Math.floor(safeValue / 86400);
  const hours = Math.floor((safeValue % 86400) / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);
  const seconds = Math.floor(safeValue % 60);
  return { days, hours, minutes, seconds };
};

function AppContent() {
  const { updateRestaurantInList, allRestaurants } = useRestaurant();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [previousPage, setPreviousPage] = useState<Page>('landing');
  const [staffAuth, setStaffAuth] = useState<StaffAuth>({ isAuthenticated: false, user: null, restaurantId: undefined, token: undefined });
  const [staffAuthModalOpen, setStaffAuthModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [activeReservation, setActiveReservation] = useState<ActiveReservation | null>(null);
  const [reservationStatusModalOpen, setReservationStatusModalOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastProcessedHash, setLastProcessedHash] = useState<string | null>(null);
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [countdownFinished, setCountdownFinished] = useState<boolean>(() => Date.now() >= LAUNCH_COUNTDOWN_TARGET);
  const [restaurantProfileImagesLoaded, setRestaurantProfileImagesLoaded] = useState(false);
  const countdownIntervalRef = useRef<number | null>(null);
  const countdownAnimationRef = useRef<number | null>(null);
  const pendingRouteRef = useRef<Page | null>(null);
  const countdownTargetLabel = useMemo(
    () => new Date(LAUNCH_COUNTDOWN_TARGET).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    []
  );

  // Reset images loaded state whenever the selected restaurant changes
  useEffect(() => {
    setRestaurantProfileImagesLoaded(false);
  }, [selectedRestaurant?.id]);

  // #13 - Load active reservation and start SSE connection
  useEffect(() => {
    const reservation = getActiveReservation();
    if (reservation) {
      setActiveReservation(reservation);
      startReservationSSE(reservation);
    }

    // Request notification permission on app load (non-intrusive)
    if (notificationService.isSupported() && notificationService.getPermission() === 'default') {
      // Request permission after a short delay to not be annoying
      setTimeout(() => {
        notificationService.requestPermission();
      }, 3000);
    }

    return () => {
      stopReservationSSE();
    };
  }, []);

  const handleReservationUpdate = (updates: Partial<ActiveReservation>) => {
    if (activeReservation) {
      const updated = { ...activeReservation, ...updates };
      setActiveReservation(updated);
      updateActiveReservation(updates);
    }
  };

  const handleReservationComplete = () => {
    setActiveReservation(null);
    clearActiveReservation();
    stopReservationSSE();
  };

  // Initialize page from URL on mount (only once)
  useEffect(() => {
    if (hasInitialized) return;
    
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setResetToken(token);
      setResetOpen(true);
    }
    
    // Check for QR code scan (backward compatibility with old check-in URLs)
    const { isQRScan, restaurantId: qrRestaurantId } = parseQRCodeFromUrl();
    
    if (isQRScan && qrRestaurantId) {
      // Will be handled by the restaurants-loaded effect
      setHasInitialized(true);
      return;
    }
    
    if (hash) {
      // Parse hash to determine initial page
      const pageFromHash = hash.split('?')[0].replace('#', '') as Page;
      if (['landing', 'discover', 'search', 'staff', 'restaurant-profile', 'admin', 'cancel-queue', 'cancel-reservation', 'notifications'].includes(pageFromHash)) {
        setCurrentPage(pageFromHash);
        
        // Admin, cancel-queue, cancel-reservation, and restaurant-profile need special handling
        if (pageFromHash === 'admin' || pageFromHash === 'cancel-queue' || pageFromHash === 'cancel-reservation') {
          // These don't need restaurant data, set immediately
          window.history.replaceState({ page: pageFromHash }, '', hash);
        } else if (pageFromHash === 'restaurant-profile') {
          // Will be handled by restaurants-loaded effect
        } else {
          window.history.replaceState({ page: pageFromHash }, '', hash);
        }
      }
    } else {
      // No hash, set initial state for landing page
      setCurrentPage('landing');
      window.history.replaceState({ page: 'landing' }, '', '#landing');
    }
    
    setHasInitialized(true);
  }, [hasInitialized]);

  // Handle restaurant profile URLs once restaurants are loaded
  useEffect(() => {
    if (!hasInitialized || allRestaurants.length === 0) return;
    
    const hash = window.location.hash;
    
    // Skip admin route - it doesn't need restaurant data
    if (hash === '#admin' || currentPage === 'admin') return;
    
    // Skip if we've already processed this exact hash
    if (lastProcessedHash === hash) return;
    
    // Check for QR code scan (backward compatibility with old check-in URLs)
    const { isQRScan, restaurantId: qrRestaurantId } = parseQRCodeFromUrl();
    
    if (isQRScan && qrRestaurantId) {
      const restaurant = allRestaurants.find(r => r.id === qrRestaurantId || r.id.toString() === qrRestaurantId);
      if (restaurant) {
        // Generate QR code URL if not exists
        if (!restaurant.qrCodeUrl) {
          generateQRCodeDataUrl(restaurant.id, restaurant.name).then(url => {
            updateRestaurantInList(restaurant.id, { qrCodeUrl: url });
          });
        }
        
        setSelectedRestaurant(restaurant);
        setCurrentPage('restaurant-profile');
        toast.success(`Welcome to ${restaurant.name}!`);
        
        // Clean up URL but keep hash for history with restaurant ID
        const newHash = `#restaurant-profile?id=${restaurant.id}`;
        window.history.replaceState({ page: 'restaurant-profile', restaurantId: restaurant.id }, '', newHash);
        setLastProcessedHash(newHash);
      } else {
        console.error('Restaurant not found for QR ID:', qrRestaurantId, 'Available IDs:', allRestaurants.map(r => r.id));
        toast.error('Restaurant not found');
        setCurrentPage('search');
        window.history.replaceState({ page: 'search' }, '', '#search');
        setLastProcessedHash('#search');
      }
      return;
    }
    
    // Check for restaurant profile in hash
    if (hash && hash.startsWith('#restaurant-profile')) {
      const { restaurantId } = parseRestaurantProfileFromUrl();
      if (restaurantId) {
        // Try both exact match and string comparison
        const restaurant = allRestaurants.find(r => r.id === restaurantId || r.id.toString() === restaurantId);
        if (restaurant) {
          setSelectedRestaurant(restaurant);
          setCurrentPage('restaurant-profile');
          window.history.replaceState({ page: 'restaurant-profile', restaurantId }, '', hash);
          setLastProcessedHash(hash);
        } else {
          console.error('Restaurant not found for ID:', restaurantId, 'Available IDs:', allRestaurants.map(r => r.id));
          // Restaurant not found after restaurants loaded, redirect to search
          setCurrentPage('search');
          setSelectedRestaurant(null);
          window.history.replaceState({ page: 'search' }, '', '#search');
          setLastProcessedHash('#search');
        }
      } else {
        // No restaurant ID in URL, but on restaurant-profile page
        // Only redirect if we don't have a selected restaurant
        if (!selectedRestaurant) {
          setCurrentPage('search');
          window.history.replaceState({ page: 'search' }, '', '#search');
          setLastProcessedHash('#search');
        } else {
          setLastProcessedHash(hash);
        }
      }
    } else {
      // Not a restaurant profile URL, mark as processed
      setLastProcessedHash(hash || '');
    }
  }, [allRestaurants, hasInitialized, updateRestaurantInList, lastProcessedHash]);

  // Load auth state from session storage on mount
  useEffect(() => {
    const savedAuth = sessionStorage.getItem('staffAuth');
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        setStaffAuth(parsedAuth);
      } catch (error) {
        console.error('Failed to parse saved auth:', error);
      }
    }
  }, []);

  // Save auth state to session storage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('staffAuth', JSON.stringify(staffAuth));
  }, [staffAuth]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      
      if (state && state.page) {
        setPreviousPage(currentPage);
        setCurrentPage(state.page);
        
        if (state.page === 'restaurant-profile') {
          // Try to get restaurant ID from state first, then from URL hash
          const restaurantId = state.restaurantId || parseRestaurantProfileFromUrl().restaurantId;
          if (restaurantId) {
            const restaurant = allRestaurants.find(r => r.id === restaurantId);
            if (restaurant) {
              setSelectedRestaurant(restaurant);
            } else {
              // Restaurant not found, redirect to search
              setCurrentPage('search');
              setSelectedRestaurant(null);
            }
          } else {
            setSelectedRestaurant(null);
          }
        } else {
          setSelectedRestaurant(null);
        }
        } else {
          // If no state, check URL hash
        const hash = window.location.hash;
        if (hash) {
          const pageFromHash = hash.split('?')[0].replace('#', '') as Page;
          if (pageFromHash === 'restaurant-profile') {
            const { restaurantId } = parseRestaurantProfileFromUrl();
            if (restaurantId) {
              const restaurant = allRestaurants.find(r => r.id === restaurantId);
              if (restaurant) {
                setPreviousPage(currentPage);
                setCurrentPage('restaurant-profile');
                setSelectedRestaurant(restaurant);
                return;
              }
            }
          } else if (pageFromHash === 'admin' || pageFromHash === 'cancel-queue' || pageFromHash === 'cancel-reservation') {
            setPreviousPage(currentPage);
            setCurrentPage(pageFromHash);
            setSelectedRestaurant(null);
            return;
          }
        }
        // Default to landing page
        setPreviousPage(currentPage);
        setCurrentPage('landing');
        setSelectedRestaurant(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentPage, allRestaurants]);

  // Enhanced navigation with transition tracking and browser history
  const navigateToPage = (newPage: Page, restaurant?: Restaurant) => {
    setPreviousPage(currentPage);
    setCurrentPage(newPage);
    
    // Reset restaurant profile images loaded flag when navigating
    if (newPage !== 'restaurant-profile') {
      setRestaurantProfileImagesLoaded(false);
    }
    
    // Update browser history
    const state: any = { page: newPage };
    
    if (newPage === 'restaurant-profile' && restaurant) {
      setSelectedRestaurant(restaurant);
      // Reset images loaded for new restaurant
      setRestaurantProfileImagesLoaded(false);
      state.restaurantId = restaurant.id;
      window.history.pushState(state, '', `#${newPage}?id=${restaurant.id}`);
    } else if (newPage !== 'restaurant-profile') {
      setSelectedRestaurant(null);
      window.history.pushState(state, '', `#${newPage}`);
    } else {
      // Navigating to restaurant-profile without restaurant (shouldn't happen, but handle gracefully)
      setSelectedRestaurant(null);
      window.history.pushState(state, '', `#${newPage}`);
    }
  };

  const handleStaffAuthSuccess = (user: StaffUser, restaurantData?: any) => {
    // Get token from localStorage (set by StaffAuthModal)
    const token = localStorage.getItem('auth_token') || '';
    
    if (restaurantData && restaurantData.id) {
      // Add the new restaurant to the list (ID from backend)
      updateRestaurantInList(restaurantData.id, restaurantData);
      toast.success(`Welcome ${restaurantData.name}! Your restaurant is now visible to customers.`);
      setStaffAuth({ 
        isAuthenticated: true, 
        user, 
        restaurantId: restaurantData.id,
        token 
      });
    } else {
      // For login (no restaurantData), we need to get restaurantId from somewhere
      // It should be in the user object from the login response
      const restaurantId = (user as any).restaurantId;
      setStaffAuth({ 
        isAuthenticated: true, 
        user, 
        restaurantId,
        token 
      });
    }
    
    navigateToPage('staff');
  };

  const handleStaffLogout = () => {
    localStorage.removeItem('auth_token');
    setStaffAuth({ isAuthenticated: false, user: null, restaurantId: undefined, token: undefined });
    navigateToPage('landing');
  };

  const handleUserUpdate = (updatedUser: any) => {
    setStaffAuth(prev => ({
      ...prev,
      user: {
        name: updatedUser.name,
        email: updatedUser.email
      }
    }));
  };

  const clearCountdownTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (countdownAnimationRef.current) {
      cancelAnimationFrame(countdownAnimationRef.current);
      countdownAnimationRef.current = null;
    }
  }, []);

  const resolvePendingNavigation = useCallback(() => {
    if (pendingRouteRef.current) {
      const nextPage = pendingRouteRef.current;
      pendingRouteRef.current = null;
      if (nextPage) {
        navigateToPage(nextPage);
      }
    }
  }, [navigateToPage]);

  const completeCountdown = useCallback(() => {
    clearCountdownTimers();
    setCountdownVisible(false);
    setCountdownSeconds(0);
    setCountdownFinished(true);
    resolvePendingNavigation();
  }, [clearCountdownTimers, resolvePendingNavigation]);

  const startCountdownTick = useCallback(
    (initialSeconds: number) => {
      if (typeof window === 'undefined') {
        return;
      }

      const targetTime = Date.now() + initialSeconds * 1000;
      setCountdownSeconds(initialSeconds);

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }

      countdownIntervalRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
        setCountdownSeconds(remaining);

        if (remaining <= 0) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          completeCountdown();
        }
      }, 1000);
    },
    [completeCountdown]
  );

  const startCountdownAnimation = useCallback(
    (initialSeconds: number) => {
      clearCountdownTimers();

      if (initialSeconds <= 0) {
        completeCountdown();
        return;
      }

      setCountdownSeconds(0);
      setCountdownVisible(true);

      if (typeof window === 'undefined') {
        setCountdownSeconds(initialSeconds);
        completeCountdown();
        return;
      }

      const animationStart = performance.now();

      const step = (timestamp: number) => {
        const progress = Math.min((timestamp - animationStart) / 1200, 1);
        const displayValue = Math.max(0, Math.floor(initialSeconds * easeOutQuad(progress)));
        setCountdownSeconds(displayValue);

        if (progress < 1) {
          countdownAnimationRef.current = window.requestAnimationFrame(step);
        } else {
          countdownAnimationRef.current = null;
          setCountdownSeconds(initialSeconds);
          startCountdownTick(initialSeconds);
        }
      };

      countdownAnimationRef.current = window.requestAnimationFrame(step);
    },
    [clearCountdownTimers, completeCountdown, startCountdownTick]
  );

  const handleCountdownNavigation = useCallback(
    (target: Page) => {
      if (countdownFinished) {
        navigateToPage(target);
        return;
      }

      const remaining = Math.max(0, Math.floor((LAUNCH_COUNTDOWN_TARGET - Date.now()) / 1000));
      if (remaining <= 0) {
        setCountdownFinished(true);
        navigateToPage(target);
        return;
      }

      pendingRouteRef.current = target;
      startCountdownAnimation(remaining);
    },
    [countdownFinished, navigateToPage, startCountdownAnimation]
  );

  const handleCountdownClose = useCallback(() => {
    clearCountdownTimers();
    setCountdownSeconds(0);
    setCountdownVisible(false);
    pendingRouteRef.current = null;
  }, [clearCountdownTimers]);

  const handleLogoClick = () => {
    navigateToPage('landing');
  };

  useEffect(() => {
    return () => {
      clearCountdownTimers();
    };
  }, [clearCountdownTimers]);

  useEffect(() => {
    if (!countdownVisible || countdownFinished) {
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [countdownVisible, countdownFinished, clearCountdownTimers]);

  // Animation variants for smooth transitions
  const getPageVariants = () => {
    const pageOrder = ['landing', 'discover', 'search', 'restaurant-profile', 'staff'];
    const currentIndex = pageOrder.indexOf(currentPage);
    const previousIndex = pageOrder.indexOf(previousPage);
    const isMovingForward = currentIndex > previousIndex;

    return {
      initial: {
        x: isMovingForward ? '100%' : '-100%',
        opacity: 0,
      },
      animate: {
        x: 0,
        opacity: 1,
      },
      exit: {
        x: isMovingForward ? '-100%' : '100%',
        opacity: 0,
      },
    };
  };

  const pageTransition: Transition = {
    type: 'spring',
    stiffness: 120,
    damping: 22,
    mass: 0.9,
  };
  const countdownParts = useMemo(() => getCountdownParts(countdownSeconds), [countdownSeconds]);
  const shouldShowCountdown = countdownVisible && !countdownFinished;
  const formatCountdownValue = (value: number, pad = true) => (pad ? value.toString().padStart(2, '0') : value.toString());

  const renderPage = () => {
    const pageVariants = getPageVariants();

    switch (currentPage) {
      case 'landing':
        return (
          <motion.div
            key="landing"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <LandingPage onNavigate={navigateToPage} onCtaNavigate={handleCountdownNavigation} />
          </motion.div>
        );
      case 'discover':
        return (
          <motion.div
            key="discover"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <DiscoverPage onNavigate={navigateToPage} />
          </motion.div>
        );
      case 'search':
        return (
          <motion.div
            key="search"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <CustomerSearchPage onNavigate={navigateToPage} />
          </motion.div>
        );
      case 'notifications':
        return (
          <motion.div
            key="notifications"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <NotificationsPage 
              onNavigate={navigateToPage}
              onRestaurantSelect={(restaurantId) => {
                const restaurant = allRestaurants.find(r => r.id === restaurantId || (r as any)._id === restaurantId);
                if (restaurant) {
                  setSelectedRestaurant(restaurant);
                  navigateToPage('restaurant-profile');
                }
              }}
            />
          </motion.div>
        );
      case 'restaurant-profile':
        if (!selectedRestaurant) {
          const { restaurantId } = parseRestaurantProfileFromUrl();
          
          // If restaurants haven't loaded yet, show loading
          if (allRestaurants.length === 0) {
            return (
              <motion.div
                key="restaurant-profile-loading"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="absolute inset-0 w-full page-transition overflow-x-hidden flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading restaurant...</p>
                </div>
              </motion.div>
            );
          }
          
          // If we have a restaurant ID in URL, check if it exists in the list
          if (restaurantId) {
            const restaurantExists = allRestaurants.some(r => r.id === restaurantId || r.id.toString() === restaurantId);
            // If restaurant exists but not selected yet, show loading (effect is processing it)
            if (restaurantExists) {
              return (
                <motion.div
                  key="restaurant-profile-loading"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  className="absolute inset-0 w-full page-transition overflow-x-hidden flex items-center justify-center"
                >
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading restaurant...</p>
                  </div>
                </motion.div>
              );
            }
            // Restaurant doesn't exist, effect will redirect - but show loading briefly
            return (
              <motion.div
                key="restaurant-profile-loading"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
                className="absolute inset-0 w-full page-transition overflow-x-hidden flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading restaurant...</p>
                </div>
              </motion.div>
            );
          }
          
          // If restaurants have loaded but no restaurant selected and no ID in URL, redirect to search
          navigateToPage('search');
          return null;
        }
        // Show loading state while images are loading to prevent animation stutter
        if (!restaurantProfileImagesLoaded) {
          return (
            <motion.div
              key="restaurant-profile-loading-images"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="absolute inset-0 w-full page-transition overflow-x-hidden flex items-center justify-center"
            >
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading restaurant...</p>
              </div>
              {/* Hidden component to preload images */}
              <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
                <RestaurantProfilePage 
                  restaurant={selectedRestaurant} 
                  onNavigate={navigateToPage}
                  onImagesLoaded={() => setRestaurantProfileImagesLoaded(true)}
                />
              </div>
            </motion.div>
          );
        }
        
        return (
          <motion.div
            key={`restaurant-profile-${selectedRestaurant.id}`}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <RestaurantProfilePage 
              restaurant={selectedRestaurant} 
              onNavigate={navigateToPage}
              onImagesLoaded={() => setRestaurantProfileImagesLoaded(true)}
            />
          </motion.div>
        );
      case 'staff':
        if (!staffAuth.isAuthenticated) {
          return (
            <motion.div
              key="staff-login"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="absolute inset-0 w-full page-transition overflow-x-hidden"
            >
              <div className="relative min-h-screen flex items-center justify-center py-8 overflow-hidden">
                <Card className="w-full max-w-md mx-4 card-shadow relative z-10" style={{backgroundColor: '#F3F4F6', borderColor: 'rgba(60, 60, 60, 0.2)'}}>
                  <CardContent className="p-8 text-center">
                    <Users className="h-16 w-16 mx-auto mb-4" style={{color: '#B7410E'}} />
                    <h2 className="text-2xl font-semibold mb-4" style={{color: '#3C3C3C'}}>Staff Access Required</h2>
                    <p className="mb-6" style={{color: '#3C3C3C'}}>Please log in to access the staff dashboard.</p>
                    <Button 
                      onClick={() => setStaffAuthModalOpen(true)}
                      className="pill-button cta-button"
                    >
                      Open Staff Login
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          );
        }
        return (
          <motion.div
            key="staff-dashboard"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <StaffDashboardWithTabs
              onNavigate={navigateToPage}
              staffAuth={staffAuth}
              onLogout={handleStaffLogout}
              onUserUpdate={handleUserUpdate}
              onRestaurantDeleted={handleStaffLogout}
            />
          </motion.div>
        );
      case 'admin':
        return (
          <motion.div
            key="admin"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <AdminPanel />
          </motion.div>
        );
      case 'cancel-queue':
        return (
          <motion.div
            key="cancel-queue"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <CancelQueuePage />
          </motion.div>
        );
      case 'cancel-reservation':
        return (
          <motion.div
            key="cancel-reservation"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <CancelQueuePage />
          </motion.div>
        );
      default:
        return (
          <motion.div
            key="default"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0 w-full page-transition overflow-x-hidden"
          >
            <LandingPage onNavigate={navigateToPage} />
          </motion.div>
        );
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {currentPage === 'landing' && <WaveBackground />}
      {/* Navigation */}
      {currentPage !== 'landing' && (
        <nav className="backdrop-blur-md border-b sticky top-0 z-50" style={{background: 'rgba(235, 211, 162, 0.95)', borderColor: 'rgba(235, 211, 162, 0.6)'}}>
          <div className="container mx-auto px-4 py-3" style={{paddingTop: '12px', paddingBottom: '12px'}}>
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              {/* Logo - Percentage-based sizing for consistent proportion */}
              <div className="flex items-center" style={{width: '13.5%', minWidth: '60px', maxWidth: '105px'}}>
                <button onClick={handleLogoClick} className="focus:outline-none w-full">
                  <img 
                    src={tabliLogo} 
                    alt="Tabli" 
                    className="hover:opacity-80 transition-opacity cursor-pointer w-full h-auto" 
                  />
                </button>
              </div>
              
              {/* Navigation Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant={currentPage === 'discover' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigateToPage('discover')}
                  className="pill-button text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Compass className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  <span>{t('nav.discover')}</span>
                </Button>
                <Button
                  variant={currentPage === 'search' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigateToPage('search')}
                  className="pill-button text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Search className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  <span>{t('nav.search')}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHelpModalOpen(true)}
                  className="rounded-full h-8 w-8 sm:h-9 sm:w-9 p-0"
                  title="Help & Contact"
                >
                  <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <LanguageToggle />
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Page Content */}
      <div className="relative min-h-screen">
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
      </div>

      {/* Staff Auth Modal */}
      <StaffAuthModal
        isOpen={staffAuthModalOpen}
        onClose={() => setStaffAuthModalOpen(false)}
        onAuthSuccess={handleStaffAuthSuccess}
      />

      {/* Help Contact Modal */}
      <HelpContactModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      {/* Toast notifications */}
      <Toaster position="top-right" />

      {/* Reset Password Modal */}
      <ResetPasswordModal isOpen={resetOpen} token={resetToken} onClose={() => setResetOpen(false)} />

      <AnimatePresence>
        {shouldShowCountdown && (
          <motion.div
            key="countdown"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <p className="text-xs uppercase tracking-[0.4em] text-gray-500">We'll be live in:</p>
              <div className="grid grid-cols-4 gap-3 my-8">
                {[
                  { label: 'Days', value: formatCountdownValue(countdownParts.days, false) },
                  { label: 'Hours', value: formatCountdownValue(countdownParts.hours) },
                  { label: 'Minutes', value: formatCountdownValue(countdownParts.minutes) },
                  { label: 'Seconds', value: formatCountdownValue(countdownParts.seconds) },
                ].map((segment) => (
                  <div key={segment.label} className="rounded-2xl bg-[#FDF7ED] px-3 py-4">
                    <div className="text-3xl font-semibold text-[#B8860B]">
                      {segment.value}
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{segment.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600">
                We’re opening the line on {countdownTargetLabel}. Thanks for your patience!
              </p>
              <Button variant="ghost" className="mt-6" onClick={handleCountdownClose}>
                Back to home
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* #13 - Floating Notification Bell (only show after landing page, excluding staff) */}
      {currentPage !== 'landing' && currentPage !== 'staff' && (
        <InAppNotificationSystem 
          onNotificationClick={() => {
            navigateToPage('notifications');
          }}
        />
      )}

      {/* #13 - Reservation Status Modal */}
      {activeReservation && (
        <ReservationStatusModal
          isOpen={reservationStatusModalOpen}
          onClose={() => setReservationStatusModalOpen(false)}
          reservation={activeReservation}
          onReservationUpdate={handleReservationUpdate}
          onReservationComplete={handleReservationComplete}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <RestaurantProvider>
        <AppContent />
      </RestaurantProvider>
    </LanguageProvider>
  );
}