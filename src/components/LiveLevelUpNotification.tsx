import { useLevelUpNotifications } from '@/hooks/useLevelUpNotifications';
import { LevelUpNotificationModal } from './LevelUpNotificationModal';

export function LiveLevelUpNotification() {
  const { notification, dismissNotification } = useLevelUpNotifications();

  if (!notification) return null;

  return (
    <LevelUpNotificationModal
      isOpen={true}
      onClose={dismissNotification}
      oldLevel={notification.oldLevel}
      newLevel={notification.newLevel}
      casesEarned={notification.casesEarned}
      borderTierChanged={notification.borderTierChanged}
    />
  );
}