import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_KEY = 'ai_job_assistant_session_id';

export function useSession() {
  const [sessionId, setSessionId] = useState<string>(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const newId = `session_${uuidv4()}`;
    localStorage.setItem(SESSION_KEY, newId);
    return newId;
  });

  const resetSession = () => {
    const newId = `session_${uuidv4()}`;
    localStorage.setItem(SESSION_KEY, newId);
    setSessionId(newId);
  };

  return { sessionId, resetSession };
}
