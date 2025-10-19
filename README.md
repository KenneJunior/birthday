# Interactive Birthday & Confession Experience ✨

[![Netlify Status](https://api.netlify.com/api/v1/badges/5962aebc-777a-4637-b46c-1d4c4c332043/deploy-status)](https://app.netlify.com/projects/fhavur/deploys)
![Vercel](https://img.shields.io/badge/Vercel-black?logo=vercel)
![Made with Love](https://img.shields.io/badge/❤️-made%20with%20love-red)
![Happy Birthday](https://img.shields.io/badge/🎂-Happy%20Birthday-pink)
![Party Mode](https://img.shields.io/badge/🥳-Party%20Time-purple)
![Special Gift](https://img.shields.io/badge/🎁-Gift%20Inside-green)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat&logo=pwa&logoColor=white)

A beautifully crafted, interactive web experience featuring a birthday celebration site with a heartfelt confession page. Built with modern web technologies and thoughtful animations.

## 🌟 Features

### 🎂 Birthday Site (`fhavur.html`)

- **Animated Greeting Card**: Beautiful gradient backgrounds with interactive elements
- **Photo Gallery**: Memory showcase with modal viewing and zoom capabilities
- **Interactive Elements**:
  - ✨ Floating hearts and confetti effects
  - 🎵 Music player with custom controls
  - 🎯 Celebration button with visual feedback
- **Responsive Design**: Works seamlessly across all devices
- **Social Sharing**: Easy sharing to popular platforms
- **Accessibility**: ARIA labels and keyboard navigation support
- **PWA Support**: Installable as a mobile app

### 💌 Confession Experience (`confession.html` → `fhav.html`)

- **Interactive Gradient Background**: Mouse-following gradient effects
- **Custom Cursor**: Enhanced visual experience
- **Three Response Options**: Yes/Maybe/No buttons with WhatsApp integration
- **Smooth Animations**: CSS transitions and JavaScript-powered interactions
- **Structured Data**: SEO-optimized with schema.org markup

## 🛠️ Technical Stack

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=fff)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=fff)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)

- **Web APIs**: Audio, Canvas, and DOM manipulation
- **PWA Ready**: Web App Manifest and service worker support
- **External Libraries**:
  - Bootstrap 5.3.3
  - Font Awesome 6.5.2
  - Animate.css 4.1.1
  - Google Fonts (Montserrat, Dancing Script, Pacifico)
  - hammer js

## 📊 Repo Stats

![GitHub stars](https://img.shields.io/github/stars/kennejunior/birthday?style=social)
![GitHub forks](https://img.shields.io/github/forks/kennejunior/birthday?style=social)
![GitHub issues](https://img.shields.io/github/issues/kennejunior/birthday)

## 📁 Project Structure

```text
├── 📄 fhavur.html # Main birthday page
├── 📄 confession.html # Initial confession page
├── 📄 fhav.html # Response collection page
├── 📄 manifest.json # PWA configuration
├── 📂 src/
│ ├── 📄 HBD.js # Birthday page functionality
│ ├── 📄 Modal.js # Image modal system
│ └── 📄 notification.js # Notification system
├── 📂 audio/ # Audio assets
└── 📂 images/ # Image assets
```

## 🚀 Quick Start

### Prerequisites

- A modern web browser
- Local server for testing (optional but recommended)

### Installation & Setup

1. **Clone or Download the project**

   ```bash
   git clone https://github.com/KenneJunior/birthday.git
   cd project-directory
   ```

2. **Serve Locally** (optional)

   - Using VSCode Live Server or any local server of your choice

   ```bash

    # Using Python
   python -m http.server 8000

   # Using Node.js (install serve first: npm install -g serve)
   npx serve

   # Using PHP
   php -S localhost:8000
   ```

3. **Open in Browser**
   - Navigate to `http://localhost:8000/fhavur.html` for the birthday site
   - Navigate to `http://localhost:8000/confession.html` for the confession flow
4. **Deploy**
   - Host on any static site hosting service (GitHub Pages, Netlify, Vercel, etc.)
   - Ensure all assets are correctly linked
   - For PWA functionality, ensure HTTPS is enabled on your hosting platform
   - Test all features across different devices and browsers

## 📱 Usage Guide

### 🎂 Birthday Site Experience

1. Initial View: Landing page with animated greeting
2. Interactions:
   - Click "Celebrate Princess!" for surprise animations
   - Use music player controls for background audio
   - Click images to open modal gallery with navigation
   - Use social share buttons to spread the joy
3. Mobile Features: Touch-optimized interactions and PWA installation

💌 Confession Flow

1. Start: Open confession.html for the initial message
2. Decision: Choose between "Continue" or "Turn Back"
3. Response: On fhav.html, select from three options:
   - ✅ "I'm happy to" (Yes)
   - 🤔 "I will think about it" (Maybe)
   - ❌ "No But thanks" (No)
4. WhatsApp Integration: Responses open with pre-filled messages

## ⚙️ Configuration

### WhatsApp Integration

Edit the phone number in `fhav.js`:

```javascript
const phoneNumber = "1234567890"; // Replace with your number
```

### Custom Messages

Edit the messages in `fhav.js`:

```javascript
const responses = {
  yes: "Your custom yes message...",
  maybe: "Your custom maybe message...",
  no: "Your custom no message...",
};
```

### Media Assets

- Audio: Replace files in audio/ directory (keep original filenames)
- Images: Update images/ directory with your photos
- Icons: Customize via Font Awesome classes or replace SVG elements

### Styling Customization

- Main styles: `int.css` and inline styles
- Notification styles:` notification.css`
- Confession page styles: `fhav.css` and `date.css`

## 🌐 Browser Support

| Browser     | Minimum Version | Platform       |
| ----------- | --------------- | -------------- |
| Chrome/Edge | 90+             | Desktop/Mobile |
| Firefox     | 88+             | Desktop/Mobile |
| Safari      | 14+             | Desktop/iOS    |

## 📊 Performance Features

- Lazy Loading: Images load on demand
- Debounced Events: Optimized resize handlers
- CSS Animations: GPU-accelerated effects
- Efficient DOM: Minimal reflows and repaints
- PWA Optimization: Fast loading and offline capabilities

## 🔧 Advance Customization

### Changing Colors

Edit CSS custom properties or gradient definitions in respective CSS files.

```css
:root {
  --primary-color: #db7093;
  --secondary-color: #ff6b6b;
  --accent-color: #ffd700;
}
```

### Animation Timing

Adjust durations and easing functions in CSS animation definitions.

```css
@keyframes float {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
  100% {
    transform: translateY(0);
  }
}
```

### Adding Photos

Update the photo gallery in fhavur.html and ensure proper file paths in the json file
located in `\public\imageDIR.json`.

### Modifying Text

Edit the HTML content directly in respective files for messages and greetings.

## 🚀 Deployment

### Netlify Deployment

1. Drag and drop folder to Netlify
2. Configure build settings (if needed)
3. Set up custom domain (optional)

### GitHub Pages

1. Push to GitHub repository
2. Enable GitHub Pages in settings
3. Configure source branch

### Traditional Hosting

1. Upload all files via FTP
2. Ensure proper file permissions
3. Test all functionality

## 📄 License

This project is created for personal use. Please respect the personal nature of this content.
Usage Restrictions:

- Personal use only
- Do not redistribute without permission
- Attribute original creator if modified
- No commercial use without consent
- Respect privacy of any personal content
- Do not use for harmful or malicious purposes
- No warranties provided; use at your own risk

## 🎯 Project Purpose

This project demonstrates advanced frontend development skills including:

- Modern CSS animations and gradients
- JavaScript interactivity and DOM manipulation
- Progressive Web App capabilities
- Responsive design principles
- Accessibility best practices
- Performance optimization techniques

## 🤝 Contributing

While this is a personal project, technical feedback and suggestions are welcome:

1. **Issues**: Report bugs or suggest improvements
2. **Forking**: For educational purposes only
3. **Respect**: Please maintain the personal nature of the content
4. **Contact**: Reach out via GitHub for any questions
5. **No Pull Requests**: Due to the personal nature, PRs will not be accepted
6. **Attribution**: If you use ideas or code, please credit the original creator

## 📞 Contact

For any inquiries or feedback, please contact me via GitHub or email.

**Note**: This project contains personal content and is intended as a demonstration of web development skills combined with personal expression.

---

<div align="center"> Made with ❤️ using modern web technologies </div>
