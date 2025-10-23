import { Button } from './ui/button';
import { Globe } from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface LanguageToggleProps {
  className?: string;
}

export function LanguageToggle({ className }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className={`pill-button flex items-center gap-1 sm:gap-2 px-2 sm:px-3 text-xs sm:text-sm ${className || ''}`}
      style={{borderColor: '#B7410E', color: '#B7410E'}}
    >
      <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
      <span className="font-medium text-xs sm:text-sm">
        {language === 'en' ? 'ع' : 'EN'}
      </span>
      <span className="hidden md:inline font-medium">
        {language === 'en' ? t('language.arabic').slice(0, 5) : t('language.english')}
      </span>
    </Button>
  );
}