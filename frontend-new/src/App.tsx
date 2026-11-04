import React, { useState, useCallback, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ResumeViewer } from './components/ResumeViewer';
import { JobCard } from './components/JobCard';
import { ApplicationHistory } from './components/ApplicationHistory';
import { ApplyModal } from './components/ApplyModal';
import { useSession } from './hooks/useSession';

import {
  uploadResume, updateResume, sendMessage, matchJobs, prepareApplication, submitApplication, getApplications, getSession,
  type ParsedResume, type Job, type JobMatch, type Application, type ChatResponse
} from './lib/api';
import { isValidUrl } from './lib/urlUtils';

import './index.css';

const queryClient = new QueryClient();

type View = 'chat' | 'resume' | 'jobs' | 'applications';

function AppContent() {
  const { sessionId, resetSession } = useSession();
  const [activeView, setActiveView] = useState<View>('chat');
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null);
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  // Application confirmation modal state
  const [applyJob, setApplyJob] = useState<Job | null>(null);
  const [pendingCoverLetter, setPendingCoverLetter] = useState<string>('');
  const [applyError, setApplyError] = useState<string>('');
  const [applyLoading, setApplyLoading] = useState(false);

  // Restore session data on mount (survives browser refresh)
  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then((data) => {
      if (data) {
        if (data.parsed_resume) setParsedResume(data.parsed_resume);
        if (data.resume_filename) setResumeFilename(data.resume_filename);
        if (data.jobs && data.jobs.length > 0) setJobs(data.jobs);
        if (data.matched && data.matched.length > 0) setJobMatches(data.matched);
      }
    }).catch(err => {
      console.log('No prior session state or server starting:', err.message);
    });
  }, [sessionId]);

  // Resume upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadResume(file, sessionId),
    onSuccess: (data) => {
      setParsedResume(data.parsed_data);
      if (data.filename) setResumeFilename(data.filename);
      toast.success('Resume parsed and profile extracted!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to parse resume');
    }
  });

  // Application history query
  const appsQuery = useQuery({
    queryKey: ['applications', sessionId],
    queryFn: () => getApplications(sessionId),
    enabled: activeView === 'applications',
  });

  // Sync applications from query result
  useEffect(() => {
    if (appsQuery.data) setApplications(appsQuery.data.applications || []);
  }, [appsQuery.data]);

  const handleSendMessage = useCallback(async (message: string): Promise<ChatResponse> => {
    return await sendMessage(message, sessionId);
  }, [sessionId]);

  const handleJobsReceived = useCallback((newJobs: Job[]) => {
    setJobs(newJobs);
    // Auto-match if resume available
    if (parsedResume) {
      matchJobs(sessionId).then(data => {
        setJobMatches(data.matches || []);
      }).catch(() => {});
    }
  }, [parsedResume, sessionId]);

  const handleApplyJob = useCallback(async (job: Job) => {
    const rawUrl = (job.applicationUrl || job.url || '').trim();
    if (!isValidUrl(rawUrl)) {
      toast.error('Cannot apply: This job listing has an invalid or missing application URL.');
      return;
    }

    // Immediately open the verified official application URL in a new browser tab
    window.open(rawUrl, '_blank', 'noopener,noreferrer');
    toast.success('Opening application page in a new tab...', { icon: '🔗' });

    setApplyJob(job);
    setApplyError('');
    setPendingCoverLetter('');
    try {
      const prep = await prepareApplication(job.id, sessionId);
      setPendingCoverLetter(prep.coverLetter || '');
    } catch (err: any) {
      setApplyError(err?.response?.data?.error || err.message || 'Could not prepare application');
    }
  }, [sessionId]);

  const handleConfirmApply = useCallback(async () => {
    if (!applyJob) return;
    setApplyLoading(true);
    try {
      const result = await submitApplication(applyJob.id, sessionId);
      if (result.success) {
        toast.success('Application marked as submitted in your tracker!', { icon: '✅' });
      } else {
        toast.error(result.message || 'Could not update application status');
      }
      queryClient.invalidateQueries({ queryKey: ['applications', sessionId] });
      setApplyJob(null);
    } catch (err: any) {
      setApplyError(err?.response?.data?.error || err.message || 'Confirmation failed');
    } finally {
      setApplyLoading(false);
    }
  }, [applyJob, sessionId]);

  // Handle manual resume edits & save to JSON storage
  const handleSaveResume = useCallback(async (updated: ParsedResume) => {
    try {
      const res = await updateResume(sessionId, updated);
      setParsedResume(res.parsed_data);
      if (res.matched) setJobMatches(res.matched);
      toast.success('Resume profile updated & saved!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to update resume profile');
      throw err;
    }
  }, [sessionId]);

  const handleNewChat = () => {
    if (window.confirm('Start a new conversation? This will reset your current session.')) {
      resetSession();
      setParsedResume(null);
      setResumeFilename(null);
      setJobs([]);
      setJobMatches([]);
      setApplications([]);
      setActiveView('chat');
      toast.success('New session created');
    }
  };

  const handleRemoveResume = () => {
    if (window.confirm('Remove current resume from this session?')) {
      setParsedResume(null);
      setResumeFilename(null);
      toast.success('Resume removed');
    }
  };

  const matchMap = Object.fromEntries(jobMatches.map(m => [m.jobId, m]));

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      <Toaster position="top-right" />

      {/* Apply confirmation modal */}
      {applyJob && (
        <ApplyModal
          job={applyJob}
          coverLetter={pendingCoverLetter}
          onConfirm={handleConfirmApply}
          onCancel={() => { setApplyJob(null); setApplyError(''); }}
          loading={applyLoading}
          error={applyError}
        />
      )}

      {/* Left Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onNewChat={handleNewChat}
        hasResume={!!parsedResume}
        resumeFilename={resumeFilename}
        jobCount={jobs.length}
        appCount={applications.length}
        sessionId={sessionId}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-hidden">
              <ChatWindow
                sessionId={sessionId}
                parsedResume={parsedResume}
                resumeFilename={resumeFilename}
                onResumeUploaded={(resume, fname) => {
                  setParsedResume(resume);
                  if (fname) setResumeFilename(fname);
                }}
                onRemoveResume={handleRemoveResume}
                onJobsReceived={handleJobsReceived}
                onSendMessage={handleSendMessage}
                uploading={uploadMutation.isPending}
                onUploadResume={(file) => uploadMutation.mutate(file)}
                jobMatches={jobMatches}
                onApplyJob={handleApplyJob}
                onViewAllJobs={() => setActiveView('jobs')}
              />
            </motion.div>
          )}

          {activeView === 'resume' && (
            <motion.div key="resume" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Extracted Resume Profile</h1>
                    <p className="text-xs text-gray-500 mt-1">
                      {resumeFilename ? `Uploaded file: ${resumeFilename}` : 'Parsed profile data used for job matching'}
                    </p>
                  </div>
                  {parsedResume && (
                    <button
                      onClick={() => setActiveView('chat')}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Return to Chat
                    </button>
                  )}
                </div>

                {parsedResume ? (
                  <ResumeViewer
                    resume={parsedResume}
                    filename={resumeFilename}
                    onSave={handleSaveResume}
                  />
                ) : (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8">
                    <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">No resume uploaded yet</p>
                    <p className="text-xs text-gray-500 mb-5">Upload your resume in the chat view to extract your skills and experience.</p>
                    <button
                      onClick={() => setActiveView('chat')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                      Go to Chat & Upload
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'jobs' && (
            <motion.div key="jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Recommended Job Opportunities
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                      {jobs.length > 0 ? `${jobs.length} verified listings found via web discovery` : 'Live search results from Tavily, Greenhouse & Lever'}
                    </p>
                  </div>
                  {parsedResume && jobs.length > 0 && (
                    <button
                      onClick={() => {
                        matchJobs(sessionId).then(data => {
                          setJobMatches(data.matches || []);
                          toast.success('Jobs re-matched to resume!');
                        });
                      }}
                      className="text-xs border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                    >
                      Re-match with Resume
                    </button>
                  )}
                </div>

                {jobs.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8">
                    <p className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">No job searches performed yet</p>
                    <p className="text-xs text-gray-500 mb-5">Ask the assistant in chat to search for jobs (e.g., "Find React developer jobs in India").</p>
                    <button
                      onClick={() => setActiveView('chat')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                    >
                      Go to Chat & Search
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {jobs.map((job, i) => (
                      <JobCard key={job.id} job={job} match={matchMap[job.id]} onApply={handleApplyJob} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'applications' && (
            <motion.div key="apps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Application Tracker</h1>
                    <p className="text-xs text-gray-500 mt-1">Track prepared and submitted applications with saved cover letters</p>
                  </div>
                </div>

                <ApplicationHistory
                  applications={appsQuery.data?.applications || applications}
                  loading={appsQuery.isLoading}
                  onStatusChanged={() => {
                    appsQuery.refetch();
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
