
import React, { useState } from 'react';
import { BrainCircuit, FileText, Play, Download, AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { runDeepAnalysis } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

const DeepThinkAnalyst: React.FC = () => {
  const [dataContext, setDataContext] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    if (!query) return;
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await runDeepAnalysis(dataContext || "No specific file uploaded. Use general knowledge.", query);
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Failed to generate analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deep_analysis_report.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <BrainCircuit className="w-6 h-6 text-indigo-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Deep Reasoning Analyst</h2>
            <p className="text-slate-500 text-sm">Uses Gemini 3 Pro with extended thinking capabilities for complex problem solving.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Data Source
            </h3>
            {fileName ? (
              <div className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                <span className="text-sm text-slate-600 font-medium truncate">{fileName}</span>
                <button onClick={() => { setFileName(''); setDataContext(''); }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            ) : (
              <FileUpload onFileSelect={(content, name) => { setDataContext(content); setFileName(name); }} />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Analysis Objective</label>
            <textarea
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[120px]"
              placeholder="Describe what you want to analyze or discover in the data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={handleRunAnalysis} 
              isLoading={isAnalyzing}
              disabled={!query}
              icon={<Play className="w-4 h-4" />}
            >
              {isAnalyzing ? 'Reasoning...' : 'Run Deep Analysis'}
            </Button>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">Analysis Report</h3>
            <Button variant="outline" onClick={downloadReport} icon={<Download className="w-4 h-4" />}>
              Download Report
            </Button>
          </div>
          <div className="prose prose-indigo max-w-none text-slate-700">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepThinkAnalyst;
