
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { AppStatus } from '../types';

// --- Utility Functions ---

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


// --- Service Callbacks Interface ---

export interface GeminiServiceCallbacks {
  onStatusUpdate: (status: AppStatus) => void;
  onTranscriptionUpdate: (update: { user?: string; model?: string }) => void;
  onTurnComplete: (completedTurn: { user: string; model: string }) => void;
  onError: (error: string) => void;
  onAnalyserNodeAvailable: (analyserNode: AnalyserNode) => void;
}

// --- Gemini Live Service Class ---

class GeminiLiveService {
  private ai: GoogleGenAI | null = null;
  private session: LiveSession | null = null;
  private sessionPromise: Promise<LiveSession> | null = null;

  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;

  private outputSources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;

  private currentInputTranscription = '';
  private currentOutputTranscription = '';

  private callbacks: GeminiServiceCallbacks | null = null;

  constructor() {
    if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }

  private cleanup() {
    this.scriptProcessor?.disconnect();
    this.scriptProcessor = null;
    this.mediaStreamSource?.disconnect();
    this.mediaStreamSource = null;
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
    this.inputAudioContext?.close().catch(console.error);
    this.inputAudioContext = null;
    this.outputAudioContext?.close().catch(console.error);
    this.outputAudioContext = null;

    this.outputSources.forEach(source => source.stop());
    this.outputSources.clear();
    this.nextStartTime = 0;
    
    this.currentInputTranscription = '';
    this.currentOutputTranscription = '';

    this.session?.close();
    this.session = null;
    this.sessionPromise = null;
  }

  public async startSession(callbacks: GeminiServiceCallbacks): Promise<void> {
    this.callbacks = callbacks;
    if (!this.ai) {
      this.callbacks.onError('API key not configured. Please set the API_KEY environment variable.');
      return;
    }

    try {
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => this.handleSessionOpen(),
          onmessage: (message) => this.handleSessionMessage(message),
          onerror: (e) => this.callbacks?.onError(e.message || 'An unknown session error occurred.'),
          onclose: () => this.stopSession(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are a friendly and helpful conversational AI. Be concise and natural in your responses.',
        },
      });

      this.session = await this.sessionPromise;
    } catch (e) {
      this.cleanup();
      const message = e instanceof Error ? e.message : 'Failed to start Gemini session.';
      this.callbacks.onError(message);
      throw e;
    }
  }

  public stopSession(): void {
    this.cleanup();
    this.callbacks?.onStatusUpdate(AppStatus.IDLE);
  }

  private async handleSessionOpen(): Promise<void> {
    this.callbacks?.onStatusUpdate(AppStatus.LISTENING);
    
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
        this.callbacks?.onError('Microphone access denied. Please allow microphone permissions in your browser settings.');
        this.stopSession();
        return;
    }

    this.mediaStreamSource = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    const analyserNode = this.inputAudioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    this.callbacks?.onAnalyserNodeAvailable(analyserNode);

    this.scriptProcessor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const l = inputData.length;
      const int16 = new Int16Array(l);
      for (let i = 0; i < l; i++) {
        int16[i] = inputData[i] * 32768;
      }
      const pcmBlob: Blob = {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
      };
      
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.mediaStreamSource.connect(analyserNode);
    analyserNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleSessionMessage(message: LiveServerMessage): Promise<void> {
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      this.currentInputTranscription += text;
      this.callbacks?.onTranscriptionUpdate({ user: text });
    }
    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      this.currentOutputTranscription += text;
      this.callbacks?.onTranscriptionUpdate({ model: text });
    }

    if (message.serverContent?.turnComplete) {
      const completedTurn = {
        user: this.currentInputTranscription.trim(),
        model: this.currentOutputTranscription.trim()
      };
      if (completedTurn.user || completedTurn.model) {
        this.callbacks?.onTurnComplete(completedTurn);
      }
      this.currentInputTranscription = '';
      this.currentOutputTranscription = '';
    }
    
    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      const audioBuffer = await decodeAudioData(decode(audioData), this.outputAudioContext, 24000, 1);
      
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);
      source.addEventListener('ended', () => this.outputSources.delete(source));

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.outputSources.add(source);
    }

    if (message.serverContent?.interrupted) {
      this.outputSources.forEach(source => source.stop());
      this.outputSources.clear();
      this.nextStartTime = 0;
    }
  }
}

export const geminiService = new GeminiLiveService();
