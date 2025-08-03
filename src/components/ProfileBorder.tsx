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
    case 1: // BASIC (Level 1-9) - Grayish
      return {
        name: 'BASIC',
        container: `${baseClasses} border-[3px] border-gray-500 bg-gray-900/30 shadow-lg shadow-gray-600/30`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-gray-400/20 via-gray-500/25 to-gray-600/20"></div>
          <div class="absolute inset-1 rounded-full border border-gray-400/50"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-gray-300/10 to-gray-500/15"></div>
          <div class="absolute top-1 left-1 w-2 h-2 rounded-full bg-gray-300/60 blur-[1px]"></div>
          <div class="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-gray-400/70"></div>
        `,
        description: 'Basic tier with grayish finish'
      };

    case 2: // BRONZE (Level 10-24) - Bronze color
      return {
        name: 'BRONZE',
        container: `${baseClasses} border-[3px] border-amber-700 bg-amber-950/30 shadow-lg shadow-amber-900/40`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500/20 via-orange-600/25 to-amber-800/20"></div>
          <div class="absolute inset-1 rounded-full border border-amber-600/50"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-amber-400/10 to-orange-500/15"></div>
          <div class="absolute top-1 left-1 w-2 h-2 rounded-full bg-amber-400/60 blur-[1px]"></div>
          <div class="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-orange-300/70"></div>
        `,
        description: 'Bronze tier with bronze metallic finish'
      };

    case 3: // SILVER (Level 25-49) - Silver color
      return {
        name: 'SILVER',
        container: `${baseClasses} border-[3px] border-slate-300 bg-slate-800/30 shadow-lg shadow-slate-400/40`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-slate-200/20 via-gray-300/25 to-slate-400/20"></div>
          <div class="absolute inset-1 rounded-full border border-slate-200/50"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-white/10 to-slate-300/15"></div>
          <div class="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/60 blur-[1px]"></div>
          <div class="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-slate-200/70"></div>
        `,
        description: 'Silver tier with polished silver finish'
      };

    case 4: // GOLD (Level 50-74) - Gold color
      return {
        name: 'GOLD',
        container: `${baseClasses} border-[3px] border-yellow-400 bg-yellow-950/30 shadow-lg shadow-yellow-500/40`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-300/20 via-amber-400/25 to-yellow-600/20"></div>
          <div class="absolute inset-1 rounded-full border border-yellow-300/50"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-yellow-200/10 to-amber-300/15"></div>
          <div class="absolute top-1 left-1 w-2 h-2 rounded-full bg-yellow-200/60 blur-[1px]"></div>
          <div class="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-amber-300/70"></div>
        `,
        description: 'Gold tier with luxurious golden finish'
      };

    case 5: // PLATINUM (Level 75-99) - Platinum color  
      return {
        name: 'PLATINUM',
        container: `${baseClasses} border-[3px] border-slate-100 bg-slate-900/30 shadow-lg shadow-slate-200/40`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-slate-100/20 via-gray-200/25 to-slate-300/20"></div>
          <div class="absolute inset-1 rounded-full border border-slate-50/50"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-white/10 to-slate-200/15"></div>
          <div class="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/60 blur-[1px]"></div>
          <div class="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-slate-100/70"></div>
        `,
        description: 'Platinum tier with pristine platinum finish'
      };

    case 6: // DIAMOND (Level 100+) - Diamond color
      return {
        name: 'DIAMOND', 
        container: `${baseClasses} border-[3px] border-cyan-300 bg-slate-900/30 shadow-lg shadow-cyan-400/40`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-200/20 via-blue-300/25 to-purple-300/20"></div>
          <div class="absolute inset-1 rounded-full border border-cyan-200/50"></div>
          <div class="absolute inset-2 rounded-full bg-gradient-to-tr from-cyan-100/10 to-blue-200/15"></div>
          <div class="absolute top-1 left-1 w-2 h-2 rounded-full bg-cyan-100/60 blur-[1px]"></div>
          <div class="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-blue-200/70"></div>
        `,
        description: 'Diamond tier with crystalline diamond finish'
      };

    default:
      return {
        name: 'BASIC',
        container: `${baseClasses} border-[3px] border-gray-500 bg-gray-900/30 shadow-lg shadow-gray-600/30`,
        inner: `
          <div class="absolute inset-0 rounded-full bg-gradient-to-br from-gray-400/20 via-gray-500/25 to-gray-600/20"></div>
          <div class="absolute inset-1 rounded-full border border-gray-400/50"></div>
        `,
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