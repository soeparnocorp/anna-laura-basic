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
            📎
          </label>
          <button class="action-btn" onclick="toggleDeepThink('${assistantMessageEl.dataset.messageId}')" title="Deep Think">🧠</button>
          <button class="action-btn" onclick="searchContext('${assistantMessageEl.dataset.messageId}')" title="Search">🔍</button>
          <button class="action-btn" onclick="copyMessage('${assistantMessageEl.dataset.messageId}')" title="Copy">📋</button>
          <button class="action-btn" onclick="regenerateResponse('${assistantMessageEl.dataset.messageId}')" title="Regenerate">🔄</button>
        </div>
        <div class="feedback-buttons">
          <button class="feedback-btn" onclick="rateMessage('${assistantMessageEl.dataset.messageId}', 'like')" title="Like">👍</button>
          <button class="feedback-btn" onclick="rateMessage('${assistantMessageEl.dataset.messageId}', 'dislike')" title="Dislike">👎</button>
          <button class="action-btn" onclick="shareAnalysis('${assistantMessageEl.dataset.messageId}')" title="Share">📤</button>
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
            📎
          </label>
          <button class="action-btn" onclick="toggleDeepThink('${messageEl.dataset.messageId}')" title="Deep Think">🧠</button>
          <button class="action-btn" onclick="searchContext('${messageEl.dataset.messageId}')" title="Search">🔍</button>
          <button class="action-btn" onclick="copyMessage('${messageEl.dataset.messageId}')" title="Copy">📋</button>
          <button class="action-btn" onclick="regenerateResponse('${messageEl.dataset.messageId}')" title="Regenerate">🔄</button>
        </div>
        <div class="feedback-buttons">
          <button class="feedback-btn" onclick="rateMessage('${messageEl.dataset.messageId}', 'like')" title="Like">👍</button>
          <button class="feedback-btn" onclick="rateMessage('${messageEl.dataset.messageId}', 'dislike')" title="Dislike">👎</button>
          <button class="action-btn" onclick="shareAnalysis('${messageEl.dataset.messageId}')" title="Share">📤</button>
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
    addMessageToChat('user', `📎 Uploaded file: ${file.name} - Laura sedang menganalisis...`);
    // File processing logic would go here
  }
  input.value = '';
}

function toggleDeepThink(messageId) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
  const deepThinkBtn = messageEl.querySelector('.action-btn:nth-child(2)');
  deepThinkBtn.innerHTML = '🧠<span class="deep-think-indicator">Thinking...</span>';
  
  setTimeout(() => {
    deepThinkBtn.innerHTML = '🧠';
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
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '✅';
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
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
      const originalText = shareBtn.innerHTML;
      shareBtn.innerHTML = '✅';
      setTimeout(() => {
        shareBtn.innerHTML = originalText;
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
