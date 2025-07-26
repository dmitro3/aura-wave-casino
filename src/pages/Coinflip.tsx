import GameLayout from '@/components/GameLayout';
import CoinflipGame from '@/components/CoinflipGame';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function Coinflip() {
  const { user } = useAuth();
  const { userData, updateUserProfile } = useUserProfile();

  return (
    <GameLayout title="Coinflip - Streak Multiplier Game">
      <div className="max-w-4xl mx-auto">
        {user && userData ? (
          <CoinflipGame userData={userData} onUpdateUser={updateUserProfile} />
        ) : (
          <CoinflipGame userData={null} onUpdateUser={() => {}} />
        )}
      </div>
    </GameLayout>
  );
}