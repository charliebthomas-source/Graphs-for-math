/* global React, ReactDOM, ARENA_CONFIG, TESTS_DATA, loadTests */
const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ─── PATH RENDERING ─────────────────────────────────────────────────────────

function pathToD(movement) {
  const { pathType, pathPoints, pathCenter, pathRadius, pathSweepFlag, pathLargeArc } = movement;

  if (!pathType || pathType === 'halt' || pathType === 'none') return null;

  if (pathType === 'straight' || pathType === 'diagonal') {
    if (!pathPoints || pathPoints.length < 2) return null;
    return 'M ' + pathPoints.map(p => `${p.x} ${p.y}`).join(' L ');
  }

  if (pathType === 'circle') {
    const { x, y } = pathCenter;
    const r = pathRadius;
    // Full circle via two arcs (so getTotalLength works)
    return `M ${x} ${y - r} A ${r} ${r} 0 1 1 ${x} ${y + r} A ${r} ${r} 0 1 1 ${x} ${y - r} Z`;
  }

  if (pathType === 'arc') {
    if (!pathPoints || pathPoints.length < 2) return null;
    const s = pathPoints[0];
    const e = pathPoints[1];
    const r = pathRadius || 50;
    const large = pathLargeArc ? 1 : 0;
    const sweep = pathSweepFlag !== undefined ? (pathSweepFlag ? 1 : 0) : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
  }

  if (pathType === 'serpentine' || pathType === 'free') {
    if (!pathPoints || pathPoints.length < 2) return null;
    // Use smooth cubic bezier through points
    const pts = pathPoints;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const cpx = (pts[i].x + pts[i - 1].x) / 2;
      const cpy = (pts[i].y + pts[i - 1].y) / 2;
      d += ` Q ${pts[i].x} ${pts[i].y} ${(pts[i].x + pts[i + 1].x) / 2} ${(pts[i].y + pts[i + 1].y) / 2}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return d;
  }

  return null;
}

// ─── ANIMATED SVG PATH ──────────────────────────────────────────────────────

function AnimatedPath({ d, stroke, strokeWidth, strokeDasharray, opacity, animKey }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !d) return;
    try {
      const len = Math.ceil(el.getTotalLength()) + 10;
      el.style.transition = 'none';
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
      // Force reflow
      void el.getBoundingClientRect();
      el.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.strokeDashoffset = '0';
    } catch (_) {}
  }, [animKey, d]);

  if (!d) return null;
  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
    />
  );
}

// ─── ARENA RENDERER ─────────────────────────────────────────────────────────

function ArenaRenderer({ test, movementIndex }) {
  const cfg = ARENA_CONFIG[test.arenaSize] || ARENA_CONFIG.small;
  const { svgWidth, svgHeight, viewBox, letters } = cfg;

  const currentMovement = test.movements[movementIndex];
  const prevMovement = movementIndex > 0 ? test.movements[movementIndex - 1] : null;

  const currentD = currentMovement ? pathToD(currentMovement) : null;
  const prevD = prevMovement ? pathToD(prevMovement) : null;

  const haltPoint = currentMovement?.pathType === 'halt' ? currentMovement.pathPoints?.[0] : null;

  // Letter label positions (offset outside arena bounds)
  function letterLabelPos(name, letter) {
    switch (letter.side) {
      case 'top':    return { x: letter.x, y: letter.y - 18, anchor: 'middle' };
      case 'bottom': return { x: letter.x, y: letter.y + 20, anchor: 'middle' };
      case 'left':   return { x: letter.x - 22, y: letter.y + 5, anchor: 'middle' };
      case 'right':  return { x: letter.x + 22, y: letter.y + 5, anchor: 'middle' };
      case 'center': return { x: letter.x + 12, y: letter.y + 5, anchor: 'start' };
      default:       return { x: letter.x, y: letter.y, anchor: 'middle' };
    }
  }

  // Tick marks on the wall for each letter position
  function letterTick(letter) {
    const s = 5;
    switch (letter.side) {
      case 'top':    return { x1: letter.x, y1: 0,          x2: letter.x, y2: s };
      case 'bottom': return { x1: letter.x, y1: svgHeight,  x2: letter.x, y2: svgHeight - s };
      case 'left':   return { x1: 0,         y1: letter.y,  x2: s,        y2: letter.y };
      case 'right':  return { x1: svgWidth,  y1: letter.y,  x2: svgWidth - s, y2: letter.y };
      default:       return null;
    }
  }

  return (
    <svg
      viewBox={viewBox}
      style={{ width: '100%', height: '100%' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Arena sand fill */}
      <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="#F8F3EA" rx={2} />

      {/* Arena border */}
      <rect
        x={0} y={0}
        width={svgWidth} height={svgHeight}
        fill="none"
        stroke="#1B2A5C"
        strokeWidth={3}
        rx={2}
      />

      {/* Centre line (dashed) */}
      <line
        x1={svgWidth / 2} y1={0}
        x2={svgWidth / 2} y2={svgHeight}
        stroke="#1B2A5C"
        strokeWidth={1}
        strokeDasharray="6 6"
        opacity={0.3}
      />

      {/* Quarter lines */}
      <line x1={0} y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2}
        stroke="#1B2A5C" strokeWidth={0.5} strokeDasharray="3 6" opacity={0.2} />

      {/* Previous movement path */}
      {prevD && (
        <AnimatedPath
          key={`prev-${movementIndex}`}
          animKey={`prev-${movementIndex}`}
          d={prevD}
          stroke="#8E44AD"
          strokeWidth={3}
          opacity={0.35}
        />
      )}

      {/* Previous halt marker */}
      {prevMovement?.pathType === 'halt' && prevMovement.pathPoints?.[0] && (
        <rect
          x={prevMovement.pathPoints[0].x - 7}
          y={prevMovement.pathPoints[0].y - 7}
          width={14} height={14}
          fill="#8E44AD"
          opacity={0.35}
          rx={2}
        />
      )}

      {/* Current movement path */}
      {currentD && (
        <AnimatedPath
          key={`curr-${movementIndex}`}
          animKey={`curr-${movementIndex}`}
          d={currentD}
          stroke="#27AE60"
          strokeWidth={3.5}
          opacity={1}
        />
      )}

      {/* Current halt marker */}
      {haltPoint && (
        <g>
          <rect
            x={haltPoint.x - 9}
            y={haltPoint.y - 9}
            width={18} height={18}
            fill="#E67E22"
            rx={3}
          />
          <text
            x={haltPoint.x}
            y={haltPoint.y + 5}
            textAnchor="middle"
            fontSize={10}
            fontWeight="bold"
            fill="white"
            fontFamily="sans-serif"
          >H</text>
        </g>
      )}

      {/* Start dot for current movement */}
      {currentD && currentMovement?.pathPoints?.[0] && (
        <circle
          cx={currentMovement.pathPoints[0].x}
          cy={currentMovement.pathPoints[0].y}
          r={5}
          fill="#27AE60"
          opacity={0.8}
        />
      )}
      {currentMovement?.pathType === 'circle' && currentMovement.pathCenter && (
        <circle
          cx={currentMovement.pathCenter.x}
          cy={currentMovement.pathCenter.y - currentMovement.pathRadius}
          r={5}
          fill="#27AE60"
          opacity={0.8}
        />
      )}

      {/* Arena letter tick marks */}
      {Object.entries(letters).map(([name, letter]) => {
        if (letter.side === 'center') return null;
        const tick = letterTick(letter);
        if (!tick) return null;
        return (
          <line
            key={`tick-${name}`}
            x1={tick.x1} y1={tick.y1}
            x2={tick.x2} y2={tick.y2}
            stroke="#1B2A5C"
            strokeWidth={2}
          />
        );
      })}

      {/* Arena letter labels */}
      {Object.entries(letters).map(([name, letter]) => {
        const pos = letterLabelPos(name, letter);
        const isCenter = letter.side === 'center';
        return (
          <text
            key={`label-${name}`}
            x={pos.x}
            y={pos.y}
            textAnchor={pos.anchor}
            fontSize={isCenter ? 11 : 14}
            fontWeight={isCenter ? '400' : '700'}
            fill={isCenter ? '#1B2A5C' : '#1B2A5C'}
            opacity={isCenter ? 0.4 : 1}
            fontFamily="'Nunito', sans-serif"
          >
            {name}
          </text>
        );
      })}

      {/* Current movement marker highlight */}
      {currentMovement?.marker && (() => {
        const markerName = currentMovement.marker.split(/[-\s]/)[0].replace(/[^A-Z]/g, '');
        const letter = letters[markerName];
        if (!letter) return null;
        return (
          <circle
            cx={letter.x}
            cy={letter.y}
            r={8}
            fill="none"
            stroke="#E67E22"
            strokeWidth={2.5}
            opacity={0.9}
          />
        );
      })()}
    </svg>
  );
}

// ─── PROGRESS INDICATORS ────────────────────────────────────────────────────

function ProgressDots({ total, current }) {
  const MAX_DOTS = 20;
  const show = Math.min(total, MAX_DOTS);
  return (
    <div className="progress-dots">
      {Array.from({ length: show }).map((_, i) => (
        <div
          key={i}
          className={`dot ${i === current ? 'dot-active' : i < current ? 'dot-done' : ''}`}
        />
      ))}
    </div>
  );
}

// ─── SWIPE HOOK ─────────────────────────────────────────────────────────────

function useSwipe(onLeft, onRight) {
  const startX = useRef(null);
  const startY = useRef(null);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (startX.current === null) return;
    const dx = startX.current - e.changedTouches[0].clientX;
    const dy = startY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) {
      if (dx > 0) onLeft();
      else onRight();
    }
    startX.current = null;
  }, [onLeft, onRight]);

  return { onTouchStart, onTouchEnd };
}

// ─── VIEWER VIEW ─────────────────────────────────────────────────────────────

function ViewerView({ test, movementIndex, setMovementIndex, onTabChange }) {
  const total = test.movements.length;
  const movement = test.movements[movementIndex];

  const goNext = useCallback(() => setMovementIndex(i => Math.min(i + 1, total - 1)), [total, setMovementIndex]);
  const goPrev = useCallback(() => setMovementIndex(i => Math.max(i - 1, 0)), [setMovementIndex]);

  const swipe = useSwipe(goNext, goPrev);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  return (
    <div className="viewer-layout" {...swipe}>
      {/* Arena */}
      <div className="arena-wrapper">
        <ArenaRenderer test={test} movementIndex={movementIndex} />
        <button
          className="nav-arrow nav-arrow-left"
          onClick={goPrev}
          disabled={movementIndex === 0}
          aria-label="Previous movement"
        >‹</button>
        <button
          className="nav-arrow nav-arrow-right"
          onClick={goNext}
          disabled={movementIndex === total - 1}
          aria-label="Next movement"
        >›</button>
      </div>

      {/* Movement card */}
      <div className="movement-card">
        <div className="movement-meta">
          <div className="movement-num">Movement {movement.number}</div>
          <div className="movement-marker">{movement.marker}</div>
          {movement.coefficient && (
            <div className="coeff-badge">×{movement.coefficient}</div>
          )}
        </div>
        <div className="movement-instruction">{movement.instruction}</div>
        {movement.criteria && (
          <div className="movement-criteria">{movement.criteria}</div>
        )}
        <ProgressDots total={total} current={movementIndex} />
        <div className="movement-counter">{movementIndex + 1} / {total}</div>
      </div>
    </div>
  );
}

// ─── MOVES LIST VIEW ────────────────────────────────────────────────────────

function MovesView({ test, movementIndex, onSelect }) {
  return (
    <div className="moves-list">
      <div className="moves-header">All Movements</div>
      {test.movements.map((m, i) => (
        <button
          key={m.number}
          className={`move-item ${i === movementIndex ? 'move-item-active' : ''}`}
          onClick={() => onSelect(i)}
        >
          <div className="move-item-left">
            <span className="move-item-num">{m.number}</span>
            <span className="move-item-marker">{m.marker}</span>
          </div>
          <div className="move-item-instruction">{m.instruction}</div>
          <div className="move-item-marks">{m.marks}{m.coefficient ? `×${m.coefficient}` : ''}</div>
        </button>
      ))}
    </div>
  );
}

// ─── SCORING VIEW ────────────────────────────────────────────────────────────

function ScoringView({ test }) {
  const storageKey = `pcdressage_scores_${test.id}`;
  const [marks, setMarks] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return saved.current || {};
    } catch { return {}; }
  });
  const [comments, setComments] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return saved.comments || {};
    } catch { return {}; }
  });
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`${storageKey}_history`) || '[]');
    } catch { return []; }
  });

  function setMark(index, val) {
    const v = Math.max(0, Math.min(10, Number(val)));
    setMarks(prev => ({ ...prev, [index]: isNaN(v) ? '' : v }));
    setSaved(false);
  }

  function setComment(index, val) {
    setComments(prev => ({ ...prev, [index]: val }));
    setSaved(false);
  }

  const totalMark = useMemo(() => {
    return test.movements.reduce((sum, m, i) => {
      const v = Number(marks[i]);
      if (isNaN(v) || marks[i] === '') return sum;
      return sum + v * (m.coefficient || 1);
    }, 0);
  }, [marks, test.movements]);

  const maxPossible = useMemo(() => {
    return test.movements.reduce((sum, m) => sum + m.marks * (m.coefficient || 1), 0);
  }, [test.movements]);

  const filled = Object.values(marks).filter(v => v !== '').length;
  const pct = maxPossible > 0 ? ((totalMark / maxPossible) * 100).toFixed(1) : '0.0';

  function saveAttempt() {
    const attempt = {
      date: new Date().toLocaleDateString('en-GB'),
      marks: { ...marks },
      comments: { ...comments },
      total: totalMark,
      max: maxPossible,
      pct,
    };
    const newHistory = [attempt, ...history].slice(0, 10);
    localStorage.setItem(`${storageKey}_history`, JSON.stringify(newHistory));
    localStorage.setItem(storageKey, JSON.stringify({ current: marks, comments }));
    setHistory(newHistory);
    setSaved(true);
  }

  function clearScores() {
    setMarks({});
    setComments({});
    setSaved(false);
    localStorage.removeItem(storageKey);
  }

  return (
    <div className="scoring-view">
      <div className="score-summary">
        <div className="score-total">{totalMark} / {maxPossible}</div>
        <div className="score-pct">{pct}%</div>
        <div className="score-progress-bar">
          <div className="score-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="score-filled">{filled} of {test.movements.length} marked</div>
      </div>

      <div className="score-movements">
        {test.movements.map((m, i) => (
          <div key={i} className="score-item">
            <div className="score-item-header">
              <span className="score-item-num">{m.number}.</span>
              <span className="score-item-marker">{m.marker}</span>
              {m.coefficient && <span className="coeff-badge">×{m.coefficient}</span>}
            </div>
            <div className="score-item-instruction">{m.instruction}</div>
            <div className="score-item-row">
              <input
                className="score-input"
                type="number"
                min="0"
                max="10"
                step="0.5"
                placeholder="—"
                value={marks[i] !== undefined ? marks[i] : ''}
                onChange={e => setMark(i, e.target.value)}
              />
              <span className="score-item-max">/ 10{m.coefficient ? ` ×${m.coefficient}` : ''}</span>
              <input
                className="score-comment"
                type="text"
                placeholder="Comment..."
                value={comments[i] || ''}
                onChange={e => setComment(i, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="score-actions">
        <button className="btn btn-primary" onClick={saveAttempt}>
          {saved ? '✓ Saved' : 'Save Attempt'}
        </button>
        <button className="btn btn-ghost" onClick={clearScores}>Clear</button>
      </div>

      {history.length > 0 && (
        <div className="score-history">
          <div className="history-label">Past attempts</div>
          {history.map((h, i) => (
            <div key={i} className="history-item">
              <span className="history-date">{h.date}</span>
              <span className="history-score">{h.total}/{h.max}</span>
              <span className="history-pct">{h.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CALLER VIEW ─────────────────────────────────────────────────────────────

function CallerView({ test, movementIndex, setMovementIndex }) {
  const total = test.movements.length;
  const movement = test.movements[movementIndex];
  const [speaking, setSpeaking] = useState(false);
  const hasSpeech = 'speechSynthesis' in window;

  const goNext = () => setMovementIndex(i => Math.min(i + 1, total - 1));
  const goPrev = () => setMovementIndex(i => Math.max(i - 1, 0));

  function speak() {
    if (!hasSpeech) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(
      `Movement ${movement.number}. At ${movement.marker}. ${movement.instruction}`
    );
    utt.rate = 0.85;
    utt.pitch = 1;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  return (
    <div className="caller-view">
      <div className="caller-counter">{movementIndex + 1} / {total}</div>

      <div className="caller-card">
        <div className="caller-marker">{movement.marker}</div>
        <div className="caller-instruction">{movement.instruction}</div>
        {movement.criteria && (
          <div className="caller-criteria">{movement.criteria}</div>
        )}
      </div>

      {hasSpeech && (
        <button
          className={`btn-speak ${speaking ? 'speaking' : ''}`}
          onClick={speaking ? stopSpeaking : speak}
        >
          {speaking ? '⏹ Stop' : '🔊 Read aloud'}
        </button>
      )}

      <div className="caller-nav">
        <button
          className="btn btn-primary caller-btn"
          onClick={goPrev}
          disabled={movementIndex === 0}
        >← Prev</button>
        <button
          className="btn btn-primary caller-btn"
          onClick={goNext}
          disabled={movementIndex === total - 1}
        >Next →</button>
      </div>

      {movementIndex < total - 1 && (
        <div className="caller-next-preview">
          <div className="caller-next-label">Up next</div>
          <div className="caller-next-text">
            <strong>{test.movements[movementIndex + 1].marker}</strong>
            {' — '}
            {test.movements[movementIndex + 1].instruction}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LIBRARY VIEW ────────────────────────────────────────────────────────────

const LEVEL_META = {
  novice:       { label: 'Novice',       color: '#27AE60', bg: '#EAF8EF' },
  intermediate: { label: 'Intermediate', color: '#2980B9', bg: '#EAF3FB' },
  open:         { label: 'Open',         color: '#8E44AD', bg: '#F4EAF9' },
};

function LibraryView({ tests, onSelect }) {
  const grouped = tests.reduce((acc, t) => {
    const level = t.level || 'novice';
    if (!acc[level]) acc[level] = [];
    acc[level].push(t);
    return acc;
  }, {});

  const order = ['novice', 'intermediate', 'open'];

  return (
    <div className="library">
      <div className="library-header">
        <div className="library-logo">🐴</div>
        <h1 className="library-title">PC Dressage</h1>
        <p className="library-sub">Pony Club Test Viewer</p>
      </div>

      {order.filter(l => grouped[l]).map(level => {
        const meta = LEVEL_META[level] || LEVEL_META.novice;
        return (
          <div key={level} className="library-section">
            <div className="library-section-title" style={{ color: meta.color }}>
              {meta.label}
            </div>
            {grouped[level].map(test => (
              <button
                key={test.id}
                className="test-card"
                onClick={() => onSelect(test)}
              >
                <div
                  className="test-card-level"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {meta.label}
                </div>
                <div className="test-card-body">
                  <div className="test-card-title">{test.title}</div>
                  <div className="test-card-sub">{test.subtitle} · {test.movements.length} movements · {ARENA_CONFIG[test.arenaSize]?.label || '20×40m'}</div>
                </div>
                <div className="test-card-arrow">›</div>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'viewer', label: 'Arena',  icon: '⬡' },
  { id: 'moves',  label: 'Moves',  icon: '≡' },
  { id: 'score',  label: 'Score',  icon: '★' },
  { id: 'caller', label: 'Caller', icon: '🎙' },
];

function BottomNav({ activeTab, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(t => (
        <button
          key={t.id}
          className={`bottom-nav-item ${activeTab === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── TEST SHELL (wraps all in-test views) ───────────────────────────────────

function TestShell({ test, onBack }) {
  const [tab, setTab] = useState('viewer');
  const [movementIndex, setMovementIndex] = useState(0);

  function handleTabChange(newTab) {
    setTab(newTab);
  }

  function handleMovesSelect(i) {
    setMovementIndex(i);
    setTab('viewer');
  }

  return (
    <div className="test-shell">
      {/* Header */}
      <header className="test-header">
        <button className="back-btn" onClick={onBack} aria-label="Back to library">
          ‹
        </button>
        <div className="test-header-text">
          <div className="test-header-title">{test.title}</div>
          <div className="test-header-sub">{test.subtitle}</div>
        </div>
        <div className="test-header-right" />
      </header>

      {/* Content */}
      <div className="test-content">
        {tab === 'viewer' && (
          <ViewerView
            test={test}
            movementIndex={movementIndex}
            setMovementIndex={setMovementIndex}
            onTabChange={handleTabChange}
          />
        )}
        {tab === 'moves' && (
          <MovesView
            test={test}
            movementIndex={movementIndex}
            onSelect={handleMovesSelect}
          />
        )}
        {tab === 'score' && (
          <ScoringView test={test} />
        )}
        {tab === 'caller' && (
          <CallerView
            test={test}
            movementIndex={movementIndex}
            setMovementIndex={setMovementIndex}
          />
        )}
      </div>

      <BottomNav activeTab={tab} onChange={handleTabChange} />
    </div>
  );
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────

function App() {
  const [tests, setTests] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTests()
      .then(() => setTests(window.TESTS_DATA))
      .catch(e => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="loading-screen">
        <div>Failed to load tests: {error}</div>
      </div>
    );
  }

  if (!tests) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div>Loading tests…</div>
      </div>
    );
  }

  if (selectedTest) {
    return (
      <TestShell
        test={selectedTest}
        onBack={() => setSelectedTest(null)}
      />
    );
  }

  return <LibraryView tests={tests} onSelect={setSelectedTest} />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
