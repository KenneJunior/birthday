# Interactive Birthday & Confession Experience

A beautifully crafted, interactive web experience featuring a birthday celebration site with a heartfelt confession page. Built with modern web technologies and thoughtful animations.

## 🌟 Features

### Birthday Site (`fhavur.html`)
- **Animated Greeting Card**: Beautiful gradient backgrounds with interactive elements
- **Photo Gallery**: Memory showcase with modal viewing
- **Interactive Elements**:
    - Floating hearts and confetti effects
    - Music player with custom controls
    - Celebration button with visual feedback
- **Responsive Design**: Works seamlessly across devices
- **Social Sharing**: Easy sharing to popular platforms
- **Accessibility**: ARIA labels and keyboard navigation support

### Confession Experience (`confession.html` → `fhav.html`)
- **Interactive Gradient Background**: Mouse-following gradient effects
- **Custom Cursor**: Enhanced visual experience
- **Three Response Options**: Yes/Maybe/No buttons that connect via WhatsApp
- **Smooth Animations**: CSS transitions and JavaScript-powered interactions
- **Structured Data**: SEO-optimized with schema.org markup

## 🛠️ Technical Stack

- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Custom animations, gradients, and responsive design
- **JavaScript ES6+**: Modern interactive functionality
- **Web APIs**: Audio, Canvas, and DOM manipulation
- **PWA Ready**: Web App Manifest and service worker support
- **External Libraries**:
    - Bootstrap 5.3.3
    - Font Awesome 6.5.2
    - Animate.css 4.1.1
    - Google Fonts (Montserrat, Dancing Script, Pacifico)

## 📁 Project Structure

```
├── fhavur.html # Main birthday page
├── confession.html # Initial confession page
├── fhav.html # Response collection page
├── manifest.json # PWA configuration
├── src/
│ ├── HBD.js # Birthday page functionality
│ ├── Modal.js # Image modal system
│ └── notification.js # Notification system
├── audio/ # Audio assets
└── images/ # Image assets
```

## 🚀 Getting Started

1. **Clone or Download** the project files
2. **Serve Locally** (recommended):
   ```bash
   # Using Python
   python -m http.server 8000
   # Using Node.js
   npx serve
   # Using PHP
   php -S localhost:8000
   ```
3. **Open in Browser**: Navigate to `http://localhost:8000/fhavur.html` or `http://localhost:8000/confession.html`
4. **Enjoy the Experience!**
5. **Deploy**: Upload to your web server or hosting platform
6. **Share**: Share the URL with friends and family
  
## 📱 Usage
   ### Birthday Site
- Click the "Celebrate Princess!" button for animations

- Use the music player to control background audio

- Click images to view in modal gallery

- Share via social media buttons
### Confession Flow
1. Start at confession.html for the initial message
2. Choose to "Continue" or "Turn Back"
3. On fhav.html, select a response option:
    * "I'm happy to" (Yes)
    * "I will think about it" (Maybe)
    * "No But thanks" (No)

4. Responses open WhatsApp with pre-filled messages
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
    no: "Your custom no message..."
};
```
### Audio Files
Replace audio files in the `audio/` directory with your own, ensuring filenames match those in `HBD.js`.
### Images
Replace images in the `images/` directory with your own, ensuring filenames match those in the HTML files.
### Styling
* Main styles: `int.css` and inline styles
* Notification styles:` notification.css`
* Confession page styles: `fhav.css` and `date.css`
## 🌐 Browser Support
* Chrome/Edge 90+
* Firefox 88+
* Safari 14+
* Mobile browsers (iOS Safari, Chrome Mobile)

## 📊 Performance Features
* Lazy Loading: Images load on demand
* Debounced Events: Optimized resize handlers
* CSS Animations: GPU-accelerated effects
* Efficient DOM: Minimal reflows and repaints

## 🔧 Customization
### Changing Colors
Edit CSS custom properties or gradient definitions in respective CSS files.

### Adding Photos
Update the photo gallery in fhavur.html and ensure proper file paths.
### Modifying Text
Edit the HTML content directly in respective files for messages and greetings.
## License
This project is created for personal use. Please respect the personal nature of this content.
Do not use or distribute without permission.
## 🎯 Purpose
* This project demonstrates:
* Modern frontend development techniques
* Interactive web experiences
* Progressive Web App capabilities
* Responsive design principles
* Accessibility considerations
## 🤝 Contributing
This is a personal project, but feedback and suggestions are welcome for technical improvements
via issues or pull requests.
**Note**: This project contains personal content and is intended as a demonstration of web development skills combined with personal expression.