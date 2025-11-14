import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

export default function App() {
  const [text, setText] = useState("ABABDABACDABABCABAB");
  const [pattern, setPattern] = useState("ABABCABAB");
  const [algorithm, setAlgorithm] = useState("KMP"); // KMP or BM
  const [steps, setSteps] = useState([]);
  const [pos, setPos] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [matches, setMatches] = useState([]); // start indices where pattern found
  const [compareGrid, setCompareGrid] = useState([]); // 2D grid of comparisons text x pattern
  const containerRef = useRef(null);
  
  // Correct cell spacing from styles.css (38px width + 6px gap + 2px border)
  const CELL_TOTAL_SPACE = 46;

  useEffect(() => {
    // reset generated state when inputs change
    setGenerated(false);
    setSteps([]);
    setPos(0);
    setMatches([]);
    setCompareGrid([]);
  }, [text, pattern, algorithm]);

  // navigation
  function onNext() { setPos(p => Math.min(p + 1, steps.length - 1)); }
  function onPrev() { setPos(p => Math.max(p - 1, 0)); }
  function onReset() { setPos(0); }

  // This function finds the step corresponding to a grid cell click
  function jumpToComparison(textIndex, patternIndex) {
    if (!steps.length) return; // Don't search if steps aren't generated

    // Find the index of the first step that matches this comparison
    const stepIndex = steps.findIndex(step => 
      step.lastComparison?.textIndex === textIndex &&
      step.lastComparison?.patternIndex === patternIndex
    );

    // If we found a matching step (stepIndex is not -1), jump to it
    if (stepIndex !== -1) {
      setPos(stepIndex);
    } else {
      // This can happen if a cell is never actually compared (e.g., in BM)
      console.log(`No direct comparison step found for t[${textIndex}] vs p[${patternIndex}]`);
    }
  }

  // when Run is clicked: generate compare grid, compute steps & matches, start at beginning and show matches highlighted
  function onRun() {
    if (!pattern) return;
    // build static compare grid (visual grid of text[i] vs pattern[j])
    const grid = Array.from({ length: text.length }, (_, i) =>
      Array.from({ length: pattern.length }, (_, j) => (text[i] === pattern[j]))
    );
    setCompareGrid(grid);

    if (algorithm === "KMP") {
      const { steps: s, matches: m } = buildKMPSteps(text, pattern);
      setSteps(s);
      setMatches(m);
    } else {
      const { steps: s, matches: m } = buildBMSteps(text, pattern);
      setSteps(s);
      setMatches(m);
    }
    setPos(0);
    setGenerated(true);
  }

  const current = steps[pos] || null;
  const windowStart = current ? (current.windowStart ?? 0) : 0;

  // Calculate complexity metrics
  const totalComparisons = steps.filter(s => s.lastComparison).length;
  const worstCaseComparisons = algorithm === "KMP" 
    ? text.length + pattern.length 
    : text.length * pattern.length;
  const currentComparisons = steps.slice(0, pos + 1).filter(s => s.lastComparison).length;

  return (
    <div className="app" ref={containerRef}>
      <h1>Pattern Matching Visualizer</h1>

      <div className="controls">
        <div className="inputs">
          <label>Text
            <input value={text} onChange={e => setText(e.target.value)} />
          </label>
          <label>Pattern
            <input value={pattern} onChange={e => setPattern(e.target.value)} />
          </label>
          <label>Algorithm
            <select value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
              <option value="KMP">KMP</option>
              <option value="BM">Boyer–Moore</option>
            </select>
          </label>
        </div>

        <div className="buttons">
          <button className="btn primary" onClick={onRun}>Run</button>
          <button className="btn" onClick={onPrev}>Prev</button>
          <button className="btn" onClick={onNext}>Next</button>
          <button className="btn" onClick={onReset}>Reset</button>
        </div>
      </div>

      <div className="visual">
        <div className="text-row">
          {Array.from(text).map((ch, i) => {
            const isCompare = current && current.compareIndex === i;
            const isFoundStart = matches.includes(i);
            return (
              <div key={i} className={`cell ${isCompare ? (current.lastMatch ? "match" : "mismatch") : ""} ${isFoundStart ? "found" : ""}`}>
                <div className="ch">{ch}</div>
                <div className="idx">{i}</div>
              </div>
            );
          })}
        </div>

        <div className="pattern-row-wrapper">
          <div
            className="pattern-row"
            style={{
              transform: `translateX(${(windowStart) * CELL_TOTAL_SPACE}px)`,
              transition: "transform 300ms ease"
            }}
          >
            {Array.from(pattern).map((ch, j) => {
              const textIndex = windowStart + j; 
              const isComp = current && 
                             current.lastComparison && 
                             current.lastComparison.textIndex === textIndex && 
                             current.lastComparison.patternIndex === j;
              
              const compClass = isComp ? (current.lastComparison.match ? "match" : "mismatch") : "";

              return (
                <div key={j} className={`cell pattern-cell ${compClass}`}>
                  <div className="ch">{ch}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="action-box">
          <div><strong>Step:</strong> {pos + 1} / {steps.length}</div>
          <div className="action-text">{current ? current.action : (generated ? "Finished / idle" : "Press Run to generate")}</div>
          <div className="matches">
            <strong>Matches:</strong> {matches.length ? matches.join(", ") : "—"}
          </div>
        </div>
      </div>

      {/* Step Log and Time Complexity side by side */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '18px' }}>
        <div className="log-box" style={{ flex: '1', marginTop: '0', borderTop: 'none', paddingTop: '0' }}>
          <h3>Step Log</h3>
          <div className="log-list">
            {steps.map((s, i) => (
              <div key={i} className={`log-item ${i===pos ? "active" : ""}`}>
                <div className="log-index">#{i+1}</div>
                <div className="log-text">{s.summary}</div>
              </div>
            ))}
            {!steps.length && <div className="muted">No steps — press Run</div>}
          </div>
        </div>

        {/* Time Complexity Visualization */}
        <div style={{ 
          flex: '1', 
          border: '1px solid #e6eef6', 
          padding: '12px', 
          borderRadius: '8px',
          background: 'white'
        }}>
          <h3>Time Complexity</h3>
          
          {/* Algorithm Info */}
          <div style={{ 
            background: 'linear-gradient(to right, #eef2ff, #dbeafe)', 
            borderRadius: '8px', 
            padding: '12px', 
            marginBottom: '12px' 
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#3730a3', marginBottom: '8px' }}>
              {algorithm === "KMP" ? 'KMP Algorithm' : 'Boyer–Moore Algorithm'}
            </h4>
            <div style={{ fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#555' }}>Best Case:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#059669' }}>
                  {algorithm === "KMP" ? 'O(n)' : 'O(n/m)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#555' }}>Average Case:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#2563eb' }}>
                  {algorithm === "KMP" ? 'O(n)' : 'O(n)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#555' }}>Worst Case:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#dc2626' }}>
                  {algorithm === "KMP" ? 'O(n+m)' : 'O(n·m)'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Execution Stats */}
          {generated && (
            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#333', marginBottom: '12px' }}>
                Current Execution
              </h4>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#555' }}>Comparisons</span>
                  <span style={{ fontWeight: '700' }}>{currentComparisons} / {totalComparisons}</span>
                </div>
                <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '8px' }}>
                  <div
                    style={{
                      width: `${totalComparisons > 0 ? (currentComparisons / totalComparisons) * 100 : 0}%`,
                      background: '#4f46e5',
                      height: '8px',
                      borderRadius: '9999px',
                      transition: 'width 300ms ease'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#555' }}>Efficiency</span>
                  <span style={{ fontWeight: '700' }}>
                    {totalComparisons > 0 
                      ? `${((1 - totalComparisons / worstCaseComparisons) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '8px' }}>
                  <div
                    style={{
                      width: `${totalComparisons > 0 ? ((1 - totalComparisons / worstCaseComparisons) * 100) : 0}%`,
                      background: '#22c55e',
                      height: '8px',
                      borderRadius: '9999px'
                    }}
                  />
                </div>
              </div>

              <div style={{ paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                  <span style={{ color: '#555' }}>Total Comparisons:</span>
                  <span style={{ fontWeight: '700', color: '#4f46e5' }}>{totalComparisons}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                  <span style={{ color: '#555' }}>Worst Case:</span>
                  <span style={{ fontWeight: '700', color: '#6b7280' }}>{worstCaseComparisons}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#555' }}>Matches Found:</span>
                  <span style={{ fontWeight: '700', color: '#059669' }}>{matches.length}</span>
                </div>
              </div>
            </div>
          )}
          
          {!generated && (
            <div className="muted" style={{ textAlign: 'center', padding: '24px' }}>
              Press Run to see complexity analysis
            </div>
          )}
        </div>
      </div>

      <div className="tables-and-grid">
        <div className="tables">
          {algorithm === "KMP" ? <KMPTable pattern={pattern} /> : <BMTable pattern={pattern} />}
        </div>

        <div className="compare-grid-box">
          <h3>Comparison Grid (Text rows × Pattern columns)</h3>
          {compareGrid.length ? (
            <div className="compare-grid">
              <div className="compare-row header">
                <div className="compare-cell header empty" />
                {Array.from(pattern).map((ch, j) => (
                  <div key={j} className="compare-cell header">{ch}<div className="small">j={j}</div></div>
                ))}
              </div>
              {Array.from(text).map((ch, i) => (
                <div key={i} className="compare-row">
                  <div className="compare-cell header">{ch}<div className="small">i={i}</div></div>
                  {Array.from(pattern).map((_, j) => {
                    const eq = compareGrid[i][j];
                    const isCurrent = current && current.lastComparison && current.lastComparison.textIndex === i && current.lastComparison.patternIndex === j;
                    return (
                      <div 
                        key={j} 
                        className={`compare-cell ${eq ? "eq" : "neq"} ${isCurrent ? "current-cell" : ""} clickable`}
                        onClick={() => jumpToComparison(i, j)}
                        title={`Click to jump to comparison of text[${i}] vs pattern[${j}]`}
                      >
                        {eq ? "✓" : "✕"}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : <div className="muted">Comparison grid will appear after Run</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Helper UI components ---------------- */

function KMPTable({ pattern }) {
  const { lps, log } = computeLPS(pattern);
  return (
    <div className="pre-table">
      <h3>KMP – LPS</h3>
      <div className="lps-row">
        {Array.from(pattern).map((ch, i) => (
          <div key={i} className="table-cell">
            <div className="ch">{ch}</div>
            <div className="val">{lps[i]}</div>
          </div>
        ))}
      </div>
      <div className="tiny muted">
        <strong>Preprocess Log</strong>
        <ol>{log.map((ln,i)=><li key={i}>{ln}</li>)}</ol>
      </div>
    </div>
  );
}

function BMTable({ pattern }) {
  const bad = computeBadChar(pattern);
  const good = computeGoodSuffix(pattern);
  return (
    <div className="pre-table">
      <h3>Boyer–Moore</h3>
      <div className="tiny"><strong>Bad Character</strong></div>
      <div className="lps-row">
        {Object.keys(bad).map((ch)=>(
          <div key={ch} className="table-cell"><div className="ch">{ch}</div><div className="val">{bad[ch]}</div></div>
        ))}
      </div>
      <div className="tiny mt"><strong>Good Suffix (Shift)</strong></div>
      <div className="lps-row">
        {good.map((v,i)=>(<div key={i} className="table-cell"><div className="ch">{i}</div><div className="val">{v}</div></div>))}
      </div>
    </div>
  );
}

/* ---------------- Algorithms and Step Builders ---------------- */

/* KMP: compute LPS */
function computeLPS(p) {
  const n = p.length;
  const lps = Array(n).fill(0);
  const log = [];
  let len = 0;
  let i = 1;
  while (i < n) {
    log.push(`Compare p[${i}]='${p[i]}' with p[${len}]='${p[len]}'`);
    if (p[i] === p[len]) {
      len++;
      lps[i] = len;
      log.push(`Match -> lps[${i}] = ${len}`);
      i++;
    } else {
      if (len !== 0) {
        len = lps[len - 1];
        log.push(`Fallback len to ${len}`);
      } else {
        lps[i] = 0;
        log.push(`Set lps[${i}] = 0`);
        i++;
      }
    }
  }
  return { lps, log };
}

/* Build KMP steps */
function buildKMPSteps(text, pattern) {
  const { lps, log } = computeLPS(pattern);
  const steps = [];
  const matches = [];
  let i = 0, j = 0;
  while (i < text.length) {
    const match = text[i] === pattern[j];
    steps.push({
      windowStart: i - j,
      windowEnd: i - j + pattern.length - 1,
      compareIndex: i,
      lastComparison: { textIndex: i, patternIndex: j, match },
      lastMatch: match,
      action: `Compare text[${i}]='${text[i]}' with pattern[${j}]='${pattern[j]}'`,
      summary: match ? `Match at text[${i}] & pattern[${j}]` : `Mismatch at text[${i}] & pattern[${j}]`
    });
    if (match) {
      i++; j++;
      if (j === pattern.length) {
        const start = i - j;
        matches.push(start);
        steps.push({
          windowStart: start,
          windowEnd: start + pattern.length - 1,
          action: `Pattern found at ${start}`,
          summary: `Pattern occurs at ${start}`
        });
        j = lps[j - 1] ?? 0;
      }
    } else {
      if (j !== 0) {
        const oldj = j;
        j = lps[j - 1] ?? 0;
        steps.push({
          action: `Mismatch -> fallback j from ${oldj} to ${j}`,
          summary: `Fallback j to ${j}`,
          windowStart: i - j,
          windowEnd: i - j + pattern.length - 1
        });
      } else {
        steps.push({ action: `Mismatch and j=0 -> i++`, summary: `Increment i` });
        i++;
      }
    }
  }
  steps.push({ action: "Search complete", summary: "Search finished." });
  return { steps, matches };
}

/* Boyer-Moore preprocessing: bad char and good suffix */
/* bad char: last occurrence */
function computeBadChar(p) {
  const bad = {};
  for (let i = 0; i < p.length; i++) bad[p[i]] = i;
  return bad;
}

/* good suffix from standard algorithm (computes shift for every position) */
function computeGoodSuffix(p) {
  const m = p.length;
  const suff = Array(m).fill(0);
  // suffixes length of longest suffix starting at i that is also a prefix ???
  // We'll compute full good-suffix shift table (standard two-pass method)
  const shift = Array(m + 1).fill(m);
  const borderPos = Array(m + 1).fill(0);
  let i = m, j = m + 1;
  borderPos[i] = j;
  while (i > 0) {
    while (j <= m && p[i - 1] !== p[j - 1]) {
      if (shift[j] === m) shift[j] = j - i;
      j = borderPos[j];
    }
    i--; j--;
    borderPos[i] = j;
  }
  j = borderPos[0];
  for (i = 0; i <= m; i++) {
    if (shift[i] === m) shift[i] = j;
    if (i === j) j = borderPos[j];
  }
  // return array of length m+1; for visualization we return first m entries (shift for j+1 index used in algorithm)
  return shift.slice(0, m + 1);
}

/* Build Boyer-Moore steps with Bad Character + Good Suffix */
function buildBMSteps(text, pattern) {
  const bad = computeBadChar(pattern);
  const good = computeGoodSuffix(pattern);
  const steps = [];
  const matches = [];
  const n = text.length, m = pattern.length;
  let s = 0; // shift
  while (s <= n - m) {
    let j = m - 1;
    steps.push({ windowStart: s, windowEnd: s + m - 1, action: `Align pattern at s=${s}`, summary: `Window [${s}, ${s + m - 1}]`});
    while (j >= 0 && pattern[j] === text[s + j]) {
      steps.push({
        windowStart: s,
        windowEnd: s + m - 1,
        compareIndex: s + j,
        lastComparison: { textIndex: s + j, patternIndex: j, match: true },
        lastMatch: true,
        action: `Match at text[${s + j}] & pattern[${j}]`,
        summary: `Match at text[${s + j}] & pattern[${j}]`
      });
      j--;
    }
    if (j < 0) {
      matches.push(s);
      steps.push({ windowStart: s, windowEnd: s + m - 1, action: `Pattern found at ${s}`, summary: `Pattern occurs at ${s}` });
      // shift by good[0]
      const shift = good[0] ?? 1;
      steps.push({ action: `Shift after match by ${shift}`, summary: `Shift to ${s + shift}`, windowStart: s + shift });
      s += shift;
    } else {
      steps.push({
        windowStart: s, windowEnd: s + m - 1,
        compareIndex: s + j,
        lastComparison: { textIndex: s + j, patternIndex: j, match: false },
        lastMatch: false,
        action: `Mismatch at text[${s + j}] & pattern[${j}]`,
        summary: `Mismatch at text[${s + j}] & pattern[${j}]`
      });
      const badChar = text[s + j];
      const lastOcc = bad[badChar] !== undefined ? bad[badChar] : -1;
      const bcShift = Math.max(1, j - lastOcc);
      const gsShift = good[j + 1] ?? m;
      const shift = Math.max(bcShift, gsShift);
      steps.push({ action: `Bad Character shift ${bcShift}, Good Suffix shift ${gsShift} -> use ${shift}`, summary: `Shift from ${s} to ${s + shift}`, windowStart: s + shift });
      s += shift;
    }
  }
  steps.push({ action: "Search complete", summary: "Search finished." });
  return { steps, matches };
}
