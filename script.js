const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const langSelect = document.querySelector("#lang-select");
const initialMessage = document.querySelector("#initial-msg");

// --- Translation Data ---
const translations = {
    si: {
        appHeading: "Sunova AI",
        appSubHeading: "කරුණාකර භාෂාවක් තෝරන්න",
        langLabel: "භාෂාව:",
        placeholder: "ඔබගේ පණිවිඩය මෙහි ටයිප් කරන්න...",
        initialMsg: "ආයුබෝවන්! මගෙන් ඕනෑම දෙයක් අසන්න.",
        language: "සිංහල"
    },
    ta: {
        appHeading: "Sunova AI",
        appSubHeading: "தயவுசெய்து ஒரு மொழியைத் தேர்ந்தெடுக்கவும்",
        langLabel: "மொழி:",
        placeholder: "உங்கள் செய்தியை இங்கே தட்டச்சு செய்யவும்...",
        initialMsg: "வணக்கம்! நீங்கள் என்னிடம் எதையும் கேட்கலாம்.",
        language: "தமிழ்"
    },
    en: {
        appHeading: "Sunova AI",
        appSubHeading: "Please select a language",
        langLabel: "Language:",
        placeholder: "Type your message here...",
        initialMsg: "Hello! Ask me anything.",
        language: "English"
    }
};

// API Setup (Please replace with your actual API Key)
const API_KEY = "AIzaSyBDFFj5kqWTEjh-7stqkpFIMFEBBm9i6vQ"; // Replace with your actual key
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=AIzaSyBDFFj5kqWTEjh-7stqkpFIMFEBBm9i6vQ`;
let controller; // For canceling fetch
let typingInterval;
const chatHistory = [];
let currentLanguage = "si"; // Default language

// --- Utility Functions ---

// Function to update UI texts based on selected language
const updateUI = (lang) => {
    document.getElementById("app-heading").textContent = translations[lang].appHeading;
    document.getElementById("app-sub-heading").textContent = translations[lang].appSubHeading;
    document.getElementById("lang-label").textContent = translations[lang].langLabel;
    promptInput.placeholder = translations[lang].placeholder;
    initialMessage.textContent = translations[lang].initialMsg;
    // Set the select element's value
    langSelect.value = lang;
    currentLanguage = lang;
};

// Function to create message elements
const createMessageElement = (content, className) => {
    const div = document.createElement("div");
    div.classList.add("message", className);
    div.innerHTML = content;
    return div;
};

// Scroll to the bottom of the container
const scrollToBottom = () => chatsContainer.scrollTo({ top: chatsContainer.scrollHeight, behavior: "smooth" });

// Simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgElement) => {
    clearInterval(typingInterval);
    textElement.innerHTML = '';
    let i = 0;

    const typingFn = () => {
        if (i < text.length) {
            textElement.textContent += text.charAt(i);
            i++;
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            botMsgElement.classList.remove("typing");
        }
    };

    typingInterval = setInterval(typingFn, 20); // Adjust typing speed here
};

// Create a typing indicator element
const createTypingIndicator = () => {
    const content = `
        <p>
            <span class="typing-animation"></span>
            <span class="typing-animation"></span>
            <span class="typing-animation"></span>
        </p>
    `;
    const botMsg = createMessageElement(content, "bot-message");
    botMsg.classList.add("typing");
    chatsContainer.appendChild(botMsg);
    return botMsg;
};

// --- API and Chat Logic ---

// Function to get response from Gemini API
const getGeminiResponse = async (userPrompt, lang) => {
    // Add instruction to respond in the selected language
    const languageInstruction = `Respond to the following prompt strictly in the ${translations[lang].language} language.`;
    const fullPrompt = `${languageInstruction}\n\nUser: ${userPrompt}`;
    
    // Prepare the content for the API call
    const contents = [...chatHistory, { role: "user", parts: [{ text: fullPrompt }] }];
    
    try {
        controller = new AbortController();
        const signal = controller.signal;
        
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
            signal
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const botResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "සමාවෙන්න, මට පිළිතුරක් ලබා දීමට නොහැකි විය.";

        // Update chat history (only storing the actual conversation parts)
        chatHistory.push(
            { role: "user", parts: [{ text: userPrompt }] }, // Store user message for context
            { role: "model", parts: [{ text: botResponseText }] } // Store bot response
        );
        
        return botResponseText;

    } catch (error) {
        if (error.name === 'AbortError') {
            return "ප්‍රතිචාරය නැවැත්විය. (Response stopped.)";
        }
        console.error("Gemini API Error:", error);
        return `දෝෂයක් සිදුවිය: ${error.message}`;
    } finally {
        document.body.classList.remove("bot-responding");
        controller = null;
    }
};

// Handle form submission
const handleFormSubmit = async (e) => {
    e.preventDefault();
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) return;

    // Remove initial message if it exists
    if (initialMessage) initialMessage.remove();

    // 1. Add User Message
    const userMsg = createMessageElement(userPrompt, "user-message");
    chatsContainer.appendChild(userMsg);
    promptInput.value = "";
    scrollToBottom();
    
    document.body.classList.add("bot-responding");

    // 2. Add Typing Indicator for Bot
    const botMsg = createTypingIndicator();
    scrollToBottom();

    // 3. Get and Display Bot Response
    const botResponseText = await getGeminiResponse(userPrompt, currentLanguage);

    // Remove typing indicator content
    botMsg.innerHTML = `<p class="bot-text"></p>`;
    const botTextElement = botMsg.querySelector(".bot-text");
    
    // Simulate typing effect for the final response
    typingEffect(botResponseText, botTextElement, botMsg);
};


// --- Event Listeners ---

// Initial UI setup
document.addEventListener("DOMContentLoaded", () => {
    updateUI(currentLanguage);
    const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
    document.body.classList.toggle("light-theme", isLightTheme);
    themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// Language change event
langSelect.addEventListener("change", (e) => {
    const newLang = e.target.value;
    updateUI(newLang);
});

// Form Submission
promptForm.addEventListener("submit", handleFormSubmit);

// Stop Response Button
document.querySelector("#stop-response-btn").addEventListener("click", () => {
    if (controller) {
        controller.abort();
        document.body.classList.remove("bot-responding");
        // Clear typing effect and show a message in the last bot message
        clearInterval(typingInterval);
        const lastBotMessage = chatsContainer.querySelector('.bot-message.typing');
        if (lastBotMessage) {
            lastBotMessage.classList.remove('typing');
            lastBotMessage.innerHTML = `<p class="bot-text">${translations[currentLanguage].language} බසින්: ප්‍රතිචාරය නැවැත්විය.</p>`;
        }
    }
});

// Toggle dark/light theme
themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

});

