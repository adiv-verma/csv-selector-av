"use client";

import { useState, useRef } from 'react';
import { Upload, Play, Loader2, CheckCircle, XCircle, AlertCircle, FileText, Star, ChevronDown, ChevronUp } from 'lucide-react';

// --- TYPES ---
interface SkillConfig {
  id: string;
  name: string;
  weight: number;
}

interface AnalysisResult {
  fileName: string;
  candidateName: string;
  yearsOfExperience: string;
  matchScore: number;
  decision: "RECOMMENDED" | "CONSIDER" | "REJECT";
  summary: string;
  skills: {
    name: string;
    weight?: string; // Sometimes the AI might return this
    evidence: string;
    proficiency: number;
    score: number;
  }[];
}

export default function Home() {
  // --- STATE ---
  const [skills, setSkills] = useState<SkillConfig[]>([
    { id: '1', name: 'Wireless Networks (5G, 4G, LTE)', weight: 5 },
    { id: '2', name: 'Fixed Networks (Fiber)', weight: 3 },
    { id: '3', name: 'OSS or Service Assurance', weight: 4 },
    { id: '4', name: 'Consulting or MBA', weight: 2 },
  ]);

  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [currentFileProcessing, setCurrentFileProcessing] = useState<string>("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]); // To show errors if any
  
  // Toggle for detail view (optional, defaults to open)
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- HANDLERS ---
  const handleWeightChange = (id: string, newWeight: number) => {
    setSkills(skills.map(s => s.id === id ? { ...s, weight: newWeight } : s));
  };

  const handleSkillNameChange = (id: string, newName: string) => {
    setSkills(skills.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setResults([]); 
      setLogs([]);
      setProcessedCount(0);
    }
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProcessedCount(0);
    setResults([]);
    setLogs([]);
    
    // Process files one by one
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileProcessing(file.name);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('skills', JSON.stringify(skills));

      try {
        const res = await fetch('/api/analyze', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (res.ok) {
          const resultWithFile = { ...data, fileName: file.name };
          setResults(prev => [...prev, resultWithFile]);
        } else {
          setLogs(prev => [...prev, `Error with ${file.name}: ${data.error}`]);
        }
      } catch (err: any) {
        setLogs(prev => [...prev, `Failed to process ${file.name}: ${err.message}`]);
      }
      
      setProcessedCount(prev => prev + 1);
    }

    setIsProcessing(false);
    setCurrentFileProcessing("");
  };

  // --- STATS CALCULATION ---
  const recommended = results.filter(r => r.decision === 'RECOMMENDED').length;
  const consider = results.filter(r => r.decision === 'CONSIDER').length;
  const reject = results.filter(r => r.decision === 'REJECT').length;
  
  const topTalent = results.length > 0 
    ? results.reduce((prev, current) => (prev.matchScore > current.matchScore) ? prev : current)
    : null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <FileText className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">CV Screening Agent</h1>
        </div>
        <div className="text-sm text-gray-500">Powered by AWS Bedrock</div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* 1. CONFIGURATION */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">1. Define Skills & Importance</h2>
            <span className="text-xs text-gray-400">Scale: 1 (Optional) to 5 (Critical)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {skills.map((skill) => (
              <div key={skill.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <input 
                  type="text" 
                  value={skill.name}
                  onChange={(e) => handleSkillNameChange(skill.id, e.target.value)}
                  className="bg-transparent border-none font-semibold text-gray-800 w-full focus:ring-0 p-0 mb-3"
                />
                <div className="flex items-center gap-4">
                  <input 
                    type="range" min="1" max="5" 
                    value={skill.weight}
                    onChange={(e) => handleWeightChange(skill.id, parseInt(e.target.value))}
                    className="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-bold text-blue-600 w-6">{skill.weight}/5</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. UPLOAD */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
          <input 
            type="file" multiple accept=".pdf" 
            ref={fileInputRef} onChange={handleFileChange} className="hidden" 
          />
          <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Upload className="text-blue-600 w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              {files.length > 0 ? `${files.length} Files Selected` : "Upload CV Folder"}
            </h3>
            <p className="text-gray-500 mt-1">Drag and drop PDF files here</p>
          </div>
        </section>

        {/* STATUS BAR */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">Status</span>
            <span className="text-lg font-bold text-gray-900">
              {isProcessing 
                ? `Processing: ${currentFileProcessing}` 
                : results.length > 0 
                  ? "Analysis Completed" 
                  : "Ready to Start"}
            </span>
          </div>
          <button 
            onClick={startAnalysis}
            disabled={isProcessing || files.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <Play className="fill-current w-4 h-4" />}
            Start Analysis
          </button>
        </div>

        {/* ERROR LOGS */}
        {logs.length > 0 && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="text-red-800 font-bold mb-2">Processing Errors:</h4>
            <ul className="list-disc list-inside text-red-600 text-sm">
              {logs.map((log, i) => <li key={i}>{log}</li>)}
            </ul>
          </div>
        )}

        {/* ---------------- RESULTS SECTION ---------------- */}
        {results.length > 0 && (
          <>
            {/* STATS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-3xl font-bold text-gray-900">{files.length}</div>
                <div className="text-xs font-bold text-gray-400 uppercase mt-1">Total</div>
              </div>
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                <div className="text-3xl font-bold text-blue-600">{results.length}</div>
                <div className="text-xs font-bold text-blue-400 uppercase mt-1">Processed</div>
              </div>
              <div className="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm">
                <div className="text-3xl font-bold text-green-600">{recommended}</div>
                <div className="text-xs font-bold text-green-400 uppercase mt-1">Recommended</div>
              </div>
              <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-100 shadow-sm">
                <div className="text-3xl
