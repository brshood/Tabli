import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { BookingModal } from './BookingModal';
import { MenuModal } from './MenuModal';
import { PostBookingSurveyModal } from './PostBookingSurveyModal';
import { useLanguage } from './LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { toast } from 'sonner';
import { formatGSTDateTime } from '../utils/dateFormat';
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
  TrendingUp,
  ExternalLink,
  Loader2
} from 'lucide-react';
import type { Restaurant } from './RestaurantContext';
import tabliLogo from '../assets/tabli-logo-new.png';

interface RestaurantProfilePageProps {
  restaurant: Restaurant;
  onNavigate: (page: 'landing' | 'discover' | 'search' | 'staff' | 'restaurant-profile') => void;
}

export function RestaurantProfilePage({ restaurant, onNavigate }: RestaurantProfilePageProps) {
  const { t, isRTL } = useLanguage();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<'reserve' | 'waitlist'>('reserve');
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [surveyModalOpen, setSurveyModalOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<Array<{name: string; category: string; description?: string; price: string}>>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false); // #14 - Track image loading

  // #16 - Detect when all images have loaded (cover photo + all photos)
  useEffect(() => {
    setImagesLoaded(false); // Reset loading state when restaurant changes
    const imagesToLoad: string[] = [];
    
    // Include cover image if present
    if (restaurant.coverImage) {
      imagesToLoad.push(restaurant.coverImage);
    }
    
    // Collect all image URLs from restaurant photos
    if (restaurant.photos && restaurant.photos.length > 0) {
      imagesToLoad.push(...restaurant.photos);
    }
    
    // If no images, consider loaded immediately
    if (imagesToLoad.length === 0) {
      setImagesLoaded(true);
      return;
    }
    
    let loadedCount = 0;
    const totalImages = imagesToLoad.length;
    
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        setImagesLoaded(true);
      }
    };
    
    // Preload all images (including cover photo)
    imagesToLoad.forEach((src) => {
      const img = new Image();
      img.onload = checkAllLoaded;
      img.onerror = checkAllLoaded; // Count errors as "loaded" to not block forever
      img.src = src;
      
      // If image is already cached, it might load synchronously
      if (img.complete) {
        checkAllLoaded();
      }
    });
  }, [restaurant.coverImage, restaurant.photos, restaurant.id]);

  // Load menu when component mounts
  useEffect(() => {
    if (restaurant.id) {
      loadMenu();
    }
  }, [restaurant.id]);

  const loadMenu = async () => {
    if (!restaurant.id) return;
    
    try {
      setMenuLoading(true);
      const res = await fetch(`${API_URL}/menus/${restaurant.id}`);
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data.menu?.items || []);
      } else {
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error loading menu:', error);
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  };
  const [isScrolled, setIsScrolled] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingName, setRatingName] = useState('');
  const [ratingEmail, setRatingEmail] = useState('');
  const [ratingPhone, setRatingPhone] = useState('');
  const [postAnonymously, setPostAnonymously] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);

  // Prevent body scroll when modal is open and maintain scroll position
  useEffect(() => {
    if (showComments) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      // Cleanup
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [showComments]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [pendingReservationId, setPendingReservationId] = useState<string | null>(null);
  const [pendingRestaurantId, setPendingRestaurantId] = useState<string | null>(null);

  const handleBookingSuccess = (reservationId?: string, restaurantId?: string) => {
    setBookingModalOpen(false);
    // Store reservation info for survey
    if (reservationId) {
      setPendingReservationId(reservationId);
      setPendingRestaurantId(restaurantId || restaurant.id);
    }
    // Show survey immediately after booking
    setSurveyModalOpen(true);
  };

  const featuredItems = restaurant.featuredMenuItems?.filter((item) => item.name?.trim()) || [];
  const isRestaurantClosed = restaurant.status !== 'available' && restaurant.tablesAvailable === 0;

  return (
    <div className="min-h-screen relative" style={{backgroundColor: '#FAFAFA'}}>
      {/* Loading state - shown while images are loading */}
      {!imagesLoaded && (
        <div className="absolute inset-0 flex items-center justify-center" style={{backgroundColor: '#FAFAFA'}}>
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" style={{color: '#5A5E3E'}} />
            <p className="text-gray-600">Loading images...</p>
          </div>
        </div>
      )}
      
      <div 
        className="container mx-auto px-4 py-4 sm:py-8 max-w-5xl"
        style={{
          opacity: imagesLoaded ? 1 : 0,
          transform: imagesLoaded ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
          visibility: imagesLoaded ? 'visible' : 'hidden'
        }}
      >
        {/* Cover Section */}
        <Card className="mb-6 overflow-hidden border-0 card-shadow">
          <div 
            className="h-64 relative flex items-center justify-center"
            style={{
              backgroundColor: '#F3F4F6',
              backgroundImage: restaurant.coverImage 
                ? `url(${restaurant.coverImage})` 
                : 'linear-gradient(135deg, #E5E7EB 0%, #F3F4F6 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
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
                    <button
                      type="button"
                      className="flex items-center"
                      onClick={async () => {
                        try {
                          const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080';
                          const res = await fetch(`${apiBase}/restaurants/${restaurant.id}/ratings`);
                          if (res.ok) {
                            const data = await res.json();
                            setComments(data.items || []);
                            setShowComments(true);
                          }
                        } catch (error) {
                          console.error('Failed to load ratings:', error);
                        }
                      }}
                    >
                      <Star className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                      <span className="font-semibold" style={{color: '#1F2937'}}>{restaurant.rating.toFixed(1)}</span>
                      <span className="text-sm ml-1" style={{color: '#6B7280'}}>({restaurant.ratingCount ?? 0})</span>
                    </button>
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
                {restaurant.locationUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    className="text-sm"
                    style={{ borderColor: '#B7410E', color: '#B7410E' }}
                    onClick={() => window.open(restaurant.locationUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Get Directions
                  </Button>
                )}
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
              <div className="text-center border-x px-1 min-w-0" style={{borderColor: '#D1D5DB'}}>
                {isRestaurantClosed ? (
                  <>
                    <div className="text-sm font-bold mb-1 break-words" style={{color: '#EF4444'}}>Closed</div>
                    <div className="text-xs" style={{color: '#6B7280'}}>Status</div>
                  </>
                ) : restaurant.status === 'available' ? (
                  <>
                    <div className="text-sm font-bold mb-1 break-words" style={{color: '#22C55E'}}>Available</div>
                    <div className="text-xs" style={{color: '#6B7280'}}>Status</div>
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
                  style={{backgroundColor: '#B8860B', color: '#FFFFFF'}}
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
                  disabled={isRestaurantClosed}
                  onClick={() => {
                    setBookingMode('waitlist');
                    setBookingModalOpen(true);
                  }}
                >
                  <Users className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {isRestaurantClosed ? 'Restaurant Closed' : t('action.standInQueue')}
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
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  className="pill-button w-full"
                  onClick={async () => {
                    try {
                      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080';
                      const res = await fetch(`${apiBase}/restaurants/${restaurant.id}/ratings`);
                      if (res.ok) {
                        const data = await res.json();
                        setComments(data.items || []);
                        setShowComments(true);
                      }
                    } catch (error) {
                      console.error('Failed to load ratings:', error);
                    }
                  }}
                  style={{borderColor: '#6B7280', color: '#4B5563'}}
                >
                  Read Reviews
                </Button>
              </div>
            </div>

            {/* Rating Widget */}
            <div className="mb-6 p-4 rounded-xl" style={{backgroundColor: '#FAF8F2', border: '1px solid rgba(90, 94, 62, 0.2)'}}>
              <h3 className="font-medium mb-3" style={{color: '#2D2D2B'}}>Rate this restaurant</h3>
              <div className="flex items-center gap-2 mb-3">
                {[1,2,3,4,5].map(v => (
                  <button
                    key={v}
                    onClick={() => setRatingValue(v)}
                    className="p-1"
                    aria-label={`Rate ${v}`}
                  >
                    <Star className={`h-6 w-6 ${v <= ratingValue ? 'text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                <input
                  value={ratingName}
                  onChange={(e) => setRatingName(e.target.value)}
                  placeholder="Your name"
                  className="border rounded px-3 py-2 bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                <input
                  value={ratingEmail}
                  onChange={(e) => setRatingEmail(e.target.value)}
                  placeholder="Your email"
                  type="email"
                  className="border rounded px-3 py-2 bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                <input
                  value={ratingPhone}
                  onChange={(e) => setRatingPhone(e.target.value)}
                  placeholder="Your phone"
                  className="border rounded px-3 py-2 bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
              </div>
              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postAnonymously}
                    onChange={(e) => setPostAnonymously(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm" style={{color: '#4B5563'}}>Post Review Anonymously</span>
                </label>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <input
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Optional comment"
                  className="w-full sm:flex-1 border rounded px-3 py-2 bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button
                    disabled={!ratingValue || ratingSubmitting}
                    onClick={async () => {
                      try {
                        setRatingSubmitting(true);
                        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080';
                        const res = await fetch(`${apiBase}/restaurants/${restaurant.id}/ratings`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          value: ratingValue, 
                          comment: ratingComment || undefined,
                          name: ratingName,
                          email: ratingEmail,
                          phone: ratingPhone,
                          showName: !postAnonymously,
                        })
                        });
                        
                        if (!res.ok) {
                          // Try to parse error message from response
                          let errorMessage = 'Failed to submit review. Please try again.';
                          try {
                            const errorData = await res.json();
                            if (errorData.error) {
                              errorMessage = errorData.error;
                            }
                          } catch {
                            // If parsing fails, use default message
                          }
                          
                          if (res.status === 403) {
                            toast.error('We only accept reviews from previous visitors. Please use the email or phone number you used when making your reservation.');
                          } else if (res.status === 409) {
                            toast.error('You have already submitted a review for this restaurant.');
                          } else if (res.status === 400) {
                            toast.error(errorMessage || 'Please provide a valid email address or phone number.');
                          } else {
                            toast.error(errorMessage);
                          }
                          return;
                        }
                        
                        toast.success('Thank you for your review!');
                        setRatingValue(0);
                        setRatingComment('');
                        setRatingName('');
                        setRatingEmail('');
                        setRatingPhone('');
                        setPostAnonymously(false);
                      } catch (error) {
                        toast.error('Failed to submit review. Please try again.');
                      } finally {
                        setRatingSubmitting(false);
                      }
                    }}
                    className="pill-button w-full sm:w-auto"
                  >
                    {ratingSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </Button>
                </div>
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
            
            {/* Featured Menu Items - Show first if available */}
            {featuredItems.length > 0 && (
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featuredItems.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="p-4 rounded-xl border"
                      style={{borderColor: '#E5E7EB', backgroundColor: '#F9FAFB'}}
                    >
                      <h3 className="text-xl font-semibold mb-1" style={{color: '#1F2937'}}>
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="text-sm mb-2" style={{color: '#4B5563'}}>
                          {item.description}
                        </p>
                      )}
                      {item.price && (
                        <span className="inline-block px-3 py-1 rounded-full text-sm font-medium" style={{backgroundColor: '#F3F4F6', color: '#1F2937'}}>
                          {item.price}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Regular Menu Items */}
            <div className="grid gap-4">
              {menuLoading ? (
                <p className="text-sm text-gray-500">Loading menu...</p>
              ) : menuItems.length > 0 ? (
                menuItems.slice(0, 5).map((item, index) => (
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
                ))
              ) : featuredItems.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No menu items available</p>
              ) : null}
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
        restaurantId={restaurant.id}
      />

      {/* Post-Booking Survey */}
      <PostBookingSurveyModal
        isOpen={surveyModalOpen}
        onClose={() => {
          setSurveyModalOpen(false);
          setPendingReservationId(null);
          setPendingRestaurantId(null);
        }}
        restaurantName={restaurant.name}
        reservationId={pendingReservationId || undefined}
        restaurantId={pendingRestaurantId || restaurant.id}
      />

      {/* Ratings Comments Modal (simple) */}
      {showComments && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" 
          onClick={() => setShowComments(false)}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="bg-white rounded-xl w-full max-w-md shadow-lg max-h-[90vh] flex flex-col" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh' }}
          >
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0" style={{borderColor: '#E5E7EB'}}>
              <h3 className="text-lg font-semibold" style={{color: '#1F2937'}}>Ratings & Comments</h3>
              <Button variant="outline" className="pill-button" onClick={() => setShowComments(false)}>Close</Button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="space-y-3">
                {comments.length ? comments.map((c, idx) => (
                  <div key={idx} className="border rounded-lg p-4" style={{borderColor: '#E5E7EB', backgroundColor: '#FAFAFA'}}>
                    <div className="flex items-center gap-2 mb-2">
                      {[1,2,3,4,5].map(v => (
                        <Star key={v} className={`h-4 w-4 ${v <= (c.value || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                    <div className="text-sm mb-2" style={{color: '#374151'}}>{c.comment || 'No comment'}</div>
                    <div className="text-xs" style={{color: '#6B7280'}}>{c.name || 'Guest'} • {formatGSTDateTime(c.createdAt)}</div>
                  </div>
                )) : (
                  <div className="text-sm text-center py-8" style={{color: '#6B7280'}}>No comments yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

