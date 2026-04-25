import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X, Sparkles, Activity } from 'lucide-react';

interface VoiceAssistantProps {
  onCommand: (command: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceAssistant({ onCommand, isOpen, onClose }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Awaiting Command');

  // @ts-ignore
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  useEffect(() => {
    if (!recognition) return;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('Listening...');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const text = event.results[current][0].transcript;
      setTranscript(text);
    };

    recognition.onend = () => {
      setIsListening(false);
      setStatus('Processing...');
      setTimeout(() => {
        if (transcript) {
          onCommand(transcript.toLowerCase());
          setTranscript('');
          setStatus('Executed!');
          setTimeout(onClose, 1000);
        } else {
          setStatus('Awaiting Command');
        }
      }, 500);
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsListening(false);
      setStatus('Interference detected. Retry.');
    };
  }, [transcript]);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      setTranscript('');
      recognition?.start();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col justify-end p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      <button className="absolute inset-0 w-full h-full cursor-default" onClick={onClose} aria-label="Close modal" />
      
      <div className="relative w-full max-w-md mx-auto">
        <div className="card-hero bg-black/80 backdrop-blur-2xl border-accent/30 p-8 shadow-2xl rounded-[40px] flex flex-col items-center animate-slide-up">
          
          <button onClick={onClose} className="absolute top-6 right-6 icon-btn bg-white/5 hover:bg-white/10 w-10 h-10 rounded-full">
            <X size={18} />
          </button>

          {/* AI Header */}
          <div className="flex items-center gap-2 mb-8 text-accent">
             <Sparkles size={16} className={isListening ? 'animate-pulse' : ''} />
             <span className="text-[0.65rem] font-black tracking-widest uppercase">CrowdFlow Neural Voice</span>
          </div>

          {/* Transcript Area */}
          <div className="h-24 w-full flex items-center justify-center mb-8 px-4 text-center">
            {transcript ? (
              <p className="text-xl font-medium leading-tight text-white/90">"{transcript}"</p>
            ) : (
               <div className="flex flex-col gap-2 text-white/40">
                  <p className="text-sm font-medium">"Find the nearest exit"</p>
                  <p className="text-xs font-medium">"Where is my seat?" · "Show food options"</p>
               </div>
            )}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2 mb-8">
             <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-danger animate-pulse' : 'bg-accent'}`} />
             <span className="text-xs font-black tracking-widest text-white/50 uppercase">{status}</span>
          </div>

          {/* Mic Button & Sound Waves */}
          <div className="relative flex items-center justify-center w-40 h-40">
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full border border-danger/30 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-4 rounded-full border border-danger/20 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
              </>
            )}
            
            <button 
              onClick={toggleListening}
              className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ 
                background: isListening 
                  ? 'linear-gradient(135deg, var(--danger) 0%, #7f1d1d 100%)' 
                  : 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                boxShadow: isListening ? '0 0 40px rgba(239,68,68,0.4)' : '0 10px 30px rgba(99,102,241,0.3)'
              }}
            >
              {isListening ? <Activity size={32} className="text-white animate-pulse" /> : <Mic size={32} className="text-white" />}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
