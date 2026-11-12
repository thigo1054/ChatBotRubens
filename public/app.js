const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const topicsDrawer = document.getElementById("topics-drawer");
const topicsToggle = document.getElementById("topics-toggle");
const form = document.getElementById("form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const suggestions = document.getElementById("suggestions");
const resetBtn = document.getElementById("reset");
const themeBtn = document.getElementById("theme-btn");
const themeIcon = document.getElementById("theme-icon");
const themeLabel = document.getElementById("theme-label");
const fontBtn = document.getElementById("font-btn");
const fontLabel = document.getElementById("font-label");

// ID da última interação: mantém o contexto da conversa no Gemini
let previousInteractionId = sessionStorage.getItem("interactionId") || null;

/* ==========================================================================
   Tema Claro / Escuro e Tamanho da Letra
   ========================================================================== */
function updateThemeUI(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const isDark = theme === "dark";
  themeIcon.textContent = isDark ? "☀️" : "🌙";
  themeLabel.textContent = isDark ? "Modo claro" : "Modo escuro";
}

updateThemeUI(document.documentElement.getAttribute("data-theme") || "light");

themeBtn.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem("theme", next);
  updateThemeUI(next);
});

function updateFontUI(isLarge) {
  document.documentElement.setAttribute("data-large-font", String(isLarge));
  fontLabel.textContent = isLarge ? "Letra normal" : "Letra maior";
}

updateFontUI(localStorage.getItem("largeFont") === "true");

fontBtn.addEventListener("click", () => {
  const isLarge = document.documentElement.getAttribute("data-large-font") !== "true";
  localStorage.setItem("largeFont", String(isLarge));
  updateFontUI(isLarge);
});

/* ==========================================================================
   Aba recolhível de dúvidas comuns
   ========================================================================== */
function setTopicsOpen(open) {
  topicsToggle.setAttribute("aria-expanded", String(open));
  suggestions.hidden = !open;
}

topicsToggle.addEventListener("click", () => {
  const isOpen = topicsToggle.getAttribute("aria-expanded") === "true";
  setTopicsOpen(!isOpen);
});

/* ==========================================================================
   Mensagens do Chat
   ========================================================================== */
function addMessage(role, content) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;

  if (role === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "⚖️";
    msg.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (role === "bot") {
    bubble.innerHTML = DOMPurify.sanitize(marked.parse(content));
    bubble.querySelectorAll("a").forEach((a) => {
      a.target = "_blank";
      a.rel = "noopener";
    });
  } else {
    bubble.textContent = content;
  }

  msg.appendChild(bubble);
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

function showTyping() {
  const msg = document.createElement("div");
  msg.className = "msg bot";
  msg.innerHTML = `
    <div class="msg-avatar" aria-hidden="true">⚖️</div>
    <div class="bubble typing">
      <span>Dra. Lex está escrevendo</span>
      <span class="typing-dots"><span></span><span></span><span></span></span>
    </div>
  `;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

function resetInputHeight() {
  input.style.height = "";
  input.style.overflowY = "hidden";
}

async function sendMessage(text) {
  text = text.trim();
  if (!text) return;

  // Fecha e esconde a aba de exemplos quando a conversa começa
  setTopicsOpen(false);
  if (topicsDrawer) topicsDrawer.style.display = "none";

  addMessage("user", text);
  input.value = "";
  resetInputHeight();
  sendBtn.disabled = true;
  const typing = showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, previousInteractionId }),
    });
    const raw = await res.text();
    typing.remove();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(
        "Servidor da API não encontrado. Rode `npm run dev` e abra http://localhost:3000 (não use o Live Server)."
      );
    }

    if (!res.ok) throw new Error(data.error || "Erro desconhecido");

    previousInteractionId = data.interactionId;
    sessionStorage.setItem("interactionId", previousInteractionId);
    addMessage("bot", data.reply);
  } catch (err) {
    typing.remove();
    addMessage("error", "⚠️ " + err.message);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(input.value);
});

// Enter envia, Shift+Enter quebra linha
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener("input", () => {
  if (!input.value) {
    resetInputHeight();
    return;
  }
  input.style.height = "auto";
  const nextHeight = Math.min(input.scrollHeight, 120);
  input.style.height = nextHeight + "px";
  input.style.overflowY = input.scrollHeight > 120 ? "auto" : "hidden";
});

// Clique nos cartões de temas frequentes
suggestions.querySelectorAll(".topic-card").forEach((btn) =>
  btn.addEventListener("click", () => {
    const question = btn.getAttribute("data-question") || btn.textContent;
    sendMessage(question);
  })
);

// Botão "Nova conversa": limpa as mensagens e mostra novamente o botão da aba de exemplos
resetBtn.addEventListener("click", () => {
  previousInteractionId = null;
  sessionStorage.removeItem("interactionId");
  // Remove todas as mensagens fora do bloco de boas-vindas
  Array.from(messagesEl.children).forEach((el) => {
    if (el !== welcomeEl) el.remove();
  });
  if (topicsDrawer) topicsDrawer.style.display = "block";
  setTopicsOpen(false);
  input.focus();
});
