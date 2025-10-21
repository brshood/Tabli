import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useLanguage } from './LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { 
  Star, 
  MapPin, 
  Phone, 
  Clock, 
  Users, 
  Search,
  ArrowLeft
} from 'lucide-react';
import { useRestaurant } from './RestaurantContext';

interface DiscoverPageProps {
  onNavigate: (page: 'landing' | 'discover' | 'search' | 'staff' | 'restaurant-profile') => void;
}

export function DiscoverPage({ onNavigate }: DiscoverPageProps) {
  const { allRestaurants } = useRestaurant();
  const { t, isRTL } = useLanguage();
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const trendingRestaurants = allRestaurants
    .filter(r => r.weeklyAverageCustomers > 50)
    .sort((a, b) => b.weeklyAverageCustomers - a.weeklyAverageCustomers);
  
  const popularRestaurants = allRestaurants
    .filter(r => r.waitingInLine > 5)
    .sort((a, b) => b.waitingInLine - a.waitingInLine);
  
  const topRatedRestaurants = allRestaurants
    .filter(r => r.rating >= 4.7)
    .sort((a, b) => b.rating - a.rating);

  const handleCardClick = (restaurant: any) => {
    setSelectedCard(restaurant.id);
    // Add a small delay for animation before navigating
    setTimeout(() => {
      onNavigate('restaurant-profile', restaurant);
    }, 300);
  };

  const handleSearchClick = () => {
    onNavigate('search');
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--where2go-bright-grey)'}}>
      {/* Top Navigation */}
      <div className="absolute top-8 left-8 right-8 z-20 flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() => onNavigate('landing')}
          className="pill-button"
        >
          <ArrowLeft className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          Back
        </Button>
        
        <LanguageToggle />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 py-6 px-4" style={{backgroundColor: 'var(--where2go-white)', borderBottom: '1px solid var(--where2go-border)'}}>
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold" style={{color: 'var(--where2go-text)'}}>
              Discover Places
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search Bar */}
        <div className="mb-12">
          <div 
            className="relative max-w-2xl mx-auto cursor-pointer"
            onClick={handleSearchClick}
          >
            <div className="flex items-center rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent" style={{backgroundColor: 'var(--where2go-white)', borderColor: 'var(--where2go-border)'}}>
              <Search className="h-5 w-5 mr-3" style={{color: 'var(--where2go-text)'}} />
              <span className="text-lg" style={{color: 'var(--where2go-text)'}}>Search restaurants, cuisines, locations...</span>
              <div className="ml-auto p-2 rounded-lg" style={{backgroundColor: 'var(--where2go-accent)'}}>
                <div className="w-6 h-6 flex flex-col justify-center">
                  <div className="w-full h-0.5 mb-1" style={{backgroundColor: 'var(--where2go-text)'}}></div>
                  <div className="w-full h-0.5 mb-1" style={{backgroundColor: 'var(--where2go-text)'}}></div>
                  <div className="w-full h-0.5" style={{backgroundColor: 'var(--where2go-text)'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trending Places */}
        {trendingRestaurants.length > 0 && (
          <div className="mb-16">
            <div className="mb-6">
              <h2 className="text-3xl font-bold" style={{color: 'var(--where2go-text)'}}>
                Trending Places
              </h2>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
              {trendingRestaurants.map(restaurant => (
                <Card 
                  key={restaurant.id} 
                  className={`flex-shrink-0 w-80 card-shadow border-0 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${
                    selectedCard === restaurant.id 
                      ? 'scale-110 shadow-2xl' 
                      : 'hover:scale-105'
                  }`}
                  onClick={() => handleCardClick(restaurant)}
                  style={{
                    transform: selectedCard === restaurant.id ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: selectedCard === restaurant.id ? 10 : 1
                  }}
                >
                  <div 
                    className="h-48 relative overflow-hidden"
                    style={{background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'}}
                  >
                    {/* Placeholder restaurant photo */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">{restaurant.name.charAt(0)}</span>
                      </div>
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge 
                        className="px-3 py-1 rounded-full text-sm font-medium shadow-lg"
                        style={{backgroundColor: 'rgba(255, 255, 255, 0.9)', color: '#22C55E'}}
                      >
                        Trending
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6" style={{backgroundColor: 'var(--where2go-white)'}}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                        <span className="font-bold text-lg">{restaurant.rating}</span>
                      </div>
                      <Badge variant="outline" className="text-sm">{restaurant.cuisine}</Badge>
                    </div>
                    <p className="text-sm mb-3" style={{color: 'var(--where2go-text)', opacity: 0.7}}>{restaurant.location}</p>
                    <div className="flex items-center text-sm font-medium" style={{color: '#22C55E'}}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      <span>{restaurant.weeklyAverageCustomers} weekly visits</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Popular Now */}
        {popularRestaurants.length > 0 && (
          <div className="mb-16">
            <div className="mb-6">
              <h2 className="text-3xl font-bold" style={{color: 'var(--where2go-text)'}}>
                Popular Now
              </h2>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
              {popularRestaurants.map(restaurant => (
                <Card 
                  key={restaurant.id} 
                  className={`flex-shrink-0 w-80 card-shadow border-0 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${
                    selectedCard === restaurant.id 
                      ? 'scale-110 shadow-2xl' 
                      : 'hover:scale-105'
                  }`}
                  onClick={() => handleCardClick(restaurant)}
                  style={{
                    transform: selectedCard === restaurant.id ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: selectedCard === restaurant.id ? 10 : 1
                  }}
                >
                  <div 
                    className="h-48 relative overflow-hidden"
                    style={{background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'}}
                  >
                    {/* Placeholder restaurant photo */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">{restaurant.name.charAt(0)}</span>
                      </div>
                    </div>
                    <div className="absolute top-3 right-3">
                      <div className="bg-white text-red-500 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                        {restaurant.waitingInLine} in line
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6" style={{backgroundColor: 'var(--where2go-white)'}}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                        <span className="font-bold text-lg">{restaurant.rating}</span>
                      </div>
                      <Badge variant="outline" className="text-sm">{restaurant.cuisine}</Badge>
                    </div>
                    <p className="text-sm" style={{color: 'var(--where2go-text)', opacity: 0.7}}>{restaurant.waitTime || 'Waitlist available'}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Top Rated */}
        {topRatedRestaurants.length > 0 && (
          <div className="mb-16">
            <div className="mb-6">
              <h2 className="text-3xl font-bold" style={{color: 'var(--where2go-text)'}}>
                Top Rated
              </h2>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide">
              {topRatedRestaurants.map(restaurant => (
                <Card 
                  key={restaurant.id} 
                  className={`flex-shrink-0 w-80 card-shadow border-0 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${
                    selectedCard === restaurant.id 
                      ? 'scale-110 shadow-2xl' 
                      : 'hover:scale-105'
                  }`}
                  onClick={() => handleCardClick(restaurant)}
                  style={{
                    transform: selectedCard === restaurant.id ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: selectedCard === restaurant.id ? 10 : 1
                  }}
                >
                  <div 
                    className="h-48 relative overflow-hidden"
                    style={{background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'}}
                  >
                    {/* Placeholder restaurant photo */}
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">{restaurant.name.charAt(0)}</span>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-6" style={{backgroundColor: 'var(--where2go-white)'}}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Star className="h-6 w-6 text-yellow-400 fill-current mr-1" />
                        <span className="font-bold text-xl">{restaurant.rating}</span>
                      </div>
                      <Badge variant="outline" className="text-sm">{restaurant.cuisine}</Badge>
                    </div>
                    <p className="text-sm" style={{color: 'var(--where2go-text)', opacity: 0.7}}>{restaurant.location}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--where2go-text)'}}>
            Can't find what you're looking for?
          </h3>
          <Button 
            onClick={handleSearchClick}
            className="pill-button cta-button text-lg px-8 py-4"
          >
            <Search className="h-5 w-5 mr-2" />
            Browse All Restaurants
          </Button>
        </div>
      </div>
    </div>
  );
}
