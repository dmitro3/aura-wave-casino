import { useMemo } from 'react';

interface ProfileBorderProps {
  level: number;
  borderTier?: number;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const getBorderTier = (level: number) => {
  if (level >= 100) return 6; // DIAMOND
  if (level >= 75) return 5;  // PLATINUM
  if (level >= 50) return 4;  // GOLD
  if (level >= 25) return 3;  // SILVER
  if (level >= 10) return 2;  // BRONZE
  return 1; // BASIC
};

const getBorderDesign = (tier: number, size: string) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  const baseClasses = `${sizeClasses[size]} rounded-full overflow-hidden relative`;

  switch (tier) {
    case 1: // BASIC (Level 1-9)
      return {
        name: 'BASIC',
        container: `${baseClasses} border-2 border-slate-400`,
        inner: '',
        animation: '',
        description: 'Basic border for new players'
      };

    case 2: // BRONZE (Level 10-24)
      return {
        name: 'BRONZE',
        container: `${baseClasses} border-2 border-amber-600 shadow-md shadow-amber-600/30`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-amber-700/20"></div>
          <div class="absolute inset-0 rounded-full border border-amber-500/40"></div>
        `,
        animation: '',
        description: 'Bronze border with warm glow'
      };

    case 3: // SILVER (Level 25-49) 
      return {
        name: 'SILVER',
        container: `${baseClasses} border-2 border-slate-300 shadow-lg shadow-slate-300/40`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200/20 via-gray-300/15 to-slate-400/20"></div>
          <div class="absolute inset-0 rounded-full border border-slate-200/50 animate-pulse"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-spin" style="animation-duration: 3s;"></div>
        `,
        animation: 'shimmer',
        description: 'Silver border with elegant shimmer'
      };

    case 4: // GOLD (Level 50-74)
      return {
        name: 'GOLD',
        container: `${baseClasses} border-2 border-yellow-400 shadow-xl shadow-yellow-400/50`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300/25 via-amber-400/20 to-yellow-600/25"></div>
          <div class="absolute inset-0 rounded-full border border-yellow-300/60 animate-pulse"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent animate-spin" style="animation-duration: 2s;"></div>
          <div class="absolute inset-[-1px] rounded-full bg-gradient-to-r from-yellow-400/0 via-yellow-300/40 to-yellow-400/0 animate-ping" style="animation-duration: 2s;"></div>
        `,
        animation: 'golden-glow',
        description: 'Gold border with radiant shine'
      };

    case 5: // PLATINUM (Level 75-99)
      return {
        name: 'PLATINUM',
        container: `${baseClasses} border-2 border-slate-100 shadow-2xl shadow-slate-100/60`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-slate-100/30 via-gray-200/25 to-slate-300/30"></div>
          <div class="absolute inset-0 rounded-full border border-slate-50/70 animate-pulse"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-spin" style="animation-duration: 1.5s;"></div>
          <div class="absolute inset-[-1px] rounded-full bg-gradient-to-r from-slate-100/0 via-white/60 to-slate-100/0 animate-ping" style="animation-duration: 1.5s;"></div>
          <div class="absolute inset-[-2px] rounded-full bg-gradient-to-r from-transparent via-slate-200/30 to-transparent animate-pulse" style="animation-duration: 1s;"></div>
        `,
        animation: 'platinum-radiance',
        description: 'Platinum border with pristine radiance'
      };

    case 6: // DIAMOND (Level 100+)
      return {
        name: 'DIAMOND', 
        container: `${baseClasses} border-3 border-cyan-300 shadow-2xl shadow-cyan-300/80`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-200/40 via-blue-300/30 to-purple-300/40"></div>
          <div class="absolute inset-0 rounded-full border border-cyan-200/80 animate-pulse"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-300/0 via-cyan-100/50 to-cyan-300/0 animate-spin" style="animation-duration: 1s;"></div>
          <div class="absolute inset-[-1px] rounded-full bg-gradient-to-r from-cyan-300/0 via-white/70 to-cyan-300/0 animate-ping" style="animation-duration: 1s;"></div>
          <div class="absolute inset-[-2px] rounded-full bg-gradient-to-r from-purple-300/0 via-cyan-200/40 to-blue-300/0 animate-pulse" style="animation-duration: 0.8s;"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-to-45 from-transparent via-rainbow-200/20 to-transparent animate-spin" style="animation-duration: 0.5s;"></div>
        `,
        animation: 'diamond-brilliance',
        description: 'Diamond border with brilliant rainbow refraction'
      };

    default:
      return {
        name: 'BASIC',
        container: `${baseClasses} border-2 border-slate-400`,
        inner: '',
        animation: '',
        description: 'Default border'
      };
  }
};

export const ProfileBorder = ({ level, borderTier, children, size = 'md' }: ProfileBorderProps) => {
  const tier = borderTier || getBorderTier(level);
  const borderDesign = useMemo(() => getBorderDesign(tier, size), [tier, size]);

  return (
    <div 
      className={borderDesign.container}
      title={`${borderDesign.name} - ${borderDesign.description}`}
    >
      {/* Render inner effects */}
      {borderDesign.inner && (
        <div 
          dangerouslySetInnerHTML={{ __html: borderDesign.inner }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};