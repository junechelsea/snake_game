
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { geminiService, GeminiServiceCallbacks } from './services/geminiService';
import { AppStatus, ConversationTurn, CurrentTurn } from './types';
import ControlButton from './components/ControlButton';
import AudioVisualizer from './components/AudioVisualizer';
import TranscriptionLog from './components/TranscriptionLog';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [currentTurn, setCurrentTurn] = useState<CurrentTurn>({ user: '', model: '' });
  const [error, setError] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  
  const turnIdCounter = useRef(0);

  const handleToggleSession = useCallback(async () => {
    if (status === AppStatus.IDLE || status === AppStatus.ERROR) {
      setStatus(AppStatus.CONNECTING);
      setError(null);
      
      const callbacks: GeminiServiceCallbacks = {
        onStatusUpdate: (newStatus) => setStatus(newStatus),
        onTranscriptionUpdate: (update) => {
          setCurrentTurn(prev => ({
            user: update.user !== undefined ? prev.user + update.user : prev.user,
            model: update.model !== undefined ? prev.model + update.model : prev.model,
          }));
        },
        onTurnComplete: (completedTurn) => {
          setHistory(prev => [...prev, { ...completedTurn, id: turnIdCounter.current++ }]);
          setCurrentTurn({ user: '', model: '' });
        },
        onError: (errorMessage) => {
          setError(errorMessage);
          setStatus(AppStatus.ERROR);
        },
        onAnalyserNodeAvailable: (node) => {
          setAnalyserNode(node);
        },
      };

      try {
        await geminiService.startSession(callbacks);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(message);
        setStatus(AppStatus.ERROR);
      }
    } else {
      geminiService.stopSession();
      setStatus(AppStatus.IDLE);
      setAnalyserNode(null);
    }
  }, [status]);

  useEffect(() => {
    return () => {
      geminiService.stopSession();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-cyan-300">
      <header className="text-center p-4 border-b border-cyan-900/50">
        <h1 className="text-2xl md:text-3xl font-bold text-glow">Gemini Conversational AI</h1>
        <p className="text-sm text-cyan-500">Powered by the Gemini 2.5 Native Audio API</p>
      </header>

      <main className="flex-grow p-4 overflow-y-auto flex flex-col">
        <TranscriptionLog history={history} currentTurn={currentTurn} />
      </main>

      <footer className="w-full flex-shrink-0 px-4 pb-4 pt-2 bg-gray-900">
         {error && (
          <div className="text-center text-red-400 mb-2">
            <p>Error: {error}</p>
          </div>
        )}
        <div className="h-24 w-full max-w-2xl mx-auto mb-4">
          <AudioVisualizer analyserNode={analyserNode} />
        </div>
        <div className="flex justify-center items-center">
          <ControlButton status={status} onClick={handleToggleSession} />
        </div>
      </footer>
    </div>
  );
};

export default App;
