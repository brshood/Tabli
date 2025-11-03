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
import tabliLogo from '../assets/tabli-logo-new.png';

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
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingName, setRatingName] = useState('');
  const [ratingEmail, setRatingEmail] = useState('');
  const [ratingPhone, setRatingPhone] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);

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
                        } catch {}
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
              <div className="flex gap-2">
                <input
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Optional comment"
                  className="flex-1 border rounded px-3 py-2 bg-input-background"
                  style={{borderColor: 'rgba(183, 65, 14, 0.3)'}}
                />
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
                        })
                      });
                      if (!res.ok) throw new Error('failed');
                      setRatingValue(0);
                      setRatingComment('');
                      setRatingName('');
                      setRatingEmail('');
                      setRatingPhone('');
                    } catch {
                      // ignore failures silently for now
                    } finally {
                      setRatingSubmitting(false);
                    }
                  }}
                  className="pill-button"
                >
                  Submit
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8080';
                      const res = await fetch(`${apiBase}/restaurants/${restaurant.id}/ratings`);
                      if (res.ok) {
                        const data = await res.json();
                        setComments(data.items || []);
                        setShowComments(true);
                      }
                    } catch {}
                  }}
                  className="pill-button"
                  style={{borderColor: '#6B7280', color: '#4B5563'}}
                >
                  View Comments
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

      {/* Ratings Comments Modal (simple) */}
      {showComments && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowComments(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-4 m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold" style={{color: '#1F2937'}}>Ratings & Comments</h3>
              <Button variant="outline" className="pill-button" onClick={() => setShowComments(false)}>Close</Button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {comments.length ? comments.map((c, idx) => (
                <div key={idx} className="border rounded-lg p-3" style={{borderColor: '#E5E7EB'}}>
                  <div className="flex items-center gap-2 mb-1">
                    {[1,2,3,4,5].map(v => (
                      <Star key={v} className={`h-4 w-4 ${v <= (c.value || 0) ? 'text-yellow-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <div className="text-sm" style={{color: '#374151'}}>{c.comment || 'No comment'}</div>
                  <div className="text-xs mt-1" style={{color: '#6B7280'}}>{c.name || 'Anonymous'} • {new Date(c.createdAt).toLocaleString()}</div>
                </div>
              )) : (
                <div className="text-sm" style={{color: '#6B7280'}}>No comments yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

