const messagesEl = document.getElementById("messages");
const form = document.getElementById("form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
const suggestions = document.getElementById("suggestions");
const resetBtn = document.getElementById("reset");

// ID da última interação: mantém o contexto da conversa no Gemini
let previousInteractionId = sessionStorage.getItem("interactionId") || null;

function addMessage(role, content) {
  const msg = document.createElement("div");
  msg.className = `msg ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (role === "bot") {
    bubble.innerHTML = DOMPurify.sanitize(marked.parse(content));
    bubble.querySelectorAll("a").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
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
  msg.innerHTML = '<div class="bubble typing"><span></span><span></span><span></span></div>';
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return msg;
}

async function sendMessage(text) {
  text = text.trim();
  if (!text) return;

  suggestions.style.display = "none";
  addMessage("user", text);
  input.value = "";
  input.style.height = "auto";
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
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
});

suggestions.querySelectorAll("button").forEach((btn) =>
  btn.addEventListener("click", () => sendMessage(btn.textContent))
);

resetBtn.addEventListener("click", () => {
  previousInteractionId = null;
  sessionStorage.removeItem("interactionId");
  messagesEl.innerHTML = "";
  addMessage("bot", "Nova conversa iniciada. Como posso ajudar? ⚖️");
  suggestions.style.display = "flex";
});

