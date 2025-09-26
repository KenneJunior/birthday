import {Notification} from "./notification.js";
export class UltimateModal {

    constructor() {
        this.elements = {
            modal: document.getElementById('imageModal'),
            modalContainer: document.querySelector('.modal-container'),
            openModalBtn: document.getElementById('modal_open'),
            modalImage: document.querySelector('.modal-image'),
            modalVideo: document.querySelector('.modal-video'),
            profileImage: document.querySelector('#profile_pic'),
            profileImageContainer: document.querySelector('#profile_image'),
            closeButton: document.querySelector('.modal-close'),
            maximizeModalBtn: document.querySelector('.modal-maximize'),
            prevButton: document.querySelector('.modal-prev'),
            nextButton: document.querySelector('.modal-next'),
            counter: document.querySelector('.modal-counter'),
            thumbnails: document.querySelectorAll('.photo-thumbnail'),
            socialLinks: document.querySelectorAll('.modal-social a'),
            profile_pic: document.querySelector('.image-container'),
        };

        this.state = {
            currentIndex: 0,
            images: [],
            videos: [],
            isZoomed: false,
            isZoomPanSetup :false,
            isMaximized:  false,
            isFullscreen: false,
            transitionStyle: 'slide-up', // Can be 'zoom-in', 'fade-in', or 'slide-up'
            panStart: { x: 0, y: 0 },
            panOffset: { x: 0, y: 0 }
        };

        this.hammer = null;
        this.initHammerWhenReady();
    }

     init() {
        this.generateGallery();
    }

     initHammerWhenReady() {
        if (typeof Hammer === 'undefined') {
            console.warn('Hammer.js not available. Touch gestures will be disabled.');
            return;
        }

        // Wait for modal container to be available
        const checkContainer = () => {
            if (this.elements.modalContainer) {
                this.setupHammer();
            } else {
                setTimeout(checkContainer, 100);
            }
        };
        
        checkContainer();
    }
    
     setupHammer() {
        try {
            this.hammer = new Hammer(this.elements.modalContainer);
            
            this.hammer.get('swipe').set({ 
                direction: Hammer.DIRECTION_ALL,
                threshold: 10,
                velocity: 0.3
            });
            
            this.hammer.get('pinch').set({ enable: true });
            this.hammer.get('pan').set({ direction: Hammer.DIRECTION_ALL });
            
            // Set up event handlers
            this.hammer.on('swipeleft', (event) => {
                event.preventDefault();
                this.navigate(1);
            });
            
            this.hammer.on('swiperight', (event) => {
                event.preventDefault();
                this.navigate(-1);
            });
            
            this.hammer.on('swipeup', (event) => {
                event.preventDefault();
                this.closeModal();
            });
            
            this.hammer.on('swipedown', (event) => {
                event.preventDefault();
                this.closeModal();
            });
            
            
            this.hammer.on('doubletap', (event) => {
                event.preventDefault();
                this.toggleFullscreen();
            });

            this.setupHammerForZoomPan();
                        
        } catch (error) {
            console.error('Failed to initialize Hammer.js:', error);
        }
    }

    cacheImages() {
        this.elements.thumbnails = document.querySelectorAll('.photo-thumbnail');
        this.state.images = Array.from(this.elements.thumbnails).map(thumb => ({
            src: thumb.querySelector('img').src,
            alt: thumb.querySelector('img').alt
        }));
        this.state.videos = [
            { src: 'vid1.mp4' },
            { src: 'vid2.mp4' },
            { src: 'vid3.mp4' }
        ];
    }

    setupEventListeners() {
        // Open modal
        this.elements.thumbnails.forEach((thumb, index) => {
            thumb.addEventListener('click', () => this.openModal(index));
        });
        
        const { length: profile_index } = this.elements.thumbnails;
        this.elements.profileImage.addEventListener('click', () => this.openModal(profile_index));

        this.elements.maximizeModalBtn.addEventListener('click', () => this.toggleMaximize());
        this.elements.openModalBtn.addEventListener('click', () => this.openModal(0));

        // Modal controls
        this.elements.closeButton.addEventListener('click', () => this.closeModal());
        this.elements.prevButton.addEventListener('click', () => this.navigate(-1));
        this.elements.nextButton.addEventListener('click', () => this.navigate(1));

        // Remove the conflicting swipe event listener
        // this.elements.modalContainer.addEventListener('swipe', () => this.closeModal());

        this.elements.profile_pic.addEventListener('click', () => this.HTU());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.elements.modal.classList.contains('active')) return;

            switch(e.key) {
                case 'Escape':
                    this.closeModal();
                    break;
                case 'ArrowLeft':
                    this.navigate(-1);
                    break;
                case 'ArrowRight':
                    this.navigate(1);
                    break;
                case 'f':
                case 'F':
                    this.toggleFullscreen();
                    break;
            }
        });

        this.setupZoomPanFunctionality();


        // Handle fullscreen change events
        document.addEventListener('fullscreenchange', ()=> this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange',()=> this.handleFullscreenChange());
        document.addEventListener('msfullscreenchange',()=> this.handleFullscreenChange());

    }

    setupSocialSharing() {
        this.elements.socialLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSocialShare(link);
            });
        });
    }

    openModal(index) {
        this.state.currentIndex = index;
        this.updateModalContent();
        document.body.style.overflow = 'hidden';
        this.elements.modal.classList.add('active');
        this.activeThumbnail();
        
        // Re-initialize Hammer if needed when modal opens
        if (!this.hammer && typeof Hammer !== 'undefined') {
            this.setupHammer();
        }
        this.resetZoom();
        this.resetMaximizeButton();
        if (!this.state.isZoomPanSetup){
            this.setupZoomPanFunctionality();
        }
    }

    closeModal() {
        if (this.state.isFullscreen) {
            this.exitFullscreen();
        }
        document.body.style.overflow = '';
        if (!this.elements.modalVideo.hidden) { 
            this.elements.modalVideo.pause(); 
        }
        this.elements.modal.classList.remove('active');
        this.elements.thumbnails[this.state.currentIndex].classList.remove('active');
    }

    toggleMaximize() {
        if (this.state.isMaximized) {
            this.elements.modal.classList.remove('fullscreen');
            this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-expand"></i>';
            this.elements.maximizeModalBtn.setAttribute('aria-label', 'Maximize modal');
            if (this.state.isFullscreen) {
                this.exitFullscreen();
            }
        } else {
            this.elements.modal.classList.add('fullscreen');
            this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-compress"></i>';
            this.elements.maximizeModalBtn.setAttribute('aria-label', 'Minimize modal');
        }
        //this.toggleFullscreen();
        this.state.isMaximized = !this.state.isMaximized;
    }

    HTU(){
        new Notification().setupEventListeners().toggleViewDetails(false).showNotification('info', {
            title: '📖 How to Use This Gallery',
            message: `
            <div style="line-height: 1.6;">
                <p>Welcome to the image gallery! Here's how to navigate:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>🖱️ <strong>Click</strong> on any thumbnail to open the image viewer</li>
                    <li>⬅️ ➡️ Use <strong>arrow keys</strong> or navigation buttons to browse images</li>
                    <li>🔍 <strong>Click</strong> on an open image to zoom in/out</li>
                    <li>👆 <strong>Drag</strong> to pan around zoomed images</li>
                    <li>📱 Use <strong>social media icons</strong> to share images</li>
                    <li>🖼️ Press <strong>'F'</strong> or use the maximize button for fullscreen</li>
                    <li>❌ Press <strong>ESC</strong> or click the X to close the viewer</li>
                    <li>👆 <strong>click</strong> outside a box to create an emoji <strong>press and hold</strong> make the emoji bigger</li>
                    <li>📷 Click the profile image anytime to see these instructions again</li>
                </ul>
                <p style="margin-top: 10px; font-style: italic;">Enjoy exploring this page 🥰💕💘!</p>
            </div>
        `,
            icon: 'fas fa-info-circle',
            useHTML: true,
            autoCloseTime: 15000, // Show for 15 seconds instead of 20
        });
    }

    setupZoomPanFunctionality() {  
        if (this.state.isZoomPanSetup) return;
        this.setupMouseZoomPan();
        this.setupTouchZoomPan();
        this.state.isZoomPanSetup = true;
    }

    resetMaximizeButton() {
        this.state.isMaximized = false;
        this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-expand"></i>';
        this.elements.maximizeModalBtn.setAttribute('aria-label', 'Maximize modal');
    }

    navigate(direction) {

        if (!this.elements.modalVideo.hidden) {this.elements.modalVideo.pause()}
        this.state.currentIndex += direction;

        // Circular navigation
        if (this.state.currentIndex < 0) {
            this.state.currentIndex = this.state.images.length - 1;
        } else if (this.state.currentIndex >= this.state.images.length) {
            this.state.currentIndex = 0;
        }
        this.updateModalContent();
        this.animateTransition(direction);
    }

    updateModalContent() {
        let src;
        let alt = this.state.images[this.state.currentIndex].alt;
        if (this.state.images.length > this.state.currentIndex + this.state.videos.length) {
            src = this.state.images[this.state.currentIndex].src;
            this.elements.modalImage.src = src;
            this.elements.modalImage.alt = alt;
            this.elements.modalVideo.hidden = true;
            this.elements.modalImage.hidden = false;
        }else {
            this.elements.modalVideo.src = src = window.location.origin +'/'+ this.state.videos[(this.state.currentIndex+this.state.videos.length) - (this.state.images.length )].src;
            this.elements.modalVideo.hidden = false;
            this.elements.modalImage.hidden = true ;
            this.elements.modalVideo.play();
        }
        this.elements.counter.textContent = `${this.state.currentIndex + 1}/${this.state.images.length}`;
        this.activeThumbnail();
        this.updateSocialLinks(src, alt);
    }

    activeThumbnail() {
        this.elements.thumbnails.forEach(thumb => {
            thumb.classList.remove('active');
        });
        const thumbnail = this.elements.thumbnails[this.state.currentIndex];
        if (thumbnail) {
            thumbnail.classList.add('active');
        }
    }

    toggleFullscreen(){
        if (!this.state.isFullscreen) {
            this.enterFullscreen();
        }else{
            this.exitFullscreen()
        }
    }

    enterFullscreen() {
        if (this.elements.modalContainer.requestFullscreen) {
            this.elements.modalContainer.requestFullscreen();
        } else if (this.elements.modalContainer.webkitRequestFullscreen) {
            this.elements.modalContainer.webkitRequestFullscreen();
        } else if (this.elements.modalContainer.msRequestFullscreen) {
            this.elements.modalContainer.msRequestFullscreen();
        }

        this.state.isFullscreen = true;
        this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-compress"></i>';
        this.elements.maximizeModalBtn.setAttribute('aria-label', 'Exit fullscreen');

        // Add a class for custom fullscreen styling
        this.elements.modal.classList.add('fullscreen');
    }

    // Exit fullscreen
     exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }

        this.state.isFullscreen = false;
        this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-expand"></i>';
        this.elements.maximizeModalBtn.setAttribute('aria-label', 'Enter fullscreen');

        // Remove the custom fullscreen styling
        this.elements.modal.classList.remove('fullscreen');
    }

    handleFullscreenChange() {
        const fullscreenElement = document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement;

        if (!fullscreenElement) {
            // We exited fullscreen
            this.state.isFullscreen = false;
            this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-expand"></i>';
            this.elements.maximizeModalBtn.setAttribute('aria-label', 'Enter fullscreen');
            this.elements.modal.classList.remove('fullscreen');
        }
    }

    createGalleryFigure(imgData, index){
        const figure = document.createElement('figure');
        figure.className = 'photo-thumbnail';
        figure.style.animationDelay = `${index * 5.1}s`;

        const img = document.createElement('img');
        img.src = imgData.src;
        img.alt = imgData.alt;
        img.loading = 'lazy';
        img.width = 80;
        img.height = 80;
        figure.appendChild(img);

        return figure;
    }

    async generateGallery() {
        const galleryContainer = document.getElementById('photo-gallery');
        const imageData = await this.loadImageData();
        imageData.images.forEach((imgData, index) => {
            const figure = this.createGalleryFigure(imgData, index);
            galleryContainer.appendChild(figure);
        });
        this.cacheImages();
        this.setupEventListeners();
        this.setupSocialSharing();
    }

    updateSocialLinks(imageUrl, description) {
        const encodedUrl = encodeURIComponent(window.location.href);
        const encodedDesc = encodeURIComponent(description);
        const encodedImage = encodeURIComponent(imageUrl);

        document.querySelector('.share-facebook').href =
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

        document.querySelector('.share-twitter').href =
            `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedDesc}`;

        document.querySelector('.share-pinterest').href =
            `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedDesc}`;

        document.querySelector('.share-link').addEventListener('click', (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(window.location.href);
            this.showTooltip('Link copied!', e.target);
        });
    }

    animateTransition(direction) {
        // Remove all animation classes
        this.elements.modalImage.classList.remove(
            'zoom-in', 'fade-in', 'slide-up', 'slide-left', 'slide-right'
        );

        // Force reflow
        void this.elements.modalImage.offsetWidth;
       // Apply selected animation
        if (this.state.transitionStyle === 'zoom-in') {
            this.elements.modalImage.classList.add('zoom-in');
        } else if (this.state.transitionStyle === 'fade-in') {
            this.elements.modalImage.classList.add('fade-in');
        } else if (this.state.transitionStyle === 'slide-up') {
            this.elements.modalImage.classList.add('slide-up');
        } else {
            // Default direction-based slide
            const animationClass = direction > 0 ? 'slide-left' : 'slide-right';
            this.elements.modalImage.classList.add(animationClass);
        }
    }

    setupHammerForZoomPan() {
        if (!this.hammer) return;
        
        // Pinch to zoom
        this.hammer.get('pinch').set({ enable: true });
        this.hammer.on('pinchstart pinchmove', (e) => {
            if (!this.elements.modalImage.hidden) {
                e.preventDefault();
                this.handlePinch(e);
            }
        });
        
        this.hammer.on('pinchend', () => {
            this.finalizeZoom();
        });
    }

    setupMouseZoomPan() {
        // Mouse zoom
        this.elements.modalImage.addEventListener('dblclick', (e) => {
            if (this.state.isZoomed) {
                this.resetZoom();
            } else {
                this.zoomImage(e);
            }
        });

        // Mouse pan
        this.elements.modalImage.addEventListener('mousedown', (e) => {
            if (this.state.isZoomed) {
                this.startPan(e);
                document.addEventListener('mousemove', this.boundPanImage);
                document.addEventListener('mouseup', this.boundEndPan);
            }
        });
        
        // Store bound functions for removal
        this.boundPanImage = (e) => this.panImage(e);
        this.boundEndPan = () => this.endPan();
    }

    setupTouchZoomPan() {
        // Touch pan (for single finger, Hammer handles multi-touch)
        this.elements.modalImage.addEventListener('touchstart', (e) => {
            if (this.state.isZoomed && e.touches.length === 1) {
                e.preventDefault();
                this.startPan(e.touches[0]);
            }
        }, { passive: false });
    }

    handlePinch(e) {
        if (e.type === 'pinchstart') {
            this.state.pinchStart = {
                scale: this.state.currentScale || 1,
                centerX: e.center.x,
                centerY: e.center.y
            };
            this.elements.modalImage.style.transition = 'none';
        }
        
        const newScale = this.state.pinchStart.scale * e.scale;
        this.state.currentScale = Math.max(1, Math.min(newScale, 5)); // Limit scale 1x to 5x
        
        // Calculate pan offset to zoom toward pinch center
        const rect = this.elements.modalImage.getBoundingClientRect();
        const centerX = e.center.x - rect.left;
        const centerY = e.center.y - rect.top;
        
        this.state.panOffset.x = centerX - (centerX - this.state.panOffset.x) * (newScale / (this.state.currentScale || 1));
        this.state.panOffset.y = centerY - (centerY - this.state.panOffset.y) * (newScale / (this.state.currentScale || 1));
        
        this.updateImageTransform();
    }

    finalizeZoom() {
        if (this.state.currentScale <= 1.1) {
            this.resetZoom();
        } else {
            this.state.isZoomed = true;
            this.constrainPanning(); // Ensure we're within bounds
        }
        this.elements.modalImage.style.transition = 'transform 0.2s ease';
    }

    zoomImage(e) {
        this.state.isZoomed = true;
        this.state.currentScale = 2; // Default zoom level
        
        const rect = this.elements.modalImage.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Center zoom on click position
        this.state.panOffset = {
            x: (rect.width / 2 - clickX) * (this.state.currentScale / 1),
            y: (rect.height / 2 - clickY) * (this.state.currentScale / 1)
        };
        
        this.elements.modalImage.classList.add('zoomed');
        this.updateImageTransform();
        this.constrainPanning(); // Immediately constrain after zoom
    }

    resetZoom() {
        this.state.isZoomed = false;
        this.state.currentScale = 1;
        this.elements.modalImage.classList.remove('zoomed');
        this.state.panOffset = { x: 0, y: 0 };
        this.elements.modalImage.style.transition = 'transform 0.3s ease';
        this.updateImageTransform();
        
        setTimeout(() => {
            this.elements.modalImage.style.transition = '';
        }, 300);
    }

    startPan(e) {
        this.state.panStart = {
            x: e.clientX - this.state.panOffset.x,
            y: e.clientY - this.state.panOffset.y
        };
        this.elements.modalImage.style.cursor = 'grabbing';
        this.elements.modalImage.style.transition = 'none';
    }

    panImage(e) {
        this.elements.modalImage.style.cursor = 'grabbing';
        
        this.state.panOffset = {
            x: e.clientX - this.state.panStart.x,
            y: e.clientY - this.state.panStart.y
        };
        
        this.constrainPanning(); // Constrain during pan, not just at end
        this.updateImageTransform();
    }

    endPan() {
        this.elements.modalImage.style.cursor = 'grab';
        this.elements.modalImage.style.transition = 'transform 0.2s ease';
        this.constrainPanning(); // Final constraint
        
        document.removeEventListener('mousemove', this.boundPanImage);
        document.removeEventListener('mouseup', this.boundEndPan);
    }

    constrainPanning() {
        if (!this.state.isZoomed) return;
        
        const img = this.elements.modalImage;
        const scale = this.state.currentScale;
        const containerWidth = img.clientWidth;
        const containerHeight = img.clientHeight;
        
        // Calculate max pan based on current scale
        const maxX = Math.max(0, (containerWidth * scale - containerWidth) / 2);
        const maxY = Math.max(0, (containerHeight * scale - containerHeight) / 2);
        
        // Constrain panning with easing at edges
        this.state.panOffset.x = this.easeConstraint(this.state.panOffset.x, -maxX, maxX);
        this.state.panOffset.y = this.easeConstraint(this.state.panOffset.y, -maxY, maxY);
        
        this.updateImageTransform();
    }

    easeConstraint(value, min, max) {
        if (value < min) {
            // Ease when pulling beyond left/top edge
            return min - (1 - Math.exp(-0.1 * (min - value)));
        } else if (value > max) {
            // Ease when pulling beyond right/bottom edge
            return max + (1 - Math.exp(-0.1 * (value - max)));
        }
        return value;
    }

    updateImageTransform() {
        const scale = this.state.currentScale || 1;
        this.elements.modalImage.style.transform = 
            `scale(${scale}) translate(${this.state.panOffset.x}px, ${this.state.panOffset.y}px)`;
    }

    handleSocialShare(link) {
        const type = link.classList.contains('share-facebook') ? 'facebook' :
            link.classList.contains('share-twitter') ? 'twitter' :
                link.classList.contains('share-pinterest') ? 'pinterest' : 'link';

        // Add click animation
        link.classList.add('animate__animated', 'animate__tada');
        setTimeout(() => {
            link.classList.remove('animate__animated', 'animate__tada');
        }, 1000);

        // For direct links, we already handle in updateSocialLinks
        if (type === 'link') return;

        // Open share window
        const popup = window.open(
            link.href,
            'share-popup',
            'width=600,height=600,top=100,left=100'
        );

        if (popup) {
            popup.focus();
        } else {
            alert('Please allow popups for sharing');
        }
    }

    showTooltip(message, element) {
        const tooltip = document.createElement('div');
        tooltip.className = 'modal-tooltip';
        tooltip.textContent = message;

        const rect = element.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width/2}px`;
        tooltip.style.top = `${rect.top - 40}px`;

        document.body.appendChild(tooltip);

        setTimeout(() => {
            tooltip.classList.add('visible');
        }, 10);

        setTimeout(() => {
            tooltip.classList.remove('visible');
            setTimeout(() => {
                tooltip.remove();
            }, 300);
        }, 2000);
    }

    async loadImageData(){
        try {
            const response = await fetch('public/imagesDIR.json');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const imageData = await response.json();
            console.log(imageData);
            return imageData;
        } catch (error) {
            console.error('Error loading JSON:', error);
        }
    }
}
