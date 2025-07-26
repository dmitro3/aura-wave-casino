import GameLayout from '@/components/GameLayout';
import { RouletteGame } from '@/components/RouletteGame';

export default function Roulette() {
  return (
    <GameLayout title="Roulette - The Classic Casino Game">
      <RouletteGame />
    </GameLayout>
  );
}