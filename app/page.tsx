"use client";

import { useState } from 'react';
import { Upload, Loader2, AlertCircle, FileText } from 'lucide-react';

// Define the shape of our data
interface Skill {
  name: string;
  weight: string;
  evidence: string;
  proficiency: number;
  score: number;
}

interface AnalysisResult {
  candidateName: string;
  yearsOfExperience: string;
  matchScore: number;
  decision: "CONSIDER" | "REJECT";
  summary: string;
  skills: Skill[];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">CV Reviewer AI</h1>
          <p className="text-gray-500 mt-2">Upload a CV to generate a scored scorecard</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-center">
             <div className="relative flex-grow w-full">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
            <button
              type="submit"
              disabled={!file || loading}
              className="w-full sm:w-auto flex justify-center items-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Analyzing...
                </>
              ) : (
                "Run Analysis"
              )}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}
        </div>

        {/* Results Card (Only shows when result exists) */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Card Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <span className="text-2xl font-bold text-blue-600">{result.matchScore}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{result.candidateName || "Candidate"}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">Match Score</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm font-medium text-gray-700">{result.yearsOfExperience} Exp</span>
                  </div>
                </div>
              </div>
              
              <span className={`px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide ${
                result.decision === 'REJECT' 
                  ? 'bg-red-100 text-red-600' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {result.decision}
              </span>
            </div>

            {/* Summary Italic Text */}
            <div className="p-6 bg-gray-50 border-b border-gray-100">
              <p className="text-gray-600 italic">"{result.summary}"</p>
            </div>

            {/* Skills Table */}
            <div className="p-6">
              <div className="grid grid-cols-12 gap-4 mb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <div className="col-span-3">Skill</div>
                <div className="col-span-5">Evidence</div>
                <div className="col-span-3">Proficiency</div>
                <div className="col-span-1 text-right">Score</div>
              </div>

              <div className="space-y-6">
                {result.skills.map((skill, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-start">
                    
                    {/* Column 1: Skill Name */}
                    <div className="col-span-3">
                      <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">WEIGHT: {skill.weight}</p>
                    </div>

                    {/* Column 2: Evidence */}
                    <div className="col-span-5">
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {skill.evidence}
                      </p>
                    </div>

                    {/* Column 3: Proficiency Bar */}
                    <div className="col-span-3 flex items-center h-full">
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            skill.score < 50 ? 'bg-red-500' : 
                            skill.score < 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${skill.proficiency}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Column 4: Score */}
                    <div className="col-span-1 text-right font-bold text-gray-900">
                      {skill.score}/100
                    </div>

                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
