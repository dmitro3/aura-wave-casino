import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, ExternalLink } from 'lucide-react';
import { EnhancedCaseOpeningModal } from './EnhancedCaseOpeningModal';
import { useCaseRewards } from '@/hooks/useCaseRewards';
import { useToast } from '@/hooks/use-toast';

interface CaseRewardNotificationProps {
  notification: {
    id: string;
    title: string;
    message: string;
    data: {
      old_level?: number;
      new_level?: number;
      level?: number;
      cases_earned?: number;
      border_changed?: boolean;
      new_border_tier?: number;
      case_rarity?: string;
    };
  };
  onDismiss: () => void;
}

export const CaseRewardNotification = ({ 
  notification, 
  onDismiss 
}: CaseRewardNotificationProps) => {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const { availableCases, refetch } = useCaseRewards();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleOpenCase = () => {
    // Get the level from the notification data
    const targetLevel = notification.data.level || notification.data.new_level;
    
    // Find the case for this specific level
    const levelCase = availableCases.find(
      c => c.level_unlocked === targetLevel
    );
    
    if (levelCase) {
      setSelectedCase(levelCase.id);
      setSelectedLevel(levelCase.level_unlocked);
    } else {
      // Force a refresh of cases and try again
      refetch().then(() => {
        const updatedCase = availableCases.find(
          c => c.level_unlocked === targetLevel
        );
        if (updatedCase) {
          setSelectedCase(updatedCase.id);
          setSelectedLevel(updatedCase.level_unlocked);
        } else {
          toast({
            title: 'Case Not Found',
            description: `Unable to find your level ${targetLevel} case. Please check your rewards page.`,
            variant: 'destructive'
          });
        }
      });
    }
  };

  const handleCaseOpened = async (reward: any) => {
    toast({
      title: `🎉 ${reward.rarity.toUpperCase()} Reward!`,
      description: `You won $${reward.amount}! Added to your balance.`,
    });
    setSelectedCase(null);
    await refetch();
    onDismiss();
  };

  const handleViewRewards = () => {
    navigate('/rewards');
    onDismiss();
  };

  return (
    <>
      <Card className="glass border border-primary/30 hover:glow-primary transition-smooth max-w-md mx-auto">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Gift className="w-5 h-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0 space-y-2">
              <h3 className="font-semibold text-base leading-tight">{notification.title}</h3>
              <p className="text-muted-foreground text-sm leading-tight">{notification.message}</p>
              
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Button 
                  onClick={handleOpenCase}
                  className="gradient-primary hover:glow-primary text-white text-sm"
                  size="sm"
                >
                  <Gift className="w-3 h-3 mr-1" />
                  Open Level {notification.data.level || notification.data.new_level} Case
                </Button>
                
                <Button 
                  onClick={handleViewRewards}
                  variant="outline"
                  size="sm"
                  className="glass border-primary/30 text-sm"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View All
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Case Opening Modal */}
      {selectedCase && (
        <EnhancedCaseOpeningModal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          caseId={selectedCase}
          level={selectedLevel}
          onCaseOpened={handleCaseOpened}
        />
      )}
    </>
  );
};