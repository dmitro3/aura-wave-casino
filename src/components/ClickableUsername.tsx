import { useState } from 'react';
import { Button } from '@/components/ui/button';
import UserProfile from './UserProfile';

interface ClickableUsernameProps {
  username: string;
  className?: string;
  children?: React.ReactNode;
}

export default function ClickableUsername({ username, className = "", children }: ClickableUsernameProps) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={`h-auto p-0 text-inherit font-inherit hover:text-primary transition-colors ${className}`}
        onClick={() => setShowProfile(true)}
      >
        {children || username}
      </Button>
      
      <UserProfile
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        username={username}
      />
    </>
  );
}