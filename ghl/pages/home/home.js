<script>
/*
  File: home.js
  Page: Home
  Section: Page JS — paste into GHL Home step Footer Tracking Code
  Last Updated: 2026-03-28
*/

(function () {
  'use strict';

  function initSectionAnimate() {
    var elements = document.querySelectorAll('.section-animate');
    if (!elements.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSectionAnimate);
  } else {
    initSectionAnimate();
  }
})();
</script>
