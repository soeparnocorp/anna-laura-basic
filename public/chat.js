/**
 * Anna Laura AI Assistant Frontend
 */

const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

let chatHistory = [
  { role: "assistant", content: "Halo! Laura adalah asisten AI cerdas dari SOEPARNO ENTERPRISE Corp. Laura beroperasi dari Sukabumi City, West Java - INDONESIA. Bagaimana Laura bisa membantu Anda hari ini?" },
];
let isProcessing = false;
let currentSessionId = null;

const SVG_ICONS = { /* semua icon lo tetap sama */ };

function loadSession() { /* kode lo 100% utuh */ }
function saveSession() { /* kode lo 100% utuh */ }
function generateSessionId() { return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }

userInput.addEventListener("input", function () { this.style.height = "auto"; this.style.height = this.scrollHeight + "px"; });
userInput.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
sendButton.addEventListener("click", sendMessage);

async function sendMessage() {
  const message = userInput.value.trim();
  if (message === "" || isProcessing) return;

  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;

  addMessageToChat("user", message);
  userInput.value = "";
  userInput.style.height = "auto";
  typingIndicator.classList.add("visible");

  chatHistory.push({ role: "user", content: message });
  saveSession();

  try {
    const assistantMessageEl = document.createElement("div");
    assistantMessageEl.className = "message assistant-message";
    assistantMessageEl.dataset.messageId = 'msg_' + Date.now();
    const timestamp = new Date().toLocaleTimeString();

    assistantMessageEl.innerHTML = `
      <div class="message-header">
        <span class="message-role">Anna Laura AI</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content"><p></p></div>
      <div class="message-actions">
        <div class="action-buttons">
          <label class="upload-label action-btn" title="Upload file">
            <input type="file" class="file-upload" accept=".txt,.log,.json,.pdf,.jpg,.png" onchange="handleFileUpload(this, '${assistantMessageEl.dataset.messageId}')">
            ${SVG_ICONS.upload}
          </label>
          <button class="action-btn" onclick="toggleDeepThink('${assistantMessageEl.dataset.messageId}')" title="Deep Think">${SVG_ICONS.deepThink}</button>
          <button class="action-btn" onclick="searchContext('${assistantMessageEl.dataset.messageId}')" title="Search">${SVG_ICONS.search}</button>
          <button class="action-btn" onclick="copyMessage('${assistantMessageEl.dataset.messageId}')" title="Copy">${SVG_ICONS.copy}</button>
          <button class="action-btn" onclick="regenerateResponse('${assistantMessageEl.dataset.messageId}')" title="Regenerate">${SVG_ICONS.regenerate}</button>
        </div>
        <div class="feedback-buttons">
          <button class="feedback-btn" onclick="rateMessage('${assistantMessageEl.dataset.messageId}', 'like')" title="Like">${SVG_ICONS.like}</button>
          <button class="feedback-btn" onclick="rateMessage('${assistantMessageEl.dataset.messageId}', 'dislike')" title="Dislike">${SVG_ICONS.dislike}</button>
          <button class="action-btn" onclick="shareAnalysis('${assistantMessageEl.dataset.messageId}')" title="Share">${SVG_ICONS.share}</button>
        </div>
      </div>
    `;

    chatMessages.appendChild(assistantMessageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory, sessionId: currentSessionId })
    });

    if (!response.ok) throw new Error("Failed");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const jsonData = JSON.parse(line.replace('data: ', ''));
          if (jsonData.sessionId) {
            currentSessionId = jsonData.sessionId;
            saveSession();
          }
          if (jsonData.response) {
            responseText += jsonData.response;
            const processed = processCodeBlocks(responseText);
            assistantMessageEl.querySelector(".message-content").innerHTML = processed;
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (e) {}
      }
    }

    chatHistory.push({ role: "assistant", content: responseText });
    saveSession();
  } catch (error) {
    addMessageToChat("assistant", "Maaf, Laura mengalami gangguan. Silakan coba lagi.");
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

/* semua fungsi lo tetap utuh: addMessageToChat, processCodeBlocks, escapeHtml, toggleDeepThink, regenerateResponse, rateMessage, shareAnalysis, clearSession, dll */

/* ==== UPGRADE BARU — PASTE DI SINI ==== */
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.opacity = '1';
  setTimeout(() => toast.style.opacity = '0', 2000);
}

function copyMessage(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  const content = messageEl.querySelector('.message-content').textContent;
  navigator.clipboard.writeText(content).then(() => showToast("Teks berhasil disalin!"));
}

async function searchContext(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  const btn = messageEl.querySelector('.action-btn:nth-child(3)');
  const original = btn.innerHTML;
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;animation:spin 1s linear infinite;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>';

  const query = (chatHistory[chatHistory.length-2]?.content || "berita").toLowerCase().includes("berita") 
    ? chatHistory[chatHistory.length-2].content 
    : `berita terkini ${chatHistory[chatHistory.length-2]?.content || "Indonesia"}`;

  try {
    const res = await fetch("/api/news", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({query}) });
    const data = await res.json();
    addMessageToChat("assistant", data.result || "Laura tidak menemukan berita terkini.");
  } catch {
    addMessageToChat("assistant", "Laura gagal mencari berita saat ini.");
  }
  btn.innerHTML = original;
}

function handleFileUpload(input, messageId) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    addMessageToChat("user", `Mengunggah gambar: ${file.name}`);

    const lastMsg = chatHistory[chatHistory.length - 1];
    const visionMsg = {
      role: "user",
      content: [
        { type: "text", text: lastMsg.content || "Tolong baca dan jelaskan gambar ini" },
        { type: "image_url", image_url: { url: base64 } }
      ]
    };
    chatHistory[chatHistory.length - 1] = visionMsg;
    sendMessage();
  };
  reader.readAsDataURL(file);
  input.value = '';
}

const style = document.createElement('style');
style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', function() {
  loadSession();
  userInput.focus();
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const sessionData = localStorage.getItem('anna_laura_session');
  if (sessionData) {
    const data = JSON.parse(sessionData);
    if (data.lastUpdated < weekAgo) clearSession();
  }
});
