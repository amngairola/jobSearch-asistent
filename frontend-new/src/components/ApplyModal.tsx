import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ExternalLink, FileText, Check, Copy, AlertTriangle,
  Building2, Globe, ShieldCheck, CheckCircle2
} from 'lucide-react';
import type { Job } from '../lib/api';
import { classifyUrl, isValidUrl } from '../lib/urlUtils';

interface ApplyModalProps {
  job: Job | null;
  coverLetter?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  job,
  coverLetter,
  onConfirm,
  onCancel,
  loading = false,
  error
}) => {
  const [copied, setCopied] = useState(false);

  if (!job) return null;

  const rawUrl = (job.applicationUrl || job.url || '').trim();
  const valid = isValidUrl(rawUrl);
  const classification = classifyUrl(rawUrl);

  const handleCopy = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    if (valid) {
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  Manual Job Application
                </span>
                {classification.isDirectPortal ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3" />
                    {classification.badge}
                  </span>
                ) : valid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                    <Globe className="w-3 h-3" />
                    {classification.badge}
                  </span>
                ) : null}
              </div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                {job.title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                {job.company} {job.location ? `• ${job.location}` : ''}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {/* Error or Missing URL Check */}
            {!valid ? (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl p-3.5 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Invalid or Missing Application URL</p>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    This job listing does not provide a valid web address to apply. The application cannot proceed.
                  </p>
                </div>
              </div>
            ) : (
              /* Verified URL Link Box */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                    Target Application URL:
                  </span>
                  <button
                    onClick={handleOpenLink}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Open in new tab <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <a
                    href={rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 text-blue-600 dark:text-blue-400 hover:underline break-all font-medium text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{rawUrl}</span>
                  </a>

                  {classification.warning && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span>{classification.warning}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Generated Tailored Cover Letter */}
            {coverLetter && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-200">
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Tailored Cover Letter</span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-green-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy Text
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed">
                  {coverLetter}
                </div>
              </div>
            )}

            {/* Operational Rules Notice */}
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-xl p-3 text-gray-700 dark:text-gray-300 space-y-1 text-[11px]">
              <p className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                How to Complete Your Application:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 text-gray-600 dark:text-gray-400 pl-0.5">
                <li>Review the job description on the opened browser tab.</li>
                <li>Fill in your candidate details and attach your resume.</li>
                <li>Paste the tailored cover letter into the portal.</li>
                <li>Submit your application directly on the employer's page.</li>
              </ol>
            </div>

            {/* Application Tracker Notice */}
            <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 rounded-xl p-3 text-gray-600 dark:text-gray-400 text-[11px]">
              <p className="font-medium">
                <strong>Tracker Status:</strong> Your application tracker remains unchanged until you explicitly confirm below that you have finished submitting your application.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3 text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/50">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Close
            </button>

            <button
              onClick={onConfirm}
              disabled={loading || !valid}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors shadow-2xs"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {loading ? 'Recording...' : 'I Have Submitted This Application'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
