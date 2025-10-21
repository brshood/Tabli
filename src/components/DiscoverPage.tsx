import { useState } from 'react';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useRestaurant } from './RestaurantContext';
import { useLanguage } from './LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { Search, Star, TrendingUp, Flame, Users, SlidersHorizontal } from 'lucide-react';
import type { Restaurant } from './RestaurantContext';

interface DiscoverPageProps {
  onNavigate: (page: 'landing' | 'search' | 'staff' | 'restaurant-profile', restaurant?: Restaurant) => void;
}

export function DiscoverPage({ onNavigate }: DiscoverPageProps) {
  const { allRestaurants } = useRestaurant();
  const { t, isRTL } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const trendingRestaurants = allRestaurants.filter(r => r.weeklyAverageCustomers > 50);
  const popularRestaurants = allRestaurants.filter(r => r.waitingInLine > 5);
  const topRatedRestaurants = allRestaurants.filter(r => r.rating >= 4.7);

  const handleSearchClick = () => {
    onNavigate('search');
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--where2go-bright-grey)'}}>
      {/* Language Toggle */}
      <div className="absolute top-8 right-8 z-20">
        <LanguageToggle />
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: 'var(--where2go-text)'}}>
            {t('search.title') || 'Discover Restaurants'}
          </h1>
          <p className={`text-xl max-w-2xl mx-auto mb-8 ${isRTL ? 'font-arabic' : ''}`} style={{color: 'var(--where2go-text)', opacity: 0.7}}>
            {t('search.subtitle') || 'Find your perfect dining experience'}
          </p>
        </div>

        {/* Simple Search Bar - Clickable to go to detailed search */}
        <div className="max-w-3xl mx-auto mb-12">
          <div 
            className="relative cursor-pointer hover:shadow-xl transition-shadow"
            onClick={handleSearchClick}
          >
            <Search className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 transform -translate-y-1/2 h-6 w-6`} style={{color: 'var(--where2go-accent)'}} />
            <Input
              placeholder="Search restaurants, cuisines, locations..."
              value={searchQuery}
              readOnly
              className={`h-16 text-lg rounded-full card-shadow ${isRTL ? 'font-arabic text-right pr-16 pl-20' : 'pl-16 pr-20'}`}
              style={{
                borderColor: 'var(--where2go-border)', 
                backgroundColor: 'var(--where2go-white)',
                cursor: 'pointer'
              }}
            />
            <div 
              className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 transform -translate-y-1/2 rounded-full p-3 hover:scale-110 transition-transform`}
              style={{backgroundColor: 'var(--where2go-buff)'}}
            >
              <SlidersHorizontal className="h-5 w-5" style={{color: 'var(--where2go-accent)'}} />
            </div>
          </div>
          <p className="text-center text-sm mt-3" style={{color: 'var(--where2go-text)', opacity: 0.6}}>
            Click to explore filters and search options
          </p>
        </div>

        {/* Horizontal Scrolling Sections */}
        <div className="space-y-12">
          {/* Trending Places */}
          {trendingRestaurants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold flex items-center gap-3" style={{color: 'var(--where2go-text)'}}>
                  <div className="rounded-full p-3" style={{backgroundColor: '#D1FAE5'}}>
                    <TrendingUp className="h-7 w-7" style={{color: '#22C55E'}} />
                  </div>
                  Trending Places
                </h2>
              </div>
              <div className="relative">
                <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                  {trendingRestaurants.map(restaurant => (
                    <Card 
                      key={restaurant.id} 
                      className="flex-shrink-0 w-80 card-shadow border-0 rounded-3xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-300 snap-center group"
                      onClick={() => onNavigate('restaurant-profile', restaurant)}
                      style={{minWidth: '320px'}}
                    >
                      <div className="h-48 flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(135deg, var(--where2go-buff) 0%, var(--where2go-buff-light) 100%)'}}>
                        <span className="text-2xl font-bold group-hover:scale-110 transition-transform" style={{color: 'var(--where2go-accent)'}}>{restaurant.name}</span>
                        <div className="absolute top-4 right-4 px-3 py-2 rounded-full flex items-center gap-2 text-sm font-medium shadow-lg" style={{backgroundColor: '#22C55E', color: 'white'}}>
                          <TrendingUp className="h-4 w-4" />
                          <span>Hot</span>
                        </div>
                      </div>
                      <CardContent className="p-6" style={{backgroundColor: 'var(--where2go-white)'}}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-400 fill-current" />
                            <span className="font-bold text-lg">{restaurant.rating}</span>
                          </div>
                          <Badge variant="outline" className="text-sm">{restaurant.cuisine}</Badge>
                        </div>
                        <p className="text-sm mb-3" style={{color: 'var(--where2go-text)', opacity: 0.7}}>{restaurant.location}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm font-medium" style={{color: '#22C55E'}}>
                            <TrendingUp className="h-4 w-4 mr-1" />
                            <span>{restaurant.weeklyAverageCustomers}+ visits</span>
                          </div>
                          <span className="text-sm font-medium" style={{color: 'var(--where2go-accent)'}}>{restaurant.priceRange}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Popular Now (Long Wait Lines) */}
          {popularRestaurants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold flex items-center gap-3" style={{color: 'var(--where2go-text)'}}>
                  <div className="rounded-full p-3" style={{backgroundColor: '#FEE2E2'}}>
                    <Flame className="h-7 w-7" style={{color: '#EF4444'}} />
                  </div>
                  Popular Now
                </h2>
              </div>
              <div className="relative">
                <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                  {popularRestaurants.map(restaurant => (
                    <Card 
                      key={restaurant.id} 
                      className="flex-shrink-0 w-80 card-shadow border-0 rounded-3xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-300 snap-center group"
                      onClick={() => onNavigate('restaurant-profile', restaurant)}
                      style={{minWidth: '320px'}}
                    >
                      <div className="h-48 flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(135deg, #FEE2E2 0%, #FCA5A5 100%)'}}>
                        <span className="text-2xl font-bold group-hover:scale-110 transition-transform" style={{color: '#EF4444'}}>{restaurant.name}</span>
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-2 rounded-full flex items-center gap-2 text-sm font-medium shadow-lg">
                          <Flame className="h-4 w-4" />
                          <span>{restaurant.waitingInLine}</span>
                        </div>
                      </div>
                      <CardContent className="p-6" style={{backgroundColor: 'var(--where2go-white)'}}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-400 fill-current" />
                            <span className="font-bold text-lg">{restaurant.rating}</span>
                          </div>
                          <Badge variant="outline" className="text-sm">{restaurant.cuisine}</Badge>
                        </div>
                        <p className="text-sm mb-3" style={{color: 'var(--where2go-text)', opacity: 0.7}}>{restaurant.location}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium" style={{color: '#EF4444'}}>
                            {restaurant.waitTime || 'Waitlist available'}
                          </div>
                          <span className="text-sm font-medium" style={{color: 'var(--where2go-accent)'}}>{restaurant.priceRange}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top Rated */}
          {topRatedRestaurants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold flex items-center gap-3" style={{color: 'var(--where2go-text)'}}>
                  <div className="rounded-full p-3" style={{backgroundColor: '#FEF3C7'}}>
                    <Star className="h-7 w-7 text-yellow-400 fill-current" />
                  </div>
                  Top Rated
                </h2>
              </div>
              <div className="relative">
                <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth">
                  {topRatedRestaurants.map(restaurant => (
                    <Card 
                      key={restaurant.id} 
                      className="flex-shrink-0 w-80 card-shadow border-0 rounded-3xl overflow-hidden cursor-pointer hover:scale-105 transition-all duration-300 snap-center group"
                      onClick={() => onNavigate('restaurant-profile', restaurant)}
                      style={{minWidth: '320px'}}
                    >
                      <div className="h-48 flex items-center justify-center relative overflow-hidden" style={{background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'}}>
                        <span className="text-2xl font-bold group-hover:scale-110 transition-transform" style={{color: '#D97706'}}>{restaurant.name}</span>
                        <div className="absolute top-4 right-4">
                          <div className="flex items-center gap-1 px-3 py-2 rounded-full shadow-lg" style={{backgroundColor: 'white'}}>
                            <Star className="h-5 w-5 text-yellow-400 fill-current" />
                            <span className="font-bold" style={{color: '#D97706'}}>{restaurant.rating}</span>
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-6" style={{backgroundColor: 'var(--where2go-white)'}}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-400 fill-current" />
                            <span className="font-bold text-lg">{restaurant.rating}</span>
                          </div>
                          <Badge variant="outline" className="text-sm">{restaurant.cuisine}</Badge>
                        </div>
                        <p className="text-sm mb-3" style={{color: 'var(--where2go-text)', opacity: 0.7}}>{restaurant.location}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium" style={{color: '#D97706'}}>
                            Highly Rated
                          </div>
                          <span className="text-sm font-medium" style={{color: 'var(--where2go-accent)'}}>{restaurant.priceRange}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 mb-8">
          <p className="text-lg mb-4" style={{color: 'var(--where2go-text)', opacity: 0.7}}>
            Looking for something specific?
          </p>
          <div 
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full cursor-pointer hover:shadow-xl transition-all"
            style={{backgroundColor: 'var(--where2go-accent)', color: 'white'}}
            onClick={handleSearchClick}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span className="font-semibold text-lg">Explore All Filters</span>
          </div>
        </div>
      </div>
    </div>
  );
}

