# CareConnect – Mini Healthcare Support Web App

A beautifully designed, responsive web application built for an NGO healthcare support initiative. This app enables patient registration, volunteer sign-ups, and provides an AI-powered FAQ assistant called **CareBuddy**.

---

## 🌐 Live Demo

**[🔗 Live Hosted Link →]https://care-connect-sooty-mu.vercel.app/**

---

## 🛠️ Tech Stack

| Layer      | Technology                                               |
| ---------- | -------------------------------------------------------- |
| Structure  | HTML5 (semantic)                                         |
| Styling    | Vanilla CSS (glassmorphism, animations, responsive grid) |
| Logic      | Vanilla JavaScript (ES6+)                                |
| Fonts      | Google Fonts – Inter, Outfit                             |
| Deployment | Google Cloud Run / Nginx (Docker)                        |

**No frameworks, no dependencies** — pure HTML/CSS/JS for maximum portability and fast load times.

---

## 🤖 AI / Automation Idea — CareBuddy FAQ Chatbot

**CareBuddy** is an embedded conversational AI assistant that answers patient and volunteer queries in real time.

### How It Works

- A **knowledge base** of 13+ FAQ categories is defined in `app.js`
- When a user sends a message, the chatbot **keyword-matches** the input against the knowledge base
- A simulated **typing indicator** and random response delay (700–1500ms) mimic real AI latency
- **Quick reply chips** guide new users to common questions instantly
- Falls back gracefully with a contact prompt if no match is found

### NGO Use-Case Value

In a production deployment, CareBuddy would connect to:

- **Dialogflow / Rasa** for NLP-powered understanding
- **Backend API** to check application status, volunteer availability, and real-time FAQs
- **WhatsApp / SMS integration** via Twilio for patients without smartphones

This dramatically reduces the manual load on NGO support staff for repetitive queries.

---

## 📋 Features

### 🤒 Patient Support Form

- Full name, age, phone, city, support type selection
- Description field for personalized case assessment
- Real-time client-side validation with helpful error messages
- Consent checkbox + simulated async submission

### 🤝 Volunteer Registration Form

- Name, qualification, phone, city, email, expertise area
- Availability selector and motivation textarea
- Code of conduct consent

### 💬 CareBuddy AI Chatbot

- Floating chat button with pulse animation
- Keyword-based intent matching across 13 FAQ categories
- Typing indicator with animated dots
- Quick reply chips for common questions

### 📖 FAQ Accordion

- 6 commonly asked questions with smooth expand/collapse
- Scroll-triggered entrance animations

### 📬 Contact Form

- Name, email, and message with simulated send

### 🎨 Design Highlights

- Dark mode UI with teal/blue gradient accents
- Animated background blobs in the hero section
- Glassmorphism cards
- Fully responsive (mobile, tablet, desktop)
- Smooth scroll and intersection observer animations

---

## 📁 File Structure

```
RTRP/
├── index.html        # Main HTML – all sections
├── style.css         # Complete design system & styles
├── app.js            # Form logic, validation, chatbot, animations
├── hero-image.png    # AI-generated hero illustration
├── Dockerfile        # Container config for Cloud Run
└── README.md         # This file
```

---

## 🚀 Running Locally

Simply open `index.html` in a browser — no build step required.

```bash
# Option 1: Open directly
open index.html

# Option 2: Local dev server (Python)
python3 -m http.server 8080
# Then visit http://localhost:8080
```

---

## 🐳 Deploying with Docker / Cloud Run

```bash
# Build the image
docker build -t careconnect .

# Run locally
docker run -p 8080:80 careconnect

# Deploy to Google Cloud Run
gcloud run deploy careconnect --source . --region europe-west1 --allow-unauthenticated
```

---

## 🌍 NGO Use-Case

**CareConnect** addresses the healthcare access gap faced by underprivileged communities in India. The platform:

1. **Reduces barrier to entry** – patients register with just a phone number and city
2. **Scales volunteer management** – centralized registration and matching
3. **Provides 24/7 initial support** via CareBuddy without requiring staff
4. **Builds trust** through transparent privacy practices and consent-first design
5. **Extensible** – can integrate with government hospital APIs, Aarogya Setu, and health record systems

---

## 👥 Target Beneficiaries

- Low-income patients requiring free medical consultations
- Individuals needing mental health support without stigma
- Rural communities with limited healthcare infrastructure
- Medical professionals who wish to volunteer their time

---

_Made with ❤️ for India's healthcare communities._
