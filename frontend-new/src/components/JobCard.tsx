import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Clock, ExternalLink, Send, ChevronDown, ChevronUp,
  Sparkles, CheckCircle2, DollarSign, Bookmark, BookmarkCheck, ListChecks, Briefcase, Globe, ShieldCheck
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

  const scoreColor = score !== null
    ? score >= 70 ? 'text-green-700 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800'
    : score >= 40 ? 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
    : 'text-gray-700 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
    : 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800';

  const hasRequirements = Array.isArray(job.requirements) && job.requirements.length > 0;
  const hasResponsibilities = Array.isArray(job.responsibilities) && job.responsibilities.length > 0;
  const hasSkills = Array.isArray(job.skills) && job.skills.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4) }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
              {job.title}
            </h3>
            <p className="text-blue-600 dark:text-blue-400 text-xs font-semibold mt-0.5">
              {job.company}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {score !== null ? (
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', scoreColor)}>
                {score}% Match
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
                {job.source}
              </span>
            )}
            {onSaveJob && (
              <button
                onClick={() => onSaveJob(job)}
                className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-md transition-colors"
                title={isSaved ? 'Saved to tracker' : 'Save job'}
              >
                {isSaved ? <BookmarkCheck className="w-4 h-4 text-blue-600" /> : <Bookmark className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Metadata Chips: Location, Type, Experience, Salary */}
        <div className="flex flex-wrap gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
          {job.location && (
            <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-md border border-gray-100 dark:border-gray-700">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="truncate max-w-[140px]">{job.location}</span>
            </span>
          )}
          {job.employmentType && (
            <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-md border border-gray-100 dark:border-gray-700">
              <Clock className="w-3 h-3 text-gray-400" />
              {job.employmentType}
            </span>
          )}
          {job.salary && (
            <span className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800">
              <DollarSign className="w-3 h-3" />
              {job.salary}
            </span>
          )}
        </div>

        {/* Match Details Section */}
        {match && (
          <div className="mb-3 space-y-1.5 text-xs bg-gray-50/80 dark:bg-gray-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
            {match.reason && (
              <p className="text-gray-700 dark:text-gray-300 font-medium flex items-start gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span>{match.reason}</span>
              </p>
            )}

            {match.matchingSkills && match.matchingSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1">
                <span className="text-green-600 dark:text-green-400 font-semibold text-[11px]">Matching:</span>
                {match.matchingSkills.slice(0, 4).map(s => (
                  <span key={s} className="bg-green-100/80 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[11px] px-1.5 py-0.2 rounded font-medium">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {match.missingSkills && match.missingSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">Missing:</span>
                {match.missingSkills.slice(0, 3).map(s => (
                  <span key={s} className="bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[11px] px-1.5 py-0.2 rounded font-medium">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clean Job Description (no markdown header artifacts) */}
        {job.description && (
          <div className="mb-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            <p className={cn(!expanded && "line-clamp-2")}>
              {job.description}
            </p>
          </div>
        )}

        {/* Expandable Section: Requirements & Responsibilities */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-3 mb-3 text-xs border-t border-gray-100 dark:border-gray-700 pt-2.5 overflow-hidden"
            >
              {hasRequirements && (
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-1">
                    <ListChecks className="w-3.5 h-3.5 text-blue-500" />
                    Key Requirements
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 pl-1">
                    {job.requirements!.map((req, idx) => (
                      <li key={idx} className="leading-relaxed">{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {hasResponsibilities && (
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                    Responsibilities
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 pl-1">
                    {job.responsibilities!.map((resp, idx) => (
                      <li key={idx} className="leading-relaxed">{resp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Required Skills Tags */}
        {hasSkills && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {job.skills!.slice(0, 5).map(s => (
                <span
                  key={s}
                  className="bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 text-[10px] px-1.5 py-0.5 rounded font-medium"
                >
                  {s}
                </span>
              ))}
              {job.skills!.length > 5 && (
                <span className="text-[10px] text-gray-400 self-center">
                  +{job.skills!.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Show more / show less toggle */}
        {(hasRequirements || hasResponsibilities || (job.description && job.description.length > 120)) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-medium mb-1"
          >
            {expanded ? <>Show less <ChevronUp className="w-3 h-3" /></> : <>Show full details <ChevronDown className="w-3 h-3" /></>}
          </button>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-2">
        {(() => {
          const targetUrl = (job.applicationUrl || job.url || job.sourceUrl || '').trim();
          const valid = isValidUrl(targetUrl);
          const classification = classifyUrl(targetUrl);

          if (!valid) {
            return (
              <span className="text-[11px] text-gray-400 italic">
                Link unavailable
              </span>
            );
          }

          return (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-1 text-xs font-semibold hover:underline",
                classification.isDirectPortal
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-amber-700 dark:text-amber-400"
              )}
              title={classification.label}
            >
              {classification.isDirectPortal ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Official Portal</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Third-Party Listing</span>
                </>
              )}
            </a>
          );
        })()}

        <button
          onClick={() => onApply(job)}
          className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-semibold transition-colors shadow-2xs"
        >
          <Send className="w-3 h-3" />
          Apply
        </button>
      </div>
    </motion.div>
  );
};
