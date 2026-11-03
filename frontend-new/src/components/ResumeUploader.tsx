import React, { useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ParsedResume } from '../lib/api';

interface ResumeUploaderProps {
  onUpload: (file: File) => void;
  uploading: boolean;
  resumeFilename?: string | null;
  parsedResume?: ParsedResume | null;
  onRemoveResume?: () => void;
}

export const ResumeUploader: React.FC<ResumeUploaderProps> = ({
  onUpload,
  uploading,
  resumeFilename,
  parsedResume,
  onRemoveResume
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateAndUpload = (file: File) => {
    setLocalError(null);
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.pdf', '.docx'].includes(ext)) {
      setLocalError('Only PDF and DOCX files are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLocalError('File size exceeds 10MB limit.');
      return;
    }
    onUpload(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  }, [onUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
  };

  // If a resume is already uploaded & parsed:
  if (parsedResume || resumeFilename) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleChange}
        />
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {resumeFilename || `${parsedResume?.name || 'Resume'}.pdf`}
                </p>
                <span className="flex items-center gap-1 text-[11px] font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Parsed & Active
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {parsedResume?.name && <span className="font-medium text-gray-700 dark:text-gray-300">{parsedResume.name} · </span>}
                {parsedResume?.skills?.length || 0} skills detected
                {parsedResume?.designation ? ` · ${parsedResume.designation}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {showDetails ? (
                <>Hide Details <ChevronUp className="w-3.5 h-3.5" /></>
              ) : (
                <>View Details <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", uploading && "animate-spin")} />
              {uploading ? 'Parsing...' : 'Replace'}
            </button>
            {onRemoveResume && (
              <button
                onClick={onRemoveResume}
                className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-lg border border-red-200 dark:border-red-800 transition-colors"
                title="Remove resume"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Expandable extracted resume details */}
        <AnimatePresence>
          {showDetails && parsedResume && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs space-y-2">
                {parsedResume.email && (
                  <p><span className="text-gray-400">Email:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{parsedResume.email}</span></p>
                )}
                {parsedResume.location && (
                  <p><span className="text-gray-400">Location:</span> <span className="font-medium text-gray-700 dark:text-gray-300">{parsedResume.location}</span></p>
                )}
                {parsedResume.skills && parsedResume.skills.length > 0 && (
                  <div>
                    <span className="text-gray-400 block mb-1">Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {parsedResume.skills.map((s, idx) => (
                        <span key={idx} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[11px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Upload Box
  return (
    <div className="space-y-2">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all',
          dragging ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 bg-white/50 dark:bg-gray-800/50',
          uploading && 'pointer-events-none opacity-60'
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleChange} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
                Parsing resume with AI...
              </p>
              <p className="text-xs text-gray-400">Extracting skills, experience, and profile</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Upload your resume to personalize job search & matching
              </p>
              <p className="text-xs text-gray-500">
                Drag and drop your file here, or <span className="text-blue-600 dark:text-blue-400 underline font-medium">browse</span> (PDF or DOCX, max 10MB)
              </p>
            </>
          )}
        </div>
      </motion.div>

      {localError && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{localError}</span>
        </div>
      )}
    </div>
  );
};
