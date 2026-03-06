import React, { useState, useEffect, useRef, useCallback } from 'react';

const RPI_WS_URL = 'ws://10.171.237.69';
const MCQ_TIMEOUT_SECONDS = 15;

// Banana = organic (flap right), Can/Bottle = inorganic (flap left)
const MCQ_DATA = {
  banana: {
    emoji: '🍌',
    label: 'banana',
    correctAnswer: 'organic',
    rotateDirection: 'right',
    funFact: 'Banana peels decompose in just 2–5 weeks and make great compost! 🌱',
  },
  can: {
    emoji: '🥫',
    label: 'can',
    correctAnswer: 'inorganic',
    rotateDirection: 'left',
    funFact: 'Recycling one aluminium can saves enough energy to run a TV for 3 hours! ♻️',
  },
  bottle: {
    emoji: '🍶',
    label: 'bottle',
    correctAnswer: 'inorganic',
    rotateDirection: 'left',
    funFact: 'Plastic bottles take up to 450 years to decompose in landfills! ♻️',
  },
};

const IDLE_SCREENS = [
  {
    id: 'welcome',
    title: "Hi! I'm BinGenius 👋",
    subtitle: 'Your Smart Recycling Companion',
    bg: 'linear-gradient(135deg, #d1fae5, #ccfbf1)',
    accent: '#10b981',
    content: "Let's make the world cleaner together! 🌍",
  },
  {
    id: 'lifecycle',
    title: 'Life Cycle of an Apple 🍎',
    bg: 'linear-gradient(135deg, #dcfce7, #ecfccb)',
    accent: '#16a34a',
    stages: [
      { emoji: '🌱', text: 'Seed', time: '0–2 weeks' },
      { emoji: '🌳', text: 'Tree', time: '3–5 years' },
      { emoji: '🍎', text: 'Apple', time: '6 months' },
      { emoji: '🗑️', text: 'Waste', time: '2–3 weeks' },
      { emoji: '🌿', text: 'Compost', time: '3–6 months' },
    ],
  },
  {
    id: 'recycle-fact',
    title: 'Recycling Power! ♻️',
    bg: 'linear-gradient(135deg, #dbeafe, #cffafe)',
    accent: '#2563eb',
    fact: 'Recycling 1 aluminum can saves enough energy to power a laptop for 3 hours!',
    stat: '95% energy saved',
  },
  {
    id: 'non-recycle-fact',
    title: 'Why Recycling Matters ⚠️',
    bg: 'linear-gradient(135deg, #ffedd5, #fee2e2)',
    accent: '#dc2626',
    fact: 'Plastic bottles can take up to 450 years to decompose in landfills!',
    stat: '450 years',
  },
  {
    id: 'inorganic',
    title: 'Inorganic Waste Facts 🔧',
    bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
    accent: '#475569',
    content: 'Glass, metals, and plastics never fully decompose. Recycling is the only way!',
    examples: ['Glass bottles 🍶', 'Metal cans 🥫', 'Plastic containers 🧴', 'Electronics 💻'],
  },
];

const card = (extra = {}) => ({
  background: 'white', borderRadius: '24px',
  boxShadow: '0 10px 40px rgba(0,0,0,0.12)', padding: '32px', ...extra,
});

const BinMascot = ({ mood }) => {
  const moods = { happy: '😊', excited: '🤩', proud: '😎', worried: '😟', thinking: '🤔' };
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: '80px', height: '100px', background: 'linear-gradient(180deg, #fbbf24, #f59e0b)', borderRadius: '16px 16px 20px 20px', margin: '0 auto', position: 'relative', boxShadow: '0 8px 24px rgba(251,191,36,0.4)', animation: 'bobble 3s ease-in-out infinite' }}>
        <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', width: '72px', height: '16px', background: '#374151', borderRadius: '8px 8px 0 0' }} />
        <div style={{ position: 'absolute', top: '28px', left: '50%', transform: 'translateX(-50%)', width: '52px', height: '52px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{moods[mood] || '😊'}</div>
        <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', fontSize: '20px' }}>♻️</div>
      </div>
    </div>
  );
};

const IdleDisplay = ({ screen, progress, wsStatus }) => {
  const moodMap = { welcome: 'happy', lifecycle: 'excited', 'recycle-fact': 'proud', 'non-recycle-fact': 'worried', inorganic: 'thinking' };
  return (
    <div style={{ minHeight: '100vh', background: screen.bg, fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column', padding: '24px', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: '16px', right: '16px', background: wsStatus === 'connected' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${wsStatus === 'connected' ? '#10b981' : '#ef4444'}`, borderRadius: '99px', padding: '4px 12px', fontSize: '12px', fontWeight: '700', color: wsStatus === 'connected' ? '#065f46' : '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: wsStatus === 'connected' ? '#10b981' : '#ef4444', display: 'inline-block' }} />
        {wsStatus === 'connected' ? 'RPi Connected' : 'RPi Offline'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: screen.accent, margin: '0 0 8px' }}>{screen.title}</h1>
          {screen.subtitle && <p style={{ fontSize: '18px', color: '#6b7280', margin: 0 }}>{screen.subtitle}</p>}
        </div>
        <BinMascot mood={moodMap[screen.id]} />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {screen.id === 'welcome' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '900', color: screen.accent, marginBottom: '32px' }}>{screen.content}</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
              {['♻️', '🌿', '💚'].map((icon, i) => (
                <div key={i} style={{ width: '72px', height: '72px', borderRadius: '50%', background: screen.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', animation: `bounce ${1.5 + i * 0.3}s ease-in-out infinite` }}>{icon}</div>
              ))}
            </div>
          </div>
        )}
        {screen.id === 'lifecycle' && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {screen.stages.map((stage, i) => (
              <div key={i} style={card({ textAlign: 'center', minWidth: '110px', padding: '20px 16px' })}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>{stage.emoji}</div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: '#1f2937' }}>{stage.text}</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{stage.time}</div>
              </div>
            ))}
          </div>
        )}
        {(screen.id === 'recycle-fact' || screen.id === 'non-recycle-fact') && (
          <div style={card({ textAlign: 'center', maxWidth: '480px', border: `3px solid ${screen.accent}33` })}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>{screen.id === 'recycle-fact' ? '♻️' : '⚠️'}</div>
            <p style={{ fontSize: '20px', color: '#374151', lineHeight: '1.6', marginBottom: '20px' }}>{screen.fact}</p>
            <div style={{ display: 'inline-block', padding: '12px 28px', borderRadius: '99px', background: screen.accent, color: 'white', fontWeight: '900', fontSize: '24px' }}>{screen.stat}</div>
          </div>
        )}
        {screen.id === 'inorganic' && (
          <div style={card({ maxWidth: '480px', width: '100%' })}>
            <p style={{ fontSize: '18px', color: '#374151', textAlign: 'center', marginBottom: '20px' }}>{screen.content}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {screen.examples.map((item, i) => (
                <div key={i} style={{ background: '#f1f5f9', borderRadius: '12px', padding: '16px', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '15px' }}>{item}</div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: screen.accent, borderRadius: '99px', transition: 'width 0.1s linear' }} />
        </div>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', marginTop: '8px' }}>
          Place waste to start ♻️
        </p>
      </div>
      <Animations />
    </div>
  );
};

const MCQScreen = ({ mcq, countdown, selectedOption, onSelect, isWrong }) => {
  const urgent = countdown <= 5;
  const isOrganic = mcq.correctAnswer === 'organic';
  const options = [
    { id: 'A', text: 'Organic Waste', icon: '🌿', correct: isOrganic },
    { id: 'B', text: 'Inorganic Waste', icon: '🔩', correct: !isOrganic },
  ];
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column', padding: '24px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: `6px solid ${urgent ? '#ef4444' : '#8b5cf6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '900', color: urgent ? '#ef4444' : '#7c3aed', background: 'white', animation: urgent ? 'pulse 0.8s ease-in-out infinite' : 'none' }}>{countdown}</div>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>⏱ seconds left</p>
      </div>
      <div style={card({ textAlign: 'center', marginBottom: '20px', border: '3px solid #ddd6fe' })}>
        <div style={{ fontSize: '72px', marginBottom: '12px' }}>{mcq.emoji}</div>
        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#1f2937', margin: '0 0 8px' }}>
          I detected a <span style={{ color: '#7c3aed' }}>{mcq.label}</span>!
        </h2>
        <p style={{ fontSize: '18px', color: '#4b5563', margin: 0 }}>
          Is a <strong>{mcq.label}</strong> organic or inorganic waste?
        </p>
      </div>
      {isWrong && (
        <div style={{ background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>❌</span>
          <div>
            <p style={{ fontWeight: '900', color: '#b91c1c', margin: '0 0 4px', fontSize: '18px' }}>Oops! Wrong answer!</p>
            <p style={{ color: '#dc2626', margin: 0, fontSize: '14px' }}>Think again — choose the correct option!</p>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          return (
            <button key={opt.id} onClick={() => !selectedOption && onSelect(opt)} style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '20px 24px', borderRadius: '16px', border: `3px solid ${isSelected ? (opt.correct ? '#22c55e' : '#ef4444') : '#ddd6fe'}`, background: isSelected ? (opt.correct ? '#f0fdf4' : '#fef2f2') : 'white', cursor: 'pointer', textAlign: 'left', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, background: isSelected ? (opt.correct ? '#22c55e' : '#ef4444') : '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px', color: isSelected ? 'white' : '#7c3aed' }}>{opt.id}</div>
              <span style={{ fontSize: '28px' }}>{opt.icon}</span>
              <span style={{ flex: 1, fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>{opt.text}</span>
              {isSelected && <span style={{ fontSize: '28px' }}>{opt.correct ? '✅' : '❌'}</span>}
            </button>
          );
        })}
      </div>
      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', marginTop: '16px' }}>Tap an option to answer</p>
      <Animations />
    </div>
  );
};

const CorrectScreen = ({ mcq }) => (
  <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
    <div style={{ fontSize: '100px', marginBottom: '16px' }}>🎉</div>
    <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#065f46', margin: '0 0 8px' }}>Correct! Well Done!</h1>
    <p style={{ fontSize: '22px', color: '#047857', marginBottom: '32px' }}>
      Flap rotating to the <strong>{mcq.correctAnswer === 'organic' ? 'organic ♻️' : 'inorganic 🔩'}</strong> bin!
    </p>
    <div style={card({ maxWidth: '440px', border: '3px solid #6ee7b7' })}>
      <p style={{ fontSize: '24px', marginBottom: '8px' }}>💡 Fun Fact</p>
      <p style={{ fontSize: '17px', color: '#374151', lineHeight: '1.6', margin: 0 }}>{mcq.funFact}</p>
    </div>
    <div style={{ marginTop: '28px', color: '#059669', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '20px', height: '20px', border: '3px solid #6ee7b7', borderTop: '3px solid #059669', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      Returning to home screen…
    </div>
    <Animations />
  </div>
);

const TimeoutScreen = ({ mcq }) => (
  <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', fontFamily: "'Segoe UI', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
    <div style={{ fontSize: '100px', marginBottom: '16px' }}>⏱️</div>
    <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#92400e', margin: '0 0 8px' }}>Time's Up!</h1>
    <p style={{ fontSize: '22px', color: '#b45309', marginBottom: '8px' }}>No answer selected.</p>
    <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '28px' }}>
      Flap rotated to <strong>{mcq.correctAnswer}</strong> bin by default.
    </p>
    <div style={card({ maxWidth: '440px', border: '3px solid #fcd34d' })}>
      <p style={{ fontSize: '17px', color: '#6b7280', margin: '0 0 8px' }}>The correct answer was:</p>
      <p style={{ fontSize: '28px', fontWeight: '900', color: mcq.correctAnswer === 'organic' ? '#16a34a' : '#2563eb', margin: '0 0 12px' }}>
        {mcq.correctAnswer === 'organic' ? '🌿 Organic Waste' : '🔩 Inorganic Waste'}
      </p>
      <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>{mcq.funFact}</p>
    </div>
    <div style={{ marginTop: '28px', color: '#d97706', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ width: '20px', height: '20px', border: '3px solid #fcd34d', borderTop: '3px solid #d97706', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      Returning to home screen…
    </div>
    <Animations />
  </div>
);

const Animations = () => (
  <style>{`
    @keyframes bobble { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
  `}</style>
);

const BinGeniusDisplay = () => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [idleProgress, setIdleProgress] = useState(0);
  const [mode, setMode] = useState('idle');
  const [detectedItem, setDetectedItem] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [countdown, setCountdown] = useState(MCQ_TIMEOUT_SECONDS);
  const [isWrong, setIsWrong] = useState(false);
  const [wsStatus, setWsStatus] = useState('connecting');
  const wsRef = useRef(null);
  const countdownRef = useRef(null);
  const resetTimerRef = useRef(null);
  const modeRef = useRef('idle');
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const connectWS = useCallback(() => {
    try {
      const ws = new WebSocket('ws://10.171.237.69');
      wsRef.current = ws;
      ws.onopen = () => setWsStatus('connected');
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'detected' && MCQ_DATA[msg.item?.toLowerCase()]) {
            if (modeRef.current === 'idle') {
              startMCQ(msg.item.toLowerCase());
            }
          }
        } catch (e) { }
      };
      ws.onclose = () => { setWsStatus('disconnected'); setTimeout(connectWS, 3000); };
      ws.onerror = () => { setWsStatus('disconnected'); ws.close(); };
    } catch (e) { setWsStatus('disconnected'); setTimeout(connectWS, 3000); }
  }, []);

  useEffect(() => { connectWS(); return () => wsRef.current?.close(); }, [connectWS]);

  const sendToRPi = (payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(payload));
  };

  useEffect(() => {
    if (mode !== 'idle') return;
    const interval = setInterval(() => {
      setIdleProgress((prev) => {
        if (prev >= 100) { setCurrentScreen((s) => (s + 1) % IDLE_SCREENS.length); return 0; }
        return prev + 100 / 70;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [mode]);

  const startMCQ = (itemKey) => {
    setDetectedItem(itemKey);
    setSelectedOption(null);
    setCountdown(MCQ_TIMEOUT_SECONDS);
    setIsWrong(false);
    setMode('mcq');
  };

  useEffect(() => {
    if (mode !== 'mcq') { clearInterval(countdownRef.current); return; }
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [mode, detectedItem]);

  // Trigger timeout rotation when countdown reaches 0
  useEffect(() => {
    if (mode === 'mcq' && countdown === 0) {
      const mcq = MCQ_DATA[detectedItem];
      setMode('timeout');
      sendToRPi({ type: 'rotate', direction: mcq?.rotateDirection || 'right', reason: 'timeout' });
      scheduleReset();
    }
  }, [countdown, mode, detectedItem]);

  const handleOptionSelect = (option) => {
    if (selectedOption) return;
    clearInterval(countdownRef.current);
    setSelectedOption(option.id);
    if (option.correct) {
      const mcq = MCQ_DATA[detectedItem];
      setTimeout(() => {
        setMode('correct');
        sendToRPi({ type: 'rotate', direction: mcq?.rotateDirection || 'right', reason: 'correct_answer' });
        scheduleReset();
      }, 600);
    } else {
      setIsWrong(true);
      setTimeout(() => {
        setSelectedOption(null);
        setIsWrong(false);
        setCountdown(MCQ_TIMEOUT_SECONDS);
        setMode('mcq');
      }, 2500);
    }
  };

  const scheduleReset = () => {
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setMode('idle'); setDetectedItem(null); setSelectedOption(null); setIdleProgress(0);
    }, 4000);
  };



  if (mode === 'idle') return <IdleDisplay screen={IDLE_SCREENS[currentScreen]} progress={idleProgress} wsStatus={wsStatus} />;
  const mcq = MCQ_DATA[detectedItem];
  if (!mcq) return null;
  if (mode === 'mcq') return <MCQScreen mcq={mcq} countdown={countdown} selectedOption={selectedOption} onSelect={handleOptionSelect} isWrong={isWrong} />;
  if (mode === 'correct') return <CorrectScreen mcq={mcq} />;
  if (mode === 'timeout') return <TimeoutScreen mcq={mcq} />;
  return null;
};

export default BinGeniusDisplay;
