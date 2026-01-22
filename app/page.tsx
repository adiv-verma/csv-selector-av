"use client";

import { useState, useRef } from 'react';
import { Upload, Play, Loader2, CheckCircle, XCircle, AlertCircle, FileText, Star } from 'lucide-react';

// --- TYPES ---
interface SkillConfig {
  id: string;
  name: string;
  weight: number;
}

interface AnalysisResult {
  fileName: string; // Added to track which file this is
  candidateName: string;
  yearsOfExperience: string;
  matchScore: number;
  decision: "RECOMMENDED" | "CONSIDER" | "REJECT";
  summary: string;
  skills: {
    name: string;
    evidence: string;
    proficiency: number;
    score: number;
  }[];
}

export default function Home() {
  // --- STATE ---
  // 1. Configuration State
  const [skills, setSkills] = useState<SkillConfig[]>([
    { id: '1', name: 'Wireless Networks (5G, 4G, LTE)', weight: 5 },
    { id: '2', name: 'Fixed Networks (Fiber)', weight: 3 },
    { id: '3', name: 'OSS or Service Assurance', weight: 4 },
    { id: '4', name: 'Consulting or MBA', weight: 2 },
  ]);

  // 2. Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  // 3. Results State
  const [results, setResults] = useState<AnalysisResult[]>([]);
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
      setResults([]); // Reset results on new upload
      setProcessedCount(0);
    }
  };

  const startAnalysis = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProcessedCount(0);
    setResults([]);
    
    const newResults: AnalysisResult[] = [];

    // Loop through each file sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      // Send the current skill configuration to the AI
      formData.append('skills', JSON.stringify(skills));

      try {
        const res = await fetch('/api/analyze', { method: 'POST', body: formData });
        const data = await res.json();
        
        if (res.ok) {
          const resultWithFile = { ...data, fileName: file.name };
          newResults.push(resultWithFile);
          setResults(prev => [...prev, resultWithFile]); // Update UI real-time
        }
      } catch (err) {
        console.error("Error processing file:", file.name, err);
      }
      
      setProcessedCount(prev => prev + 1);
    }

    setIsProcessing(false);
  };

  // --- DERIVED STATS ---
  const recommended = results.filter(r => r.decision === 'RECOMMENDED').length;
  const consider = results.filter(r => r.decision === 'CONSIDER').length;
  const reject = results.filter(r => r.decision === 'REJECT').length;
  
  // Find top talent
  const topTalent = results.length > 0 
    ? results.reduce((prev, current) => (prev.matchScore > current.matchScore) ? prev : current)
    : null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 p-2 rounded-lg">
            <FileText className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">CV Screening Agent</h1>
        </div>
        <div className="flex items-center gap-4">
          <select className="bg-gray-100 border-none text-sm font-medium rounded-md px-3 py-2">
            <option>Claude 3 Haiku (Fast)</option>
            <option>Claude 3 Sonnet (Balanced)</option>
          </select>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        
        {/* SECTION 1: Define Skills */}
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
                  <span className="text-xs font-medium text-gray-500 w-12">Weight</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
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

        {/* SECTION 2: Upload */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
          <input 
            type="file" 
            multiple 
            accept=".pdf" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden" 
          />
          
          <div className="cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <Upload className="text-blue-600 w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              {files.length > 0 ? `${files.length} Files Selected` : "Upload CV Folder"}
            </h3>
            <p className="text-gray-500 mt-1">Drag and drop files here or click to browse</p>
          </div>
        </section>

        {/* Action Bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500">Status</span>
            <span className="text-lg font-bold text-gray-900">
              {isProcessing ? "Processing..." : results.length > 0 ? "Completed" : "Waiting for Input"}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
             {isProcessing && (
               <div className="flex items-center gap-2 text-sm text-gray-500 mr-4">
                 <Loader2 className="animate-spin w-4 h-4" />
                 Processing {processedCount}/{files.length}
               </div>
             )}
            <button 
              onClick={startAnalysis}
              disabled={isProcessing || files.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Play className="fill-current w-4 h-4" />}
              Start Analysis
            </button>
          </div>
        </div>

        {/* SECTION 3: Dashboard Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-3xl font-bold text-gray-900">{files.length}</div>
              <div className="text-xs font-bold text-gray-400 uppercase mt-1">Total CVs</div>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
              <div className="text-3xl font-bold text-blue-600">{results.length}</div>
              <div className="text-xs font-bold text-blue-400 uppercase mt-1">Processed</div>
            </div>
            <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm">
              <div className="text-3xl font-bold text-green-600">{recommended}</div>
              <div className="text-xs font-bold text-green-400 uppercase mt-1">Recommended</div>
            </div>
            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 shadow-sm">
              <div className="text-3xl font-bold text-yellow-600">{consider}</div>
              <div className="text-xs font-bold text-yellow-400 uppercase mt-1">Consider</div>
            </div>
            <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
              <div className="text-3xl font-bold text-red-600">{reject}</div>
              <div className="text-xs font-bold text-red-400 uppercase mt-1">Reject</div>
            </div>
          </div>
        )}

        {/* SECTION 4: Top Talent Spotlight */}
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
                   <span className="bg-gray-800 px-3 py-1 rounded-full">{topTalent.fileName}</span>
                   <span>{topTalent.yearsOfExperience} Experience</span>
                </div>
                
                <p className="text-gray-300 max-w-2xl text-lg italic leading-relaxed">
                  "{topTalent.summary}"
                </p>
              </div>

              <div className="bg-gray-800 p-6 rounded-xl min-w-[150px] text-center">
                 <div className="text-5xl font-bold text-green-400 mb-1">{topTalent.matchScore}</div>
                 <div className="text-sm text-gray-400">Match Score</div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
