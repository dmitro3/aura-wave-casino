import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BorderTier {
  tier: number;
  min_level: number;
  max_level: number;
  name: string;
  description: string;
  css_classes: string;
  animation_type: string | null;
}

interface ProfileBorderProps {
  level: number;
  borderTier?: number;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const ProfileBorder = ({ level, borderTier, children, size = 'md' }: ProfileBorderProps) => {
  const [borderData, setBorderData] = useState<BorderTier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBorderData = async () => {
      try {
        const { data, error } = await supabase
          .from('border_tiers')
          .select('*')
          .lte('min_level', level)
          .gte('max_level', level)
          .single();

        if (error) throw error;
        setBorderData(data);
      } catch (error) {
        console.error('Error fetching border data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBorderData();
  }, [level]);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const getAnimationClass = (animationType: string | null) => {
    switch (animationType) {
      case 'shimmer':
        return 'animate-pulse';
      case 'glow':
        return 'animate-pulse';
      case 'flame':
        return 'animate-pulse';
      case 'crystal':
        return 'animate-pulse';
      case 'ice':
        return 'animate-pulse';
      case 'fire':
        return 'animate-pulse';
      case 'storm':
        return 'animate-pulse';
      case 'radiance':
        return 'animate-pulse';
      case 'shadow':
        return 'animate-pulse';
      case 'elite':
        return 'animate-pulse';
      case 'force':
        return 'animate-pulse';
      case 'light':
        return 'animate-pulse';
      case 'power':
        return 'animate-pulse';
      case 'void':
        return 'animate-pulse';
      case 'astral':
        return 'animate-pulse';
      case 'phoenix':
        return 'animate-pulse';
      case 'dragon':
        return 'animate-pulse';
      case 'arcane':
        return 'animate-pulse';
      case 'celestial':
        return 'animate-pulse';
      case 'infernal':
        return 'animate-pulse';
      case 'cosmic':
        return 'animate-pulse';
      case 'temporal':
        return 'animate-pulse';
      case 'reality':
        return 'animate-pulse';
      case 'dimensional':
        return 'animate-pulse';
      case 'quantum':
        return 'animate-pulse';
      case 'ethereal':
        return 'animate-pulse';
      case 'primordial':
        return 'animate-pulse';
      case 'universal':
        return 'animate-pulse';
      case 'omega':
        return 'animate-pulse';
      case 'alpha':
        return 'animate-pulse';
      case 'nexus':
        return 'animate-pulse';
      case 'transcendent':
        return 'animate-pulse';
      case 'omnipotent':
        return 'animate-pulse';
      case 'titan':
        return 'animate-pulse';
      case 'emperor':
        return 'animate-pulse';
      case 'sovereign':
        return 'animate-pulse';
      case 'godlike':
        return 'animate-pulse';
      case 'supreme':
        return 'animate-pulse';
      case 'celestial-ultimate':
        return 'animate-pulse';
      default:
        return '';
    }
  };

  if (loading || !borderData) {
    return (
      <div className={`${sizeClasses[size]} rounded-full border-2 border-amber-600 overflow-hidden`}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        overflow-hidden 
        ${borderData.css_classes} 
        ${getAnimationClass(borderData.animation_type)}
        relative
      `}
      title={`${borderData.name} - ${borderData.description}`}
    >
      {children}
      {borderData.animation_type === 'celestial-ultimate' && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 opacity-50 animate-spin" 
             style={{ animationDuration: '3s' }}
        />
      )}
    </div>
  );
};