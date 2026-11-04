import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, ExternalLink, Send, ChevronDown, ChevronUp,
  Sparkles, CheckCircle2, DollarSign, Bookmark, BookmarkCheck,
  ListChecks, Briefcase, Globe, ShieldCheck, AlertCircle, Building2
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Job, JobMatch } from '../lib/api';
import { classifyUrl, isValidUrl } from '../lib/urlUtils';

interface JobCardProps {
  job: Job;
  match?: JobMatch;
  onApply: (job: Job) => void;
  onSaveJob?: (job: Job) => void;
  isSaved?: boolean;
  index: number;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  match,
  onApply,
  onSaveJob,
  isSaved = false,
  index
}) => {
  const [expanded, setExpanded] = useState(false);
  const score = match?.score ?? null;

  // Match score visual styling
  const scoreBadgeStyle = score !== null
    ? score >= 70
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      : score >= 45
      ? 'text-blue-700 bg-blue-50 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
      : 'text-amber-700 bg-amber-50 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    : 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  const hasRequirements = Array.isArray(job.requirements) && job.requirements.length > 0;
  const hasResponsibilities = Array.isArray(job.responsibilities) && job.responsibilities.length > 0;
  const hasSkills = Array.isArray(job.skills) && job.skills.length > 0;

  const targetUrl = (job.applicationUrl || job.url || job.sourceUrl || '').trim();
  const validLink = isValidUrl(targetUrl);
  const classification = classifyUrl(targetUrl);

  const isVerifiedActive = job.verificationStatus === 'verified' || classification.isDirectPortal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:shadow-md hover:border-blue-400/50 dark:hover:border-blue-500/40 transition-all flex flex-col justify-between"
    >
      <div>
        {/* Top Header: Title, Company, Status Badges */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {job.title}
              </h3>
              {/* Verification status chip */}
              {isVerifiedActive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Verified Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                  <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                  Live Listing
                </span>
              )}
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-600 dark:text-blue-400 font-semibold">{job.company}</span>
              {job.source && (
                <span className="text-slate-400 text-[11px]">· via {job.source}</span>
              )}
            </p>
          </div>

          {/* Action icons & Match Score */}
          <div className="flex items-center gap-2 shrink-0">
            {score !== null ? (
              <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border shadow-2xs', scoreBadgeStyle)}>
                {score}% Match
              </span>
            ) : null}

            {onSaveJob && (
              <button
                onClick={() => onSaveJob(job)}
                className={cn(
                  "p-1.5 rounded-lg border transition-all text-xs flex items-center justify-center",
                  isSaved
                    ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400"
                    : "border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:hover:text-slate-200"
                )}
                title={isSaved ? 'Saved in Application Tracker' : 'Save to Tracker'}
                aria-label="Save Job"
              >
                {isSaved ? <BookmarkCheck className="w-4 h-4 text-blue-600 fill-blue-600/20" /> : <Bookmark className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Metadata Badges: Location, Type, Experience, Salary */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-3">
          {job.location && (
            <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200/70 dark:border-slate-700 font-medium">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate max-w-[160px]">{job.location}</span>
            </span>
          )}

          {job.employmentType && (
            <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-200/70 dark:border-slate-700 font-medium">
              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{job.employmentType}</span>
            </span>
          )}

          {job.experienceLevel && (
            <span className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200/70 dark:border-indigo-800 font-semibold">
              <Briefcase className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>{job.experienceLevel}</span>
            </span>
          )}

          {job.salary && (
            <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-md border border-emerald-200/80 dark:border-emerald-800">
              <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{job.salary}</span>
            </span>
          )}
        </div>

        {/* Explainable Match Reason & Skills Box */}
        {match && (
          <div className="mb-3 text-xs bg-slate-50/90 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/70 dark:border-slate-700/80 space-y-2">
            {match.reason && (
              <p className="text-slate-700 dark:text-slate-300 font-medium flex items-start gap-1.5 leading-relaxed">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>{match.reason}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
              {match.matchingSkills && match.matchingSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">Matched:</span>
                  {match.matchingSkills.slice(0, 5).map(s => (
                    <span key={s} className="bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-[10.5px] px-1.5 py-0.2 rounded font-medium border border-emerald-200/60">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {match.missingSkills && match.missingSkills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-amber-700 dark:text-amber-400 font-semibold text-[11px]">Missing:</span>
                  {match.missingSkills.slice(0, 4).map(s => (
                    <span key={s} className="bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-[10.5px] px-1.5 py-0.2 rounded font-medium border border-amber-200/60">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Job Description */}
        {job.description && (
          <div className="mb-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p className={cn(!expanded && "line-clamp-2")}>
              {job.description}
            </p>
          </div>
        )}

        {/* Expandable Section: Key Requirements & Responsibilities */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 mb-3 text-xs border-t border-slate-100 dark:border-slate-800 pt-3 overflow-hidden"
            >
              {hasRequirements && (
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 text-blue-500" />
                    Key Requirements
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                    {job.requirements!.map((req, idx) => (
                      <li key={idx} className="leading-relaxed">{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hasResponsibilities && (
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                    Responsibilities
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                    {job.responsibilities!.map((resp, idx) => (
                      <li key={idx} className="leading-relaxed">{resp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Required Skills Chips */}
        {hasSkills && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {job.skills!.slice(0, 6).map(s => (
                <span
                  key={s}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10.5px] px-2 py-0.5 rounded font-medium border border-slate-200/50 dark:border-slate-700"
                >
                  {s}
                </span>
              ))}
              {job.skills!.length > 6 && (
                <span className="text-[10px] text-slate-400 self-center font-medium">
                  +{job.skills!.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Toggle Details Button */}
        {(hasRequirements || hasResponsibilities || (job.description && job.description.length > 130)) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11.5px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 font-semibold mb-1 transition-colors"
          >
            {expanded ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Show full details <ChevronDown className="w-3 h-3" /></>}
          </button>
        )}
      </div>

      {/* Footer Actions & Link Classification */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
        <div>
          {validLink ? (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold hover:underline",
                classification.isDirectPortal
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-amber-700 dark:text-amber-400"
              )}
              title={classification.label}
            >
              {classification.isDirectPortal ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Official Application Portal</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Third-Party Job Listing</span>
                </>
              )}
              <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
            </a>
          ) : (
            <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Application link unavailable
            </span>
          )}
        </div>

        <button
          onClick={() => onApply(job)}
          className="inline-flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-xs hover:shadow"
        >
          <Send className="w-3 h-3" />
          <span>Apply</span>
        </button>
      </div>
    </motion.div>
  );
};
