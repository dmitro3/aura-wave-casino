import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, X } from 'lucide-react';
import { CaseOpeningModal } from './CaseOpeningModal';
import { useCaseRewards } from '@/hooks/useCaseRewards';

interface CaseReward {
  id: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  reward_amount: number;
  level_unlocked: number;
}

interface CaseNotificationProps {
  notification: {
    id: string;
    title: string;
    message: string;
    data: {
      level: number;
      cases_earned: number;
    };
    created_at: string;
  };
  onDismiss: () => void;
  onMarkRead: () => void;
}

export const CaseNotification = ({ notification, onDismiss, onMarkRead }: CaseNotificationProps) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const { availableCases } = useCaseRewards();

  const handleOpenCase = () => {
    // Find the first available case for this level
    const availableCase = availableCases.find(c => c.level_unlocked === notification.data.level);
    if (availableCase) {
      setSelectedCaseId(availableCase.id);
      setShowCaseModal(true);
      onMarkRead();
    }
  };

  const handleCaseOpened = (reward: CaseReward) => {
    setShowCaseModal(false);
    setSelectedCaseId(null);
  };

  const hasAvailableCases = availableCases.some(c => c.level_unlocked === notification.data.level);

  return (
    <>
      <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gift className="w-4 h-4 text-orange-500" />
              {notification.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3">
            {notification.message}
          </p>
          
          {hasAvailableCases ? (
            <Button
              onClick={handleOpenCase}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              size="sm"
            >
              <Gift className="w-4 h-4 mr-2" />
              Open Case
            </Button>
          ) : (
            <div className="text-sm text-muted-foreground">
              All cases for this level have been opened.
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-2">
            {new Date(notification.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>

      {selectedCaseId && (
        <CaseOpeningModal
          isOpen={showCaseModal}
          onClose={() => setShowCaseModal(false)}
          caseId={selectedCaseId}
          level={notification.data.level}
          onCaseOpened={handleCaseOpened}
        />
      )}
    </>
  );
};