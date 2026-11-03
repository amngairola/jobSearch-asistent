import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Clock, CheckCircle, AlertCircle, Loader, FileText, ChevronDown, ChevronUp, Bookmark, Star, Award, XCircle } from 'lucide-react';
import type { Application } from '../lib/api';
import { cn } from '../lib/utils';

interface ApplicationHistoryProps {
  applications: Application[];
  loading?: boolean;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  saved:       { icon: Bookmark,    color: 'text-gray-600',   bg: 'bg-gray-100 dark:bg-gray-800',           label: 'Saved' },
  interested:  { icon: Star,        color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30',     label: 'Interested' },
  prepared:    { icon: Loader,      color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/30',         label: 'Prepared' },
  pending:     { icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/30',       label: 'Pending' },
  applied:     { icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/30',       label: 'Applied' },
  submitted:   { icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/30',       label: 'Submitted' },
  interview:   { icon: Award,       color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30',     label: 'Interview' },
  offer:       { icon: Award,       color: 'text-emerald-600',bg: 'bg-emerald-50 dark:bg-emerald-900/30',   label: 'Offer' },
  rejected:    { icon: XCircle,     color: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-900/30',         label: 'Rejected' },
  failed:      { icon: AlertCircle, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/30',           label: 'Failed' },
};

export const ApplicationHistory: React.FC<ApplicationHistoryProps> = ({ applications, loading }) => {
  const [expandedLetterId, setExpandedLetterId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl h-24" />
        ))}
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">No applications tracked yet</p>
        <p className="text-xs text-gray-500 mt-1">
          When you prepare an application or click "Apply" on any job, it will be tracked here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app, i) => {
        const cfg = statusConfig[app.status?.toLowerCase()] || statusConfig.prepared;
        const StatusIcon = cfg.icon;
        const hasCoverLetter = Boolean(app.coverLetter && app.coverLetter.trim().length > 0);
        const isLetterOpen = expandedLetterId === app.id;

        return (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {app.title}
                </p>
                <p className="text-blue-600 dark:text-blue-400 text-xs font-medium mt-0.5">
                  {app.company}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Applied: {new Date(app.appliedDate).toLocaleDateString()}</span>
                  {hasCoverLetter && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <FileText className="w-3 h-3" /> Cover Letter Ready
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={cn('flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>

                <div className="flex items-center gap-2">
                  {hasCoverLetter && (
                    <button
                      onClick={() => setExpandedLetterId(isLetterOpen ? null : app.id)}
                      className="text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-0.5 font-medium border border-gray-200 dark:border-gray-700 px-2 py-1 rounded"
                    >
                      <FileText className="w-3 h-3" />
                      {isLetterOpen ? 'Hide' : 'Cover Letter'}
                      {isLetterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                  {app.url && (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 border border-blue-200 dark:border-blue-900 px-2 py-1 rounded"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Job Link
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable Cover Letter preview */}
            <AnimatePresence>
              {isLetterOpen && app.coverLetter && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 pt-3 border-t border-gray-100 dark:border-gray-700"
                >
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Generated Cover Letter:</p>
                  <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-gray-200 dark:border-gray-800">
                    {app.coverLetter}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};
