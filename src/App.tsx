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
import { Users, Search, ArrowLeft } from 'lucide-react';
import tabliLogo from 'figma:asset/b9aff3f805d23772814268da68c337d8a54fb6dd.png';
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

  // Handle QR code scan on mount
  useEffect(() => {
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
        
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        toast.error('Restaurant not found');
      }
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

  // Enhanced navigation with transition tracking
  const navigateToPage = (newPage: Page, restaurant?: Restaurant) => {
    setPreviousPage(currentPage);
    setCurrentPage(newPage);
    
    if (newPage === 'restaurant-profile' && restaurant) {
      setSelectedRestaurant(restaurant);
    } else if (newPage !== 'restaurant-profile') {
      setSelectedRestaurant(null);
    }
  };

  const handleStaffAuthSuccess = (user: StaffUser, restaurantData?: any) => {
    if (restaurantData) {
      // Generate a new ID for the restaurant
      const newRestaurantId = Math.max(...allRestaurants.map(r => r.id), 0) + 1;
      const newRestaurant = {
        ...restaurantData,
        id: newRestaurantId
      };
      
      // Add the new restaurant to the list
      updateRestaurantInList(newRestaurantId, newRestaurant);
      
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
                <Card className="w-full max-w-md mx-4 card-shadow relative z-10" style={{backgroundColor: '#F3E5AB', borderColor: 'rgba(60, 60, 60, 0.2)'}}>
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
        <nav className="backdrop-blur-sm border-b sticky top-0 z-50" style={{background: 'rgba(235, 211, 162, 0.7)', borderColor: 'rgba(235, 211, 162, 0.3)', height: '128px'}}>
          <div className="container mx-auto h-full" style={{paddingLeft: '48px', paddingRight: '16px'}}>
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center space-x-4">
                <Button
                  variant={currentPage === 'discover' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigateToPage('discover')}
                  className="pill-button"
                  style={{marginLeft: '-48px'}}
                >
                  <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  Back
                </Button>
                <button onClick={handleLogoClick} className="focus:outline-none py-1">
                  <img src={tabliLogo} alt="Tabli" className="hover:opacity-80 transition-opacity cursor-pointer" style={{height: '160px', width: 'auto'}} />
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={currentPage === 'discover' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigateToPage('discover')}
                  className="pill-button"
                >
                  <Search className="h-4 w-4 mr-1" />
                  Discover
                </Button>
                <Button
                  variant={currentPage === 'search' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigateToPage('search')}
                  className="pill-button"
                >
                  <Search className="h-4 w-4 mr-1" />
                  {t('nav.search')}
                </Button>
                <Button
                  variant={currentPage === 'staff' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={handleStaffClick}
                  className="pill-button"
                >
                  <Users className="h-4 w-4 mr-1" />
                  {t('nav.staff')}
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