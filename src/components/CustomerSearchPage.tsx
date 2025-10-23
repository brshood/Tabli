import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

import { BookingModal } from './BookingModal';
import { MenuModal } from './MenuModal';
import { useRestaurant } from './RestaurantContext';
import { useLanguage } from './LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { Search, MapPin, Star, Clock, Users, Phone, Flame, TrendingUp, Menu, ArrowLeft } from 'lucide-react';
import tabliLogo from 'figma:asset/b9aff3f805d23772814268da68c337d8a54fb6dd.png';

interface CustomerSearchPageProps {
  onNavigate: (page: 'landing' | 'discover' | 'search' | 'staff' | 'restaurant-profile') => void;
}

const locationFilters = ['Al Ain', 'Abu Dhabi', 'Dubai'];

export function CustomerSearchPage({ onNavigate }: CustomerSearchPageProps) {
  const { allRestaurants } = useRestaurant();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<'reserve' | 'waitlist'>('reserve');
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [selectedRestaurantForBooking, setSelectedRestaurantForBooking] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredRestaurants = allRestaurants.filter(restaurant => {
    const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         restaurant.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = !selectedLocation || restaurant.city === selectedLocation;
    
    return matchesSearch && matchesLocation;
  });

  const handleCardClick = (restaurant: any) => {
    setSelectedCard(restaurant.id);
    // Add a small delay for animation before navigating
    setTimeout(() => {
      onNavigate('restaurant-profile', restaurant);
    }, 300);
  };

  return (
    <div className="relative min-h-screen py-8 overflow-hidden" style={{backgroundColor: '#F5F5F5'}}>
      {/* Wave Background */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='1440' height='800' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,200 Q360,100 720,200 T1440,200 L1440,800 L0,800 Z' fill='%23F0DC82' opacity='0.1'/%3E%3Cpath d='M0,400 Q360,300 720,400 T1440,400 L1440,800 L0,800 Z' fill='%23F0DC82' opacity='0.15'/%3E%3Cpath d='M0,600 Q360,500 720,600 T1440,600 L1440,800 L0,800 Z' fill='%23F0DC82' opacity='0.2'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'bottom',
        backgroundSize: 'cover'
      }}></div>
      <div className="container mx-auto px-4 relative z-10 mt-4 sm:mt-8">
        {/* Title Section */}
        <div className="text-center mb-12 mt-12">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: 'var(--where2go-text)'}}>{t('search.title')}</h1>
          <p className={`text-xl max-w-2xl mx-auto ${isRTL ? 'font-arabic' : ''}`} style={{color: 'var(--where2go-text)', opacity: 0.7}}>
            {t('search.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
            <Input
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`h-14 text-lg rounded-full card-shadow ${isRTL ? 'font-arabic text-right pr-12 pl-4' : 'pl-12 pr-4'}`}
              style={{borderColor: 'rgba(60, 60, 60, 0.2)', backgroundColor: '#F8F1C1'}}
            />
          </div>
        </div>

        {/* Filter Tags */}
        <div className="mb-8">
          {/* Location Filters */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant={selectedLocation === null ? "default" : "outline"}
              onClick={() => setSelectedLocation(null)}
              className={`pill-button ${isRTL ? 'font-arabic' : ''}`}
              size="sm"
              style={selectedLocation === null ? {backgroundColor: '#B7410E', color: 'white'} : {}}
            >
              <MapPin className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {t('search.all.locations')}
            </Button>
            {locationFilters.map((location) => (
              <Button
                key={location}
                variant={selectedLocation === location ? "default" : "outline"}
                onClick={() => setSelectedLocation(selectedLocation === location ? null : location)}
                className="pill-button"
                size="sm"
                style={selectedLocation === location ? {backgroundColor: '#B7410E', color: 'white'} : {}}
              >
                <MapPin className="h-4 w-4 mr-1" />
                {location}
              </Button>
            ))}
          </div>
        </div>

        {/* Search Results Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold" style={{color: 'var(--where2go-text)'}}>
            {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'Restaurant' : 'Restaurants'} Found
          </h2>
          {selectedLocation && (
            <div className="text-sm" style={{color: 'var(--where2go-text)', opacity: 0.7}}>
              {selectedLocation}
            </div>
          )}
        </div>

        {/* Restaurant Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {filteredRestaurants.map((restaurant) => (
            <Card 
              key={restaurant.id} 
              className={`card-shadow border-0 rounded-3xl overflow-hidden transition-all duration-300 relative cursor-pointer ${
                selectedCard === restaurant.id 
                  ? 'scale-110 shadow-2xl' 
                  : 'hover:scale-105'
              }`}
              onClick={() => handleCardClick(restaurant)}
              style={{
                transform: selectedCard === restaurant.id ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div className="h-48 flex items-center justify-center relative" style={{background: 'linear-gradient(to bottom right, #F8F1C1, #F3E5AB)'}}>
                <span className="text-lg font-medium" style={{color: '#B7410E'}}>{restaurant.name}</span>
                
                {/* Trending badge for restaurants with >50 weekly average customers */}
                {restaurant.weeklyAverageCustomers > 50 && (
                  <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium shadow-lg ${isRTL ? 'font-arabic' : ''}`} style={{backgroundColor: '#22C55E', color: 'white'}}>
                    <TrendingUp className="h-3 w-3" />
                    <span>{t('search.trending')}</span>
                  </div>
                )}
                
                {/* Fire icon for restaurants with >5 people waiting */}
                {restaurant.waitingInLine > 5 && (
                  <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} bg-red-500 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs font-medium shadow-lg ${isRTL ? 'font-arabic' : ''}`}>
                    <Flame className="h-3 w-3" />
                    <span>{restaurant.waitingInLine} {t('search.waiting')}</span>
                  </div>
                )}
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-semibold mb-1" style={{color: '#3C3C3C'}}>{restaurant.name}</h3>
                    <div className="flex items-center mb-2" style={{color: '#3C3C3C'}}>
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">{restaurant.location}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span className="text-sm font-medium">{restaurant.rating}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  {restaurant.status === 'available' ? (
                    <Badge className={`px-3 py-1 rounded-full ${isRTL ? 'font-arabic' : ''}`} style={{backgroundColor: '#D4F6D4', color: '#2D5B2D'}}>
                      {t('search.available')}
                    </Badge>
                  ) : (
                    <Badge className={`px-3 py-1 rounded-full ${isRTL ? 'font-arabic' : ''}`} style={{backgroundColor: '#F8F1C1', color: '#B7410E'}}>
                      {t('search.waitlist.only')}
                    </Badge>
                  )}
                  
                  <Badge variant="outline" className="px-3 py-1 rounded-full">
                    {restaurant.cuisine}
                  </Badge>
                </div>

                {/* Info */}
                <div className="flex items-center justify-between text-sm mb-4" style={{color: '#3C3C3C'}}>
                  {restaurant.status === 'available' ? (
                    <div className={`flex items-center ${isRTL ? 'font-arabic' : ''}`}>
                      <Users className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      <span>{restaurant.tablesAvailable} {t('search.tables.available')}</span>
                    </div>
                  ) : (
                    <div className={`flex items-center ${isRTL ? 'font-arabic' : ''}`}>
                      <Clock className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                      <span>{t('search.wait.time')} {restaurant.waitTime}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {restaurant.status === 'available' ? (
                      <Button 
                        className={`flex-1 pill-button cta-button ${isRTL ? 'font-arabic' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRestaurantForBooking(restaurant);
                          setBookingMode('reserve');
                          setBookingModalOpen(true);
                        }}
                      >
                        {t('search.reserve')}
                      </Button>
                    ) : (
                      <Button 
                        className={`flex-1 pill-button text-white ${isRTL ? 'font-arabic' : ''}`}
                        style={{backgroundColor: '#000000', borderColor: '#000000'}}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRestaurantForBooking(restaurant);
                          setBookingMode('waitlist');
                          setBookingModalOpen(true);
                        }}
                      >
                        Stand in Queue
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="pill-button"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`w-full pill-button ${isRTL ? 'font-arabic' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRestaurant(restaurant);
                      setMenuModalOpen(true);
                    }}
                    style={{borderColor: '#B7410E', color: '#B7410E'}}
                  >
                    <Menu className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('search.view.menu')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredRestaurants.length === 0 && (
          <div className="text-center py-16">
            <div className="rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6" style={{backgroundColor: '#F8F1C1'}}>
              <Search className="h-12 w-12" style={{color: '#B7410E'}} />
            </div>
            <h3 className={`text-2xl font-semibold mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('search.no.results.title')}</h3>
            <p className={`mb-6 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('search.no.results.desc')}</p>
            <Button 
              onClick={() => {setSearchQuery(''); setSelectedLocation(null);}}
              className={`pill-button ${isRTL ? 'font-arabic' : ''}`}
            >
              {t('search.clear.filters')}
            </Button>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        mode={bookingMode}
        restaurant={selectedRestaurantForBooking}
      />

      {/* Menu Modal */}
      {selectedRestaurant && (
        <MenuModal
          isOpen={menuModalOpen}
          onClose={() => {
            setMenuModalOpen(false);
            setSelectedRestaurant(null);
          }}
          restaurantName={selectedRestaurant.name}
          restaurantRating={selectedRestaurant.rating}
        />
      )}
    </div>
  );
}