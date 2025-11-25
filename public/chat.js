/**
 * secAI Security Frontend
 *
 * Handles the security chat UI interactions and communication with the backend API.
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

// Chat state
let chatHistory = [
  {
    role: "assistant",
    content: "Hello! I'm secAI Security Assistant. I can help analyze security threats, detect vulnerabilities, and provide cybersecurity guidance. How can I assist with your security needs today?",
  },
];
let isProcessing = false;

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
 * Sends a message to the security API and processes the response
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

  try {
    const assistantMessageEl = document.createElement("div");
    assistantMessageEl.className = "message assistant-message";
    assistantMessageEl.innerHTML = "<p></p>";
    chatMessages.appendChild(assistantMessageEl);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });

      const lines = chunk.split("\n");
      for (const line of lines) {
        try {
          const jsonData = JSON.parse(line);
          if (jsonData.response) {
            responseText += jsonData.response;
            assistantMessageEl.querySelector("p").textContent = responseText;

            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (e) {
          console.error("Error parsing JSON:", e);
        }
      }
    }

    chatHistory.push({ role: "assistant", content: responseText });
  } catch (error) {
    console.error("Error:", error);
    addMessageToChat(
      "assistant",
      "Security analysis failed. Please check your connection and try again.",
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
function addMessageToChat(role, content) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;
  messageEl.innerHTML = `<p>${content}</p>`;
  chatMessages.appendChild(messageEl);

  chatMessages.scrollTop = chatMessages.scrollHeight;
}
