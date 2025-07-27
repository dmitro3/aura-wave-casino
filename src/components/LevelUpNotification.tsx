import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Coins, Sparkles, X } from 'lucide-react';
import { LevelBadge } from './LevelBadge';

interface LevelUpNotificationProps {
  newLevel: number;
  bonusEarned: number;
  onClose: () => void;
}

export const LevelUpNotification = ({ newLevel, bonusEarned, onClose }: LevelUpNotificationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`
      fixed inset-0 z-50 flex items-center justify-center p-4
      bg-black/50 backdrop-blur-sm transition-opacity duration-300
      ${show ? 'opacity-100' : 'opacity-0'}
    `}>
      <Card className={`
        relative max-w-md w-full 
        bg-gradient-to-br from-purple-900/90 to-blue-900/90 
        border-2 border-yellow-400/50 shadow-2xl
        transform transition-all duration-500
        ${show ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
      `}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-white/70 hover:text-white"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </Button>

        <CardContent className="p-8 text-center space-y-6">
          {/* Celebration Icons */}
          <div className="relative">
            <div className="text-6xl animate-bounce">
              🎉
            </div>
            <div className="absolute -top-2 -right-2 text-4xl animate-spin-slow">
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="absolute -bottom-2 -left-2 text-4xl animate-pulse">
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          {/* Level Up Text */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white animate-pulse">
              LEVEL UP!
            </h2>
            <p className="text-white/80">
              Congratulations! You've reached
            </p>
            <div className="flex justify-center">
              <LevelBadge level={newLevel} size="lg" />
            </div>
          </div>

          {/* Bonus Section */}
          {bonusEarned > 0 && (
            <div className="space-y-3 p-4 rounded-lg bg-green-500/20 border border-green-400/30">
              <div className="flex items-center justify-center gap-2 text-green-400">
                <Coins className="w-5 h-5" />
                <span className="font-semibold">Level Bonus Earned!</span>
              </div>
              <div className="text-3xl font-bold text-green-300">
                +${bonusEarned.toFixed(2)}
              </div>
              <p className="text-sm text-green-200/80">
                Added to your balance
              </p>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold hover:shadow-lg hover:shadow-yellow-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
          >
            Continue Playing
          </Button>
        </CardContent>
      </Card>

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={`
              absolute w-2 h-2 bg-yellow-400 rounded-full
              animate-float-particle opacity-70
            `}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};