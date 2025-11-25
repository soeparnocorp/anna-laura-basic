/**
 * Anna Laura AI Assistant Frontend
 * 
 * Laura adalah asisten AI cerdas dari SOEPARNO ENTERPRISE Corp.
 * Beroperasi dari Sukabumi City, West Java - INDONESIA
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

// Chat state dengan session management
let chatHistory = [
  {
    role: "assistant",
    content: "Halo! Laura adalah asisten AI cerdas dari SOEPARNO ENTERPRISE Corp. Laura beroperasi dari Sukabumi City, West Java - INDONESIA. Bagaimana Laura bisa membantu Anda hari ini?"
  },
];
let isProcessing = false;
let currentSessionId = null;

// SVG Icons untuk dynamic rendering
const SVG_ICONS = {
  upload: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
  </svg>`,
  deepThink: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>`,
  copy: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
  </svg>`,
  regenerate: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>`,
  like: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
  </svg>`,
  dislike: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398-.306.774-1.086 1.227-1.918 1.227h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 0 0 .303-.54" />
  </svg>`,
  share: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>`
};

// Load session dari localStorage jika ada
function loadSession() {
  const savedSession = localStorage.getItem('anna_laura_session');
  if (savedSession) {
    const sessionData = JSON.parse(savedSession);
    currentSessionId = sessionData.sessionId;
    chatHistory = sessionData.chatHistory || chatHistory;
    
    // Re-render chat history
    chatMessages.innerHTML = '';
    chatHistory.forEach(msg => {
      addMessageToChat(msg.role, msg.content);
    });
  } else {
    // Generate new session ID
    currentSessionId = generateSessionId();
    saveSession();
  }
}

// Save session ke localStorage
function saveSession() {
  const sessionData = {
    sessionId: currentSessionId,
    chatHistory: chatHistory,
    lastUpdated: Date.now()
  };
  localStorage.setItem('anna_laura_session', JSON.stringify(sessionData));
}

// Generate session ID
function generateSessionId() {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Auto-resize textarea as user types
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Send message on Enter (without Shift)
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button click handler
sendButton.addEventListener("click", sendMessage);

/**
 * Sends a message to the AI API and processes the response
 */
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
  saveSession(); // Save setelah user message

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
      <div class="message-content">
        <p></p>
      </div>
      <div class="message-actions">
        <div class="action-buttons">
          <label class="upload-label action-btn" title="Upload file">
            <input type="file" class="file-upload" accept=".txt,.log,.json,.pdf,.jpg,.png" onchange="handleFileUpload(this, '${assistantMessageEl.dataset.messageId}')">
            ${SVG_ICONS.upload}
          </label>
          <button class="action-btn" onclick="toggleDeepThink('${assistantMessageEl.dataset.messageId}')" title="Deep Think">
            ${SVG_ICONS.deepThink}
          </button>
          <button class="action-btn" onclick="searchContext('${assistantMessageEl.dataset.messageId}')" title="Search">
            ${SVG_ICONS.search}
          </button>
          <button class="action-btn" onclick="copyMessage('${assistantMessageEl.dataset.messageId}')" title="Copy">
            ${SVG_ICONS.copy}
          </button>
          <button class="action-btn" onclick="regenerateResponse('${assistantMessageEl.dataset.messageId}')" title="Regenerate">
            ${SVG_ICONS.regenerate}
          </button>
        </div>
        <div class="feedback-buttons">
          <button class="feedback-btn" onclick="rateMessage('${assistantMessageEl.dataset.messageId}', 'like')" title="Like">
            ${SVG_ICONS.like}
          </button>
          <button class="feedback-btn" onclick="rateMessage('${assistantMessageEl.dataset.messageId}', 'dislike')" title="Dislike">
            ${SVG_ICONS.dislike}
          </button>
          <button class="action-btn" onclick="shareAnalysis('${assistantMessageEl.dataset.messageId}')" title="Share">
            ${SVG_ICONS.share}
          </button>
        </div>
      </div>
    `;
    
    chatMessages.appendChild(assistantMessageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory,
        sessionId: currentSessionId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";
    let receivedSessionId = currentSessionId;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        
        try {
          const jsonData = JSON.parse(line.replace('data: ', ''));
          
          if (jsonData.sessionId) {
            receivedSessionId = jsonData.sessionId;
            if (receivedSessionId !== currentSessionId) {
              currentSessionId = receivedSessionId;
              saveSession();
            }
          }
          
          if (jsonData.response) {
            responseText += jsonData.response;
            
            // Process code blocks
            const processedContent = processCodeBlocks(responseText);
            assistantMessageEl.querySelector(".message-content").innerHTML = processedContent;
            
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
          
          if (jsonData.error) {
            throw new Error(jsonData.error);
          }
        } catch (e) {
          // Skip JSON parse errors for streaming
        }
      }
    }

    chatHistory.push({ role: "assistant", content: responseText });
    saveSession(); // Save setelah assistant response
  } catch (error) {
    console.error("Error:", error);
    addMessageToChat(
      "assistant",
      error.message || "Maaf, Laura mengalami gangguan. Silakan coba lagi."
    );
  } finally {
    typingIndicator.classList.remove("visible");
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
  }
}

/**
 * Helper function to add message to chat
 */
function addMessageToChat(role, content, messageId = null) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;
  
  if (messageId) {
    messageEl.dataset.messageId = messageId;
  } else {
    messageEl.dataset.messageId = 'msg_' + Date.now();
  }
  
  const timestamp = new Date().toLocaleTimeString();
  
  let actionBar = '';
  if (role === 'assistant') {
    actionBar = `
      <div class="message-actions">
        <div class="action-buttons">
          <label class="upload-label action-btn" title="Upload file">
            <input type="file" class="file-upload" accept=".txt,.log,.json,.pdf,.jpg,.png" onchange="handleFileUpload(this, '${messageEl.dataset.messageId}')">
            ${SVG_ICONS.upload}
          </label>
          <button class="action-btn" onclick="toggleDeepThink('${messageEl.dataset.messageId}')" title="Deep Think">
            ${SVG_ICONS.deepThink}
          </button>
          <button class="action-btn" onclick="searchContext('${messageEl.dataset.messageId}')" title="Search">
            ${SVG_ICONS.search}
          </button>
          <button class="action-btn" onclick="copyMessage('${messageEl.dataset.messageId}')" title="Copy">
            ${SVG_ICONS.copy}
          </button>
          <button class="action-btn" onclick="regenerateResponse('${messageEl.dataset.messageId}')" title="Regenerate">
            ${SVG_ICONS.regenerate}
          </button>
        </div>
        <div class="feedback-buttons">
          <button class="feedback-btn" onclick="rateMessage('${messageEl.dataset.messageId}', 'like')" title="Like">
            ${SVG_ICONS.like}
          </button>
          <button class="feedback-btn" onclick="rateMessage('${messageEl.dataset.messageId}', 'dislike')" title="Dislike">
            ${SVG_ICONS.dislike}
          </button>
          <button class="action-btn" onclick="shareAnalysis('${messageEl.dataset.messageId}')" title="Share">
            ${SVG_ICONS.share}
          </button>
        </div>
      </div>
    `;
  }
  
  const processedContent = processCodeBlocks(content);
  
  messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-role">${role === 'user' ? 'You' : 'Anna Laura AI'}</span>
      <span class="message-time">${timestamp}</span>
    </div>
    <div class="message-content">
      ${processedContent}
    </div>
    ${actionBar}
  `;
  
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Process code blocks in message content
 */
function processCodeBlocks(content) {
  // Simple code block detection and formatting
  return content
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `
        <div class="code-block">
          <div class="code-header">
            <span class="code-language">${language}</span>
            <button class="copy-code-btn" onclick="copyCode(this)">Copy</button>
          </div>
          <div class="code-content">${escapeHtml(code.trim())}</div>
        </div>
      `;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Feature Implementations
 */

function handleFileUpload(input, messageId) {
  const file = input.files[0];
  if (file) {
    addMessageToChat('user', `Uploaded file: ${file.name} - Laura sedang menganalisis...`);
    // File processing logic would go here
  }
  input.value = '';
}

function toggleDeepThink(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  const deepThinkBtn = messageEl.querySelector('.action-btn:nth-child(2)');
  const originalSvg = deepThinkBtn.innerHTML;
  deepThinkBtn.innerHTML = `${SVG_ICONS.deepThink}<span class="deep-think-indicator">Thinking...</span>`;
  
  setTimeout(() => {
    deepThinkBtn.innerHTML = originalSvg;
    addMessageToChat('assistant', 'Laura telah melakukan analisis mendalam. Hasilnya menunjukkan...');
  }, 2000);
}

function searchContext(messageId) {
  addMessageToChat('assistant', 'Laura sedang mencari informasi terkait di database...');
}

function copyMessage(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  const content = messageEl.querySelector('.message-content').textContent;
  
  navigator.clipboard.writeText(content).then(() => {
    const copyBtn = messageEl.querySelector('.action-btn:nth-child(4)');
    const originalSvg = copyBtn.innerHTML;
    copyBtn.innerHTML = `${SVG_ICONS.copy}<span style="margin-left: 4px; font-size: 0.7rem;">✅</span>`;
    setTimeout(() => {
      copyBtn.innerHTML = originalSvg;
    }, 2000);
  });
}

function copyCode(button) {
  const codeContent = button.closest('.code-block').querySelector('.code-content').textContent;
  navigator.clipboard.writeText(codeContent).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  });
}

function regenerateResponse(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  messageEl.remove();
  
  // Remove the last assistant message from history
  chatHistory = chatHistory.filter((msg, index) => 
    !(msg.role === 'assistant' && index === chatHistory.length - 1)
  );
  
  saveSession();
  
  // Resend the last user message
  const lastUserMessage = chatHistory[chatHistory.length - 1];
  if (lastUserMessage && lastUserMessage.role === 'user') {
    addMessageToChat('assistant', 'Laura sedang meregenerasi respons...');
  }
}

function rateMessage(messageId, rating) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  const likeBtn = messageEl.querySelector('.feedback-btn:nth-child(1)');
  const dislikeBtn = messageEl.querySelector('.feedback-btn:nth-child(2)');
  
  if (rating === 'like') {
    likeBtn.classList.add('active');
    dislikeBtn.classList.remove('active');
    addMessageToChat('assistant', 'Terima kasih atas feedback positifnya! Laura senang bisa membantu.');
  } else {
    dislikeBtn.classList.add('active');
    likeBtn.classList.remove('active');
    addMessageToChat('assistant', 'Laura minta maaf jika respons kurang memuaskan. Laura akan berusaha lebih baik.');
  }
}

function shareAnalysis(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  const content = messageEl.querySelector('.message-content').textContent;
  
  if (navigator.share) {
    navigator.share({
      title: 'Anna Laura AI Analysis',
      text: content,
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(content).then(() => {
      const shareBtn = messageEl.querySelector('.action-btn:last-child');
      const originalSvg = shareBtn.innerHTML;
      shareBtn.innerHTML = `${SVG_ICONS.share}<span style="margin-left: 4px; font-size: 0.7rem;">✅</span>`;
      setTimeout(() => {
        shareBtn.innerHTML = originalSvg;
      }, 2000);
    });
  }
}

// Clear session data (untuk testing/development)
function clearSession() {
  localStorage.removeItem('anna_laura_session');
  currentSessionId = generateSessionId();
  chatHistory = [
    {
      role: "assistant",
      content: "Halo! Laura adalah asisten AI cerdas dari SOEPARNO ENTERPRISE Corp. Laura beroperasi dari Sukabumi City, West Java - INDONESIA. Bagaimana Laura bisa membantu Anda hari ini?"
    },
  ];
  chatMessages.innerHTML = '';
  addMessageToChat("assistant", chatHistory[0].content);
  saveSession();
}

// Initialize chat dengan session management
document.addEventListener('DOMContentLoaded', function() {
  loadSession();
  userInput.focus();
  
  // Auto-cleanup session yang terlalu tua (7 hari)
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const sessionData = localStorage.getItem('anna_laura_session');
  if (sessionData) {
    const data = JSON.parse(sessionData);
    if (data.lastUpdated < weekAgo) {
      clearSession();
    }
  }
});
