/* ===== 스도쿠 생성·풀이 엔진 =====
   - 같은 '씨앗(날짜·크기·난이도·단계)'이면 어느 기기에서든 똑같은 문제가 나온다.
   - 모든 문제는 정답이 하나뿐이다. */
const SudokuEngine = (() => {
  // 크기별 굵은 상자 모양: 4×4 → 2행×2열, 6×6 → 2행×3열, 9×9 → 3행×3열
  function boxDims(n) {
    if (n === 4) return [2, 2];
    if (n === 6) return [2, 3];
    return [3, 3];
  }

  // 난이도별 빈칸 수 범위 [1단계, 10단계] — 단계가 오를수록 빈칸이 늘어난다
  const BANDS = {
    4: { easy: [4, 6], medium: [6, 8], hard: [8, 10] },
    6: { easy: [10, 14], medium: [15, 19], hard: [20, 23] },
    9: { easy: [30, 37], medium: [40, 47], hard: [50, 55] }
  };
  const STAGES = 10;

  function stageTarget(n, diff, stage) {
    const [lo, hi] = BANDS[n][diff] || BANDS[n].medium;
    return Math.round(lo + (hi - lo) * (stage - 1) / (STAGES - 1));
  }

  // 문자열 → 고정 난수 (FNV-1a 해시 + mulberry32)
  function makeRng(seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    let a = h >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const geoCache = {};
  function geometry(n) {
    if (geoCache[n]) return geoCache[n];
    const [br, bc] = boxDims(n);
    const N = n * n;
    const row = new Array(N), col = new Array(N), box = new Array(N);
    for (let i = 0; i < N; i++) {
      row[i] = Math.floor(i / n);
      col[i] = i % n;
      box[i] = Math.floor(row[i] / br) * (n / bc) + Math.floor(col[i] / bc);
    }
    const peers = [];
    for (let i = 0; i < N; i++) {
      const p = [];
      for (let j = 0; j < N; j++) {
        if (j !== i && (row[j] === row[i] || col[j] === col[i] || box[j] === box[i])) p.push(j);
      }
      peers.push(p);
    }
    geoCache[n] = { n, N, br, bc, row, col, box, peers };
    return geoCache[n];
  }

  function shuffle(a, rng) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function popcount(m) {
    let k = 0;
    while (m) { m &= m - 1; k++; }
    return k;
  }

  // 완성된 정답판을 무작위로 만든다
  function fillGrid(n, rng) {
    const G = geometry(n);
    const g = new Array(G.N).fill(0);
    const rows = new Array(n).fill(0), cols = new Array(n).fill(0), boxes = new Array(n).fill(0);
    const digits = Array.from({ length: n }, (_, k) => k + 1);
    function rec(i) {
      if (i === G.N) return true;
      const r = G.row[i], c = G.col[i], b = G.box[i];
      const used = rows[r] | cols[c] | boxes[b];
      for (const d of shuffle(digits.slice(), rng)) {
        const bit = 1 << d;
        if (used & bit) continue;
        g[i] = d; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        if (rec(i + 1)) return true;
        g[i] = 0; rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
      }
      return false;
    }
    rec(0);
    return g;
  }

  // 해의 개수를 limit개까지만 센다 (유일해 판정용)
  function countSolutions(cells, n, limit = 2) {
    const G = geometry(n);
    const g = cells.slice();
    const rows = new Array(n).fill(0), cols = new Array(n).fill(0), boxes = new Array(n).fill(0);
    for (let i = 0; i < G.N; i++) {
      const v = g[i];
      if (!v) continue;
      const bit = 1 << v;
      const r = G.row[i], c = G.col[i], b = G.box[i];
      if ((rows[r] | cols[c] | boxes[b]) & bit) return 0;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
    }
    const full = (1 << (n + 1)) - 2;
    let count = 0;
    function solve() {
      let best = -1, bestMask = 0, bestK = 99;
      for (let i = 0; i < G.N; i++) {
        if (g[i]) continue;
        const m = full & ~(rows[G.row[i]] | cols[G.col[i]] | boxes[G.box[i]]);
        const k = popcount(m);
        if (k === 0) return;
        if (k < bestK) { best = i; bestMask = m; bestK = k; if (k === 1) break; }
      }
      if (best === -1) { count++; return; }
      const r = G.row[best], c = G.col[best], b = G.box[best];
      let m = bestMask;
      while (m) {
        const bit = m & -m;
        m ^= bit;
        g[best] = 31 - Math.clz32(bit);
        rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        solve();
        rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
        g[best] = 0;
        if (count >= limit) return;
      }
    }
    solve();
    return count;
  }

  // 빈칸 target개짜리 유일해 문제 (목표에 못 미치면 같은 난수 흐름으로 다시 시도)
  function generate(n, target, rng = Math.random, maxTries = 60) {
    const G = geometry(n);
    let best = null;
    for (let t = 0; t < maxTries; t++) {
      const solution = fillGrid(n, rng);
      const puzzle = solution.slice();
      const order = shuffle(Array.from({ length: G.N }, (_, i) => i), rng);
      let removed = 0;
      for (const i of order) {
        if (removed >= target) break;
        const keep = puzzle[i];
        puzzle[i] = 0;
        if (countSolutions(puzzle, n, 2) !== 1) puzzle[i] = keep;
        else removed++;
      }
      if (!best || removed > best.removed) best = { puzzle, solution, removed };
      if (removed >= target) break;
    }
    return { puzzle: best.puzzle, solution: best.solution };
  }

  // 오늘의 단계 문제: 날짜·크기·난이도·단계가 같으면 항상 같은 문제
  const dailyCache = {};
  function daily(day, n, diff, stage) {
    const key = `${day}|${n}|${diff}|${stage}`;
    if (!dailyCache[key]) {
      dailyCache[key] = generate(n, stageTarget(n, diff, stage), makeRng(`sudoku-classroom|${key}`));
    }
    return dailyCache[key];
  }

  return { boxDims, geometry, generate, countSolutions, stageTarget, daily, makeRng, BANDS, STAGES };
})();
