/* Modern multilingual AI chat front-end
   - Blue accents (as requested)
   - Dark + Light theme toggle
   - Typing animation with custom icon and dots
   - API_KEY = 'abc123' and GEMINI_ENDPOINT included (example)
   WARNING: Storing API keys in client-side JS is insecure. Use a server-side proxy in production.
*/

const API_KEY = "AIzaSyBDFFj5kqWTEjh-7stqkpFIMFEBBm9i6vQ";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=AIzaSyBDFFj5kqWTEjh-7stqkpFIMFEBBm9i6vQ`;

// Elements
const langSelect = document.getElementById('lang-select');
const suggestionsEl = document.getElementById('suggestions');
const inputEl = document.getElementById('input');
const chatEl = document.getElementById('chat');
const composer = document.getElementById('composer');
const fileInput = document.getElementById('file');
const clearBtn = document.getElementById('clear-btn');
const stopBtn = document.getElementById('stop');
const themeToggle = document.getElementById('theme-toggle');
const sendBtn = document.getElementById('send');

let currentLang = langSelect.value || 'en';
let abortController = null;
let attachedFile = null;

// Localized strings and suggestions
const LOCALES = {
  en: {
    placeholder: 'Ask me anything...',
    suggestions: [
      'Why is it necessary to learn ICT?',
      'How will learning ICT be useful to me as a school student in the future?',
    
    ],
    thinking: 'Thinking...'
  },
  si: {
    placeholder: 'ඔබට අවශ්‍ය දෙය අසන්න....',
    suggestions: [
      'ICT ඉගෙනීම අවශ්‍ය වන්නේ ඇයි?',
      'අනාගතයේදී ICT ඉගෙනීම පාසල් සිසුවකු ලෙස මට ප්‍රයෝජනවත් වන්නේ කෙසේද?',
     
    ],
    thinking: 'සිතමින්...'
  },
  ta: {
    placeholder: 'உங்கள் கேள்வியை இங்கே தட்டச்சு செய்யவும்...',
    suggestions: [
      ' ICT படிப்பது ஏன் முக்கியம்?',
      'ഭാவிയിൽ ஒரு വിദ്യാർത്ഥിയെന്ന നിലയിൽ ICT கற்றுக் கொள்வது എനിക്ക് എങ്ങനെ പ്രയോജനകരമാകും?',
    ],
    thinking: 'கணிக்கும்...'
  }
};

function setLocale(lang){
  currentLang = lang;
  langSelect.value = lang;
  inputEl.placeholder = LOCALES[lang].placeholder || LOCALES.en.placeholder;
  renderSuggestions();
}

function renderSuggestions(){
  suggestionsEl.innerHTML = '';
  const arr = LOCALES[currentLang].suggestions || LOCALES.en.suggestions;
  arr.forEach(s => {
    const el = document.createElement('div');
    el.className = 'suggestion';
    el.textContent = s;
    el.addEventListener('click', ()=>{
      inputEl.value = s;
      inputEl.focus();
    });
    suggestionsEl.appendChild(el);
  });
}

// message helpers
function appendMessage(text, who='bot', replace=false){
  if (who === 'bot' && replace){
    const last = chatEl.querySelector('.msg.bot:last-child');
    if (last){
      last.querySelector('.bubble')?.remove();
      const p = document.createElement('div');
      p.className = 'bubble';
      p.textContent = text;
      last.appendChild(p);
      chatEl.scrollTop = chatEl.scrollHeight;
      return last;
    }
  }

  const d = document.createElement('div');
  d.className = 'msg ' + (who === 'user' ? 'user' : 'bot');
  const p = document.createElement('div');
  p.className = 'bubble';
  p.textContent = text;
  d.appendChild(p);
  chatEl.appendChild(d);
  chatEl.scrollTop = chatEl.scrollHeight;
  return d;
}

function showTypingIndicator(){
  const wrap = document.createElement('div');
  wrap.className = 'msg bot typing';
  wrap.innerHTML = `
    <div class="icon" aria-hidden="true">
      <!-- custom typing icon (chat bubble with spark) -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V13C20 14.1046 19.1046 15 18 15H9L6 18V6Z" fill="#fff" opacity="0.06"/>
        <path d="M8.5 9.5C8.5 10 9 10.5 9.5 10.5C10 10.5 10.5 10 10.5 9.5C10.5 9 10 8.5 9.5 8.5C9 8.5 8.5 9 8.5 9.5Z" fill="#fff"/>
        <path d="M12 9.5C12 10 12.5 10.5 13 10.5C13.5 10.5 14 10 14 9.5C14 9 13.5 8.5 13 8.5C12.5 8.5 12 9 12 9.5Z" fill="#fff"/>
      </svg>
    </div>
    <div class="dots"><span></span><span></span><span></span></div>
  `;
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
  return wrap;
}

function removeTypingIndicator(el){
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

// file handling
fileInput.addEventListener('change', (e)=>{
  attachedFile = e.target.files[0] || null;
});

// controls
langSelect.addEventListener('change', (e)=> setLocale(e.target.value));
clearBtn.addEventListener('click', ()=> chatEl.innerHTML = '');

themeToggle.addEventListener('click', ()=>{
  document.body.classList.toggle('light');
  const icon = themeToggle.querySelector('.material-symbols-rounded');
  if (document.body.classList.contains('light')) icon.textContent = 'light_mode'; else icon.textContent = 'dark_mode';
});

stopBtn.addEventListener('click', ()=> {
  if (abortController){
    abortController.abort();
    abortController = null;
    appendMessage('[Interrupted]', 'bot');
  }
});

composer.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const prompt = inputEl.value.trim();
  if (!prompt) return;
  appendMessage(prompt, 'user');
  inputEl.value = '';
  // show typing indicator
  const typer = showTypingIndicator();

  try {
    abortController = new AbortController();
    const responseText = await callGemini(prompt, {signal: abortController.signal, file: attachedFile});
    abortController = null;
    removeTypingIndicator(typer);
    appendMessage(responseText, 'bot');
  } catch (err) {
    removeTypingIndicator(typer);
    if (err.name === 'AbortError') appendMessage('[Response stopped by user]', 'bot');
    else appendMessage('Error: could not fetch response', 'bot');
    console.error(err);
  }
});

// call Gemini (example shape) — adapt to your server/proxy or Google API auth method
// නිවැරදි කළ කේතය
async function callGemini(prompt, {signal = undefined, file = null} = {}){
  
  // 1. භාෂාව තේරීම සඳහා prompt එකට උපදෙසක් එක් කිරීම
  const finalPrompt = `(Response must be in ${currentLang === 'si' ? 'Sinhala' : (currentLang === 'ta' ? 'Tamil' : 'English')}) \n\nUser Query: ${prompt}`;

  // 2. Google API එකට ගැළපෙන නිවැරදි payload ව්‍යුහය සකස් කිරීම
  const payload = {
    "contents": [
      {
        "parts": [
          { "text": finalPrompt }
          // සටහන: ගොනු (file) යැවීම මීට වඩා සංකීර්ණයි, එයට base64 encoding අවශ්‍ය වේ.
          // මෙම කේතය දැනට text-only ඉල්ලීම් සඳහා පමණක් නිවැරදි කර ඇත.
        ]
      }
    ]
  };

  let options;
  if (file){
    // *** ගොනු උඩුගත කිරීමේ (file upload) තර්කනය තවමත් දෝෂ සහිතයි ***
    // Gemini API එක 'multipart/form-data' බාර නොගනී.
    // නමුත් අපි text-only කොටස පළමුව විසඳා ගනිමු.
    console.warn("File upload logic is not correctly implemented for Gemini API");
    // තාවකාලිකව දෝෂයක් පෙන්වමු
    return "File uploads are not supported in this demo setup.";

  } else {
    // 3. Text-only ඉල්ලීම් සඳහා නිවැරදි options සකස් කිරීම
    // (වැරදි 'x-api-key' header එක ඉවත් කර ඇත, કારણ કે key එක දැනටමත් ENDPOINT URL එකේ ඇත)
    options = { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload), 
      signal 
    };
  }

let controller; // For canceling fetch
let typingInterval;
const chatHistory = [];
let currentLanguage = "si"; // Default language
  const res = await fetch(GEMINI_ENDPOINT, options);
  if (!res.ok){
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error('API error: ' + res.status + ' ' + txt);
  }
  const data = await res.json().catch(()=>null);
  if (!data) return '[No response body]';
  // --- නිවැරදි කළ කේතය (මෙය යොදන්න) ---
  if (data.outputText) return data.outputText; // වෙනත් API සඳහා
  if (data.text) return data.text; // වෙනත් API සඳහා

  // Google Gemini API එකෙන් එන text එක නිවැරදිව ලබා ගැනීම:
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (responseText) {
    return responseText;
  }

  // කිසිවක් හමු නොවූයේ නම්, දෝෂය සොයාගැනීමට සම්පූර්ණ දත්ත පෙන්වන්න
  return "[Error: Could not parse response text] " + JSON.stringify(data);
}


// init
setLocale(currentLang);
renderSuggestions();
