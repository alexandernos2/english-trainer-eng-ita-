const tapAudio = document.getElementById("tapSound");
const musicAudio = document.getElementById("bgMusic");

musicAudio.loop = true;
musicAudio.volume = 0.3;

if (window.__APP_STARTED__ === undefined) {
  window.__APP_STARTED__ = false;
}

const state = {
  mode: null,
  index: 0,
  hearts: 5,
  score: 0,
  bestScore: Number(localStorage.getItem("bestScore") || 0),
  deck: [],
  correct: null
};

const game = document.getElementById("game");
document.documentElement.setAttribute("lang", "it");

const HEART = "Vite";
const STAR = "Punteggio";

/* ---------------- UTILS ---------------- */

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function getItalianFromSentence(en) {
  const key = normalize(en);
  return window.words?.[key]?.it || "-";
}

function buildSentence(q) {
  return q.question.replace("____", q.answer);
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function fixText(str) {
  if (!str) return "";
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

/* ---------------- START SCREEN ---------------- */

function start() {
  state.mode = null;
  game.innerHTML = `
    <h2>English Trainer</h2>

    <p>Parti con 5 vite</p>
    <p>+1 vita e +5 punti se corretto</p>
    <p>-1 vita e -3 punti se sbagliato</p>
    <p>Max vite: 10</p>

    <p>Record: ${state.bestScore}</p>

    <button id="clozeBtn">Cloze Mode</button>
  `;

  document.getElementById("clozeBtn").onclick = startCloze;
}

/* ---------------- AUDIO START ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  if (window.__APP_STARTED__) return;
  window.__APP_STARTED__ = true;

  const startAudio = async () => {
    try {
      await musicAudio.play();
    } catch (e) {}
  };

  document.addEventListener("click", startAudio, { once: true });

  start();
});

/* ---------------- GAME RESET ---------------- */

function resetGame() {
  state.index = 0;
  state.hearts = 5;
  state.score = 0;
}

/* ---------------- MODE ---------------- */

function startCloze() {
  state.mode = "cloze";
  state.deck = shuffle(window.cloze || []);
  resetGame();
  render();
}

/* ---------------- HEARTS ---------------- */

function renderHearts() {
  let html = "";

  for (let i = 0; i < 10; i++) {
    html += `<img src="${i < state.hearts ? "heart.png" : "heart_empty.png"}" width="26" height="26">`;
  }

  return html;
}

/* ---------------- RENDER ---------------- */

function render() {
  if (state.hearts <= 0) return endGame();

  const q = state.deck[state.index];

  const correct = q.answer;
  state.correct = correct;

  // -------------------------------
  // SMART DISTRACTORS (NEW SYSTEM)
  // -------------------------------

  const pool = (window.cloze || []).filter(item => item.answer !== correct);

  let slotPool = pool.filter(x => x.slot === q.slot);
  let domainPool = pool.filter(x => x.domain === q.domain);
  let patternPool = pool.filter(x => x.pattern === q.pattern);

// pesa i candidati invece di unirli in modo piatto
let scored = new Map();

function add(list, weight) {
  for (let x of list) {
    const key = x.answer;

    if (!scored.has(key)) scored.set(key, { item: x, score: 0 });

    scored.get(key).score += weight;
  }
}

// priorità reale
add(slotPool, 3);
add(domainPool, 2);
add(patternPool, 1);

// trasformazione in array ordinato
let candidates = [...scored.values()]
  .sort((a, b) => b.score - a.score)
  .map(x => x.item);
  if (candidates.length < 3) {
    candidates = pool;
  }

  const unique = [];
  const seen = new Set();

  for (let c of candidates) {
    if (!seen.has(c.answer)) {
      seen.add(c.answer);
      unique.push(c);
    }
  }

const wrongAnswers = shuffle(
  [...new Set(unique.map(x => x.answer))]
).slice(0, 3);  const options = shuffle([correct, ...wrongAnswers]);

  game.innerHTML = `
    <h2>${q.question}</h2>

    <div>${renderHearts()}</div>

    <p>${STAR} ${state.score}</p>

    <div>
      ${options.map(o => `<button class="opt">${o}</button>`).join("")}
    </div>
  `;
}

/* ---------------- CLICK ---------------- */

document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("opt")) return;
  handleAnswer(e.target.textContent);
});

/* ---------------- ANSWER ---------------- */

function handleAnswer(val) {
  const ok = val === state.correct;

 try {
  tapAudio.currentTime = 0;
  const p = tapAudio.play();
  if (p !== undefined) p.catch(() => {});
} catch (e) {}

  if (ok) {
    state.score += 5;
    state.hearts = Math.min(10, state.hearts + 1);
  } else {
    state.score -= 3;
    state.hearts = Math.max(0, state.hearts - 1);
  }

  if (state.score < 0) state.score = 0;

  if (state.hearts <= 0) return endGame();

  showResult(ok);
}

/* ---------------- RESULT ---------------- */

function showResult(ok) {
  const q = state.deck[state.index];

  const en = buildSentence(q);
  const it = getItalianFromSentence(en);

  game.innerHTML = `
    <h2>${ok ? "CORRETTO" : "SBAGLIATO"}</h2>

    <p>EN: ${fixText(en)}</p>
    <p>IT: ${fixText(it)}</p>

    <div>${renderHearts()}</div>

    <p>${STAR} ${state.score}</p>

    <button id="nextBtn">Continua</button>
    <button id="revBtn">Reverso</button>
  `;

  document.getElementById("nextBtn").onclick = next;

  document.getElementById("revBtn").onclick = () => {
    window.open(
      "https://context.reverso.net/translation/english-italian/" +
      encodeURIComponent(en),
      "_blank"
    );
  };
}
/* ---------------- NEXT ---------------- */

function next() {
  state.index++;

  if (state.index >= state.deck.length) {
    state.deck = shuffle(window.cloze || []);
    state.index = 0;
  }

  render();
}

/* ---------------- GAME OVER ---------------- */

function endGame() {
  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem("bestScore", state.bestScore);
  }

  game.innerHTML = `
    <h2>GAME OVER</h2>

    <p>Score: ${state.score}</p>
    <p>Record: ${state.bestScore}</p>

    <button id="retryBtn">Riprova</button>
  `;

  document.getElementById("retryBtn").onclick = start;
}