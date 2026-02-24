const editor = document.getElementById("editor");
const analyzeBtn = document.getElementById("analyzeBtn");
const commentsContainer = document.getElementById("comments-container");

const personaButtons = document.querySelectorAll(".personas button");
const modeButtons = document.querySelectorAll(".modes button");

let selectedPersona = "junior-dev";
let currentMode = "light";

// ---------- Mode switching ----------
modeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    document.body.classList.remove(currentMode);
    currentMode = btn.dataset.mode;
    document.body.classList.add(currentMode);
    modeButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

// ---------- Persona switching ----------
personaButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    selectedPersona = btn.dataset.persona;
    personaButtons.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });
});

// ---------- Analyze ----------
analyzeBtn.addEventListener("click", async () => {
  const text = editor.innerText.trim();
  if (!text) return alert("Please enter some text to analyze!");

  commentsContainer.innerHTML = "<em>Analyzing carefully…</em>";

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, persona: selectedPersona })
    });

    if (!response.ok) throw new Error("Failed to analyze text");

    const data = await response.json();
    renderComments(data.comments);

  } catch (err) {
    commentsContainer.innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
  }
});

// ---------- Render comments ----------
function renderComments(comments) {
  commentsContainer.innerHTML = "";
  let editorHTML = editor.innerText;

  // Clear previous highlights
  editor.innerHTML = editorHTML;

  comments.forEach((c, i) => {
    // Create comment card
    const card = document.createElement("div");
    card.classList.add("comment-card");
    card.innerHTML = `<strong>${c.anchor || "(general)"}</strong><p>${c.question}</p>`;
    commentsContainer.appendChild(card);

    // Fade-in animation
    card.style.animation = `fadeInHighlight 0.3s ease ${i * 0.05}s forwards`;

    // Highlight anchor in editor
    if (c.anchor) {
      const safeAnchor = c.anchor.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(safeAnchor, "g");
      editorHTML = editorHTML.replace(regex, `<span class="comment-anchor" data-anchor="${safeAnchor}">${c.anchor}</span>`);
    }

    // Scroll to anchor on click
    card.addEventListener("click", () => {
      const span = editor.querySelector(`span.comment-anchor[data-anchor="${c.anchor.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}"]`);
      if (span) span.scrollIntoView({ behavior: "smooth", block: "center" });
      // Optional: highlight the anchor briefly
      if (span) {
        span.classList.add("highlight");
        setTimeout(() => span.classList.remove("highlight"), 1500);
      }
    });
  });

  editor.innerHTML = editorHTML;
}
