import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Clock, CheckCircle, MessageSquare, Zap, TrendingUp, Users, Calendar, Star, Smartphone } from 'lucide-react';
import tabliLogo from '../assets/tabli-logo-new.png';
import { useLanguage } from './LanguageContext';
import { LanguageToggle } from './LanguageToggle';

interface LandingPageProps {
  onNavigate: (page: 'landing' | 'discover' | 'search' | 'staff') => void;
  onCtaNavigate?: (page: 'landing' | 'discover' | 'search' | 'staff') => void;
}

export function LandingPage({ onNavigate, onCtaNavigate }: LandingPageProps) {
  const { t, isRTL } = useLanguage();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const statsSectionRef = useRef<HTMLDivElement | null>(null);
  const [stats, setStats] = useState({ reservations: 0, restaurants: 0, users: 0 });
  const [displayStats, setDisplayStats] = useState({ reservations: 0, restaurants: 0, users: 0 });
  const [hasAnimated, setHasAnimated] = useState(false);
  const currentYear = new Date().getFullYear();
  const handlePrimaryNavigate = (page: 'discover' | 'search') => {
    if (onCtaNavigate) {
      onCtaNavigate(page);
    } else {
      onNavigate(page);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${API_URL}/analytics/platform-metrics`);
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setStats({
            reservations: Number(data.reservations) || 0,
            restaurants: Number(data.restaurants) || 0,
            users: Number(data.users) || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load platform metrics', error);
      }
    })();
    return () => { cancelled = true; };
  }, [API_URL]);

  useEffect(() => {
    if (!statsSectionRef.current || hasAnimated) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasAnimated(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(statsSectionRef.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;
    setDisplayStats({ reservations: 0, restaurants: 0, users: 0 });

    const duration = 1200;
    const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
    const start = performance.now();
    let frameId = requestAnimationFrame(function animate(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeOutQuad(progress);
      setDisplayStats({
        reservations: Math.round(stats.reservations * eased),
        restaurants: Math.round(stats.restaurants * eased),
        users: Math.round(stats.users * eased),
      });
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [hasAnimated, stats]);

  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Language Toggle */}
        <div className="absolute top-8 right-8 z-20">
          <LanguageToggle />
        </div>
        
        <div className="container mx-auto px-4 text-center z-10 relative">
          <div className="max-w-4xl mx-auto">
            {/* Logo */}
            <div className="mb-8">
              <img src={tabliLogo} alt="Tabli" className="h-32 w-auto mx-auto mb-4 floating-logo" />
            </div>
            
            <h1 className={`text-4xl sm:text-6xl md:text-7xl font-bold mb-6 floating-text-block ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B', letterSpacing: 'normal', lineHeight: isRTL ? '1.2' : '1.25'}}>
              <div className="block">{t('hero.title.line1')}</div>
              <div className="block">{t('hero.title.line2')}</div>
              <div className="block" style={{color: '#B8860B'}}>{t('hero.title.line3')}</div>
            </h1>
            
            <p className={`text-lg sm:text-xl md:text-2xl mb-8 sm:mb-12 max-w-2xl mx-auto ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B', letterSpacing: 'normal', lineHeight: isRTL ? '1.4' : '1.625'}}>
              {t('hero.subtitle')}
            </p>
            
            <div className="mt-8 sm:mt-12">
              <Button
                size="lg"
                className={`pill-button cta-button text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-6 h-auto font-semibold ${isRTL ? 'font-arabic' : ''}`}
                onClick={() => handlePrimaryNavigate('discover')}
              >
                {t('hero.cta')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-12 sm:py-20" style={{backgroundColor: '#E7D7C5'}}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-6xl mx-auto">
            <Card className="card-shadow border-0 rounded-2xl sm:rounded-3xl hover:scale-105 transition-transform duration-300" style={{backgroundColor: 'white', borderColor: 'rgba(45, 45, 43, 0.1)'}}>
              <CardContent className="p-4 sm:p-8 text-center">
                <div className="rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-6" style={{backgroundColor: '#5A5E3E'}}>
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('showcase.instant.title')}</h3>
                <p className={`text-sm sm:text-base leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>
                  {t('showcase.instant.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="card-shadow border-0 rounded-2xl sm:rounded-3xl hover:scale-105 transition-transform duration-300" style={{backgroundColor: 'white', borderColor: 'rgba(45, 45, 43, 0.1)'}}>
              <CardContent className="p-4 sm:p-8 text-center">
                <div className="rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-6" style={{backgroundColor: '#5A5E3E'}}>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('showcase.waitlist.title')}</h3>
                <p className={`text-sm sm:text-base leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>
                  {t('showcase.waitlist.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="card-shadow border-0 rounded-2xl sm:rounded-3xl hover:scale-105 transition-transform duration-300 sm:col-span-2 lg:col-span-1" style={{backgroundColor: 'white', borderColor: 'rgba(45, 45, 43, 0.1)'}}>
              <CardContent className="p-4 sm:p-8 text-center">
                <div className="rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-6" style={{backgroundColor: '#5A5E3E'}}>
                  <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('showcase.sms.title')}</h3>
                <p className={`text-sm sm:text-base leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>
                  {t('showcase.sms.desc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Platform Metrics Section */}
      <section ref={statsSectionRef} className="py-12 sm:py-20" style={{backgroundColor: '#FDF7ED'}}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12 max-w-3xl mx-auto">
            <h2 className={`text-3xl sm:text-5xl font-bold mb-3 sm:mb-6 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>
              {t('metrics.title')}
            </h2>
            <p className={`text-base sm:text-xl ${isRTL ? 'font-arabic' : ''}`} style={{color: '#4B5563'}}>
              {t('metrics.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 max-w-5xl mx-auto">
            <div className="rounded-3xl card-shadow p-6 sm:p-8 text-center" style={{backgroundColor: '#FFFFFF'}}>
              <p className={`uppercase tracking-wide text-xs sm:text-sm mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#9FA0A0'}}>
                {t('metrics.reservations.heading')}
              </p>
              <div className="text-4xl sm:text-5xl font-bold mb-3" style={{color: '#B8860B'}}>
                {formatNumber(displayStats.reservations)}
              </div>
              <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#4B5563'}}>
                {t('metrics.reservations.desc')}
              </p>
            </div>
            <div className="rounded-3xl card-shadow p-6 sm:p-8 text-center" style={{backgroundColor: '#FFFFFF'}}>
              <p className={`uppercase tracking-wide text-xs sm:text-sm mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#9FA0A0'}}>
                {t('metrics.restaurants.heading')}
              </p>
              <div className="text-4xl sm:text-5xl font-bold mb-3" style={{color: '#B8860B'}}>
                {formatNumber(displayStats.restaurants)}
              </div>
              <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#4B5563'}}>
                {t('metrics.restaurants.desc')}
              </p>
            </div>
            <div className="rounded-3xl card-shadow p-6 sm:p-8 text-center" style={{backgroundColor: '#FFFFFF'}}>
              <p className={`uppercase tracking-wide text-xs sm:text-sm mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#9FA0A0'}}>
                {t('metrics.unique.heading')}
              </p>
              <div className="text-4xl sm:text-5xl font-bold mb-3" style={{color: '#B8860B'}}>
                {formatNumber(displayStats.users)}
              </div>
              <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#4B5563'}}>
                {t('metrics.unique.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Tabli Matters Section */}
      <section className="relative py-12 sm:py-20" style={{backgroundColor: '#E7D7C5'}}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className={`text-3xl sm:text-5xl font-bold mb-3 sm:mb-6 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('why.title')}</h2>
            <p className={`text-base sm:text-xl max-w-3xl mx-auto mb-8 sm:mb-12 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>
              {t('why.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6 card-shadow">
                <Zap className="h-8 w-8 sm:h-10 sm:w-10" style={{color: '#5A5E3E'}} />
              </div>
              <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('why.satisfaction.title')}</h3>
              <p className={`text-sm sm:text-lg leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>
                {t('why.satisfaction.desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6 card-shadow">
                <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10" style={{color: '#5A5E3E'}} />
              </div>
              <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('why.capacity.title')}</h3>
              <p className={`text-sm sm:text-lg leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>
                {t('why.capacity.desc')}
              </p>
            </div>

            <div className="text-center sm:col-span-2 lg:col-span-1">
              <div className="bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6 card-shadow">
                <Users className="h-8 w-8 sm:h-10 sm:w-10" style={{color: '#5A5E3E'}} />
              </div>
              <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('why.connections.title')}</h3>
              <p className={`text-sm sm:text-lg leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>
                {t('why.connections.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Customers vs For Restaurants Section */}
      <section className="py-12 sm:py-20" style={{backgroundColor: '#E7D7C5'}}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className={`text-2xl sm:text-5xl font-bold mb-3 sm:mb-6 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('everyone.title')}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
            {/* For Customers */}
            <div>
              <h3 className={`text-xl sm:text-3xl font-semibold mb-4 sm:mb-8 text-center ${isRTL ? 'font-arabic' : ''}`} style={{color: '#B6683B'}}>{t('customers.title')}</h3>
              <div className="space-y-3 sm:space-y-6">
                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(45, 45, 43, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#5A5E3E'}}>
                      <Star className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('customers.availability.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('customers.availability.desc')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(45, 45, 43, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#5A5E3E'}}>
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('customers.booking.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('customers.booking.desc')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(45, 45, 43, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#5A5E3E'}}>
                      <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('customers.walkin.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('customers.walkin.desc')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* For Restaurants */}
            <div>
              <h3 className={`text-xl sm:text-3xl font-semibold mb-4 sm:mb-8 text-center ${isRTL ? 'font-arabic' : ''}`} style={{color: '#B6683B'}}>{t('restaurants.title')}</h3>
              <div className="space-y-3 sm:space-y-6">
                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(45, 45, 43, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#5A5E3E'}}>
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('restaurants.lost.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('restaurants.lost.desc')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(45, 45, 43, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#5A5E3E'}}>
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('restaurants.optimize.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('restaurants.optimize.desc')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(45, 45, 43, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#5A5E3E'}}>
                      <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('restaurants.fill.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#2D2D2B'}}>{t('restaurants.fill.desc')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-12 sm:py-20" style={{backgroundColor: '#F8F1C1'}}>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className={`text-2xl sm:text-4xl font-bold mb-3 sm:mb-6 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#9FA0A0'}}>{t('cta.title')}</h2>
          <p className={`text-base sm:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto ${isRTL ? 'font-arabic' : ''}`} style={{color: '#9FA0A0'}}>
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              size="lg"
              className={`pill-button cta-button text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 h-auto ${isRTL ? 'font-arabic' : ''}`}
              onClick={() => handlePrimaryNavigate('search')}
            >
              {t('cta.find')}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={`pill-button text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 h-auto ${isRTL ? 'font-arabic' : ''}`}
              style={{backgroundColor: 'rgba(255, 255, 255, 0.9)', borderColor: '#B7410E', color: '#3C3C3C'}}
              onClick={() => onNavigate('staff')}
            >
              {t('cta.login')}
            </Button>
          </div>
        </div>
      </section>

      <footer className="py-10" style={{backgroundColor: '#2D2D2B', color: '#F4F1E7'}}>
        <div className="container mx-auto px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 items-start">
            <div className="space-y-2 text-center sm:text-left">
              <h3 className="text-2xl font-semibold tracking-tight">Tabli</h3>
              <p className="text-sm opacity-80">Est. 2025 • Crafted for memorable dining</p>
              <p className="text-sm opacity-80">Serving restaurants and guests across the region</p>
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-sm font-semibold uppercase tracking-wide opacity-90">Stay in touch</p>
              <a href="mailto:tabli.team@gmail.com" className="text-sm hover:opacity-100 opacity-80 transition-opacity">
                tabli.team@gmail.com
              </a>
              <p className="text-sm opacity-80">Available 7 days a week</p>
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-sm font-semibold uppercase tracking-wide opacity-90">Quick links</p>
              <ul className="space-y-1 text-sm opacity-80">
                <li>Instant reservations</li>
                <li>Live waitlists</li>
                <li>Customer engagement &amp; insights</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-4 text-xs text-center sm:text-left opacity-70">
            © {currentYear} Tabli. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}