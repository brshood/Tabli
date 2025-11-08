import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LandingPage } from './components/LandingPage';
import { DiscoverPage } from './components/DiscoverPage';
import { CustomerSearchPage } from './components/CustomerSearchPage';
import { RestaurantProfilePage } from './components/RestaurantProfilePage';
import { StaffDashboardWithTabs } from './components/StaffDashboardWithTabs';
import { StaffAuthModal } from './components/StaffAuthModal';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Search, Compass, Users } from 'lucide-react';
import tabliLogo from './assets/tabli-logo-new.png';
import { Toaster } from './components/ui/sonner';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { toast } from 'sonner@2.0.3';
import { WaveBackground } from './components/WaveBackground';
import { RestaurantProvider, useRestaurant, type Restaurant } from './components/RestaurantContext';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { LanguageToggle } from './components/LanguageToggle';
import { parseQRCodeFromUrl, generateQRCodeDataUrl, parseRestaurantProfileFromUrl } from './utils/qrCodeGenerator';

type Page = 'landing' | 'discover' | 'search' | 'staff' | 'restaurant-profile';

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

function AppContent() {
  const { updateRestaurantInList, allRestaurants } = useRestaurant();
  const { t, isRTL } = useLanguage();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [previousPage, setPreviousPage] = useState<Page>('landing');
  const [staffAuth, setStaffAuth] = useState<StaffAuth>({ isAuthenticated: false, user: null, restaurantId: undefined, token: undefined });
  const [staffAuthModalOpen, setStaffAuthModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastProcessedHash, setLastProcessedHash] = useState<string | null>(null);

  // Initialize page from URL on mount (only once)
  useEffect(() => {
    if (hasInitialized) return;
    
    const path = window.location.pathname;
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
      if (['landing', 'discover', 'search', 'staff', 'restaurant-profile'].includes(pageFromHash)) {
        setCurrentPage(pageFromHash);
        
        // If restaurant-profile, will be handled by restaurants-loaded effect
        if (pageFromHash !== 'restaurant-profile') {
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
    
    // Update browser history
    const state: any = { page: newPage };
    
    if (newPage === 'restaurant-profile' && restaurant) {
      setSelectedRestaurant(restaurant);
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

  const handleStaffClick = () => {
    if (staffAuth.isAuthenticated) {
      navigateToPage('staff');
    } else {
      setStaffAuthModalOpen(true);
    }
  };

  const handleLogoClick = () => {
    navigateToPage('landing');
  };

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

  const pageTransition = {
    type: 'tween',
    ease: [0.25, 0.8, 0.25, 1],
    duration: 0.6,
  };

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
            <LandingPage onNavigate={navigateToPage} />
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
      case 'restaurant-profile':
        if (!selectedRestaurant) {
          const hash = window.location.hash;
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
        return (
          <motion.div
            key="restaurant-profile"
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
            <StaffDashboardWithTabs onNavigate={navigateToPage} staffAuth={staffAuth} onLogout={handleStaffLogout} onUserUpdate={handleUserUpdate} />
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
        <nav className="backdrop-blur-sm border-b sticky top-0 z-50" style={{background: 'rgba(235, 211, 162, 0.4)', borderColor: 'rgba(235, 211, 162, 0.2)'}}>
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

      {/* Toast notifications */}
      <Toaster position="top-right" />

      {/* Reset Password Modal */}
      <ResetPasswordModal isOpen={resetOpen} token={resetToken} onClose={() => setResetOpen(false)} />
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