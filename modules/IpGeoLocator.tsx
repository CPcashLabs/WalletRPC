
import React, { useState } from 'react';
import { Globe, Download, Play, FileCheck, Server, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { analyzeIpCsvLocal } from '../services/ipGeoService';

const IpGeoLocator: React.FC = () => {
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultCsv, setResultCsv] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!csvContent) return;
    
    setIsProcessing(true);
    setError(null);
    setResultCsv(null);
    setAnalysisReport(null);

    try {
      const { csv, report } = await analyzeIpCsvLocal(csvContent);
      setResultCsv(csv);
      setAnalysisReport(report);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to process CSV. Please ensure it has an 'IP' column.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultCsv) return;
    const blob = new Blob([resultCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enriched_${fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Helper to preview top 5 lines
  const getPreviewLines = (csv: string) => {
    return csv.split('\n').slice(0, 5).join('\n');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-emerald-100 rounded-lg">
            <Globe className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Local IP Geo-Locator</h2>
            <p className="text-slate-500 text-sm">Offline-capable, high-speed IP resolution using local ip2region database.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            {fileName ? (
              <div className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                <div className="flex items-center">
                  <FileCheck className="w-5 h-5 text-emerald-600 mr-2" />
                  <span className="text-sm text-slate-600 font-medium truncate">{fileName}</span>
                </div>
                <button 
                  onClick={() => { setFileName(''); setCsvContent(''); setResultCsv(null); setAnalysisReport(null); }} 
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Change File
                </button>
              </div>
            ) : (
              <FileUpload 
                label="Upload CSV with IP Addresses"
                accept=".csv"
                onFileSelect={(content, name) => { setCsvContent(content); setFileName(name); }} 
              />
            )}
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={handleProcess} 
              isLoading={isProcessing}
              disabled={!csvContent}
              className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              icon={<Play className="w-4 h-4" />}
            >
              {isProcessing ? 'Processing Locally...' : 'Start Local Analysis'}
            </Button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {(resultCsv || analysisReport) && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          
          {/* Analysis Report Card */}
          {analysisReport && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center mb-4 pb-2 border-b border-slate-100">
                 <Server className="w-5 h-5 text-indigo-600 mr-2" />
                 <h3 className="text-lg font-bold text-slate-900">Local DB Statistics</h3>
              </div>
              <div className="prose prose-sm prose-emerald max-w-none text-slate-700">
                <ReactMarkdown>{analysisReport}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* CSV Preview Card */}
          {resultCsv && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-emerald-600 mr-2" />
                  <h3 className="text-lg font-bold text-slate-900">Enriched Data Preview</h3>
                </div>
                <Button 
                  variant="primary" 
                  onClick={handleDownload} 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  icon={<Download className="w-4 h-4" />}
                >
                  Download Full CSV
                </Button>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Preview (First 5 Rows)</h4>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto shadow-inner">
                  <pre className="text-xs text-emerald-400 font-mono whitespace-pre">{getPreviewLines(resultCsv)}</pre>
                </div>
                <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
                  <span>Columns added: Country, City, ISP</span>
                  <span>Total rows: {resultCsv.split('\n').filter(l => l.trim()).length - 1}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default IpGeoLocator;
