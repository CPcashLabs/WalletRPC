
export type ThemeColor = 'ocean' | 'sunset' | 'forest' | 'lavender';

export const THEMES: Record<ThemeColor, { gradient: string, accent: string, orb: string }> = {
  ocean: {
    gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
    accent: 'text-blue-600',
    orb: 'bg-cyan-400'
  },
  sunset: {
    gradient: 'from-amber-300 via-orange-400 to-rose-500',
    accent: 'text-orange-600',
    orb: 'bg-amber-300'
  },
  forest: {
    gradient: 'from-emerald-300 via-green-500 to-teal-600',
    accent: 'text-emerald-600',
    orb: 'bg-emerald-300'
  },
  lavender: {
    gradient: 'from-purple-300 via-violet-500 to-indigo-600',
    accent: 'text-violet-600',
    orb: 'bg-purple-300'
  }
};
