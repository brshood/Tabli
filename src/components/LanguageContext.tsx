import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  direction: 'ltr' | 'rtl';
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

    // Landing Page - Metrics Section
    'metrics.title': 'Tabli by the Numbers',
    'metrics.subtitle': 'A quick look at how restaurants and guests are connecting on Tabli.',
    'metrics.reservations.heading': 'Reservations',
    'metrics.reservations.desc': 'Guests who booked a table through Tabli.',
    'metrics.restaurants.heading': 'Restaurants',
    'metrics.restaurants.desc': 'Partners currently welcoming diners on Tabli.',
    'metrics.unique.heading': 'Unique Guests',
    'metrics.unique.desc': 'Individual phone numbers or emails that have booked with Tabli.',

    // Discover Page - Browse More
    'discover.more.title': "Can't find what you're looking for?",
    'discover.more.cta': 'Browse More!',

    // Discover Page - Featured Cities
    'discover.cities.dubai': 'Dubai',
    'discover.cities.alAin': 'Al Ain',
    'discover.cities.abuDhabi': 'Abu Dhabi',

    // Availability tags and actions
    'status.available': 'Available',
    'status.waitlist': 'Waitlist',
    'action.standInQueue': 'Stand in Queue',
    'status.tablesAvailableNow': 'Tables available now',

    // Search Page Results Summary
    'search.results.count': 'Restaurants Found',

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
    'nav.discover': 'Discover',
    'nav.search': 'Search',
    'nav.staff': 'Staff',

    // Language Toggle
    'language.english': 'English',
    'language.arabic': 'العربية',

    // Generic actions / labels
    'action.cancel': 'Cancel',
    'action.save': 'Save',
    'action.delete': 'Delete',
    'action.close': 'Close',
    'action.confirm': 'Confirm',

    // Staff / Admin / Forms (keys only in English copy for now)
    'staff.login.title': 'Staff Access',
    'staff.login.subtitle': 'Log in to your staff account or create a new restaurant account.',
    'staff.login.email': 'Email',
    'staff.login.password': 'Password',
    'staff.login.button': 'Log in',
    'staff.login.forgotPassword': 'Forgot your password?',
    'staff.signup.title': 'Create Restaurant Account',
    'staff.signup.personalInfo': 'Personal Information',
    'staff.signup.fullName': 'Full Name',
    'staff.signup.restaurantInfo': 'Restaurant Information',
    'staff.signup.restaurantName': 'Restaurant Name',
    'staff.signup.city': 'City',
    'staff.signup.cuisine': 'Cuisine Type',
    'staff.signup.phone': 'Phone Number',
    'staff.signup.address': 'Address',
    'staff.signup.licenseInfo': 'License Information',
    'staff.signup.licenseNumber': 'License Number',
    'staff.signup.licenseDocument': 'License Document',

    'admin.login.title': 'Admin Login',
    'admin.dashboard.title': 'Admin Dashboard',
    'admin.logout': 'Logout',

    'notifications.empty.title': 'No Reservations Yet',
    'notifications.empty.subtitle': "You haven't made any reservations. Start exploring restaurants!",

    'survey.title': 'Quick Feedback',
    'survey.subtitle': 'Help us improve your experience',
    'survey.hearAboutUs': 'How did you hear about {restaurant}?',
    'survey.specialRequirements': 'Any special requirements?',
    'survey.improvements': 'What can we improve?',
    'survey.skip': 'Skip',
    'survey.submit': 'Submit',
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

    // Landing Page - Metrics Section
    'metrics.title': 'أرقام تابلي',
    'metrics.subtitle': 'نظرة سريعة على كيفية اتصال المطاعم والضيوف عبر تابلي.',
    'metrics.reservations.heading': 'الحجوزات',
    'metrics.reservations.desc': 'ضيوف حجزوا طاولة عبر تابلي.',
    'metrics.restaurants.heading': 'المطاعم',
    'metrics.restaurants.desc': 'شركاء يستقبلون الضيوف حالياً على تابلي.',
    'metrics.unique.heading': 'الضيوف الفريدون',
    'metrics.unique.desc': 'أرقام هواتف أو رسائل بريد إلكتروني حجزت عبر تابلي.',

    // Discover Page - Browse More
    'discover.more.title': 'لم تجد ما تبحث عنه؟',
    'discover.more.cta': 'تصفح المزيد!',

    // Discover Page - Featured Cities
    'discover.cities.dubai': 'دبي',
    'discover.cities.alAin': 'العين',
    'discover.cities.abuDhabi': 'أبوظبي',

    // Availability tags and actions
    'status.available': 'متاح',
    'status.waitlist': 'قائمة الانتظار',
    'action.standInQueue': 'انضم إلى الطابور',
    'status.tablesAvailableNow': 'طاولات متاحة الآن',

    // Search Page Results Summary
    'search.results.count': 'المطاعم الموجودة',

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
    'nav.discover': 'اكتشف',
    'nav.search': 'بحث',
    'nav.staff': 'الموظفين',

    // Language Toggle
    'language.english': 'English',
    'language.arabic': 'العربية',

    // Generic actions / labels
    'action.cancel': 'إلغاء',
    'action.save': 'حفظ',
    'action.delete': 'حذف',
    'action.close': 'إغلاق',
    'action.confirm': 'تأكيد',

    // Staff / Admin / Forms
    'staff.login.title': 'دخول الموظفين',
    'staff.login.subtitle': 'سجّل الدخول إلى حساب الموظفين أو أنشئ حساب مطعم جديد.',
    'staff.login.email': 'البريد الإلكتروني',
    'staff.login.password': 'كلمة المرور',
    'staff.login.button': 'تسجيل الدخول',
    'staff.login.forgotPassword': 'نسيت كلمة المرور؟',
    'staff.signup.title': 'إنشاء حساب مطعم',
    'staff.signup.personalInfo': 'المعلومات الشخصية',
    'staff.signup.fullName': 'الاسم الكامل',
    'staff.signup.restaurantInfo': 'معلومات المطعم',
    'staff.signup.restaurantName': 'اسم المطعم',
    'staff.signup.city': 'المدينة',
    'staff.signup.cuisine': 'نوع المطبخ',
    'staff.signup.phone': 'رقم الهاتف',
    'staff.signup.address': 'العنوان',
    'staff.signup.licenseInfo': 'معلومات الرخصة',
    'staff.signup.licenseNumber': 'رقم الرخصة',
    'staff.signup.licenseDocument': 'مستند الرخصة',

    'admin.login.title': 'تسجيل دخول المشرف',
    'admin.dashboard.title': 'لوحة تحكم المشرف',
    'admin.logout': 'تسجيل الخروج',

    'notifications.empty.title': 'لا توجد حجوزات بعد',
    'notifications.empty.subtitle': 'لم تقم بأي حجز حتى الآن. ابدأ في استكشاف المطاعم!',

    'survey.title': 'ملاحظات سريعة',
    'survey.subtitle': 'ساعدنا على تحسين تجربتك',
    'survey.hearAboutUs': 'كيف سمعت عن {restaurant}?',
    'survey.specialRequirements': 'هل لديك أي متطلبات خاصة؟',
    'survey.improvements': 'ما الذي يمكننا تحسينه؟',
    'survey.skip': 'تخطّي',
    'survey.submit': 'إرسال',
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
    direction: language === 'ar' ? 'rtl' : 'ltr',
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