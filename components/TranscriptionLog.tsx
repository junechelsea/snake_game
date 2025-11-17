
import React, { useRef, useEffect } from 'react';
import { ConversationTurn, CurrentTurn } from '../types';

interface TranscriptionLogProps {
  history: ConversationTurn[];
  currentTurn: CurrentTurn;
}

const Turn: React.FC<{ turn: ConversationTurn }> = ({ turn }) => (
  <>
    {turn.user && (
      <div className="p-3 my-2 rounded-lg bg-cyan-900/30 self-end max-w-xl">
        <p className="font-bold text-cyan-400">You</p>
        <p className="text-gray-200 whitespace-pre-wrap">{turn.user}</p>
      </div>
    )}
    {turn.model && (
      <div className="p-3 my-2 rounded-lg bg-gray-800/60 self-start max-w-xl">
        <p className="font-bold text-cyan-200">Gemini</p>
        <p className="text-gray-200 whitespace-pre-wrap">{turn.model}</p>
      </div>
    )}
  </>
);

const CurrentTurnDisplay: React.FC<{ turn: CurrentTurn }> = ({ turn }) => (
  <>
    {turn.user && (
      <div className="p-3 my-2 rounded-lg bg-cyan-900/20 self-end max-w-xl opacity-70">
        <p className="font-bold text-cyan-400">You</p>
        <p className="text-gray-300 whitespace-pre-wrap">{turn.user}</p>
      </div>
    )}
    {turn.model && (
      <div className="p-3 my-2 rounded-lg bg-gray-800/40 self-start max-w-xl opacity-70">
        <p className="font-bold text-cyan-300">Gemini</p>
        <p className="text-gray-300 whitespace-pre-wrap">{turn.model}</p>
      </div>
    )}
  </>
);

const TranscriptionLog: React.FC<TranscriptionLogProps> = ({ history, currentTurn }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, currentTurn]);

  const hasContent = history.length > 0 || currentTurn.user || currentTurn.model;

  return (
    <div ref={scrollRef} className="w-full max-w-4xl mx-auto flex-grow flex flex-col overflow-y-auto pr-2">
      {!hasContent && (
        <div className="m-auto text-center text-cyan-600">
          <h2 className="text-xl">Start the conversation!</h2>
          <p>Click the button below to begin speaking.</p>
        </div>
      )}
      {history.map((turn) => <Turn key={turn.id} turn={turn} />)}
      {(currentTurn.user || currentTurn.model) && <CurrentTurnDisplay turn={currentTurn} />}
    </div>
  );
};

export default TranscriptionLog;
