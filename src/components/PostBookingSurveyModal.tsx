import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MessageSquare } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface PostBookingSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
}

const hearAboutUsOptions = [
  'Social Media',
  'Friend/Family Recommendation',
  'Google Search',
  'Walked by',
  'Food Blog/Review',
  'Other'
];

export function PostBookingSurveyModal({ isOpen, onClose, restaurantName }: PostBookingSurveyModalProps) {
  const [hearAboutUs, setHearAboutUs] = useState<string>('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [improvements, setImprovements] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHearAboutUs('');
      setSpecialRequirements('');
      setImprovements('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const surveyData = {
      restaurantName,
      hearAboutUs,
      specialRequirements: specialRequirements.trim() || null,
      improvements: improvements.trim() || null,
      timestamp: new Date().toISOString()
    };

    console.log('📋 [SURVEY SUBMISSION]', surveyData);
    
    toast.success('Thank you for your feedback!');
    onClose();
  };

  const handleSkip = () => {
    console.log('📋 [SURVEY SKIPPED]', { restaurantName });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md mx-4 !opacity-100 !bg-white" 
        style={{backgroundColor: '#FFFFFF !important', borderColor: 'var(--where2go-border)', opacity: '1 !important'}}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div 
              className="rounded-full w-10 h-10 flex items-center justify-center"
              style={{backgroundColor: 'var(--where2go-buff)'}}
            >
              <MessageSquare className="h-5 w-5" style={{color: 'var(--where2go-accent)'}} />
            </div>
            <div>
              <DialogTitle style={{color: 'var(--where2go-text)'}}>
                Quick Feedback
              </DialogTitle>
              <DialogDescription style={{color: 'var(--where2go-text)', opacity: 0.7}}>
                Help us improve your experience
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* How did you hear about us */}
          <div className="space-y-2">
            <Label htmlFor="hearAboutUs" style={{color: 'var(--where2go-text)'}}>
              How did you hear about {restaurantName}?
            </Label>
            <Select value={hearAboutUs} onValueChange={setHearAboutUs}>
              <SelectTrigger 
                className="bg-white" 
                style={{borderColor: 'var(--where2go-border)'}}
              >
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent style={{backgroundColor: '#FFFFFF', opacity: '1'}} className="!bg-white !opacity-100">
                {hearAboutUsOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Special Requirements (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="specialRequirements" style={{color: 'var(--where2go-text)'}}>
              Any special requirements? <span className="text-sm opacity-60">(Optional)</span>
            </Label>
            <Textarea
              id="specialRequirements"
              placeholder="e.g., high chair needed, allergies, celebration..."
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              className="bg-white resize-none"
              style={{borderColor: 'var(--where2go-border)'}}
              rows={3}
            />
          </div>

          {/* What can we improve (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="improvements" style={{color: 'var(--where2go-text)'}}>
              What can we improve? <span className="text-sm opacity-60">(Optional)</span>
            </Label>
            <Textarea
              id="improvements"
              placeholder="Share your suggestions..."
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              className="bg-white resize-none"
              style={{borderColor: 'var(--where2go-border)'}}
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1 pill-button"
              style={{borderColor: 'var(--where2go-border)', color: 'var(--where2go-text)'}}
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!hearAboutUs}
              className="flex-1 pill-button cta-button"
            >
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

