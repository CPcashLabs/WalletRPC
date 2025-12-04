
import React from 'react';
import { 
  BrainCircuit, 
  Image as ImageIcon, 
  Globe, 
  Box, 
  Activity, 
  Zap,
  LayoutGrid,
  Wallet,
  Key,
  Shield,
  PiggyBank
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  'brain-circuit': BrainCircuit,
  'image': ImageIcon,
  'globe': Globe,
  'box': Box,
  'activity': Activity,
  'zap': Zap,
  'layout-grid': LayoutGrid,
  'wallet': Wallet,
  'key': Key,
  'safe': Shield,
  'piggy-bank': PiggyBank
};

export const DynamicIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => {
  const IconComponent = ICON_MAP[name] || Box;
  return <IconComponent className={className} />;
};
