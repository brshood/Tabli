import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Clock, CheckCircle, MessageSquare, Zap, TrendingUp, Users, Calendar, Star, Smartphone } from 'lucide-react';
import tabliLogo from 'figma:asset/b9aff3f805d23772814268da68c337d8a54fb6dd.png';
import { useLanguage } from './LanguageContext';
import { LanguageToggle } from './LanguageToggle';

interface LandingPageProps {
  onNavigate: (page: 'landing' | 'search' | 'staff') => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  const { t, isRTL } = useLanguage();

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
              <img src={tabliLogo} alt="Tabli" className="h-64 w-auto mx-auto mb-4" />
            </div>
            
            <h1 className={`text-4xl sm:text-6xl md:text-7xl font-bold mb-6 leading-tight ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>
              <div className="block">{t('hero.title.line1')}</div>
              <div className="block">{t('hero.title.line2')}</div>
              <div className="block" style={{color: '#B7410E'}}>{t('hero.title.line3')}</div>
            </h1>
            
            <p className={`text-lg sm:text-xl md:text-2xl mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>
              {t('hero.subtitle')}
            </p>
            
            <div className="mt-8 sm:mt-12">
              <Button
                size="lg"
                className={`pill-button cta-button text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-6 h-auto font-semibold ${isRTL ? 'font-arabic' : ''}`}
                onClick={() => onNavigate('search')}
              >
                {t('hero.cta')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-12 sm:py-20" style={{backgroundColor: '#F3E5AB'}}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-6xl mx-auto">
            <Card className="card-shadow border-0 rounded-2xl sm:rounded-3xl hover:scale-105 transition-transform duration-300" style={{backgroundColor: 'white', borderColor: 'rgba(60, 60, 60, 0.1)'}}>
              <CardContent className="p-4 sm:p-8 text-center">
                <div className="rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-6" style={{backgroundColor: '#B7410E'}}>
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('showcase.instant.title')}</h3>
                <p className={`text-sm sm:text-base leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>
                  {t('showcase.instant.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="card-shadow border-0 rounded-2xl sm:rounded-3xl hover:scale-105 transition-transform duration-300" style={{backgroundColor: 'white', borderColor: 'rgba(60, 60, 60, 0.1)'}}>
              <CardContent className="p-4 sm:p-8 text-center">
                <div className="rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-6" style={{backgroundColor: '#B7410E'}}>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('showcase.waitlist.title')}</h3>
                <p className={`text-sm sm:text-base leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>
                  {t('showcase.waitlist.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="card-shadow border-0 rounded-2xl sm:rounded-3xl hover:scale-105 transition-transform duration-300 sm:col-span-2 lg:col-span-1" style={{backgroundColor: 'white', borderColor: 'rgba(60, 60, 60, 0.1)'}}>
              <CardContent className="p-4 sm:p-8 text-center">
                <div className="rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-6" style={{backgroundColor: '#B7410E'}}>
                  <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('showcase.sms.title')}</h3>
                <p className={`text-sm sm:text-base leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>
                  {t('showcase.sms.desc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Tabli Matters Section */}
      <section className="relative py-12 sm:py-20" style={{backgroundColor: '#F3E5AB'}}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className={`text-3xl sm:text-5xl font-bold mb-3 sm:mb-6 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('why.title')}</h2>
            <p className={`text-base sm:text-xl max-w-3xl mx-auto ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>
              {t('why.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6 card-shadow">
                <Zap className="h-8 w-8 sm:h-10 sm:w-10" style={{color: '#B7410E'}} />
              </div>
              <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('why.satisfaction.title')}</h3>
              <p className={`text-sm sm:text-lg leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>
                {t('why.satisfaction.desc')}
              </p>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6 card-shadow">
                <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10" style={{color: '#B7410E'}} />
              </div>
              <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('why.capacity.title')}</h3>
              <p className={`text-sm sm:text-lg leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>
                {t('why.capacity.desc')}
              </p>
            </div>

            <div className="text-center sm:col-span-2 lg:col-span-1">
              <div className="bg-white rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4 sm:mb-6 card-shadow">
                <Users className="h-8 w-8 sm:h-10 sm:w-10" style={{color: '#B7410E'}} />
              </div>
              <h3 className={`text-lg sm:text-2xl font-semibold mb-2 sm:mb-4 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('why.connections.title')}</h3>
              <p className={`text-sm sm:text-lg leading-relaxed ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>
                {t('why.connections.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Customers vs For Restaurants Section */}
      <section className="py-12 sm:py-20" style={{backgroundColor: '#F3E5AB'}}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className={`text-2xl sm:text-5xl font-bold mb-3 sm:mb-6 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('everyone.title')}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
            {/* For Customers */}
            <div>
              <h3 className={`text-xl sm:text-3xl font-semibold mb-4 sm:mb-8 text-center ${isRTL ? 'font-arabic' : ''}`} style={{color: '#B7410E'}}>{t('customers.title')}</h3>
              <div className="space-y-3 sm:space-y-6">
                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(60, 60, 60, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#B7410E'}}>
                      <Star className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('customers.availability.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('customers.availability.desc')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(60, 60, 60, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#B7410E'}}>
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('customers.booking.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('customers.booking.desc')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(60, 60, 60, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#B7410E'}}>
                      <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('customers.walkin.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('customers.walkin.desc')}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* For Restaurants */}
            <div>
              <h3 className={`text-xl sm:text-3xl font-semibold mb-4 sm:mb-8 text-center ${isRTL ? 'font-arabic' : ''}`} style={{color: '#B7410E'}}>{t('restaurants.title')}</h3>
              <div className="space-y-3 sm:space-y-6">
                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(60, 60, 60, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#B7410E'}}>
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('restaurants.lost.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('restaurants.lost.desc')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(60, 60, 60, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#B7410E'}}>
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('restaurants.optimize.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('restaurants.optimize.desc')}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl sm:rounded-2xl transition-colors" style={{backgroundColor: 'white', borderColor: 'rgba(60, 60, 60, 0.1)'}}>
                  <CardContent className="p-3 sm:p-6 flex items-start space-x-3 sm:space-x-4">
                    <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center flex-shrink-0" style={{backgroundColor: '#B7410E'}}>
                      <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`text-base sm:text-xl font-semibold mb-1 sm:mb-2 ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('restaurants.fill.title')}</h4>
                      <p className={`text-sm sm:text-base ${isRTL ? 'font-arabic' : ''}`} style={{color: '#3C3C3C'}}>{t('restaurants.fill.desc')}</p>
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
              onClick={() => onNavigate('search')}
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
    </div>
  );
}