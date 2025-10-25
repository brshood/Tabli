import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { BookingModal } from './BookingModal';
import { MenuModal } from './MenuModal';
import { PostBookingSurveyModal } from './PostBookingSurveyModal';
import { useLanguage } from './LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { 
  Star, 
  MapPin, 
  Phone, 
  Clock, 
  Users, 
  CalendarClock,
  Menu as MenuIcon,
  ArrowLeft,
  Flame,
  TrendingUp
} from 'lucide-react';
import type { Restaurant } from './RestaurantContext';
import tabliLogo from 'figma:asset/b9aff3f805d23772814268da68c337d8a54fb6dd.png';

interface RestaurantProfilePageProps {
  restaurant: Restaurant;
  onNavigate: (page: 'landing' | 'discover' | 'search' | 'staff' | 'restaurant-profile') => void;
}

export function RestaurantProfilePage({ restaurant, onNavigate }: RestaurantProfilePageProps) {
  const { t, isRTL } = useLanguage();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<'reserve' | 'waitlist'>('reserve');
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBookingSuccess = () => {
    setBookingModalOpen(false);
    // Show survey immediately after booking
    setSurveyModalOpen(true);
  };

  return (
    <div className="min-h-screen relative" style={{backgroundColor: '#FAFAFA'}}>
      
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl">
        {/* Cover Section */}
        <Card className="mb-6 overflow-hidden border-0 card-shadow">
          <div 
            className="h-64 relative flex items-center justify-center"
            style={{
              background: restaurant.coverImage 
                ? `url(${restaurant.coverImage}) center/cover` 
                : 'linear-gradient(135deg, #E5E7EB 0%, #F3F4F6 100%)'
            }}
          >
            {!restaurant.coverImage && (
              <div className="text-center">
                <h1 className="text-5xl font-bold" style={{color: '#6B7280'}}>
                  {restaurant.name}
                </h1>
              </div>
            )}

            {/* Badges on cover */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {restaurant.weeklyAverageCustomers > 50 && (
                <Badge 
                  className="px-3 py-1 rounded-full flex items-center gap-1 text-sm font-medium shadow-lg"
                  style={{backgroundColor: '#22C55E', color: 'white'}}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>{t('search.trending') || 'Trending'}</span>
                </Badge>
              )}
              
              {restaurant.waitingInLine > 5 && (
                <Badge 
                  className="px-3 py-1 rounded-full flex items-center gap-1 text-sm font-medium shadow-lg"
                  style={{backgroundColor: '#EF4444', color: 'white'}}
                >
                  <Flame className="h-4 w-4" />
                  <span>{restaurant.waitingInLine} {t('search.waiting') || 'waiting'}</span>
                </Badge>
              )}
            </div>
          </div>

          <CardContent className="p-6" style={{backgroundColor: '#FFFFFF'}}>
            {/* Restaurant Name & Basic Info */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl font-bold mb-2" style={{color: '#1F2937'}}>
                    {restaurant.name}
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                      <span className="font-semibold" style={{color: '#1F2937'}}>{restaurant.rating}</span>
                      <span className="text-sm ml-1" style={{color: '#6B7280'}}>({restaurant.weeklyAverageCustomers} reviews)</span>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      {restaurant.cuisine}
                    </Badge>
                    <span className="text-lg font-medium" style={{color: '#4B5563'}}>
                      {restaurant.priceRange}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Contact */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm" style={{color: '#4B5563'}}>
                  <MapPin className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} style={{color: '#6B7280'}} />
                  <span>{restaurant.address || restaurant.location}</span>
                </div>
                <div className="flex items-center text-sm" style={{color: '#4B5563'}}>
                  <Clock className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} style={{color: '#6B7280'}} />
                  <span>{restaurant.openingHours} - {restaurant.closingHours}</span>
                </div>
                <div className="flex items-center text-sm" style={{color: '#4B5563'}}>
                  <Phone className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} style={{color: '#6B7280'}} />
                  <a href={`tel:${restaurant.phone}`} className="hover:underline">{restaurant.phone}</a>
                </div>
              </div>

              {/* Description */}
              <p className="text-base leading-relaxed" style={{color: '#6B7280'}}>
                {restaurant.description}
              </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-xl" style={{backgroundColor: '#F3F4F6'}}>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{color: '#1F2937'}}>{restaurant.rating}</div>
                <div className="text-xs" style={{color: '#6B7280'}}>Rating</div>
              </div>
              <div className="text-center border-x" style={{borderColor: '#D1D5DB'}}>
                {restaurant.status === 'available' ? (
                  <>
                    <div className="text-2xl font-bold mb-1" style={{color: '#22C55E'}}>{restaurant.tablesAvailable}</div>
                    <div className="text-xs" style={{color: '#6B7280'}}>Available</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold mb-1" style={{color: '#1F2937'}}>{restaurant.waitTime}</div>
                    <div className="text-xs" style={{color: '#6B7280'}}>Wait Time</div>
                  </>
                )}
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold mb-1" style={{color: '#1F2937'}}>{restaurant.waitingInLine}</div>
                <div className="text-xs" style={{color: '#6B7280'}}>In Queue</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              {restaurant.status === 'available' ? (
                <Button 
                  className={`w-full pill-button text-lg py-6 ${isRTL ? 'font-arabic' : ''}`}
                  style={{backgroundColor: '#1F2937', color: '#FFFFFF'}}
                  onClick={() => {
                    setBookingMode('reserve');
                    setBookingModalOpen(true);
                  }}
                >
                  <CalendarClock className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('search.reserve') || 'Reserve Now'}
                </Button>
              ) : (
                <Button 
                  className={`w-full pill-button text-white text-lg py-6 ${isRTL ? 'font-arabic' : ''}`}
                  style={{backgroundColor: '#000000', borderColor: '#000000'}}
                  onClick={() => {
                    setBookingMode('waitlist');
                    setBookingModalOpen(true);
                  }}
                >
                  <Users className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  Stand in Queue
                </Button>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className={`pill-button ${isRTL ? 'font-arabic' : ''}`}
                  onClick={() => setMenuModalOpen(true)}
                  style={{borderColor: '#6B7280', color: '#4B5563'}}
                >
                  <MenuIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('search.view.menu') || 'View Menu'}
                </Button>
                <Button 
                  variant="outline" 
                  className="pill-button"
                  onClick={() => window.location.href = `tel:${restaurant.phone}`}
                  style={{borderColor: '#6B7280', color: '#4B5563'}}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              </div>
            </div>

            {/* Additional Info */}
            {restaurant.maxHoldTime && (
              <Card className="border rounded-xl p-4 mb-4" style={{backgroundColor: '#F9FAFB', borderColor: '#E5E7EB'}}>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 mt-0.5" style={{color: '#6B7280'}} />
                  <div>
                    <p className="font-medium mb-1" style={{color: '#1F2937'}}>Important Notice</p>
                    <p className="text-sm" style={{color: '#6B7280'}}>
                      Tables are held for {restaurant.maxHoldTime} minutes. Please arrive on time to secure your reservation.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Seating Options */}
            {(restaurant.indoorSeating || restaurant.outdoorSeating) && (
              <div className="flex items-center gap-4 text-sm" style={{color: '#4B5563'}}>
                <span className="font-medium">Seating:</span>
                {restaurant.indoorSeating && (
                  <Badge variant="outline" className="rounded-full">Indoor</Badge>
                )}
                {restaurant.outdoorSeating && (
                  <Badge variant="outline" className="rounded-full">Outdoor</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menu Preview Section */}
        <Card className="border-0 card-shadow">
          <CardContent className="p-6" style={{backgroundColor: '#FFFFFF'}}>
            <h2 className="text-2xl font-bold mb-4" style={{color: '#1F2937'}}>Menu Highlights</h2>
            <div className="grid gap-4">
              {restaurant.menu.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-start justify-between p-4 rounded-xl hover:shadow-md transition-shadow" style={{backgroundColor: '#F9FAFB'}}>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1" style={{color: '#1F2937'}}>{item.name}</h4>
                    <p className="text-sm" style={{color: '#6B7280'}}>{item.description}</p>
                    {item.category && (
                      <Badge variant="outline" className="mt-2 text-xs">{item.category}</Badge>
                    )}
                  </div>
                  <div className="ml-4">
                    <span className="font-bold text-lg" style={{color: '#1F2937'}}>AED {item.price}</span>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4 pill-button"
              onClick={() => setMenuModalOpen(true)}
              style={{borderColor: '#6B7280', color: '#4B5563'}}
            >
              View Full Menu
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        mode={bookingMode}
        restaurant={restaurant}
        onSuccess={handleBookingSuccess}
      />

      {/* Menu Modal */}
      <MenuModal
        isOpen={menuModalOpen}
        onClose={() => setMenuModalOpen(false)}
        restaurantName={restaurant.name}
        restaurantRating={restaurant.rating}
      />

      {/* Post-Booking Survey */}
      <PostBookingSurveyModal
        isOpen={surveyModalOpen}
        onClose={() => setSurveyModalOpen(false)}
        restaurantName={restaurant.name}
      />
    </div>
  );
}

