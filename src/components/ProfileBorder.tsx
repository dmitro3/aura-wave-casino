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
    case 1: // BASIC (Level 1-9) - Simple clean look
      return {
        name: 'BASIC',
        container: `${baseClasses} border-2 border-slate-500/80 bg-slate-900/20`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-slate-600/20 to-slate-700/30"></div>
          <div class="absolute inset-1 rounded-full border border-slate-400/30"></div>
        `,
        description: 'Basic tier for new players'
      };

    case 2: // BRONZE (Level 10-24) - Warm copper tones
      return {
        name: 'BRONZE',
        container: `${baseClasses} border-[3px] border-amber-700 bg-amber-950/30 shadow-lg shadow-amber-900/40`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/15 via-orange-600/20 to-amber-800/25"></div>
          <div class="absolute inset-1 rounded-full border border-amber-600/50"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-amber-400/10 to-orange-500/15"></div>
          <div class="absolute top-1 left-1 w-2 h-2 rounded-full bg-amber-400/60 blur-[1px]"></div>
          <div class="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-orange-300/70"></div>
        `,
        description: 'Bronze tier with warm metallic finish'
      };

    case 3: // SILVER (Level 25-49) - Sleek metallic
      return {
        name: 'SILVER',
        container: `${baseClasses} border-[3px] border-slate-300 bg-slate-800/40 shadow-xl shadow-slate-400/30`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200/20 via-gray-300/25 to-slate-500/20"></div>
          <div class="absolute inset-1 rounded-full border border-slate-200/60"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-white/10 to-slate-300/15"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-conic from-slate-400/0 via-white/20 to-slate-400/0"></div>
          <div class="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-white/80 blur-[0.5px]"></div>
          <div class="absolute bottom-1 left-2 w-1 h-1 rounded-full bg-slate-200/90"></div>
        `,
        description: 'Silver tier with polished chrome finish'
      };

    case 4: // GOLD (Level 50-74) - Rich golden elegance
      return {
        name: 'GOLD',
        container: `${baseClasses} border-[4px] border-yellow-400 bg-yellow-950/40 shadow-2xl shadow-yellow-500/40`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300/25 via-amber-400/30 to-yellow-600/25"></div>
          <div class="absolute inset-1 rounded-full border-2 border-yellow-300/70"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-yellow-200/15 to-amber-300/20"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-conic from-yellow-500/0 via-yellow-200/30 to-yellow-500/0"></div>
          <div class="absolute inset-3 rounded-full border border-yellow-200/40"></div>
          <div class="absolute top-1 left-2 w-2 h-2 rounded-full bg-yellow-200/90 blur-[1px]"></div>
          <div class="absolute bottom-2 right-1 w-1.5 h-1.5 rounded-full bg-amber-300/80"></div>
          <div class="absolute top-3 right-3 w-1 h-1 rounded-full bg-yellow-100/90"></div>
        `,
        description: 'Gold tier with luxurious golden radiance'
      };

    case 5: // PLATINUM (Level 75-99) - Premium metallic
      return {
        name: 'PLATINUM',
        container: `${baseClasses} border-[4px] border-slate-100 bg-slate-900/50 shadow-2xl shadow-slate-200/50 ring-1 ring-white/20`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-slate-100/30 via-gray-200/35 to-slate-300/30"></div>
          <div class="absolute inset-1 rounded-full border-2 border-slate-50/80"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-white/15 to-slate-200/20"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-conic from-slate-200/0 via-white/40 to-slate-200/0"></div>
          <div class="absolute inset-3 rounded-full border border-white/50"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-radial from-white/10 via-transparent to-slate-300/10"></div>
          <div class="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-white/90 blur-[1px]"></div>
          <div class="absolute bottom-1 right-2 w-1.5 h-1.5 rounded-full bg-slate-100/90"></div>
          <div class="absolute top-2 right-1 w-1 h-1 rounded-full bg-white/95"></div>
          <div class="absolute bottom-3 left-3 w-1 h-1 rounded-full bg-slate-50/80"></div>
        `,
        description: 'Platinum tier with pristine metallic brilliance'
      };

    case 6: // DIAMOND (Level 100+) - Ultimate prestige
      return {
        name: 'DIAMOND', 
        container: `${baseClasses} border-[5px] border-cyan-300 bg-slate-900/60 shadow-2xl shadow-cyan-400/60 ring-2 ring-cyan-200/30`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-200/40 via-blue-300/35 to-purple-300/40"></div>
          <div class="absolute inset-1 rounded-full border-2 border-cyan-200/90"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-cyan-100/20 to-blue-200/25"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-conic from-cyan-300/0 via-cyan-100/50 to-purple-300/20"></div>
          <div class="absolute inset-3 rounded-full border border-cyan-100/60"></div>
          <div class="absolute inset-0 rounded-full bg-gradient-radial from-white/15 via-cyan-200/10 to-blue-300/15"></div>
          <div class="absolute inset-1 rounded-full bg-gradient-conic from-purple-300/0 via-cyan-200/20 to-blue-400/0"></div>
          <div class="absolute top-1 left-1 w-3 h-3 rounded-full bg-cyan-100/95 blur-[1.5px]"></div>
          <div class="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-blue-200/90 blur-[1px]"></div>
          <div class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/95"></div>
          <div class="absolute bottom-3 left-2 w-1 h-1 rounded-full bg-cyan-200/90"></div>
          <div class="absolute top-3 left-3 w-1 h-1 rounded-full bg-purple-200/80"></div>
          <div class="absolute bottom-2 right-3 w-1 h-1 rounded-full bg-blue-100/85"></div>
        `,
        description: 'Diamond tier with crystalline multi-faceted brilliance'
      };

    default:
      return {
        name: 'BASIC',
        container: `${baseClasses} border-2 border-slate-500/80 bg-slate-900/20`,
        inner: `<div class="absolute inset-0 rounded-full bg-gradient-to-br from-slate-600/20 to-slate-700/30"></div>`,
        description: 'Default tier'
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