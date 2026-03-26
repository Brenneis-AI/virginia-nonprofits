/* ==========================================================================
   directory.js — Virginia Nonprofits Directory
   Filtering, search, pagination, and URL query parameter support
   ========================================================================== */

function init() {
  'use strict';

  /* ========================================================================
     DOM References
     ======================================================================== */

  const searchInput = document.querySelector('[data-search]');
  const regionRow = document.querySelector('[data-filter-region]');
  const causeRow = document.querySelector('[data-filter-cause]');
  const filterCount = document.querySelector('[data-filter-count]');
  const clearBtn = document.querySelector('[data-filter-clear]');
  const clearAllBtn = document.querySelector('[data-filter-clear-all]');
  const listingsGrid = document.querySelector('[data-listings-grid]');
  const emptyState = document.querySelector('[data-listings-empty]');
  const pagination = document.querySelector('[data-pagination]');
  const pageNumbersContainer = document.querySelector('[data-page-numbers]');
  const prevBtn = document.querySelector('[data-page-prev]');
  const nextBtn = document.querySelector('[data-page-next]');
  const stickyFilter = document.querySelector('[data-sticky-filter]');

  const allCards = Array.from(listingsGrid.querySelectorAll('.listing-card'));
  const regionPills = Array.from(regionRow.querySelectorAll('[data-region]'));
  const causePills = Array.from(causeRow.querySelectorAll('[data-cause]'));

  /* ========================================================================
     State
     ======================================================================== */

  const ITEMS_PER_PAGE = 12;
  const DEBOUNCE_MS = 200;

  let activeRegion = 'all';
  let activeCauses = new Set();
  let searchTerm = '';
  let currentPage = 1;
  let filteredCards = []; // cards matching current filters (in DOM order)

  /* ========================================================================
     Filtering Logic
     ======================================================================== */

  /**
   * Determine which cards match the current region, cause, and search filters.
   * Returns an array of matching card elements in DOM order.
   */
  function getFilteredCards() {
    return allCards.filter(function (card) {
      // Region check
      const cardRegion = card.getAttribute('data-region');
      if (activeRegion !== 'all' && cardRegion !== activeRegion) return false;

      // Cause check — if any cause pills are active, card must match one of them
      if (activeCauses.size > 0) {
        const cardCause = card.getAttribute('data-cause');
        if (!activeCauses.has(cardCause)) return false;
      }

      // Search check — match against org name and mission text
      if (searchTerm) {
        const name = card.querySelector('.listing-name');
        const mission = card.querySelector('.listing-mission');
        const text = ((name ? name.textContent : '') + ' ' + (mission ? mission.textContent : '')).toLowerCase();
        if (text.indexOf(searchTerm) === -1) return false;
      }

      return true;
    });
  }

  /* ========================================================================
     Rendering — Show/Hide Cards + Pagination
     ======================================================================== */

  /**
   * Main render function. Call after any filter, search, or page change.
   */
  function render() {
    filteredCards = getFilteredCards();
    const totalResults = filteredCards.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / ITEMS_PER_PAGE));

    // Clamp current page
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    // Build a Set of cards visible on the current page
    const visibleSet = new Set(filteredCards.slice(startIndex, endIndex));

    // Show/hide each card
    allCards.forEach(function (card) {
      if (visibleSet.has(card)) {
        card.classList.remove('is-hidden');
      } else {
        card.classList.add('is-hidden');
      }
    });

    // Update results count
    filterCount.textContent = 'Showing ' + totalResults + ' nonprofit' + (totalResults !== 1 ? 's' : '');

    // Empty state
    if (totalResults === 0) {
      emptyState.style.display = '';
      listingsGrid.style.display = 'none';
      pagination.style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      listingsGrid.style.display = '';
      pagination.style.display = totalPages <= 1 ? 'none' : '';
    }

    // Render pagination buttons
    renderPagination(totalPages);
  }

  /* ========================================================================
     Pagination Controls
     ======================================================================== */

  function renderPagination(totalPages) {
    // Clear existing page number buttons
    pageNumbersContainer.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = 'pagination-page' + (i === currentPage ? ' is-active' : '');
      btn.setAttribute('data-page', i);
      btn.textContent = i;
      btn.addEventListener('click', function () {
        goToPage(i);
      });
      pageNumbersContainer.appendChild(btn);
    }

    // Prev / Next state
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }

  function goToPage(page) {
    currentPage = page;
    render();
    scrollToListings();
  }

  function scrollToListings() {
    const target = stickyFilter || listingsGrid;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ========================================================================
     Pill Click Handlers
     ======================================================================== */

  /**
   * Region pills — single-select. Clicking the already-active pill does nothing
   * (it stays active). "All Regions" is the default.
   */
  regionRow.addEventListener('click', function (e) {
    const pill = e.target.closest('[data-region]');
    if (!pill || pill.classList.contains('is-active')) return;

    // Deactivate all region pills, activate clicked one
    regionPills.forEach(function (p) { p.classList.remove('is-active'); });
    pill.classList.add('is-active');

    activeRegion = pill.getAttribute('data-region');
    currentPage = 1;
    updateURL();
    render();
  });

  /**
   * Cause pills — toggle (multi-select). Deselecting all shows everything.
   * No "All Causes" pill exists in the HTML.
   */
  causeRow.addEventListener('click', function (e) {
    const pill = e.target.closest('[data-cause]');
    if (!pill) return;

    const cause = pill.getAttribute('data-cause');

    if (pill.classList.contains('is-active')) {
      pill.classList.remove('is-active');
      activeCauses.delete(cause);
    } else {
      pill.classList.add('is-active');
      activeCauses.add(cause);
    }

    currentPage = 1;
    updateURL();
    render();
  });

  /* ========================================================================
     Text Search with Debounce
     ======================================================================== */

  let searchTimer = null;

  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      searchTerm = searchInput.value.trim().toLowerCase();
      currentPage = 1;
      render();
    }, DEBOUNCE_MS);
  });

  /* ========================================================================
     Clear Filters
     ======================================================================== */

  function clearAllFilters() {
    // Reset region to "All Regions"
    regionPills.forEach(function (p) { p.classList.remove('is-active'); });
    const allRegionPill = regionRow.querySelector('[data-region="all"]');
    if (allRegionPill) allRegionPill.classList.add('is-active');
    activeRegion = 'all';

    // Reset causes
    causePills.forEach(function (p) { p.classList.remove('is-active'); });
    activeCauses.clear();

    // Reset search
    searchInput.value = '';
    searchTerm = '';

    // Reset page
    currentPage = 1;

    updateURL();
    render();
  }

  if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);
  if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllFilters);

  /* ========================================================================
     Prev / Next Buttons
     ======================================================================== */

  prevBtn.addEventListener('click', function () {
    if (currentPage > 1) goToPage(currentPage - 1);
  });

  nextBtn.addEventListener('click', function () {
    const totalPages = Math.max(1, Math.ceil(filteredCards.length / ITEMS_PER_PAGE));
    if (currentPage < totalPages) goToPage(currentPage + 1);
  });

  /* ========================================================================
     URL Query Parameter Support
     ======================================================================== */

  /**
   * Read ?region= and ?cause= from the URL on page load and pre-select
   * the corresponding pills.
   */
  function readURL() {
    const params = new URLSearchParams(window.location.search);

    // Region
    const regionParam = params.get('region');
    if (regionParam) {
      const pill = regionRow.querySelector('[data-region="' + regionParam + '"]');
      if (pill) {
        regionPills.forEach(function (p) { p.classList.remove('is-active'); });
        pill.classList.add('is-active');
        activeRegion = regionParam;
      }
    }

    // Cause — supports comma-separated for multiple causes
    const causeParam = params.get('cause');
    if (causeParam) {
      const causes = causeParam.split(',');
      causes.forEach(function (c) {
        const pill = causeRow.querySelector('[data-cause="' + c.trim() + '"]');
        if (pill) {
          pill.classList.add('is-active');
          activeCauses.add(c.trim());
        }
      });
    }

    // Search
    const searchParam = params.get('q');
    if (searchParam) {
      searchInput.value = searchParam;
      searchTerm = searchParam.trim().toLowerCase();
    }
  }

  /**
   * Update URL query params to reflect current filter state without page reload.
   */
  function updateURL() {
    const params = new URLSearchParams();

    if (activeRegion !== 'all') {
      params.set('region', activeRegion);
    }

    if (activeCauses.size > 0) {
      params.set('cause', Array.from(activeCauses).join(','));
    }

    const queryString = params.toString();
    const newURL = window.location.pathname + (queryString ? '?' + queryString : '');

    history.pushState(null, '', newURL);
  }

  /* ========================================================================
     Sticky Filter Bar — Scroll Shadow
     ======================================================================== */

  if (stickyFilter) {
    let ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          if (window.scrollY > 200) {
            stickyFilter.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)';
          } else {
            stickyFilter.style.boxShadow = '';
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* ========================================================================
     Back/Forward Navigation Support
     ======================================================================== */

  window.addEventListener('popstate', function () {
    // Reset state
    activeRegion = 'all';
    activeCauses.clear();
    searchTerm = '';
    searchInput.value = '';
    regionPills.forEach(function (p) { p.classList.remove('is-active'); });
    const allRegionPill = regionRow.querySelector('[data-region="all"]');
    if (allRegionPill) allRegionPill.classList.add('is-active');
    causePills.forEach(function (p) { p.classList.remove('is-active'); });

    // Re-read URL and render
    readURL();
    currentPage = 1;
    render();
  });

  /* ========================================================================
     Initialize
     ======================================================================== */

  readURL();
  render();
}

/* ========================================================================
   Boot — readyState guard pattern per project standard
   ======================================================================== */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
