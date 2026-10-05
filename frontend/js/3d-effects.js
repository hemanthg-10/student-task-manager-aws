/**
 * Student Task Manager — 3D UI & Parallax Motion Engine (3d-effects.js)
 * 
 * High-performance, GPU-accelerated 3D tilt and ambient parallax effects.
 * Built with Vanilla JavaScript and requestAnimationFrame. Zero dependencies.
 */

(function () {
  'use strict';

  // Check user preferences & device capabilities
  const prefersReducedMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const isTouchDevice = () =>
    'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;

  /**
   * 3D Tilt Controller
   * Attaches pointer-based micro-tilt to cards with clamping and rAF optimization.
   */
  class Tilt3DController {
    constructor(elements, options = {}) {
      this.elements = Array.isArray(elements) ? elements : Array.from(elements);
      this.options = {
        maxTilt: options.maxTilt || 4.5,     // Clamped <= 5 deg for subtle elegance
        perspective: options.perspective || 1000,
        scale: options.scale || 1.02,
        speed: options.speed || 400,        // Transition speed in ms
        easing: options.easing || 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        glare: options.glare !== undefined ? options.glare : true,
        ...options
      };

      this.activeRaf = null;
      this.init();
    }

    init() {
      if (prefersReducedMotion() || isTouchDevice()) return;

      this.elements.forEach(el => {
        if (!el || el.dataset.tiltInitialized) return;
        el.dataset.tiltInitialized = 'true';

        let bounds = null;
        let isHovered = false;
        let mouseX = 0;
        let mouseY = 0;

        const updateBounds = () => {
          bounds = el.getBoundingClientRect();
        };

        const onPointerEnter = () => {
          isHovered = true;
          updateBounds();
          el.style.transition = `transform ${this.options.speed}ms ${this.options.easing}`;
        };

        const onPointerMove = (e) => {
          if (!isHovered || !bounds) return;
          mouseX = e.clientX - bounds.left;
          mouseY = e.clientY - bounds.top;

          if (!this.activeRaf) {
            this.activeRaf = requestAnimationFrame(() => {
              this.applyTilt(el, bounds, mouseX, mouseY);
              this.activeRaf = null;
            });
          }
        };

        const onPointerLeave = () => {
          isHovered = false;
          el.style.transition = `transform ${this.options.speed * 1.4}ms ${this.options.easing}`;
          el.style.transform = `perspective(${this.options.perspective}px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)`;
        };

        el.addEventListener('pointerenter', onPointerEnter);
        el.addEventListener('pointermove', onPointerMove, { passive: true });
        el.addEventListener('pointerleave', onPointerLeave);
      });
    }

    applyTilt(el, bounds, x, y) {
      const xPct = (x / bounds.width) - 0.5;
      const yPct = (y / bounds.height) - 0.5;

      // Clamped subtle rotation
      const rotateX = Math.max(-this.options.maxTilt, Math.min(this.options.maxTilt, -yPct * this.options.maxTilt * 2));
      const rotateY = Math.max(-this.options.maxTilt, Math.min(this.options.maxTilt, xPct * this.options.maxTilt * 2));

      el.style.transform = `perspective(${this.options.perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(10px) scale3d(${this.options.scale}, ${this.options.scale}, 1)`;
    }
  }

  /**
   * Decorative Hero 3D Backdrop Builder
   * Injects ambient blurred glowing orbs and floating 3D micro badges into hero section.
   */
  function initHero3DBackdrop() {
    if (prefersReducedMotion() || isTouchDevice()) return;

    const hero = document.querySelector('.hero-section');
    if (!hero || hero.querySelector('.hero-3d-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'hero-3d-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = `
      <div class="floating-3d-orb orb-primary"></div>
      <div class="floating-3d-orb orb-secondary"></div>
      <div class="floating-3d-geom geom-badge-1">
        <i class="bi bi-shield-check text-primary fs-6"></i>
        <span>AWS Load Balancer Ready</span>
      </div>
      <div class="floating-3d-geom geom-badge-2">
        <i class="bi bi-clock-history text-warning fs-6"></i>
        <span>Active Semester Deadlines</span>
      </div>
    `;

    hero.insertBefore(backdrop, hero.firstChild);
  }

  /**
   * Global 3D Tilt Initialization
   */
  function initGlobal3DTilt() {
    if (prefersReducedMotion() || isTouchDevice()) return;

    // 1. Landing Hero Preview Card (Subtle ±4.5deg)
    const heroCards = document.querySelectorAll('.hero-preview-card');
    if (heroCards.length > 0) {
      new Tilt3DController(heroCards, {
        maxTilt: 4.5,
        perspective: 1400,
        scale: 1.015,
        speed: 350
      });
    }

    // 2. Dashboard Stat Cards (Gentle ±3.5deg)
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length > 0) {
      new Tilt3DController(statCards, {
        maxTilt: 3.5,
        perspective: 1100,
        scale: 1.02,
        speed: 320
      });
    }

    // 3. Feature Cards (Landing page)
    const featureCards = document.querySelectorAll('.feature-card');
    if (featureCards.length > 0) {
      new Tilt3DController(featureCards, {
        maxTilt: 4.0,
        perspective: 1200,
        scale: 1.02,
        speed: 350
      });
    }

    // 4. Auth Cards (Login & Register)
    const authCards = document.querySelectorAll('.auth-card');
    if (authCards.length > 0) {
      new Tilt3DController(authCards, {
        maxTilt: 3.0,
        perspective: 1300,
        scale: 1.01,
        speed: 400
      });
    }
  }

  /**
   * Tactile Button & Micro-interaction Pop
   */
  function initTactileInteractions() {
    // Complete task micro-pop animation trigger
    document.addEventListener('click', (e) => {
      const completeBtn = e.target.closest('.action-complete');
      if (completeBtn) {
        const row = completeBtn.closest('tr') || completeBtn.closest('.mobile-task-card');
        if (row) {
          row.classList.remove('task-complete-anim');
          void row.offsetWidth; // Force reflow
          row.classList.add('task-complete-anim');
          setTimeout(() => row.classList.remove('task-complete-anim'), 400);
        }
      }
    });
  }

  /**
   * Master Bootstrapper
   */
  function boot() {
    initHero3DBackdrop();
    initGlobal3DTilt();
    initTactileInteractions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Export to global scope
  window.App3D = {
    Tilt3DController,
    reinit: initGlobal3DTilt
  };
})();
