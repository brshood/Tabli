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

    // Common UI Elements
    'common.loading': 'Loading...',
    'common.submit': 'Submit',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.skip': 'Skip',
    'common.done': 'Done',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.view': 'View',
    'common.more': 'More',
    
    // Booking Modal
    'booking.title.reserve': 'Reserve a Table',
    'booking.title.waitlist': 'Join Waitlist',
    'booking.party.size': 'Party Size',
    'booking.contact.method': 'Contact Method',
    'booking.contact.phone': 'Phone',
    'booking.contact.email': 'Email',
    'booking.name': 'Your Name',
    'booking.name.optional': 'Your Name (Optional)',
    'booking.email.address': 'Email Address',
    'booking.phone.number': 'Phone Number',
    'booking.gender': 'Gender',
    'booking.gender.male': 'Male',
    'booking.gender.female': 'Female',
    'booking.gender.no.preference': 'Prefer not to say',
    'booking.seating.preference': 'Seating Preference',
    'booking.seating.indoor': 'Indoor',
    'booking.seating.outdoor': 'Outdoor',
    'booking.seating.no.preference': 'No Preference',
    'booking.button.reserve': 'Reserve Table',
    'booking.button.join': 'Join Waitlist',
    'booking.submitting': 'Submitting...',
    'booking.hold.time': 'Your table will be held for',
    'booking.hold.minutes': 'minutes once confirmed',
    
    // Notifications Page
    'notifications.title': 'Notifications',
    'notifications.updates': 'Updates',
    'notifications.active': 'Active',
    'notifications.past': 'Past',
    'notifications.queue.position': 'Queue Position',
    'notifications.estimated.wait': 'Estimated Wait',
    'notifications.table.hold': 'Table Hold',
    'notifications.arrive.within': 'Arrive within 15 minutes',
    'notifications.view.restaurant': 'View Restaurant',
    'notifications.refresh': 'Refresh',
    'notifications.cancel': 'Cancel',
    'notifications.cancelling': 'Cancelling...',
    'notifications.remove': 'Remove',
    'notifications.clear.all': 'Clear',
    'notifications.no.active': 'No active reservations',
    'notifications.no.past': 'No past reservations',
    'notifications.party.size': 'Party Size',
    'notifications.contact': 'Contact',
    
    // Staff Dashboard
    'staff.dashboard': 'Dashboard',
    'staff.waitlist': 'Waitlist',
    'staff.seated': 'Seated Tables',
    'staff.analytics': 'Analytics',
    'staff.settings': 'Settings',
    'staff.logout': 'Logout',
    'staff.check.in': 'Check In',
    'staff.checking.in': 'Checking In...',
    'staff.check.out': 'Check Out',
    'staff.checking.out': 'Checking Out...',
    'staff.seat': 'Seat',
    'staff.call': 'Call',
    'staff.cancel': 'Cancel',
    'staff.table': 'Table',
    'staff.time.waiting': 'Waiting',
    'staff.overview': 'Overview',
    'staff.total.reservations': 'Total Reservations',
    'staff.confirmed': 'Confirmed',
    'staff.seated.count': 'Seated',
    'staff.cancelled': 'Cancelled',
    'staff.tables.management': 'Tables Management',
    'staff.menu.management': 'Menu Management',
    'staff.restaurant.info': 'Restaurant Info',
    
    // Admin Panel
    'admin.dashboard': 'Admin Dashboard',
    'admin.login': 'Admin Login',
    'admin.username': 'Username',
    'admin.password': 'Password',
    'admin.login.button': 'Login',
    'admin.logout': 'Logout',
    'admin.search': 'Search restaurants...',
    'admin.total': 'Total',
    'admin.restaurants': 'restaurant(s)',
    'admin.loading': 'Loading restaurants...',
    'admin.no.restaurants': 'No restaurants found',
    'admin.view.details': 'View Details',
    'admin.approve': 'Approve',
    'admin.deny': 'Deny',
    'admin.delete': 'Delete',
    'admin.feedback': 'View Feedback',
    'admin.feedback.title': 'Customer Feedback',
    'admin.feedback.no.data': 'No feedback submitted yet',
    'admin.feedback.loading': 'Loading feedback...',
    'admin.feedback.hear.about': 'How did you hear about us?',
    'admin.feedback.special.requirements': 'Special Requirements:',
    'admin.feedback.improvements': 'Suggestions for Improvement:',
    'admin.feedback.contact': 'Contact:',
    
    // Menu Modal
    'menu.title': 'Menu',
    'menu.full.menu': 'Full Menu',
    'menu.loading': 'Loading menu...',
    'menu.no.items': 'No menu items available',
    'menu.category': 'Category',
    'menu.price': 'Price',
    
    // Post-Booking Survey
    'survey.title': 'Quick Feedback',
    'survey.subtitle': 'Help us improve your experience',
    'survey.hear.about': 'How did you hear about us?',
    'survey.hear.required': 'Please select an option',
    'survey.special.requirements': 'Any special requirements?',
    'survey.special.placeholder': 'Dietary restrictions, accessibility needs, etc.',
    'survey.improvements': 'How can we improve?',
    'survey.improvements.placeholder': 'Share your suggestions...',
    'survey.submit': 'Submit',
    'survey.submitting': 'Submitting...',
    'survey.skip': 'Skip',
    'survey.thanks': 'Thank you for your feedback!',
    
    // Restaurant Profile
    'profile.featured.items': 'Featured Menu Items',
    'profile.menu.highlights': 'Menu Highlights',
    'profile.view.full.menu': 'View Full Menu',
    'profile.important.notice': 'Important Notice',
    'profile.tables.held': 'Tables are held for',
    'profile.please.arrive': 'minutes. Please arrive on time to secure your reservation.',
    'profile.seating.options': 'Seating Options',
    'profile.indoor.seating': 'Indoor Seating',
    'profile.outdoor.seating': 'Outdoor Seating',
    'profile.opening.hours': 'Opening Hours',
    'profile.location': 'Location',
    'profile.contact': 'Contact',
    'profile.rating': 'Rating',
    'profile.reviews': 'reviews',
    'profile.get.directions': 'Get Directions',
    
    // Status Messages
    'status.pending': 'Pending',
    'status.confirmed': 'Confirmed',
    'status.seated': 'Seated',
    'status.cancelled': 'Cancelled',
    'status.completed': 'Completed',
    'status.no.show': 'No Show',
    'status.expired': 'Expired',
    'status.ready': 'Ready',
    
    // Error Messages
    'error.required': 'This field is required',
    'error.invalid.email': 'Invalid email address',
    'error.invalid.phone': 'Invalid phone number',
    'error.network': 'Network error. Please try again.',
    'error.server': 'Server error. Please try again later.',
    'error.not.found': 'Not found',
    'error.unauthorized': 'Unauthorized access',
    'error.duplicate.reservation': 'You already have an active reservation at this restaurant',
    
    // Success Messages
    'success.reservation': 'Table reserved!',
    'success.waitlist': 'Added to waitlist!',
    'success.cancelled': 'Reservation cancelled',
    'success.updated': 'Updated successfully',
    'success.saved': 'Saved successfully',
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

    // Common UI Elements
    'common.loading': 'جاري التحميل...',
    'common.submit': 'إرسال',
    'common.cancel': 'إلغاء',
    'common.close': 'إغلاق',
    'common.save': 'حفظ',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.confirm': 'تأكيد',
    'common.back': 'رجوع',
    'common.next': 'التالي',
    'common.skip': 'تخطي',
    'common.done': 'تم',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'common.view': 'عرض',
    'common.more': 'المزيد',
    
    // Booking Modal
    'booking.title.reserve': 'احجز طاولة',
    'booking.title.waitlist': 'انضم لقائمة الانتظار',
    'booking.party.size': 'عدد الأشخاص',
    'booking.contact.method': 'طريقة التواصل',
    'booking.contact.phone': 'هاتف',
    'booking.contact.email': 'بريد إلكتروني',
    'booking.name': 'اسمك',
    'booking.name.optional': 'اسمك (اختياري)',
    'booking.email.address': 'عنوان البريد الإلكتروني',
    'booking.phone.number': 'رقم الهاتف',
    'booking.gender': 'الجنس',
    'booking.gender.male': 'ذكر',
    'booking.gender.female': 'أنثى',
    'booking.gender.no.preference': 'أفضل عدم الإفصاح',
    'booking.seating.preference': 'تفضيل الجلوس',
    'booking.seating.indoor': 'داخلي',
    'booking.seating.outdoor': 'خارجي',
    'booking.seating.no.preference': 'لا تفضيل',
    'booking.button.reserve': 'احجز طاولة',
    'booking.button.join': 'انضم لقائمة الانتظار',
    'booking.submitting': 'جاري الإرسال...',
    'booking.hold.time': 'سيتم حجز طاولتك لمدة',
    'booking.hold.minutes': 'دقيقة بمجرد التأكيد',
    
    // Notifications Page
    'notifications.title': 'الإشعارات',
    'notifications.updates': 'التحديثات',
    'notifications.active': 'نشط',
    'notifications.past': 'السابق',
    'notifications.queue.position': 'موقع في الطابور',
    'notifications.estimated.wait': 'وقت الانتظار المقدر',
    'notifications.table.hold': 'حجز الطاولة',
    'notifications.arrive.within': 'احضر خلال 15 دقيقة',
    'notifications.view.restaurant': 'عرض المطعم',
    'notifications.refresh': 'تحديث',
    'notifications.cancel': 'إلغاء',
    'notifications.cancelling': 'جاري الإلغاء...',
    'notifications.remove': 'إزالة',
    'notifications.clear.all': 'مسح',
    'notifications.no.active': 'لا توجد حجوزات نشطة',
    'notifications.no.past': 'لا توجد حجوزات سابقة',
    'notifications.party.size': 'عدد الأشخاص',
    'notifications.contact': 'التواصل',
    
    // Staff Dashboard
    'staff.dashboard': 'لوحة التحكم',
    'staff.waitlist': 'قائمة الانتظار',
    'staff.seated': 'الطاولات المشغولة',
    'staff.analytics': 'التحليلات',
    'staff.settings': 'الإعدادات',
    'staff.logout': 'تسجيل الخروج',
    'staff.check.in': 'تسجيل الدخول',
    'staff.checking.in': 'جاري التسجيل...',
    'staff.check.out': 'تسجيل الخروج',
    'staff.checking.out': 'جاري الخروج...',
    'staff.seat': 'إجلاس',
    'staff.call': 'اتصال',
    'staff.cancel': 'إلغاء',
    'staff.table': 'طاولة',
    'staff.time.waiting': 'في الانتظار',
    'staff.overview': 'نظرة عامة',
    'staff.total.reservations': 'إجمالي الحجوزات',
    'staff.confirmed': 'مؤكد',
    'staff.seated.count': 'جالس',
    'staff.cancelled': 'ملغي',
    'staff.tables.management': 'إدارة الطاولات',
    'staff.menu.management': 'إدارة القائمة',
    'staff.restaurant.info': 'معلومات المطعم',
    
    // Admin Panel
    'admin.dashboard': 'لوحة المسؤول',
    'admin.login': 'تسجيل دخول المسؤول',
    'admin.username': 'اسم المستخدم',
    'admin.password': 'كلمة المرور',
    'admin.login.button': 'تسجيل الدخول',
    'admin.logout': 'تسجيل الخروج',
    'admin.search': 'بحث عن مطاعم...',
    'admin.total': 'المجموع',
    'admin.restaurants': 'مطعم/مطاعم',
    'admin.loading': 'جاري تحميل المطاعم...',
    'admin.no.restaurants': 'لم يتم العثور على مطاعم',
    'admin.view.details': 'عرض التفاصيل',
    'admin.approve': 'موافقة',
    'admin.deny': 'رفض',
    'admin.delete': 'حذف',
    'admin.feedback': 'عرض الملاحظات',
    'admin.feedback.title': 'ملاحظات العملاء',
    'admin.feedback.no.data': 'لم يتم تقديم ملاحظات بعد',
    'admin.feedback.loading': 'جاري تحميل الملاحظات...',
    'admin.feedback.hear.about': 'كيف سمعت عنا؟',
    'admin.feedback.special.requirements': 'متطلبات خاصة:',
    'admin.feedback.improvements': 'اقتراحات للتحسين:',
    'admin.feedback.contact': 'التواصل:',
    
    // Menu Modal
    'menu.title': 'القائمة',
    'menu.full.menu': 'القائمة الكاملة',
    'menu.loading': 'جاري تحميل القائمة...',
    'menu.no.items': 'لا توجد عناصر في القائمة',
    'menu.category': 'الفئة',
    'menu.price': 'السعر',
    
    // Post-Booking Survey
    'survey.title': 'ملاحظات سريعة',
    'survey.subtitle': 'ساعدنا في تحسين تجربتك',
    'survey.hear.about': 'كيف سمعت عنا؟',
    'survey.hear.required': 'الرجاء اختيار خيار',
    'survey.special.requirements': 'أي متطلبات خاصة؟',
    'survey.special.placeholder': 'قيود غذائية، احتياجات الوصول، إلخ.',
    'survey.improvements': 'كيف يمكننا التحسين؟',
    'survey.improvements.placeholder': 'شارك اقتراحاتك...',
    'survey.submit': 'إرسال',
    'survey.submitting': 'جاري الإرسال...',
    'survey.skip': 'تخطي',
    'survey.thanks': 'شكراً لملاحظاتك!',
    
    // Restaurant Profile
    'profile.featured.items': 'عناصر القائمة المميزة',
    'profile.menu.highlights': 'أبرز القائمة',
    'profile.view.full.menu': 'عرض القائمة الكاملة',
    'profile.important.notice': 'إشعار مهم',
    'profile.tables.held': 'يتم حجز الطاولات لمدة',
    'profile.please.arrive': 'دقيقة. الرجاء الحضور في الوقت المحدد لتأمين حجزك.',
    'profile.seating.options': 'خيارات الجلوس',
    'profile.indoor.seating': 'جلوس داخلي',
    'profile.outdoor.seating': 'جلوس خارجي',
    'profile.opening.hours': 'ساعات العمل',
    'profile.location': 'الموقع',
    'profile.contact': 'التواصل',
    'profile.rating': 'التقييم',
    'profile.reviews': 'مراجعات',
    'profile.get.directions': 'الحصول على الاتجاهات',
    
    // Status Messages
    'status.pending': 'قيد الانتظار',
    'status.confirmed': 'مؤكد',
    'status.seated': 'جالس',
    'status.cancelled': 'ملغي',
    'status.completed': 'مكتمل',
    'status.no.show': 'لم يحضر',
    'status.expired': 'منتهي',
    'status.ready': 'جاهز',
    
    // Error Messages
    'error.required': 'هذا الحقل مطلوب',
    'error.invalid.email': 'عنوان بريد إلكتروني غير صالح',
    'error.invalid.phone': 'رقم هاتف غير صالح',
    'error.network': 'خطأ في الشبكة. يرجى المحاولة مرة أخرى.',
    'error.server': 'خطأ في الخادم. يرجى المحاولة لاحقاً.',
    'error.not.found': 'غير موجود',
    'error.unauthorized': 'وصول غير مصرح به',
    'error.duplicate.reservation': 'لديك بالفعل حجز نشط في هذا المطعم',
    
    // Success Messages
    'success.reservation': 'تم حجز الطاولة!',
    'success.waitlist': 'تمت الإضافة لقائمة الانتظار!',
    'success.cancelled': 'تم إلغاء الحجز',
    'success.updated': 'تم التحديث بنجاح',
    'success.saved': 'تم الحفظ بنجاح',
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