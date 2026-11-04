import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink, Clock, CheckCircle, AlertCircle, Loader, FileText,
  ChevronDown, ChevronUp, Bookmark, Star, Award, XCircle, Copy, Check, Filter
} from 'lucide-react';
import type { Application } from '../lib/api';
import { updateApplicationStatus } from '../lib/api';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface ApplicationHistoryProps {
  applications: Application[];
  loading?: boolean;
  onStatusChanged?: (updated: Application) => void;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; border: string; label: string }> = {
  saved:       { icon: Bookmark,    color: 'text-slate-700 dark:text-slate-300',    bg: 'bg-slate-100 dark:bg-slate-800',           border: 'border-slate-200 dark:border-slate-700',   label: 'Saved' },
  interested:  { icon: Star,        color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/50',     border: 'border-indigo-200 dark:border-indigo-800', label: 'Interested' },
  prepared:    { icon: Loader,      color: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-50 dark:bg-blue-950/50',         border: 'border-blue-200 dark:border-blue-800',     label: 'Prepared' },
  applied:     { icon: CheckCircle, color: 'text-emerald-700 dark:text-emerald-300',bg: 'bg-emerald-50 dark:bg-emerald-950/50',  border: 'border-emerald-200 dark:border-emerald-800',label: 'Applied' },
  interview:   { icon: Award,       color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/50',     border: 'border-purple-200 dark:border-purple-800', label: 'Interview' },
  offer:       { icon: Award,       color: 'text-teal-700 dark:text-teal-300',     bg: 'bg-teal-50 dark:bg-teal-950/50',         border: 'border-teal-200 dark:border-teal-800',     label: 'Offer' },
  rejected:    { icon: XCircle,     color: 'text-rose-700 dark:text-rose-300',     bg: 'bg-rose-50 dark:bg-rose-950/50',         border: 'border-rose-200 dark:border-rose-800',     label: 'Rejected' },
};

const PIPELINE_STATUSES = ['all', 'saved', 'interested', 'prepared', 'applied', 'interview', 'offer', 'rejected'];

export const ApplicationHistory: React.FC<ApplicationHistoryProps> = ({
  applications: initialApplications,
  loading,
  onStatusChanged
}) => {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedLetterId, setExpandedLetterId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Sync state if props change
  React.useEffect(() => {
    setApplications(initialApplications);
  }, [initialApplications]);

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      const res = await updateApplicationStatus(appId, newStatus);
      if (res && res.success) {
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus as Application['status'] } : a));
        if (onStatusChanged) onStatusChanged(res.application);
        toast.success(`Application marked as "${newStatus}"`);
      }
    } catch (err: any) {
      toast.error('Failed to update status: ' + (err.message || 'Server error'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyLetter = (appId: string, letter: string) => {
    navigator.clipboard.writeText(letter);
    setCopiedId(appId);
    toast.success('Cover letter copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredApplications = applications.filter(app => {
    if (activeFilter === 'all') return true;
    return (app.status || '').toLowerCase() === activeFilter;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-24 border border-slate-200/50 dark:border-slate-700/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Pipeline Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pipeline Filter:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PIPELINE_STATUSES.map(st => {
            const count = st === 'all'
              ? applications.length
              : applications.filter(a => (a.status || '').toLowerCase() === st).length;

            return (
              <button
                key={st}
                onClick={() => setActiveFilter(st)}
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5",
                  activeFilter === st
                    ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold"
                    : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <span className="capitalize">{st}</span>
                <span className={cn(
                  "text-[10.5px] px-1.5 py-0.2 rounded-full font-bold",
                  activeFilter === st ? "bg-white/20 text-white" : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {activeFilter === 'all' ? 'No applications tracked yet' : `No applications in "${activeFilter}"`}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeFilter === 'all'
              ? 'When you prepare an application or click "Apply" on any recommended job, it will be automatically tracked in this pipeline.'
              : 'Try selecting "All" or apply for new positions in the Recommended Jobs tab.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((app, i) => {
            const rawStatus = (app.status || 'prepared').toLowerCase();
            const cfg = statusConfig[rawStatus] || statusConfig.prepared;
            const StatusIcon = cfg.icon;
            const hasCoverLetter = Boolean(app.coverLetter && app.coverLetter.trim().length > 0);
            const isLetterOpen = expandedLetterId === app.id;

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-4.5 shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">
                        {app.title}
                      </p>
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border', cfg.bg, cfg.color, cfg.border)}>
                        <StatusIcon className="w-3 h-3 shrink-0" />
                        {cfg.label}
                      </span>
                    </div>

                    <p className="text-blue-600 dark:text-blue-400 text-xs font-semibold mt-0.5">
                      {app.company}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Applied/Saved: {new Date(app.appliedDate).toLocaleDateString()}</span>
                      {hasCoverLetter && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <FileText className="w-3 h-3" /> Cover Letter Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Lifecycle Status Selector */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {/* Status Changer Dropdown */}
                    <select
                      value={rawStatus}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      disabled={updatingId === app.id}
                      className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-colors"
                      title="Update application stage"
                    >
                      <option value="saved">Stage: Saved</option>
                      <option value="interested">Stage: Interested</option>
                      <option value="prepared">Stage: Prepared</option>
                      <option value="applied">Stage: Applied</option>
                      <option value="interview">Stage: Interview</option>
                      <option value="offer">Stage: Offer</option>
                      <option value="rejected">Stage: Rejected</option>
                    </select>

                    {hasCoverLetter && (
                      <button
                        onClick={() => setExpandedLetterId(isLetterOpen ? null : app.id)}
                        className="text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 font-medium border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isLetterOpen ? 'Hide Letter' : 'Cover Letter'}</span>
                        {isLetterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}

                    {app.url && (
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 px-2.5 py-1.5 rounded-lg font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Portal</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Expandable Cover Letter */}
                <AnimatePresence>
                  {isLetterOpen && app.coverLetter && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Tailored Cover Letter:
                        </p>
                        <button
                          onClick={() => handleCopyLetter(app.id, app.coverLetter!)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {copiedId === app.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy to Clipboard</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed border border-slate-200/80 dark:border-slate-800 font-sans">
                        {app.coverLetter}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
