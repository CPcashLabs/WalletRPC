
import React, { useState } from 'react';
import { Image as ImageIcon, Sparkles, Download, Settings2, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { generateVisualAsset } from '../services/geminiService';
import { ImageSize, AspectRatio } from '../types';

const VisualSynthesizer: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [size, setSize] = useState<ImageSize>(ImageSize.Size1K);
  const [aspect, setAspect] = useState<AspectRatio>(AspectRatio.Square);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageUrl = await generateVisualAsset(prompt, size, aspect);
      setGeneratedImage(imageUrl);
    } catch (err: any) {
      setError(err.message || "Failed to generate image. Try adjusting your prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `generated-asset-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      {/* Control Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-pink-100 rounded-lg">
              <ImageIcon className="w-6 h-6 text-pink-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Visual Synthesizer</h2>
              <p className="text-slate-500 text-sm">Powered by Gemini 3 Pro Image</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prompt</label>
              <textarea
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[120px]"
                placeholder="A futuristic data center in a rainforest, highly detailed, 8k..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <Settings2 className="w-3 h-3 mr-1" /> Size
                </label>
                <select 
                  value={size} 
                  onChange={(e) => setSize(e.target.value as ImageSize)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value={ImageSize.Size1K}>1K (Standard)</option>
                  <option value={ImageSize.Size2K}>2K (High Res)</option>
                  <option value={ImageSize.Size4K}>4K (Ultra Res)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
                  <Settings2 className="w-3 h-3 mr-1" /> Aspect Ratio
                </label>
                <select 
                  value={aspect} 
                  onChange={(e) => setAspect(e.target.value as AspectRatio)}
                  className="w-full p-2 border border-slate-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value={AspectRatio.Square}>Square (1:1)</option>
                  <option value={AspectRatio.Landscape}>Landscape (16:9)</option>
                  <option value={AspectRatio.Portrait}>Portrait (9:16)</option>
                  <option value={AspectRatio.Standard}>Standard (4:3)</option>
                </select>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              isLoading={isGenerating}
              disabled={!prompt}
              className="w-full bg-pink-600 hover:bg-pink-700 focus:ring-pink-500"
              icon={<Sparkles className="w-4 h-4" />}
            >
              {isGenerating ? 'Synthesizing...' : 'Generate Asset'}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Output Preview</h3>
            {generatedImage && (
              <Button variant="outline" onClick={handleDownload} icon={<Download className="w-4 h-4" />}>
                Download Asset
              </Button>
            )}
          </div>
          
          <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 border-dashed flex items-center justify-center relative overflow-hidden min-h-[400px]">
            {generatedImage ? (
              <img 
                src={generatedImage} 
                alt="Generated asset" 
                className="max-w-full max-h-full object-contain shadow-lg"
              />
            ) : (
              <div className="text-center text-slate-400">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Generated visual assets will appear here.</p>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
                  <p className="text-pink-600 font-medium animate-pulse">Rendering Pixel Data...</p>
                </div>
              </div>
            )}
          </div>
          
          {error && (
             <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center animate-in slide-in-from-bottom-2">
               <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
               <span className="text-sm font-medium">{error}</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualSynthesizer;
