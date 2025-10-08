/**
 * Swayambhu Stories Website JavaScript
 * Version: 1.0
 * Description: Handles interactive features including scroll effects,
 * image galleries, and animations
 */

// Initialize all interactive features when DOM is ready
/**
 * Scroll Effects
 * Manages scroll-based animations and UI updates
 */
function initializeScrollEffects() {
    // Fade out scroll indicator on scroll
    const handleScrollIndicator = () => {
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (scrollIndicator) {
            const opacity = 1 - (window.scrollY / window.innerHeight);
            scrollIndicator.style.opacity = opacity > 0 ? opacity : 0;
        }
    };

    // Update header background on scroll
    const handleHeaderScroll = () => {
        const header = document.querySelector('header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', handleScrollIndicator);
    window.addEventListener('scroll', handleHeaderScroll);
}

/**
 * Intersection Observer Setup
 * Handles fade-in animations for elements as they enter the viewport
 */
function initializeIntersectionObserver() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for fade-in
    document.querySelectorAll('.slider-wrapper').forEach(wrapper => {
        observer.observe(wrapper);
    });
}

// Initialize all features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeScrollEffects();
    initializeIntersectionObserver();
});

/**
 * Image Slider Class
 * Manages the functionality of image sliders throughout the site
 */
class ImageSlider {
    constructor(wrapper) {
        this.currentSlide = 0;
        this.slides = wrapper.querySelectorAll(".slider img");
        this.dots = wrapper.querySelectorAll(".slider-nav a");
        this.slideTexts = wrapper.querySelectorAll(".slide-text");
        this.prevBtn = wrapper.querySelector(".prev");
        this.nextBtn = wrapper.querySelector(".next");

        this.initialize();
    }

    showSlide(index) {
        this.currentSlide = index;

        // Handle wrap-around
        if (this.currentSlide < 0) this.currentSlide = this.slides.length - 1;
        if (this.currentSlide >= this.slides.length) this.currentSlide = 0;

        // Update slides
        this.slides.forEach(slide => slide.style.display = "none");
        this.slides[this.currentSlide].style.display = "block";

        // Update text visibility
        this.slideTexts.forEach(text => {
            text.style.opacity = "0";
            text.style.pointerEvents = "none";
        });
        if (this.slideTexts[this.currentSlide]) {
            this.slideTexts[this.currentSlide].style.opacity = "1";
            this.slideTexts[this.currentSlide].style.pointerEvents = "auto";
        }

        // Update navigation dots
        this.dots.forEach(dot => dot.classList.remove("active-dot"));
        this.dots[this.currentSlide].classList.add("active-dot");
    }

    initialize() {
        // Set up navigation events
        this.prevBtn?.addEventListener("click", () => this.showSlide(this.currentSlide - 1));
        this.nextBtn?.addEventListener("click", () => this.showSlide(this.currentSlide + 1));
        this.dots.forEach((dot, i) => dot.addEventListener("click", () => this.showSlide(i)));

        // Show initial slide
        this.showSlide(0);
    }
}

// Initialize all sliders
function initializeSliders() {
    document.querySelectorAll(".slider-wrapper").forEach(wrapper => {
        new ImageSlider(wrapper);
    });
}
/**
 * Section Image Gallery
 * Manages the image galleries in content sections
 */
class SectionGallery {
    constructor(section) {
        this.images = section.querySelectorAll('.image-container img');
        this.dots = section.querySelectorAll('.dot');
        this.initialize();
    }

    showImage(index) {
        this.images.forEach(img => img.classList.remove('active'));
        this.dots.forEach(dot => dot.classList.remove('active'));

        this.images[index].classList.add('active');
        this.dots[index].classList.add('active');
    }

    initialize() {
        this.dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.getAttribute('data-index'));
                this.showImage(index);
            });
        });
    }
}

/**
 * Initialize all interactive features
 */
function initializeGalleries() {
    document.querySelectorAll('.section-image').forEach(section => {
        new SectionGallery(section);
    });
}

// Initialize all features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeScrollEffects();
    initializeIntersectionObserver();
    initializeSliders();
    initializeGalleries();
});
