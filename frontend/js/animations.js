/**
 * Student Task Manager — Animation Utilities (animations.js)
 *
 * Provides:
 *   - ScrollReveal via IntersectionObserver
 *   - countUpStat() for dashboard stat cards
 *   - animateTaskEnter() for newly added task rows/cards
 *   - animateTaskExit() for deleted task rows/cards
 *   - pageEnter() for page load entrance
 *   - filterTransition() for smooth filter updates
 */

(function () {
  'use strict';

  /* ---- Utility: check if reduced motion is preferred ---- */
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* --------------------------------------------------------
     Scroll Reveal — IntersectionObserver
     Elements with class .reveal get .visible when in viewport
  -------------------------------------------------------- */
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: make everything visible immediately
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // run once
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  /* --------------------------------------------------------
     countUpStat — Animates a number from 0 to target
     @param {HTMLElement} el     - element containing the number
     @param {number}      target - the final number
     @param {number}      duration - ms (default 900)
  -------------------------------------------------------- */
  function countUpStat(el, target, duration) {
    if (prefersReducedMotion() || !el) {
      if (el) el.textContent = target;
      return;
    }

    duration = duration || 900;
    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(startValue + eased * (target - startValue));
      el.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(update);
  }

  /* --------------------------------------------------------
     animateTaskEnter — Adds task-enter class to new rows/cards
     @param {HTMLElement} el
  -------------------------------------------------------- */
  function animateTaskEnter(el) {
    if (!el || prefersReducedMotion()) return;
    el.classList.remove('task-enter');
    // force reflow
    void el.offsetWidth;
    el.classList.add('task-enter');
    el.addEventListener('animationend', () => el.classList.remove('task-enter'), { once: true });
  }

  /* --------------------------------------------------------
     animateTaskExit — Animates removal then calls callback
     @param {HTMLElement} el
     @param {Function}    callback - called after animation ends
  -------------------------------------------------------- */
  function animateTaskExit(el, callback) {
    if (!el) {
      if (callback) callback();
      return;
    }
    if (prefersReducedMotion()) {
      el.remove();
      if (callback) callback();
      return;
    }

    el.classList.add('task-exit');
    el.addEventListener('animationend', () => {
      el.remove();
      if (callback) callback();
    }, { once: true });

    // Safety timeout
    setTimeout(() => {
      if (el.parentNode) {
        el.remove();
        if (callback) callback();
      }
    }, 500);
  }

  /* --------------------------------------------------------
     filterTransition — Fades task container out/in during filter
     @param {HTMLElement} container
     @param {Function}    updateFn - called while container is faded
  -------------------------------------------------------- */
  function filterTransition(container, updateFn) {
    if (!container) {
      if (updateFn) updateFn();
      return;
    }
    if (prefersReducedMotion()) {
      if (updateFn) updateFn();
      return;
    }

    container.classList.add('task-list-fading');
    container.classList.remove('task-list-visible');

    setTimeout(() => {
      if (updateFn) updateFn();
      container.classList.remove('task-list-fading');
      container.classList.add('task-list-visible');
    }, 180);
  }

  /* --------------------------------------------------------
     pageEnter — Triggers page-enter on the main content area
  -------------------------------------------------------- */
  function pageEnter() {
    if (prefersReducedMotion()) return;
    const main = document.querySelector('main') || document.querySelector('.dashboard-content') || document.querySelector('.auth-container');
    if (main) {
      main.classList.add('page-enter');
    }
  }

  /* --------------------------------------------------------
     Observe stat cards for count-up animation
     (Run when dashboard stats are rendered)
  -------------------------------------------------------- */
  function observeStatCards() {
    const statIds = [
      'statTotalTasks',
      'statCompletedTasks',
      'statPendingTasks',
      'statHighPriorityTasks'
    ];

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = parseInt(el.dataset.countTarget || el.textContent, 10);
            if (!isNaN(target) && target > 0) {
              countUpStat(el, target);
            }
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );

    statIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  /* ---- Initialize on DOM ready ---- */
  function init() {
    initScrollReveal();
    pageEnter();
    // Stat card observer (only meaningful on dashboard)
    if (document.getElementById('statTotalTasks')) {
      // observe after a short delay to let dashboard.js render data
      setTimeout(observeStatCards, 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ---- Expose globally ---- */
  window.AnimUtils = {
    countUpStat,
    animateTaskEnter,
    animateTaskExit,
    filterTransition,
    pageEnter,
    observeStatCards
  };
})();
