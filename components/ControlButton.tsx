
import React from 'react';
import { AppStatus } from '../types';

interface ControlButtonProps {
  status: AppStatus;
  onClick: () => void;
}

const MicrophoneIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
  </svg>
);

const StopIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h12v12H6z" />
  </svg>
);

const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const ErrorIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ControlButton: React.FC<ControlButtonProps> = ({ status, onClick }) => {
  const getButtonContent = () => {
    switch (status) {
      case AppStatus.CONNECTING:
        return <LoadingSpinner />;
      case AppStatus.LISTENING:
        return <StopIcon />;
      case AppStatus.ERROR:
        return <ErrorIcon />;
      case AppStatus.IDLE:
      default:
        return <MicrophoneIcon />;
    }
  };

  const getButtonClass = () => {
    switch (status) {
      case AppStatus.LISTENING:
        return 'bg-red-500 hover:bg-red-600 animate-pulse';
      case AppStatus.ERROR:
        return 'bg-yellow-600 hover:bg-yellow-700';
      case AppStatus.IDLE:
      case AppStatus.CONNECTING:
      default:
        return 'bg-cyan-500 hover:bg-cyan-600';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={status === AppStatus.CONNECTING}
      className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-cyan-400/50 glow-shadow ${getButtonClass()}`}
      aria-label={status === AppStatus.LISTENING ? "Stop session" : "Start session"}
    >
      {getButtonContent()}
    </button>
  );
};

export default ControlButton;
