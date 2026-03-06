import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Recycle, Leaf, Apple, Trash2, Sparkles, Heart, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const RPI_WS_URL = 'ws://10.42.205.220:8765';
const MCQ_TIMEOUT_SECONDS = 15;
const CONFIDENCE_THRESHOLD = 0.75;   // RPi must send confidence >= 0.75 (75%)
const SUSTAINED_FRAMES_REQUIRED = 3; // must pass threshold N frames in a row

// ─── MCQ DATABASE ─────────────────────────────────────────────────────────────
const MCQ_DATA = {
  banana: {
    emoji: '🍌',
    label: 'Banana',
    question: 'What type of waste is a banana peel?',
    options: [
      { id: 'A', text: 'Organic Waste', icon: '🌿', correct: true },
      { id: 'B', text: 'Inorganic Waste', icon: '🔩', correct: false },
    ],
    correctBin: 'organic',
    funFact: 'Banana peels decompose in just 2–5 weeks and make excellent compost! 🌱',
  },
  bottle: { // <--- ADDED BOTTLE LOGIC HERE
    emoji: '🍾',
    label: 'Plastic Bottle',
    question: 'Which bin is meant for plastic bottles?',
    options: [
      { id: 'A', text: 'Plastic / Recyclables', icon: '♻️', correct: true },
      { id: 'B', text: 'Organic / Compost', icon: '🌿', correct: false },
    ],
    correctBin: 'plastic',
    funFact: 'Recycling one plastic bottle saves enough energy to power a 60W lightbulb for 6 hours! 💡',
  }
};

// ─── IDLE SCREENS ─────────────────────────────────────────────────────────────
const IDLE_SCREENS = [
  {
    id: 'welcome',
    title: "Hi! I'm BinGenius 👋",
    subtitle: 'Your Smart Recycling Companion',
    color: 'from-emerald-400 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
    icon: Sparkles,
    content: "Let's make the world cleaner together!",
    mascotMood: 'happy',
  },
  {
    id: 'lifecycle',
    title: 'Life Cycle of an Apple 🍎',
    color: 'from-green-400 to-lime-500',
    bgGradient: 'from-green-50 to-lime-50',
    icon: Apple,
    stages: [
      { emoji: '🌱', text: 'Seed', time: '0–2 weeks' },
      { emoji: '🌳', text: 'Tree', time: '3–5 years' },
      { emoji: '🍎', text: 'Apple', time: '6 months' },
      { emoji: '🗑️', text: 'Waste', time: '2–3 weeks' },
      { emoji: '🌿', text: 'Compost', time: '3–6 months' },
    ],
    mascotMood: 'excited',
  },
  {
    id: 'recycle-fact',
    title: 'Recycling Power! ♻️',
    color: 'from-blue-400 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50',
    icon: Recycle,
    fact: 'Recycling 1 aluminum can saves enough energy to power a laptop for 3 hours!',
    stat: '95% energy saved',
    mascotMood: 'proud',
  },
  {
    id: 'non-recycle-fact',
    title: 'Why Recycling Matters ⚠️',
    color: 'from-orange-400 to-red-500',
    bgGradient: 'from-orange-50 to-red-50',
    icon: AlertCircle,
    fact: 'Plastic bottles can take up to 450 years to decompose in landfills!',
    stat: '450 years',
    mascotMood: 'worried',
  },
  {
    id: 'inorganic',
    title: 'Inorganic Waste Facts 🔧',
    color: 'from-slate-400 to-gray-600',
    bgGradient: 'from-slate-50 to-gray-100',
    icon: Trash2,
    content: 'Glass, metals, and plastics never fully decompose. Recycling is the only way!',
    examples: ['Glass bottles', 'Metal cans', 'Plastic containers', 'Electronics'],
    mascotMood: 'thinking',
  },
];

// ─── MASCOT ───────────────────────────────────────────────────────────────────
const BinMascot = ({ mood, size = 'md' }) => {
  const moods = {
    happy: { eyes: '😊', color: 'text-yellow-500' },
    excited: { eyes: '🤩', color: 'text-green-500' },
    proud: { eyes: '😎', color: 'text-blue-500' },
    worried: { eyes: '😟', color: 'text-orange-500' },
    thinking: { eyes: '🤔', color: 'text-gray-600' },
    celebrate: { eyes: '🥳', color: 'text-purple-500' },
    sad: { eyes: '😔', color: 'text-red-500' },
  };
  const m = moods[mood] || moods.happy;
  const sizeClass = size === 'sm' ? 'w-20 h-24' : 'w-32 h-40';
  const faceSize = size === 'sm' ? 'w-12 h-12' : 'w-20 h-20';
  const iconSize = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10';
  const emojiSize = size === 'sm' ? 'text-2xl' : 'text-4xl';
  const faceTop = size === 'sm' ? 'top-8' : 'top-12';

  return (
    <div className="relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="absolute animate-float-particle"
            style={{ left: `${20 + i * 15}%`, animationDelay: `${i * 0.5}s`, animationDuration: `${3 + i}s` }}>
            <Sparkles className="w-4 h-4 text-yellow-400 opacity-60" />
          </div>
        ))}
      </div>
      <div className="relative animate-bounce-gentle">
        <div className={`${sizeClass} ${m.color} rounded-3xl rounded-t-xl shadow-2xl relative overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-[90%] h-6 bg-gradient-to-b from-gray-700 to-gray-600 rounded-t-xl shadow-lg animate-lid-wiggle" />
          <div className={`absolute ${faceTop} left-1/2 transform -translate-x-1/2 ${faceSize} bg-white rounded-full flex items-center justify-center shadow-inner`}>
            <span className={emojiSize}>{m.eyes}</span>
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <Recycle className={`${iconSize} text-white/80`} />
          </div>
        </div>
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-[85%] h-4 bg-black/20 rounded-full blur-md" />
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const BinGeniusDisplay = () => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [idleProgress, setIdleProgress] = useState(0);
  const [mode, setMode] = useState('idle');
  const [detectedItem, setDetectedItem] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [countdown, setCountdown] = useState(MCQ_TIMEOUT_SECONDS);
  const [wrongShake, setWrongShake] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting');

  // ── Refs ───────────────────────────────────────────────────────────────────
  const modeRef = useRef('idle');
  const confidenceCountRef = useRef({});      // { itemKey: frameCount }
  const lastItemRef = useRef(null);
  const wsRef = useRef(null);
  const countdownRef = useRef(null);
  const resetTimerRef = useRef(null);
  const startMCQRef = useRef(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── startMCQ ───────────────────────────────────────────────────────────────
  const startMCQ = useCallback((itemKey) => {
    setDetectedItem(itemKey);
    setSelectedOption(null);
    setCountdown(MCQ_TIMEOUT_SECONDS);
    setMode('mcq');
  }, []);

  useEffect(() => { startMCQRef.current = startMCQ; }, [startMCQ]);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    try {
      const ws = new WebSocket(RPI_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        console.log('[WS] Connected to Raspberry Pi');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log('[WS] Received:', msg);

          if (msg.type === 'detected') {
            const itemKey = msg.item?.toLowerCase();
            const confidence = typeof msg.confidence === 'number' ? msg.confidence : 1.0;

            if (!MCQ_DATA[itemKey]) {
              console.warn(`[WS] Unknown item "${itemKey}" — add it to MCQ_DATA`);
              return;
            }

            if (modeRef.current !== 'idle') {
              console.log(`[WS] Skipped — mode is "${modeRef.current}", not idle`);
              return;
            }

            if (lastItemRef.current !== itemKey) {
              confidenceCountRef.current = {};
              lastItemRef.current = itemKey;
            }

            if (confidence >= CONFIDENCE_THRESHOLD) {
              confidenceCountRef.current[itemKey] =
                (confidenceCountRef.current[itemKey] || 0) + 1;

              if (confidenceCountRef.current[itemKey] >= SUSTAINED_FRAMES_REQUIRED) {
                console.log(`[WS] ✅ Launching MCQ for "${itemKey}"`);
                confidenceCountRef.current = {};
                lastItemRef.current = null;
                startMCQRef.current(itemKey);
              }
            } else {
              confidenceCountRef.current[itemKey] = 0;
            }
          }
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        console.log('[WS] Disconnected — retrying in 3s');
        setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        setWsStatus('disconnected');
        ws.close();
      };
    } catch (e) {
      setWsStatus('disconnected');
      setTimeout(connectWS, 3000);
    }
  }, []);

  useEffect(() => {
    connectWS();
    return () => wsRef.current?.close();
  }, [connectWS]);

  const sendToRPi = (payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  // ── Idle carousel ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'idle') return;
    const interval = setInterval(() => {
      setIdleProgress((prev) => {
        if (prev >= 100) {
          setCurrentScreen((s) => (s + 1) % IDLE_SCREENS.length);
          return 0;
        }
        return prev + 100 / 70;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [mode]);

  // ── MCQ countdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'mcq') { clearInterval(countdownRef.current); return; }
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current); handleTimeout(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [mode, detectedItem]);

  // <--- DYNAMIC ROUTING FIXES FOR ROTATION --->
  const handleTimeout = () => {
    setMode('timeout');
    const rotDir = MCQ_DATA[detectedItem]?.correctBin === 'organic' ? 'right' : 'left';
    sendToRPi({ type: 'rotate', direction: rotDir, item: detectedItem, reason: 'timeout' });
    scheduleReset();
  };

  const handleOptionSelect = (option) => {
    if (selectedOption) return;
    clearInterval(countdownRef.current);
    setSelectedOption(option.id);

    if (option.correct) {
      setTimeout(() => {
        setMode('correct');
        const rotDir = MCQ_DATA[detectedItem].correctBin === 'organic' ? 'right' : 'left';
        sendToRPi({ type: 'rotate', direction: rotDir, item: detectedItem, reason: 'correct_answer' });
        scheduleReset();
      }, 600);
    } else {
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 800);
      setMode('wrong');
      setTimeout(() => {
        setSelectedOption(null);
        setMode('mcq');
        setCountdown(MCQ_TIMEOUT_SECONDS);
      }, 2500);
    }
  };

  const scheduleReset = () => {
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setMode('idle');
      setDetectedItem(null);
      setSelectedOption(null);
      setIdleProgress(0);
    }, 4000);
  };

  // ── Demo: press D or B ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'd' || e.key === 'D') startMCQ('banana');
      if (e.key === 'b' || e.key === 'B') startMCQ('bottle');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startMCQ]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const screen = IDLE_SCREENS[currentScreen];

  if (mode === 'idle') {
    return <IdleDisplay screen={screen} progress={idleProgress} wsStatus={wsStatus} />;
  }

  const mcq = MCQ_DATA[detectedItem];
  if (mode === 'mcq' || mode === 'wrong') {
    return (
      <MCQScreen
        mcq={mcq}
        countdown={countdown}
        selectedOption={selectedOption}
        onSelect={handleOptionSelect}
        wrongShake={wrongShake}
        isWrong={mode === 'wrong'}
        wsStatus={wsStatus}
      />
    );
  }

  if (mode === 'correct') return <CorrectScreen mcq={mcq} />;
  if (mode === 'timeout') return <TimeoutScreen mcq={mcq} />;
  return null;
};

// ─── IDLE DISPLAY ─────────────────────────────────────────────────────────────
const IdleDisplay = ({ screen, progress, wsStatus }) => (
  <div className={`min-h-screen bg-gradient-to-br ${screen.bgGradient} transition-all duration-1000 overflow-hidden relative`}>
    <FloatingBg color={screen.color} />
    <div className="absolute top-4 right-4 z-20">
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm
        ${wsStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-400/40'
          : wsStatus === 'connecting' ? 'bg-yellow-500/20  text-yellow-700  border border-yellow-400/40'
            : 'bg-red-500/20     text-red-700     border border-red-400/40'}`}>
        <span className={`w-2 h-2 rounded-full
          ${wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse'
            : wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500'}`} />
        {wsStatus === 'connected' ? 'RPi Connected' : wsStatus === 'connecting' ? 'Connecting…' : 'RPi Offline'}
      </div>
    </div>
    <div className="relative z-10 container mx-auto px-6 py-8 h-screen flex flex-col">
      <div className="flex justify-between items-start mb-8 animate-slide-down">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <screen.icon className={`w-10 h-10 bg-gradient-to-br ${screen.color} text-white p-2 rounded-xl shadow-lg`} />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {screen.title}
            </h1>
          </div>
          {screen.subtitle && (
            <p className="text-xl text-gray-600 ml-14 animate-fade-in-delay">{screen.subtitle}</p>
          )}
        </div>
        <BinMascot mood={screen.mascotMood} />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-4xl">
          {screen.id === 'welcome' && <WelcomeContent screen={screen} />}
          {screen.id === 'lifecycle' && <LifecycleContent screen={screen} />}
          {screen.id === 'recycle-fact' && <FactContent screen={screen} />}
          {screen.id === 'non-recycle-fact' && <NonRecycleContent screen={screen} />}
          {screen.id === 'inorganic' && <InorganicContent screen={screen} />}
        </div>
      </div>
      <div className="mt-auto animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-gray-500 font-medium">Place waste to start ♻️</span>
          <span className="text-xs text-gray-400">| Press D (Banana) or B (Bottle) to demo</span>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-full h-4 overflow-hidden shadow-lg mb-3">
          <div className={`h-full bg-gradient-to-r ${screen.color} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-gray-600 text-sm font-medium">
          Next in {Math.ceil((100 - progress) * 0.07)} seconds
        </p>
      </div>
    </div>
    <Animations />
  </div>
);

// ─── MCQ SCREEN ───────────────────────────────────────────────────────────────
const MCQScreen = ({ mcq, countdown, selectedOption, onSelect, wrongShake, isWrong }) => {
  const urgency = countdown <= 5;
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50 overflow-hidden relative">
      <FloatingBg color="from-violet-400 to-purple-500" />
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
        <div className={`relative w-20 h-20 ${urgency ? 'animate-pulse' : ''}`}>
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none"
              stroke={urgency ? '#ef4444' : '#8b5cf6'}
              strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / MCQ_TIMEOUT_SECONDS)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-black ${urgency ? 'text-red-500' : 'text-purple-700'}`}>{countdown}</span>
          </div>
        </div>
        <span className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" /> seconds left
        </span>
      </div>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div className="animate-scale-in mb-8">
          <div className="bg-white rounded-3xl shadow-2xl px-10 py-6 text-center border-4 border-purple-200">
            <div className="text-7xl mb-3">{mcq.emoji}</div>
            <h2 className="text-2xl font-black text-gray-800">
              I detected a <span className="text-purple-600">{mcq.label}</span>!
            </h2>
            <p className="text-lg text-gray-600 mt-2 font-medium">{mcq.question}</p>
          </div>
        </div>
        {isWrong && (
          <div className="mb-6 bg-red-100 border-2 border-red-400 rounded-2xl px-8 py-4 flex items-center gap-3 animate-shake-once">
            <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-black text-red-700 text-lg">Oops! Wrong answer! ❌</p>
              <p className="text-red-600 text-sm">Think again — choose the correct option!</p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-4 w-full max-w-lg animate-slide-up-cascade">
          {mcq.options.map((opt, i) => {
            const isSelected = selectedOption === opt.id;
            return (
              <button key={opt.id} onClick={() => onSelect(opt)}
                className={`group relative flex items-center gap-5 w-full px-8 py-6 rounded-2xl border-4 text-left
                  font-bold text-xl transition-all duration-200 shadow-lg
                  ${isSelected && opt.correct ? 'bg-emerald-100 border-emerald-500 scale-105' : ''}
                  ${isSelected && !opt.correct ? 'bg-red-100 border-red-500 animate-shake-once' : ''}
                  ${!isSelected ? 'bg-white border-purple-200 hover:border-purple-500 hover:scale-105 hover:shadow-2xl active:scale-95 cursor-pointer' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
                disabled={!!selectedOption}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0
                  ${isSelected && opt.correct ? 'bg-emerald-500 text-white' : ''}
                  ${isSelected && !opt.correct ? 'bg-red-500 text-white' : ''}
                  ${!isSelected ? 'bg-purple-100 text-purple-700 group-hover:bg-purple-500 group-hover:text-white transition-colors' : ''}`}>
                  {opt.id}
                </div>
                <span className="text-3xl">{opt.icon}</span>
                <span className={`flex-1
                  ${isSelected && opt.correct ? 'text-emerald-800' : ''}
                  ${isSelected && !opt.correct ? 'text-red-800' : ''}
                  ${!isSelected ? 'text-gray-800' : ''}`}>
                  {opt.text}
                </span>
                {isSelected && opt.correct && <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />}
                {isSelected && !opt.correct && <XCircle className="w-8 h-8 text-red-500     flex-shrink-0" />}
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-gray-400 text-sm">Tap an option to answer</p>
      </div>
      <Animations />
    </div>
  );
};

// ─── CORRECT SCREEN ───────────────────────────────────────────────────────────
const CorrectScreen = ({ mcq }) => (
  <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col items-center justify-center px-6 text-center">
    <FloatingBg color="from-emerald-400 to-green-500" />
    <div className="relative z-10 animate-scale-in">
      <div className="text-9xl mb-6">🎉</div>
      <h1 className="text-5xl font-black text-emerald-700 mb-3">Correct! Well Done!</h1>
      <p className="text-2xl text-emerald-600 mb-8">The flap is rotating to the <strong>{mcq.correctBin} bin</strong> ♻️</p>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg mx-auto border-4 border-emerald-300">
        <div className="text-4xl mb-3">💡 Fun Fact</div>
        <p className="text-lg text-gray-700 leading-relaxed">{mcq.funFact}</p>
      </div>
      <div className="mt-8 flex items-center justify-center gap-3 text-emerald-600">
        <div className="w-6 h-6 border-4 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
        <span className="text-lg font-medium">Returning to home screen…</span>
      </div>
    </div>
    <Animations />
  </div>
);

// ─── TIMEOUT SCREEN ───────────────────────────────────────────────────────────
const TimeoutScreen = ({ mcq }) => (
  <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex flex-col items-center justify-center px-6 text-center">
    <FloatingBg color="from-amber-400 to-orange-500" />
    <div className="relative z-10 animate-scale-in">
      <div className="text-9xl mb-6">⏱️</div>
      <h1 className="text-5xl font-black text-amber-700 mb-3">Time's Up!</h1>
      <p className="text-2xl text-amber-600 mb-2">No answer selected.</p>
      <p className="text-xl text-gray-600 mb-8">The flap rotated to <strong>{mcq.correctBin}</strong> by default for the {mcq.label}.</p>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg mx-auto border-4 border-amber-300">
        <p className="text-lg text-gray-600 font-medium">The correct answer was:</p>
        <p className="text-3xl font-black text-emerald-600 mt-2">
          {mcq.correctBin === 'organic' ? '🌿 Organic Waste' : '♻️ Plastic Waste'}
        </p>
        <p className="text-base text-gray-500 mt-3">{mcq.funFact}</p>
      </div>
      <div className="mt-8 flex items-center justify-center gap-3 text-amber-600">
        <div className="w-6 h-6 border-4 border-amber-400 border-t-amber-700 rounded-full animate-spin" />
        <span className="text-lg font-medium">Returning to home screen…</span>
      </div>
    </div>
    <Animations />
  </div>
);

// ─── SHARED HELPERS ───────────────────────────────────────────────────────────
const FloatingBg = ({ color }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="absolute animate-float-bg"
        style={{ left: `${(i * 13) % 100}%`, top: `${(i * 17) % 100}%`, animationDelay: `${i * 1.2}s`, animationDuration: `${15 + i * 2}s` }}>
        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${color} opacity-10`} />
      </div>
    ))}
  </div>
);

const WelcomeContent = ({ screen }) => (
  <div className="text-center space-y-6 animate-scale-in">
    <div className={`text-6xl font-black bg-gradient-to-r ${screen.color} bg-clip-text text-transparent mb-4`}>
      {screen.content}
    </div>
    <div className="flex justify-center gap-6 mt-8">
      {[Recycle, Leaf, Heart].map((Icon, i) => (
        <div key={i} className="animate-bounce-stagger" style={{ animationDelay: `${i * 0.2}s` }}>
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${screen.color} flex items-center justify-center shadow-xl`}>
            <Icon className="w-10 h-10 text-white" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LifecycleContent = ({ screen }) => (
  <div className="space-y-6 animate-scale-in">
    <div className="flex justify-center gap-4 flex-wrap">
      {screen.stages.map((stage, i) => (
        <div key={i} className="animate-slide-up-cascade" style={{ animationDelay: `${i * 0.15}s` }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 text-center min-w-[140px]">
            <div className="text-5xl mb-3">{stage.emoji}</div>
            <div className="font-bold text-gray-800 text-lg">{stage.text}</div>
            <div className="text-sm text-gray-500 mt-1">{stage.time}</div>
          </div>
          {i < screen.stages.length - 1 && (
            <div className="flex justify-center mt-4">
              <div className="w-1 h-8 bg-gradient-to-b from-green-400 to-green-200" />
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const FactContent = ({ screen }) => (
  <div className="text-center space-y-8 animate-scale-in">
    <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto">
      <div className={`inline-block p-6 rounded-full bg-gradient-to-br ${screen.color} mb-6 animate-pulse-slow`}>
        <Recycle className="w-20 h-20 text-white" />
      </div>
      <p className="text-2xl text-gray-700 leading-relaxed mb-6">{screen.fact}</p>
      <div className={`inline-block px-8 py-4 rounded-full bg-gradient-to-r ${screen.color} text-white font-bold text-3xl shadow-lg`}>
        {screen.stat}
      </div>
    </div>
  </div>
);

const NonRecycleContent = ({ screen }) => (
  <div className="text-center space-y-8 animate-scale-in">
    <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto border-4 border-orange-200">
      <div className="inline-block p-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500 mb-6 animate-shake">
        <AlertCircle className="w-20 h-20 text-white" />
      </div>
      <p className="text-2xl text-gray-700 leading-relaxed mb-6">{screen.fact}</p>
      <div className="inline-block px-8 py-4 rounded-full bg-gradient-to-r from-orange-400 to-red-500 text-white font-bold text-4xl shadow-lg animate-pulse">
        {screen.stat}
      </div>
    </div>
  </div>
);

const InorganicContent = ({ screen }) => (
  <div className="space-y-8 animate-scale-in">
    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl mx-auto">
      <p className="text-2xl text-gray-700 text-center leading-relaxed mb-8">{screen.content}</p>
      <div className="grid grid-cols-2 gap-4">
        {screen.examples.map((item, i) => (
          <div key={i}
            className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 text-center font-semibold text-gray-700 shadow-md animate-slide-up-cascade"
            style={{ animationDelay: `${i * 0.1}s` }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Animations = () => (
  <style>{`
    @keyframes float-particle  { 0%,100%{transform:translateY(0) scale(1);opacity:0} 50%{transform:translateY(-30px) scale(1.2);opacity:1} }
    @keyframes float-bg        { 0%,100%{transform:translate(0,0) scale(1)} 25%{transform:translate(20px,-20px) scale(1.1)} 50%{transform:translate(0,-40px) scale(1.2)} 75%{transform:translate(-20px,-20px) scale(1.1)} }
    @keyframes bounce-gentle   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes lid-wiggle      { 0%,100%{transform:translateX(-50%) rotate(0deg)} 25%{transform:translateX(-50%) rotate(-2deg)} 75%{transform:translateX(-50%) rotate(2deg)} }
    @keyframes slide-down      { from{transform:translateY(-30px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes scale-in        { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes slide-up-cascade{ from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes fade-in-delay   { from{opacity:0} to{opacity:1} }
    @keyframes fade-in-delay   { from{opacity:0} to{opacity:1} }
    @keyframes bounce-stagger  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
    @keyframes pulse-slow      { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
    @keyframes shake           { 0%,100%{transform:rotate(0deg)} 25%{transform:rotate(-5deg)} 75%{transform:rotate(5deg)} }
    @keyframes shake-once      { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
    .animate-float-particle  { animation: float-particle ease-in-out infinite; }
    .animate-float-bg        { animation: float-bg ease-in-out infinite; }
    .animate-bounce-gentle   { animation: bounce-gentle 3s ease-in-out infinite; }
    .animate-lid-wiggle      { animation: lid-wiggle 2s ease-in-out infinite; }
    .animate-slide-down      { animation: slide-down 0.6s ease-out; }
    .animate-scale-in        { animation: scale-in 0.5s ease-out; }
    .animate-slide-up-cascade{ animation: slide-up-cascade 0.6s ease-out forwards; opacity:0; }
    .animate-fade-in         { animation: fade-in-delay 0.8s ease-out; }
    .animate-fade-in-delay   { animation: fade-in-delay 1s ease-out 0.3s forwards; opacity:0; }
    .animate-bounce-stagger  { animation: bounce-stagger 2s ease-in-out infinite; }
    .animate-pulse-slow      { animation: pulse-slow 2s ease-in-out infinite; }
    .animate-shake           { animation: shake 0.5s ease-in-out infinite; }
    .animate-shake-once      { animation: shake-once 0.6s ease-in-out; }
  `}</style>
);

export default BinGeniusDisplay;