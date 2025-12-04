
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  repoUrl: string; // URL to the git repo
  iconName: string; // Lucide icon name
  category: 'Analysis' | 'Visualization' | 'Utility';
}

export interface InstalledPlugin extends PluginManifest {
  installedAt: number;
}

export enum ImageSize {
  Size1K = '1K',
  Size2K = '2K',
  Size4K = '4K'
}

export enum AspectRatio {
  Square = '1:1',
  Landscape = '16:9',
  Portrait = '9:16',
  Standard = '4:3',
  Wide = '3:4'
}

export interface DeepAnalysisConfig {
  thinkingBudget: number;
}
