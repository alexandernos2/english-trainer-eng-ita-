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

/* ---------------- NORMALIZE ---------------- */

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/* ---------------- WORD LOOKUP ---------------- */

function getItalianFromSentence(en) {
  const key = normalize(en);
  return window.words?.[key]?.it || "-";
}

/* ---------------- CLOZE BUILDER ---------------- */

function buildSentence(q) {
  return q.question.replace("____", q.answer);
}

/* ---------------- SHUFFLE ---------------- */

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function fixText(str) {
  if (!str) return "";
  try {
    return decodeURIComponent(escape(str));
  } catch (e) {
    return str;
  }
}

/* ---------------- INIT ---------------- */

function start() {
  state.mode = null;
  game.innerHTML = "";

  game.innerHTML = `
    <h2>English Trainer</h2>

    <div style="margin: 15px 0; line-height: 1.6;">
      <p><strong>Regole</strong></p>

      <p>Parti con 5 vite.</p>
      <p>Ogni risposta corretta: +1 vita e +5 punti.</p>
      <p>Ogni errore: -1 vita e -3 punti.</p>
      <p>Se le vite arrivano a 0, il gioco termina.</p>

      <p>Obiettivo: battere il record.</p>
    </div>

    <p>Record attuale: ${state.bestScore}</p>

    <button id="clozeBtn">Inizia gioco</button>
  `;

  document.getElementById("clozeBtn").onclick = startCloze;
}

/* ---------------- START ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  if (window.__APP_STARTED__) return;
  window.__APP_STARTED__ = true;
  start();
});

/* ---------------- RESET ---------------- */

function resetGame() {
  state.index = 0;
  state.hearts = 5;
  state.score = 0;
}

/* ---------------- CLOZE ---------------- */

function startCloze() {
  state.mode = "cloze";
  state.deck = shuffle(window.cloze || []);
  resetGame();
  render();
}

/* ---------------- RENDER ---------------- */

function render() {
  if (state.hearts <= 0) return endGame();

  const q = state.deck[state.index];

  const question = q.question;
  const correct = q.answer;

  const allAnswers = (window.cloze || []).map(c => c.answer);

  const wrongAnswers = shuffle(
    allAnswers.filter(a => a !== correct)
  ).slice(0, 3);

  const options = shuffle([
    correct,
    ...wrongAnswers
  ]);

  state.correct = correct;

  game.innerHTML = `
    <h2>${question}</h2>

    <p>${HEART} ${state.hearts} | ${STAR} ${state.score}</p>

    <div id="options">
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

  if (ok) {
    state.score += 5;
    state.hearts += 1;
  } else {
    state.score -= 3;
    state.hearts -= 1;
  }

  if (state.score < 0) state.score = 0;

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

    <p>${HEART} ${state.hearts} | ${STAR} ${state.score}</p>

    <button id="nextBtn">Continua</button>
    <button id="revBtn">Reverso</button>
  `;

  document.getElementById("nextBtn").onclick = next;

  document.getElementById("revBtn").onclick = () =>
    window.open(
      "https://context.reverso.net/translation/english-italian/" +
      encodeURIComponent(en),
      "_blank"
    );
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

/* ---------------- END ---------------- */

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