/* ==========================================================================
   nav.js — Virginia Nonprofits
   Global shared JavaScript for all pages
   - Mobile hamburger toggle (dynamic overlay injection)
   - Glassmorphism scroll handler (.nav-scrolled)
   - IntersectionObserver for .section-animate elements
   - Copyright year population
   - Active nav state based on current page path
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------
     Mobile Nav — Dynamic Overlay Injection
     -------------------------------------------------------------------- */

  var hamburger = document.querySelector('.nav-hamburger');
  var nav = document.querySelector('.site-nav');
  var overlay = null;

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    var links = [
      { text: 'Directory', href: getRelativePath('pages/directory/directory.html') },
      { text: 'About', href: getRelativePath('pages/about/about.html') },
      { text: 'Submit a Nonprofit', href: getRelativePath('pages/submit/submit.html') }
    ];

    links.forEach(function (link) {
      var a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.text;
      overlay.appendChild(a);
    });

    var cta = document.createElement('a');
    cta.href = getRelativePath('pages/submit/submit.html');
    cta.className = 'btn-primary btn-primary--large';
    cta.textContent = 'Join the Directory';
    overlay.appendChild(cta);

    document.body.appendChild(overlay);
  }

  function getRelativePath(target) {
    var path = window.location.pathname;
    // Detect if we're in a pages subdirectory
    if (path.indexOf('/pages/') !== -1) {
      return '../../' + target;
    }
    return target;
  }

  function toggleNav() {
    if (!overlay) createOverlay();

    var isOpen = hamburger.classList.toggle('is-open');
    overlay.classList.toggle('is-open', isOpen);
    overlay.setAttribute('aria-hidden', !isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';

    // Force hamburger lines white when open (overlay is dark)
    if (isOpen) {
      hamburger.querySelectorAll('span').forEach(function (span) {
        span.style.backgroundColor = 'var(--color-on-primary)';
      });
    } else {
      hamburger.querySelectorAll('span').forEach(function (span) {
        span.style.backgroundColor = '';
      });
    }
  }

  if (hamburger) {
    hamburger.addEventListener('click', toggleNav);
  }

  /* --------------------------------------------------------------------
     Glassmorphism Scroll Handler
     -------------------------------------------------------------------- */

  var heroSection = document.querySelector('.hero');
  var scrollThreshold = 80;

  function handleScroll() {
    if (!nav) return;

    var scrolled = window.scrollY > scrollThreshold;
    nav.classList.toggle('nav-scrolled', scrolled);
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Initial check

  /* --------------------------------------------------------------------
     IntersectionObserver — .section-animate
     -------------------------------------------------------------------- */

  var animatedSections = document.querySelectorAll('.section-animate');

  if (animatedSections.length > 0 && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    animatedSections.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show everything if no IO support
    animatedSections.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  /* --------------------------------------------------------------------
     Copyright Year
     -------------------------------------------------------------------- */

  var yearEl = document.getElementById('copyright-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* --------------------------------------------------------------------
     Active Nav State
     -------------------------------------------------------------------- */

  var currentPath = window.location.pathname;
  var navAnchors = document.querySelectorAll('.nav-links a:not(.btn-primary)');

  navAnchors.forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href) return;

    // Normalize: strip trailing slashes and index.html
    var normalizedCurrent = currentPath.replace(/\/index\.html$/, '/').replace(/\/$/, '');
    var normalizedHref = new URL(a.href).pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '');

    if (normalizedCurrent === normalizedHref) {
      a.classList.add('active');
    }
  });

})();
