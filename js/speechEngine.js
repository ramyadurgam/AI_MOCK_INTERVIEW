/**
 * InterviewAI - Audio & Speech Engine (TTS, STT, and WebRTC Visualizer)
 */

class SpeechEngine {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.isRecognizing = false;
    this.recognition = null;
    this.audioContext = null;
    this.analyser = null;
    this.micStream = null;
    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    } else {
      console.warn('SpeechRecognition API not natively supported in this browser.');
    }
  }

  speak(text, onStart, onEnd) {
    if (!this.synthesis) {
      if (onEnd) onEnd();
      return;
    }

    // Cancel ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Pick best English voice if available
    const voices = this.synthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('David')));
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      if (onEnd) onEnd();
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  startListening(onResult, onError) {
    if (!this.recognition) {
      if (onError) onError('Speech Recognition is not supported in this browser. Please type your response.');
      return false;
    }

    if (this.isRecognizing) return true;

    try {
      this.isRecognizing = true;
      let finalTranscript = '';

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (onResult) {
          onResult(finalTranscript + interimTranscript, Boolean(finalTranscript));
        }
      };

      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        if (onError) onError(event.error);
      };

      this.recognition.onend = () => {
        this.isRecognizing = false;
      };

      this.recognition.start();
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      this.isRecognizing = false;
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isRecognizing) {
      this.recognition.stop();
      this.isRecognizing = false;
    }
  }

  // WebRTC Camera Helper
  async startCamera(videoElement) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device access not supported.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
      }
      return stream;
    } catch (err) {
      console.warn('Webcam permission denied or device not found:', err.message);
      return null;
    }
  }

  stopMediaStream(stream) {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }
}

window.speechEngine = new SpeechEngine();
