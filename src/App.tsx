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
import { toast } from 'sonner@2.0.3';
import { WaveBackground } from './components/WaveBackground';
import { RestaurantProvider, useRestaurant, type Restaurant } from './components/RestaurantContext';
import { LanguageProvider, useLanguage } from './components/LanguageContext';
import { LanguageToggle } from './components/LanguageToggle';
import { parseQRCodeFromUrl, generateQRCodeDataUrl } from './utils/qrCodeGenerator';

type Page = 'landing' | 'discover' | 'search' | 'staff' | 'restaurant-profile';

interface StaffUser {
  name: string;
  email: string;
}

interface StaffAuth {
  isAuthenticated: boolean;
  user: StaffUser | null;
}

function AppContent() {
  const { updateRestaurantInList, allRestaurants } = useRestaurant();
  const { t, isRTL } = useLanguage();
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [previousPage, setPreviousPage] = useState<Page>('landing');
  const [staffAuth, setStaffAuth] = useState<StaffAuth>({ isAuthenticated: false, user: null });
  const [staffAuthModalOpen, setStaffAuthModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  // Initialize page from URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Check for QR code scan
    const { isQRScan, restaurantId } = parseQRCodeFromUrl();
    
    if (isQRScan && restaurantId) {
      const restaurant = allRestaurants.find(r => r.id === restaurantId);
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
        
        // Clean up URL but keep hash for history
        window.history.replaceState({ page: 'restaurant-profile', restaurantId }, '', '#restaurant-profile');
      } else {
        toast.error('Restaurant not found');
      }
    } else if (hash) {
      // Parse hash to determine initial page
      const pageFromHash = hash.replace('#', '') as Page;
      if (['landing', 'discover', 'search', 'staff', 'restaurant-profile'].includes(pageFromHash)) {
        setCurrentPage(pageFromHash);
        // Set initial history state
        window.history.replaceState({ page: pageFromHash }, '', hash);
      }
    } else {
      // No hash, set initial state for landing page
      window.history.replaceState({ page: 'landing' }, '', '#landing');
    }
  }, [allRestaurants, updateRestaurantInList]);

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
        
        if (state.page === 'restaurant-profile' && state.restaurantId) {
          const restaurant = allRestaurants.find(r => r.id === state.restaurantId);
          if (restaurant) {
            setSelectedRestaurant(restaurant);
          }
        } else if (state.page !== 'restaurant-profile') {
          setSelectedRestaurant(null);
        }
      } else {
        // If no state, default to landing page
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
      window.history.pushState(state, '', `#${newPage}`);
    } else if (newPage !== 'restaurant-profile') {
      setSelectedRestaurant(null);
      window.history.pushState(state, '', `#${newPage}`);
    } else {
      window.history.pushState(state, '', `#${newPage}`);
    }
  };

  const handleStaffAuthSuccess = (user: StaffUser, restaurantData?: any) => {
    if (restaurantData && restaurantData.id) {
      // Add the new restaurant to the list (ID from backend)
      updateRestaurantInList(restaurantData.id, restaurantData);
      toast.success(`Welcome ${restaurantData.name}! Your restaurant is now visible to customers.`);
    }
    
    setStaffAuth({ isAuthenticated: true, user });
    navigateToPage('staff');
  };

  const handleStaffLogout = () => {
    setStaffAuth({ isAuthenticated: false, user: null });
    navigateToPage('landing');
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
          // If no restaurant selected, redirect to search
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
            <StaffDashboardWithTabs onNavigate={navigateToPage} staffAuth={staffAuth} onLogout={handleStaffLogout} />
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