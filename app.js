/* ============================================================
   CareConnect – AI Chatbot Logic & Form Validation
   ============================================================ */

/* ---- Navbar scroll effect ---- */
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 40) {
    nav.style.background = 'rgba(6,11,22,0.95)';
  } else {
    nav.style.background = 'rgba(6,11,22,0.7)';
  }
});

/* ---- Scroll helper ---- */
function scrollToSection(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

/* ============================================================
   FORM TABS
   ============================================================ */
function switchTab(type) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + type).classList.add('active');
  document.getElementById('form-patient').classList.add('hidden');
  document.getElementById('form-volunteer').classList.add('hidden');
  document.getElementById('form-' + type).classList.remove('hidden');
  document.getElementById('success-msg').classList.add('hidden');
}

/* ============================================================
   FORM VALIDATION
   ============================================================ */
function setError(id, msg) {
  const el = document.getElementById('err-' + id);
  const input = document.getElementById(id.replace('err-', ''));
  if (el) el.textContent = msg;
  if (input) {
    if (msg) input.classList.add('invalid');
    else input.classList.remove('invalid');
  }
}

function clearErrors(ids) {
  ids.forEach(id => setError(id, ''));
}

function validatePatientForm() {
  let valid = true;
  clearErrors(['p-name', 'p-age', 'p-phone', 'p-city', 'p-support', 'p-consent']);

  const name = document.getElementById('p-name').value.trim();
  const age = document.getElementById('p-age').value.trim();
  const phone = document.getElementById('p-phone').value.trim();
  const city = document.getElementById('p-city').value.trim();
  const support = document.getElementById('p-support').value;
  const consent = document.getElementById('p-consent').checked;

  if (!name) { setError('p-name', 'Name is required.'); valid = false; }
  if (!age || isNaN(age) || age < 1 || age > 120) { setError('p-age', 'Enter a valid age (1–120).'); valid = false; }
  if (!phone || !/^\+?[\d\s\-]{7,15}$/.test(phone)) { setError('p-phone', 'Enter a valid phone number.'); valid = false; }
  if (!city) { setError('p-city', 'City is required.'); valid = false; }
  if (!support) { setError('p-support', 'Please select a support type.'); valid = false; }
  if (!consent) { setError('p-consent', 'You must agree to the consent.'); valid = false; }

  return valid;
}

function validateVolunteerForm() {
  let valid = true;
  clearErrors(['v-name', 'v-qual', 'v-phone', 'v-city', 'v-email', 'v-expertise', 'v-consent']);

  const name = document.getElementById('v-name').value.trim();
  const qual = document.getElementById('v-qual').value.trim();
  const phone = document.getElementById('v-phone').value.trim();
  const city = document.getElementById('v-city').value.trim();
  const email = document.getElementById('v-email').value.trim();
  const expertise = document.getElementById('v-expertise').value;
  const consent = document.getElementById('v-consent').checked;

  if (!name) { setError('v-name', 'Name is required.'); valid = false; }
  if (!qual) { setError('v-qual', 'Qualification is required.'); valid = false; }
  if (!phone || !/^\+?[\d\s\-]{7,15}$/.test(phone)) { setError('v-phone', 'Enter a valid phone number.'); valid = false; }
  if (!city) { setError('v-city', 'City is required.'); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('v-email', 'Enter a valid email address.'); valid = false; }
  if (!expertise) { setError('v-expertise', 'Please select an expertise area.'); valid = false; }
  if (!consent) { setError('v-consent', 'You must agree to the code of conduct.'); valid = false; }

  return valid;
}

/* ---- Simulate async submission ---- */
function simulateSubmit(loaderId, submitId) {
  return new Promise(resolve => {
    document.getElementById(loaderId).classList.remove('hidden');
    document.getElementById(submitId).disabled = true;
    setTimeout(() => {
      document.getElementById(loaderId).classList.add('hidden');
      document.getElementById(submitId).disabled = false;
      resolve();
    }, 1800);
  });
}

/* ---- Patient form submit ---- */
document.getElementById('patient-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validatePatientForm()) return;
  await simulateSubmit('patient-loader', 'patient-submit');
  showSuccess('patient');
});

/* ---- Volunteer form submit ---- */
document.getElementById('volunteer-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateVolunteerForm()) return;
  await simulateSubmit('volunteer-loader', 'volunteer-submit');
  showSuccess('volunteer');
});

function showSuccess(type) {
  document.getElementById('form-' + type).classList.add('hidden');
  const successEl = document.getElementById('success-msg');
  successEl.classList.remove('hidden');
  if (type === 'patient') {
    document.getElementById('success-title').textContent = 'Your request has been received! 🙏';
    document.getElementById('success-body').innerHTML = 'Our care coordinator will reach out within <strong>24 hours</strong>.<br/>Ask our AI assistant any questions while you wait.';
  } else {
    document.getElementById('success-title').textContent = 'Welcome aboard, volunteer! 🎉';
    document.getElementById('success-body').innerHTML = 'We\'ll review your profile and get in touch within <strong>48 hours</strong>.<br/>Thank you for making a difference!';
  }
  successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ---- Contact form ---- */
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('contact-submit');
  btn.textContent = '⏳ Sending…';
  btn.disabled = true;
  await new Promise(r => setTimeout(r, 1400));
  btn.textContent = 'Send Message';
  btn.disabled = false;
  document.getElementById('contact-form').reset();
  document.getElementById('contact-success').classList.remove('hidden');
  setTimeout(() => document.getElementById('contact-success').classList.add('hidden'), 4000);
});

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
function toggleFaq(item) {
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

/* ============================================================
   AI CHATBOT – CareBuddy
   ============================================================ */

/* --- Knowledge base --- */
const KB = [
  {
    keys: ['free', 'cost', 'charge', 'pay', 'money', 'price'],
    answer: 'Yes! CareConnect is <strong>100% free</strong> for all patients. We are a non-profit organization funded by donations and grants. You will never be charged for our services. 🆓'
  },
  {
    keys: ['register', 'sign up', 'apply', 'join', 'enroll', 'how do i'],
    answer: 'You can register using the form on this page! Simply click the <strong>"Register Now"</strong> button or scroll to the Register section. Choose between Patient Support or Volunteer Registration and fill in the form. ✅'
  },
  {
    keys: ['volunteer', 'volunteering', 'help out', 'contribute'],
    answer: 'We\'d love to have you! Volunteers can register in the <strong>Register section</strong> of this page. We welcome medical professionals, counselors, nurses, pharmacists, and community outreach workers. After applying, our team reviews and contacts you within 48 hours. 🤝'
  },
  {
    keys: ['patient', 'support', 'need help', 'sick', 'ill', 'treatment'],
    answer: 'If you need healthcare support, scroll to the <strong>Register</strong> section and select "Patient Support". Fill in your details and describe your situation — our team will match you with a volunteer or professional within 24 hours. 🩺'
  },
  {
    keys: ['service', 'offer', 'provide', 'what do', 'what can'],
    answer: 'CareConnect offers: <br/>• 🩺 Free medical consultations<br/>• 🧠 Mental health support<br/>• 💊 Medicine aid programs<br/>• 🚑 Emergency response assistance<br/>• 🏠 Home care support coordination'
  },
  {
    keys: ['emergency', 'urgent', 'sos', 'ambulance'],
    answer: 'For emergencies, please <strong>call 108</strong> (India\'s national emergency number) immediately. Once the immediate situation is handled, reach out to us and we will provide follow-up care coordination. 🚑'
  },
  {
    keys: ['mental health', 'depression', 'anxiety', 'counseling', 'stress', 'psychological'],
    answer: 'We offer anonymous mental health support through trained counselors. You can register using a pseudonym. Our mental health volunteers are available for one-on-one sessions, completely free and confidential. 🧠💚'
  },
  {
    keys: ['medicine', 'medication', 'drug', 'prescription', 'pharmacy'],
    answer: 'Our Medicine Aid program helps provide essential medications to those who cannot afford them. Register as a patient and select "Medicine Aid" as your support type, and we\'ll connect you with our pharmacy network. 💊'
  },
  {
    keys: ['data', 'privacy', 'secure', 'safe', 'information', 'personal'],
    answer: 'Your privacy is our top priority. All data is <strong>end-to-end encrypted</strong> and stored securely. We never sell or share your information with third parties. You can request deletion at any time by emailing us. 🔒'
  },
  {
    keys: ['location', 'city', 'area', 'where', 'available', 'region', 'india'],
    answer: 'We currently serve <strong>48 cities</strong> across India, including metro areas and Tier 2 cities. Telehealth services are available nationwide. We\'re also expanding to rural areas through mobile health camps. 📍'
  },
  {
    keys: ['contact', 'reach', 'call', 'phone', 'email'],
    answer: 'You can reach us at:<br/>📧 support@careconnect.org<br/>📞 1800-CARE-NGO (Toll Free)<br/>Or use the Contact form at the bottom of this page. We typically reply within 2 business hours. 📬'
  },
  {
    keys: ['wait', 'long', 'time', 'response', 'quick', 'fast'],
    answer: 'Non-emergency patient requests are matched within <strong>24–48 hours</strong>. Emergency cases are expedited and typically handled within a few hours. Volunteer applications are reviewed within 48 hours. ⏱️'
  },
  {
    keys: ['donate', 'fund', 'contribution', 'giving'],
    answer: 'We greatly appreciate donations! You can support us via our donor portal. Every rupee goes directly to healthcare services. Please email us at donate@careconnect.org for more details. 💛'
  },
];

const FALLBACK = "I'm not sure I understand that fully. Could you try rephrasing? Or you can reach our team directly at <strong>support@careconnect.org</strong>. I'm best at answering questions about our services, volunteering, and registration! 😊";

function getBotResponse(userText) {
  const lower = userText.toLowerCase();
  for (const entry of KB) {
    if (entry.keys.some(k => lower.includes(k))) {
      return entry.answer;
    }
  }
  // Greeting check
  if (/^(hi|hello|hey|hii|howdy|namaste|hola)\b/.test(lower)) {
    return "Hello! 👋 I'm <strong>CareBuddy</strong>, CareConnect's AI assistant. How can I help you today? You can ask me about our services, registration, volunteering, or anything else related to CareConnect!";
  }
  if (/thank/.test(lower)) {
    return "You're most welcome! 😊 If you have any more questions, I'm here to help. Stay healthy! 💚";
  }
  return FALLBACK;
}

/* --- Chat state --- */
let chatOpen = false;
let isTyping = false;

function openChat() {
  chatOpen = true;
  document.getElementById('chat-window').classList.remove('hidden');
  document.getElementById('chat-input').focus();
}
function closeChat() {
  chatOpen = false;
  document.getElementById('chat-window').classList.add('hidden');
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(text, role) {
  const body = document.getElementById('chat-body');
  const msg = document.createElement('div');
  msg.className = 'msg ' + role;
  msg.innerHTML = `
    <div class="msg-bubble">${text}</div>
    <div class="msg-time">${getTime()}</div>
  `;
  body.appendChild(msg);
  body.scrollTop = body.scrollHeight;
  return msg;
}

function showTyping() {
  const body = document.getElementById('chat-body');
  const typing = document.createElement('div');
  typing.className = 'msg bot';
  typing.id = 'typing-indicator';
  typing.innerHTML = `
    <div class="msg-bubble typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  body.appendChild(typing);
  body.scrollTop = body.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById('typing-indicator');
  if (t) t.remove();
}

async function sendMessage() {
  if (isTyping) return;
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  // Hide quick replies
  const qr = document.getElementById('quick-replies');
  if (qr) qr.style.display = 'none';

  input.value = '';
  appendMessage(text, 'user');

  isTyping = true;
  showTyping();

  // Simulate AI "thinking" latency (700–1500ms)
  const delay = 700 + Math.random() * 800;
  await new Promise(r => setTimeout(r, delay));

  hideTyping();
  const response = getBotResponse(text);
  appendMessage(response, 'bot');
  isTyping = false;
}

function sendQuick(text) {
  if (isTyping) return;
  const input = document.getElementById('chat-input');
  input.value = text;
  sendMessage();
}

function handleChatKey(e) {
  if (e.key === 'Enter') sendMessage();
}

/* ============================================================
   Intersection Observer – subtle entrance animations
   ============================================================ */
const observerOpts = { threshold: 0.1 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOpts);

document.querySelectorAll('.feature-card, .faq-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
