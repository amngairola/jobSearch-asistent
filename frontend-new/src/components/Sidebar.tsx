import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, FileText, Briefcase, ClipboardList, PlusCircle, Bot, Sparkles, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

type View = 'chat' | 'resume' | 'jobs' | 'applications';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  onNewChat: () => void;
  hasResume: boolean;
  resumeFilename?: string | null;
  jobCount: number;
  appCount: number;
  sessionId: string;
}

const navItems = [
  { id: 'chat'         as View, icon: MessageSquare, label: 'AI Agent Chat' },
  { id: 'resume'       as View, icon: FileText,      label: 'My Resume Profile' },
  { id: 'jobs'         as View, icon: Briefcase,     label: 'Recommended Jobs' },
  { id: 'applications' as View, icon: ClipboardList, label: 'Application Tracker' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  onNewChat,
  hasResume,
  resumeFilename,
  jobCount,
  appCount,
  sessionId,
}) => {
  const badge = (count: number) => count > 0 ? (
    <span className="ml-auto text-xs bg-blue-600 text-white font-medium rounded-full px-2 py-0.5 min-w-[20px] text-center shadow-xs">
      {count}
    </span>
  ) : null;

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full shrink-0 shadow-xs">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white text-sm tracking-tight flex items-center gap-1.5">
            AI Job Assistant
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          </h2>
          <p className="text-[11px] text-gray-400 font-medium">Groq & Tavily Powered</p>
        </div>
      </div>

      {/* Action: New Conversation */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-2.5 rounded-xl transition-all shadow-xs hover:shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Session</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map(({ id, icon: Icon, label }) => (
          <motion.button
            key={id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onViewChange(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
              activeView === id
                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-2xs font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-100'
            )}
          >
            <Icon className={cn("w-4 h-4 shrink-0", activeView === id ? "text-blue-600 dark:text-blue-400" : "text-gray-400")} />
            <span className="flex-1 truncate">{label}</span>
            {id === 'resume' && hasResume && (
              <span className="flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 dark:bg-green-950/40 px-1.5 py-0.5 rounded-full font-medium">
                <CheckCircle2 className="w-2.5 h-2.5" />
              </span>
            )}
            {id === 'jobs' && badge(jobCount)}
            {id === 'applications' && badge(appCount)}
          </motion.button>
        ))}
      </nav>

      {/* Session info & status footer */}
      <div className="p-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-xs space-y-2">
        <div className="flex items-center justify-between text-gray-500">
          <span>Session:</span>
          <span className="font-mono text-[11px] bg-gray-200/60 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
            {sessionId.slice(0, 14)}...
          </span>
        </div>
        {hasResume && resumeFilename && (
          <div className="text-[11px] text-gray-500 truncate" title={resumeFilename}>
            📄 <span className="font-medium text-gray-700 dark:text-gray-300">{resumeFilename}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
