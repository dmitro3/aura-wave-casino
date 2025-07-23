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
      old_level: number;
      new_level: number;
      cases_earned: number;
      border_changed: boolean;
      new_border_tier: number;
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
    // Find the case for this specific level
    const levelCase = availableCases.find(
      c => c.level_unlocked === notification.data.new_level
    );
    
    if (levelCase) {
      setSelectedCase(levelCase.id);
      setSelectedLevel(levelCase.level_unlocked);
    } else {
      toast({
        title: 'Case Not Found',
        description: 'Unable to find your level case. Please check your rewards page.',
        variant: 'destructive'
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
      <Card className="glass border border-primary/30 hover:glow-primary transition-smooth">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Gift className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-lg">{notification.title}</h3>
              <p className="text-muted-foreground">{notification.message}</p>
              
              <div className="flex gap-2 mt-3">
                <Button 
                  onClick={handleOpenCase}
                  className="gradient-primary hover:glow-primary text-white"
                  size="sm"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Open Level {notification.data.new_level} Case
                </Button>
                
                <Button 
                  onClick={handleViewRewards}
                  variant="outline"
                  size="sm"
                  className="glass border-primary/30"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View All Rewards
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