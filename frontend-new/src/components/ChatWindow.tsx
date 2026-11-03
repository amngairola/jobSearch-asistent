import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, AlertCircle, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { JobCard } from './JobCard';
import { ResumeUploader } from './ResumeUploader';
import type { Job, JobMatch, ParsedResume, ChatResponse } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  jobs?: Job[];
}

interface ChatWindowProps {
  sessionId: string;
  parsedResume: ParsedResume | null;
  resumeFilename?: string | null;
  onResumeUploaded: (resume: ParsedResume, filename?: string) => void;
  onRemoveResume?: () => void;
  onJobsReceived: (jobs: Job[]) => void;
  onSendMessage: (message: string) => Promise<ChatResponse>;
  uploading: boolean;
  onUploadResume: (file: File) => void;
  jobMatches: JobMatch[];
  onApplyJob: (job: Job) => void;
  onViewAllJobs?: () => void;
}

const SUGGESTED_PROMPTS = [
  'Find React developer jobs in India',
  'Search for remote Node.js internships',
  'Find jobs matching my resume',
  'Explain why the top job matches my profile',
  'Show my applications',
];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  sessionId,
  parsedResume,
  resumeFilename,
  onResumeUploaded,
  onRemoveResume,
  onJobsReceived,
  onSendMessage,
  uploading,
  onUploadResume,
  jobMatches,
  onApplyJob,
  onViewAllJobs,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hi! I'm your **AI Job Assistant** powered by Groq & Tavily.

Here is what I can do for you:
1. 📄 **Upload & Parse Resume**: Upload your PDF/DOCX to extract your technical skills, experience & education.
2. 🔍 **Search Live Jobs**: Search real positions across the web with natural language queries.
3. 🎯 **Resume Matching**: Score and match jobs against your specific skill set.
4. ✍️ **Cover Letters & Apply**: Generate customized cover letters and prepare applications.
5. 📊 **Application Tracking**: Keep track of applied positions and their statuses.

*Upload your resume above or choose a suggested query below to get started!*`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const addMessage = (msg: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: `msg_${Date.now()}_${Math.random()}` }]);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        role: 'assistant',
        content: 'Conversation cleared. How can I help with your job search today?'
      }
    ]);
  };

  const handleSend = useCallback(async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;
    setInput('');
    addMessage({ role: 'user', content: msgText });
    setLoading(true);
    try {
      const res = await onSendMessage(msgText);
      const assistantMsg: Message = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: res.response || 'I processed your request.',
        jobs: res.recommended_jobs || undefined
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (res.recommended_jobs && res.recommended_jobs.length > 0) {
        onJobsReceived(res.recommended_jobs);
      }
    } catch (err: any) {
      addMessage({
        role: 'error',
        content: err?.response?.data?.error || err.message || 'Something went wrong processing your request.'
      });
    } finally {
      setLoading(false);
    }
  }, [input, loading, onSendMessage, onJobsReceived]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const matchMap = Object.fromEntries(jobMatches.map(m => [m.jobId, m]));

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50">
      {/* Top Banner: Resume Uploader is prominent at the top */}
      <div className="p-4 pb-2 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
        <ResumeUploader
          onUpload={onUploadResume}
          uploading={uploading}
          resumeFilename={resumeFilename}
          parsedResume={parsedResume}
          onRemoveResume={onRemoveResume}
        />
      </div>

      {/* Chat header toolbar */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-b border-gray-100 dark:border-gray-800">
        <span className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
          <Bot className="w-3.5 h-3.5 text-blue-600" />
          AI Job Agent Session
        </span>
        <button
          onClick={handleClearChat}
          className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
          title="Clear conversation"
        >
          <Trash2 className="w-3 h-3" /> Clear Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}
          >
            {/* Avatar */}
            <div className={cn(
              'w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white shadow-sm',
              msg.role === 'user'
                ? 'bg-blue-600'
                : msg.role === 'error'
                ? 'bg-red-500'
                : 'bg-gradient-to-br from-indigo-500 to-blue-600'
            )}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : msg.role === 'error' ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className={cn('max-w-[85%] space-y-3', msg.role === 'user' && 'items-end')}>
              {/* Message Bubble */}
              <div className={cn(
                'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : msg.role === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-tl-sm'
                  : 'bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-sm'
              )}>
                <ReactMarkdown
                  className="prose prose-sm max-w-none dark:prose-invert break-words [&>p]:mb-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4"
                  components={{
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-700"
                      />
                    )
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* Inline job cards */}
              {msg.jobs && msg.jobs.length > 0 && (
                <div className="grid gap-2 w-full mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
                    <span>Recommended Jobs ({msg.jobs.length})</span>
                    {onViewAllJobs && (
                      <button
                        onClick={onViewAllJobs}
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        View all <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {msg.jobs.slice(0, 4).map((job, i) => (
                    <JobCard key={job.id} job={job} match={matchMap[job.id]} onApply={onApplyJob} index={i} />
                  ))}
                  {msg.jobs.length > 4 && onViewAllJobs && (
                    <button
                      onClick={onViewAllJobs}
                      className="text-xs text-center py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors font-medium"
                    >
                      +{msg.jobs.length - 4} more jobs. Click to view all in Recommended Jobs tab →
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Thinking indicator */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                <Sparkles className="w-4 h-4 animate-spin text-blue-500" />
                <span>Thinking & querying tools...</span>
                <div className="flex gap-1 ml-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="text-xs bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full transition-colors shadow-2xs"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-4 pt-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200/80 dark:border-gray-800">
        <div className="flex gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl p-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything: 'Find React jobs in India', 'Match jobs to resume', 'Write a cover letter'..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none py-1.5 px-3 max-h-32"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-3.5 py-2 transition-colors shrink-0 flex items-center justify-center shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-1.5">
          Press <kbd className="font-sans px-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">Enter</kbd> to send · <kbd className="font-sans px-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
};
