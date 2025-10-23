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
      className={`pill-button flex items-center gap-2 ${className || ''}`}
      style={{borderColor: '#B7410E', color: '#B7410E'}}
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">
        {language === 'en' ? t('language.arabic') : t('language.english')}
      </span>
    </Button>
  );
}