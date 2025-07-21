import { useState } from 'react';
import { Button } from '@/components/ui/button';
import UserStatsModal from './UserStatsModal';

interface ClickableUsernameProps {
  username: string;
  className?: string;
  children?: React.ReactNode;
}

export default function ClickableUsername({ username, className = "", children }: ClickableUsernameProps) {
  const [showStatsModal, setShowStatsModal] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`h-auto p-0 text-inherit font-inherit hover:text-primary transition-colors ${className}`}
        onClick={() => setShowStatsModal(true)}
      >
        {children || username}
      </Button>
      
      <UserStatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        username={username}
      />
    </>
  );
}