import GameLayout from '@/components/GameLayout';
import { TowerGame } from '@/components/TowerGame';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function Tower() {
  const { user } = useAuth();
  const { userData, updateUserProfile } = useUserProfile();

  return (
    <GameLayout title="Tower - Mystic Quest Adventure">
      <div className="max-w-6xl mx-auto">
        {user && userData ? (
          <TowerGame userData={userData} onUpdateUser={updateUserProfile} />
        ) : (
          <TowerGame userData={null} onUpdateUser={() => {}} />
        )}
      </div>
    </GameLayout>
  );
}