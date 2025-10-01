import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations = {
  en: {
    // Landing Page - Hero Section
    'hero.title.line1': 'No more waiting.',
    'hero.title.line2': 'No more guessing.',
    'hero.title.line3': 'Just great moments.',
    'hero.subtitle': 'Reserve tables instantly. Check live availability. Join waitlists with a single click.',
    'hero.cta': 'Hop in line',

    // Landing Page - Showcase Cards
    'showcase.instant.title': 'Instant Reservations',
    'showcase.instant.desc': 'Book your table in seconds. See real-time availability and secure your spot instantly.',
    'showcase.waitlist.title': 'Live Waitlists',
    'showcase.waitlist.desc': 'Join digital waitlists and track your position in real-time. No more standing around.',
    'showcase.sms.title': 'SMS Updates',
    'showcase.sms.desc': 'Get notified when your table is ready. Stay informed without staying put.',

    // Landing Page - Why Tabli Matters
    'why.title': 'Why Tabli Matters',
    'why.subtitle': 'We\'re transforming the dining experience for everyone involved',
    'why.satisfaction.title': 'Immediate Satisfaction',
    'why.satisfaction.desc': 'Know availability before you arrive. Make decisions with confidence and reduce disappointment.',
    'why.capacity.title': 'Maximized Capacity',
    'why.capacity.desc': 'Keep guests engaged instead of losing them. Turn wait times into anticipation, not frustration.',
    'why.connections.title': 'Live Connections',
    'why.connections.desc': 'Connect customers to available tables instantly. Bridge the gap between demand and availability.',

    // Landing Page - For Everyone Section
    'everyone.title': 'Built for Everyone in the Dining Experience',
    'customers.title': 'For Customers',
    'customers.availability.title': 'Live Availability',
    'customers.availability.desc': 'See which restaurants have tables right now',
    'customers.booking.title': 'Instant Booking',
    'customers.booking.desc': 'Reserve your table in just a few taps',
    'customers.walkin.title': 'Walk in Confidently',
    'customers.walkin.desc': 'Know before you go - never waste a trip',
    'restaurants.title': 'For Restaurants',
    'restaurants.lost.title': 'Reduce Lost Customers',
    'restaurants.lost.desc': 'Keep guests engaged instead of walking away',
    'restaurants.optimize.title': 'Optimize Live Capacity',
    'restaurants.optimize.desc': 'Maximize table turnover and revenue',
    'restaurants.fill.title': 'Fill Tables Instantly',
    'restaurants.fill.desc': 'Connect with customers actively looking for tables',

    // Landing Page - CTA Section
    'cta.title': 'Ready to Transform Your Dining Experience?',
    'cta.subtitle': 'Join thousands of restaurants and millions of diners already using Tabli',
    'cta.find': 'Find a Table',
    'cta.login': 'Restaurant Login',

    // Search Page
    'search.title': 'Find Your Perfect Table',
    'search.subtitle': 'Discover available tables near you or join waitlists with real-time updates',
    'search.placeholder': 'Search restaurants, cuisines, or locations…',
    'search.all': 'All',
    'search.all.locations': 'All Locations',
    'search.available': 'Available Now',
    'search.waitlist.only': 'Waitlist Only',
    'search.trending': 'Trending',
    'search.waiting': 'waiting',
    'search.tables.available': 'tables available',
    'search.wait.time': 'Wait time:',
    'search.reserve': 'Reserve Table',
    'search.join.waitlist': 'Join Waitlist',
    'search.view.menu': 'View Menu',
    'search.no.results.title': 'No restaurants found',
    'search.no.results.desc': 'Try adjusting your search or filter options',
    'search.clear.filters': 'Clear Filters',

    // Navigation
    'nav.search': 'Search',
    'nav.staff': 'Staff',

    // Language Toggle
    'language.english': 'English',
    'language.arabic': 'العربية',
  },
  ar: {
    // Landing Page - Hero Section
    'hero.title.line1': 'لا مزيد من الانتظار.',
    'hero.title.line2': 'لا مزيد من التخمين.',
    'hero.title.line3': 'فقط لحظات رائعة.',
    'hero.subtitle': 'احجز الطاولات فوراً. تحقق من التوفر المباشر. انضم إلى قوائم الانتظار بنقرة واحدة.',
    'hero.cta': 'انضم إلى الطابور',

    // Landing Page - Showcase Cards
    'showcase.instant.title': 'حجوزات فورية',
    'showcase.instant.desc': 'احجز طاولتك في ثوانٍ. شاهد التوفر المباشر واضمن مكانك فوراً.',
    'showcase.waitlist.title': 'قوائم انتظار مباشرة',
    'showcase.waitlist.desc': 'انضم إلى قوائم الانتظار الرقمية وتتبع موقعك في الوقت الفعلي. لا مزيد من الوقوف.',
    'showcase.sms.title': 'تحديثات نصية',
    'showcase.sms.desc': 'احصل على إشعار عند جاهزية طاولتك. ابق على اطلاع دون البقاء في مكانك.',

    // Landing Page - Why Tabli Matters
    'why.title': 'لماذا تابلي مهم',
    'why.subtitle': 'نحن نغير تجربة تناول الطعام للجميع',
    'why.satisfaction.title': 'رضا فوري',
    'why.satisfaction.desc': 'اعرف التوفر قبل وصولك. اتخذ قرارات بثقة وقلل من خيبة الأمل.',
    'why.capacity.title': 'قدرة استيعابية قصوى',
    'why.capacity.desc': 'حافظ على تفاعل الضيوف بدلاً من فقدانهم. حول أوقات الانتظار إلى توقع وليس إحباط.',
    'why.connections.title': 'اتصالات مباشرة',
    'why.connections.desc': 'اربط العملاء بالطاولات المتاحة فوراً. اسد الفجوة بين الطلب والتوفر.',

    // Landing Page - For Everyone Section
    'everyone.title': 'مصمم للجميع في تجربة تناول الطعام',
    'customers.title': 'للعملاء',
    'customers.availability.title': 'توفر مباشر',
    'customers.availability.desc': 'شاهد المطاعم التي لديها طاولات متاحة الآن',
    'customers.booking.title': 'حجز فوري',
    'customers.booking.desc': 'احجز طاولتك بضغطات قليلة فقط',
    'customers.walkin.title': 'ادخل بثقة',
    'customers.walkin.desc': 'اعرف قبل أن تذهب - لا تضيع رحلة أبداً',
    'restaurants.title': 'للمطاعم',
    'restaurants.lost.title': 'قلل العملاء المفقودين',
    'restaurants.lost.desc': 'حافظ على تفاعل الضيوف بدلاً من المغادرة',
    'restaurants.optimize.title': 'حسّن القدرة الاستيعابية',
    'restaurants.optimize.desc': 'اكبر من معدل دوران الطاولات والإيرادات',
    'restaurants.fill.title': 'املأ الطاولات فوراً',
    'restaurants.fill.desc': 'تواصل مع العملاء الباحثين بنشاط عن طاولات',

    // Landing Page - CTA Section
    'cta.title': 'جاهز لتحويل تجربة تناول الطعام؟',
    'cta.subtitle': 'انضم إلى آلاف المطاعم وملايين رواد المطاعم المستخدمين لتابلي',
    'cta.find': 'ابحث عن طاولة',
    'cta.login': 'دخول المطعم',

    // Search Page
    'search.title': 'ابحث عن طاولتك المثالية',
    'search.subtitle': 'اكتشف الطاولات المتاحة بالقرب منك أو انضم إلى قوائم الانتظار مع التحديثات المباشرة',
    'search.placeholder': 'ابحث عن مطاعم أو مأكولات أو مواقع...',
    'search.all': 'الكل',
    'search.all.locations': 'جميع المواقع',
    'search.available': 'متاح الآن',
    'search.waitlist.only': 'قائمة انتظار فقط',
    'search.trending': 'رائج',
    'search.waiting': 'في الانتظار',
    'search.tables.available': 'طاولات متاحة',
    'search.wait.time': 'وقت الانتظار:',
    'search.reserve': 'احجز طاولة',
    'search.join.waitlist': 'انضم لقائمة الانتظار',
    'search.view.menu': 'عرض القائمة',
    'search.no.results.title': 'لم يتم العثور على مطاعم',
    'search.no.results.desc': 'جرب تعديل البحث أو خيارات التصفية',
    'search.clear.filters': 'مسح التصفية',

    // Navigation
    'nav.search': 'بحث',
    'nav.staff': 'الموظفين',

    // Language Toggle
    'language.english': 'English',
    'language.arabic': 'العربية',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('tabli-language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // Save language to localStorage and update document direction
  useEffect(() => {
    localStorage.setItem('tabli-language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
    isRTL: language === 'ar',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}