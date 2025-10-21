import { useState, useEffect } from 'react';
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
  TrendingUp,
  Flame,
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="min-h-screen relative" style={{backgroundColor: '#F5F5F5'}}>
       {/* Wave Background */}
       <div className="absolute inset-0 pointer-events-none" style={{
         backgroundImage: `url("data:image/svg+xml,%3Csvg width='1440' height='800' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,200 Q360,100 720,200 T1440,200 L1440,800 L0,800 Z' fill='%23F0DC82' opacity='0.1'/%3E%3Cpath d='M0,400 Q360,300 720,400 T1440,400 L1440,800 L0,800 Z' fill='%23F0DC82' opacity='0.15'/%3E%3Cpath d='M0,600 Q360,500 720,600 T1440,600 L1440,800 L0,800 Z' fill='%23F0DC82' opacity='0.2'/%3E%3C/svg%3E")`,
         backgroundRepeat: 'no-repeat',
         backgroundPosition: 'bottom',
         backgroundSize: 'cover'
       }}></div>
       {/* Header */}
       <div 
         className="sticky top-0 z-30 backdrop-blur-sm transition-all duration-300"
         style={{
           backgroundColor: 'rgba(240, 220, 130, 0.7)',
           borderBottom: '1px solid rgba(240, 220, 130, 0.3)',
           padding: isScrolled ? '12px 48px' : '16px 48px'
         }}
       >
         <div 
           className="mx-auto transition-all duration-300"
           style={{
             maxWidth: isScrolled ? '66.666%' : '100%'
           }}
         >
           <div className="flex items-center justify-between">
             {/* Back Button */}
             <Button
               variant="ghost"
               onClick={() => onNavigate('landing')}
               className="pill-button"
             >
               <ArrowLeft className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
               Back
             </Button>
             
             {/* Language Toggle */}
             <LanguageToggle />
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
             <div className="flex items-center rounded-2xl px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-orange-200" style={{backgroundColor: '#FFFFFF'}}>
              <Search className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-gray-500 text-lg">Search restaurants, cuisines, locations...</span>
              <div className="ml-auto p-2 rounded-lg" style={{backgroundColor: 'var(--where2go-buff)'}}>
                <div className="w-6 h-6 flex flex-col justify-center">
                  <div className="w-full h-0.5 bg-gray-600 mb-1"></div>
                  <div className="w-full h-0.5 bg-gray-600 mb-1"></div>
                  <div className="w-full h-0.5 bg-gray-600"></div>
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
                <div 
                  key={restaurant.id}
                  className="flex-shrink-0 relative"
                >
                  {/* Shadow effect square */}
                  <div 
                    className="absolute top-2 left-2 rounded-3xl"
                    style={{
                      backgroundColor: '#F0DC82',
                      width: 'calc(100% - 8px)',
                      height: 'calc(100% - 8px)',
                      zIndex: 0,
                      opacity: 0.6
                    }}
                  ></div>
                <Card 
                  className={`w-80 card-shadow border-0 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 relative ${
                    selectedCard === restaurant.id 
                      ? 'scale-110 shadow-2xl' 
                      : 'hover:scale-105'
                  }`}
                  onClick={() => handleCardClick(restaurant)}
                  style={{
                    transform: selectedCard === restaurant.id ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: selectedCard === restaurant.id ? 10 : 2
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
                  </div>
                   <CardContent className="p-6" style={{backgroundColor: '#FFFFFF'}}>

                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-400 fill-current mr-1" />
                        <span className="font-bold text-lg">{restaurant.rating}</span>
                      </div>
                      <Badge variant="outline" className="text-sm">{restaurant.cuisine}</Badge>
                    </div>
                    <p className="text-sm mb-3" style={{color: 'var(--where2go-text)', opacity: 0.7}}>{restaurant.location}</p>
                     <div className="flex items-center text-sm font-medium" style={{color: '#22C55E'}}>
                       <span>{restaurant.weeklyAverageCustomers} weekly visits</span>
                     </div>
                  </CardContent>
                </Card>
                </div>
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
                <div 
                  key={restaurant.id}
                  className="flex-shrink-0 relative"
                >
                  {/* Shadow effect square */}
                  <div 
                    className="absolute top-2 left-2 rounded-3xl"
                    style={{
                      backgroundColor: '#F0DC82',
                      width: 'calc(100% - 8px)',
                      height: 'calc(100% - 8px)',
                      zIndex: 0,
                      opacity: 0.6
                    }}
                  ></div>
                <Card 
                  className={`w-80 card-shadow border-0 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 relative ${
                    selectedCard === restaurant.id 
                      ? 'scale-110 shadow-2xl' 
                      : 'hover:scale-105'
                  }`}
                  onClick={() => handleCardClick(restaurant)}
                  style={{
                    transform: selectedCard === restaurant.id ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: selectedCard === restaurant.id ? 10 : 2
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
                  </div>
                   <CardContent className="p-6" style={{backgroundColor: '#FFFFFF'}}>

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
                </div>
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
                <div 
                  key={restaurant.id}
                  className="flex-shrink-0 relative"
                >
                  {/* Shadow effect square */}
                  <div 
                    className="absolute top-2 left-2 rounded-3xl"
                    style={{
                      backgroundColor: '#F0DC82',
                      width: 'calc(100% - 8px)',
                      height: 'calc(100% - 8px)',
                      zIndex: 0,
                      opacity: 0.6
                    }}
                  ></div>
                <Card 
                  className={`w-80 card-shadow border-0 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 relative ${
                    selectedCard === restaurant.id 
                      ? 'scale-110 shadow-2xl' 
                      : 'hover:scale-105'
                  }`}
                  onClick={() => handleCardClick(restaurant)}
                  style={{
                    transform: selectedCard === restaurant.id ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: selectedCard === restaurant.id ? 10 : 2
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
                   <CardContent className="p-6" style={{backgroundColor: '#FFFFFF'}}>

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
                </div>
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
