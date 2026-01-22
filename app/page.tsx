"use client";

import { useState, useRef } from 'react';
import { Upload, Play, Loader2, FileText, Star } from 'lucide-react';

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
    weight?: string;
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
  const [logs, setLogs] = useState<string[]>([]);
  
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
                <div className="text-3xl font-bold text-yellow-600">{consider}</div>
                <div className="text-xs font-bold text-yellow-400 uppercase mt-1">Consider</div>
              </div>
              <div className="bg-red-50 p-5 rounded-xl border border-red-100 shadow-sm">
                <div className="text-3xl font-bold text-red-600">{reject}</div>
                <div className="text-xs font-bold text-red-400 uppercase mt-1">Reject</div>
              </div>
            </div>

            {/* TOP TALENT SPOTLIGHT */}
            {topTalent && (
              <div className="bg-gray-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-blue-600 w-64 h-64 rounded-full filter blur-3xl opacity-20 -mr-20 -mt-20"></div>
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="text-yellow-400 fill-current w-5 h-5" />
                      <h3 className="text-lg font-bold text-yellow-400 uppercase tracking-wide">Top Talent Spotlight</h3>
                    </div>
                    <h2 className="text-4xl font-bold mb-2">{topTalent.candidateName}</h2>
                    <div className="flex items-center gap-4 text-gray-300 text-sm mb-6">
                      <span className="bg-gray-800 px-3 py-1 rounded-full text-xs font-mono">{topTalent.fileName}</span>
                      <span>{topTalent.yearsOfExperience}</span>
                      <span className="text-green-400 font-bold">{topTalent.matchScore} Match Score</span>
                    </div>
                    <p className="text-gray-300 max-w-3xl text-lg italic leading-relaxed">"{topTalent.summary}"</p>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-xl min-w-[120px] text-center hidden md:block">
                    <div className="text-5xl font-bold text-green-400 mb-1">{topTalent.matchScore}</div>
                    <div className="text-xs text-gray-400 uppercase">Score</div>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILED CARDS LIST */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800 mt-8">Detailed Candidate Analysis</h3>
              
              {results.map((result, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between md:items-start gap-4">
                    <div className="flex gap-4">
                      {/* Score Badge */}
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold shadow-sm ${
                        result.matchScore >= 80 ? 'bg-green-100 text-green-700' :
                        result.matchScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700' 
                      }`}>
                        {result.matchScore}
                      </div>
                      
                      {/* Name & File */}
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{result.candidateName || "Unknown Candidate"}</h2>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span className="font-medium text-gray-700">{result.fileName}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>{result.yearsOfExperience}</span>
                        </div>
                      </div>
                    </div>

                    {/* Decision Tag */}
                    <div className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wide self-start ${
                      result.decision === 'RECOMMENDED' ? 'bg-green-100 text-green-800 border border-green-200' :
                      result.decision === 'REJECT' ? 'bg-red-100 text-red-800 border border-red-200' :
                      'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {result.decision}
                    </div>
                  </div>

                  {/* Summary Block */}
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <p className="text-gray-600 text-sm italic leading-relaxed">
                      "{result.summary}"
                    </p>
                  </div>

                  {/* Skills Table */}
                  <div className="p-6">
                    <div className="grid grid-cols-12 gap-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <div className="col-span-12 md:col-span-3">Skill</div>
                      <div className="col-span-12 md:col-span-5 hidden md:block">Evidence</div>
                      <div className="col-span-12 md:col-span-3 hidden md:block">Proficiency</div>
                      <div className="col-span-12 md:col-span-1 text-right hidden md:block">Score</div>
                    </div>

                    <div className="space-y-6">
                      {result.skills.map((skill, sIdx) => (
                        <div key={sIdx} className="grid grid-cols-12 gap-y-2 md:gap-4 items-start border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                          
                          {/* Skill Name */}
                          <div className="col-span-12 md:col-span-3">
                            <h4 className="font-semibold text-gray-900 text-sm">{skill.name}</h4>
                            <span className="text-xs text-gray-400">Weight: {skills.find(s => skill.name.includes(s.name))?.weight || 'N/A'}/5</span>
                          </div>

                          {/* Evidence */}
                          <div className="col-span-12 md:col-span-5">
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {skill.evidence || "No specific evidence provided."}
                            </p>
                          </div>

                          {/* Proficiency Bar */}
                          <div className="col-span-10 md:col-span-3 flex items-center h-full mt-1 md:mt-0">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  skill.score < 40 ? 'bg-red-500' : 
                                  skill.score < 75 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${skill.proficiency}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Numeric Score */}
                          <div className="col-span-2 md:col-span-1 text-right font-bold text-sm text-gray-900">
                            {skill.score}/100
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
