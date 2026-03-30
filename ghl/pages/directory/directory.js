<script>
/* ==========================================================================
   File: page.js
   Page: Directory
   Section: Supabase-powered filtering, search, pagination, and URL query support
   Last Updated: 2026-03-28
   ========================================================================== */

function init() {
  'use strict';

  /* ========================================================================
     Supabase Client
     ======================================================================== */

  var SUPABASE_URL = 'https://irhpxfilazawsweqqymw.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaHB4ZmlsYXphd3N3ZXFxeW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTA1MzEsImV4cCI6MjA5MDI4NjUzMX0.mxUxkPrp_TY_TraB4NN-i3DJWfXLd1RmXEuB5aQt4GE';

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ========================================================================
     Label Lookup Maps
     ======================================================================== */

  var REGION_LABELS = {
    'shenandoah-valley': 'Shenandoah Valley',
    'southwest-va': 'Southwest VA',
    'central-va': 'Central VA',
    'northern-va': 'Northern VA',
    'hampton-roads': 'Hampton Roads',
    'southside-va': 'Southside VA'
  };

  var CAUSE_LABELS = {
    'youth-education': 'Youth & Education',
    'food-security': 'Food Security',
    'housing': 'Housing',
    'arts-culture': 'Arts & Culture',
    'veterans': 'Veterans',
    'health-wellness': 'Health & Wellness',
    'environment': 'Environment',
    'animal-welfare': 'Animal Welfare',
    'faith-based': 'Faith-Based',
    'civic-community': 'Civic & Community',
    'sports-recreation': 'Sports & Recreation'
  };

  /* ========================================================================
     DOM References
     ======================================================================== */

  var searchInput = document.querySelector('[data-search]');
  var regionRow = document.querySelector('[data-filter-region]');
  var causeRow = document.querySelector('[data-filter-cause]');
  var filterCount = document.querySelector('[data-filter-count]');
  var clearBtn = document.querySelector('[data-filter-clear]');
  var clearAllBtn = document.querySelector('[data-filter-clear-all]');
  var listingsGrid = document.querySelector('[data-listings-grid]');
  var emptyState = document.querySelector('[data-listings-empty]');
  var errorState = document.querySelector('[data-listings-error]');
  var retryBtn = document.querySelector('[data-error-retry]');
  var pagination = document.querySelector('[data-pagination]');
  var pageNumbersContainer = document.querySelector('[data-page-numbers]');
  var prevBtn = document.querySelector('[data-page-prev]');
  var nextBtn = document.querySelector('[data-page-next]');
  var stickyFilter = document.querySelector('[data-sticky-filter]');

  var regionPills = Array.from(regionRow.querySelectorAll('[data-region]'));
  var causePills = Array.from(causeRow.querySelectorAll('[data-cause]'));

  /* ========================================================================
     State
     ======================================================================== */

  var ITEMS_PER_PAGE = 12;
  var DEBOUNCE_MS = 300;

  var activeRegion = 'all';
  var activeCauses = new Set();
  var searchTerm = '';
  var currentPage = 1;
  var totalCount = 0;
  var isLoading = false;

  /* ========================================================================
     Supabase Fetch
     ======================================================================== */

  function fetchListings() {
    if (isLoading) return;
    isLoading = true;
    showSkeleton();

    var start = (currentPage - 1) * ITEMS_PER_PAGE;
    var end = start + ITEMS_PER_PAGE - 1;

    var query = sb
      .from('nonprofits')
      .select('*', { count: 'exact' })
      .eq('status', 'active');

    if (activeRegion !== 'all') {
      query = query.eq('region', activeRegion);
    }

    if (activeCauses.size > 0) {
      query = query.in('cause_primary', Array.from(activeCauses));
    }

    if (searchTerm) {
      query = query.or('name.ilike.%' + searchTerm + '%,mission_short.ilike.%' + searchTerm + '%');
    }

    query = query
      .order('featured', { ascending: false })
      .order('name', { ascending: true })
      .range(start, end);

    query.then(function (result) {
      isLoading = false;

      if (result.error) {
        showError();
        return;
      }

      totalCount = result.count || 0;
      renderCards(result.data || []);
      renderPagination();
      updateCount();
    });
  }

  /* ========================================================================
     Card Rendering
     ======================================================================== */

  function renderCard(item) {
    var regionLabel = REGION_LABELS[item.region] || item.region;
    var causeLabel = CAUSE_LABELS[item.cause_primary] || item.cause_primary;
    var expandedClass = item.featured ? ' listing-card--expanded' : '';

    var websiteLink = '';
    if (item.website_url) {
      websiteLink = '<a href="' + escapeAttr(item.website_url) + '" class="btn-card" target="_blank" rel="noopener noreferrer">Visit Website</a>';
    }

    var claimBadge = '';
    if (item.claimed) {
      claimBadge = '<span class="verified-badge">' +
        '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        'Verified</span>';
    } else {
      claimBadge = '<a href="/claim?org=' + escapeAttr(item.slug) + '&name=' + encodeURIComponent(item.name) + '" class="claim-link" aria-label="Claim listing for ' + escapeAttr(item.name) + '">Claim this listing</a>';
    }

    return '<article class="listing-card' + expandedClass + '" data-region="' + escapeAttr(item.region) + '" data-cause="' + escapeAttr(item.cause_primary) + '">' +
      '<div class="listing-content">' +
        '<div class="card-tags">' +
          '<span class="tag">' + escapeHtml(regionLabel) + '</span>' +
          '<span class="tag">' + escapeHtml(causeLabel) + '</span>' +
        '</div>' +
        '<h3 class="listing-name">' + escapeHtml(item.name) + '</h3>' +
        '<p class="listing-mission">' + escapeHtml(item.mission_short || '') + '</p>' +
        '<div class="listing-actions">' +
          websiteLink +
          '<div class="listing-meta">' +
            claimBadge +
            '<button class="listing-bookmark" aria-label="Bookmark ' + escapeAttr(item.name) + '">' +
              '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 2h10v13l-5-3.5L3 15V2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function renderCards(data) {
    if (data.length === 0) {
      listingsGrid.style.display = 'none';
      listingsGrid.innerHTML = '';
      emptyState.style.display = '';
      errorState.style.display = 'none';
      pagination.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    listingsGrid.style.display = '';

    var html = '';
    for (var i = 0; i < data.length; i++) {
      html += renderCard(data[i]);
    }
    listingsGrid.innerHTML = html;
  }

  /* ========================================================================
     Skeleton / Error States
     ======================================================================== */

  var skeletonHTML = '';
  (function () {
    var card = '<article class="listing-card skeleton-card" aria-hidden="true">' +
      '<div class="listing-content">' +
        '<div class="card-tags"><span class="skeleton-line skeleton-tag"></span><span class="skeleton-line skeleton-tag"></span></div>' +
        '<div class="skeleton-line skeleton-title"></div>' +
        '<div class="skeleton-line skeleton-text"></div>' +
        '<div class="skeleton-line skeleton-text skeleton-text--short"></div>' +
        '<div class="skeleton-line skeleton-action"></div>' +
      '</div>' +
    '</article>';
    for (var i = 0; i < 6; i++) skeletonHTML += card;
  })();

  function showSkeleton() {
    listingsGrid.innerHTML = skeletonHTML;
    listingsGrid.style.display = '';
    emptyState.style.display = 'none';
    errorState.style.display = 'none';
    pagination.style.display = 'none';
  }

  function showError() {
    listingsGrid.style.display = 'none';
    listingsGrid.innerHTML = '';
    emptyState.style.display = 'none';
    errorState.style.display = '';
    pagination.style.display = 'none';
    filterCount.textContent = '';
  }

  /* ========================================================================
     Pagination Controls
     ======================================================================== */

  function renderPagination() {
    var totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

    if (totalPages <= 1) {
      pagination.style.display = 'none';
      return;
    }

    pagination.style.display = '';
    pageNumbersContainer.innerHTML = '';

    for (var i = 1; i <= totalPages; i++) {
      var btn = document.createElement('button');
      btn.className = 'pagination-page' + (i === currentPage ? ' is-active' : '');
      btn.setAttribute('data-page', i);
      btn.textContent = i;
      btn.addEventListener('click', (function (page) {
        return function () { goToPage(page); };
      })(i));
      pageNumbersContainer.appendChild(btn);
    }

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }

  function updateCount() {
    filterCount.textContent = 'Showing ' + totalCount + ' nonprofit' + (totalCount !== 1 ? 's' : '');
  }

  function goToPage(page) {
    currentPage = page;
    fetchListings();
    scrollToListings();
  }

  function scrollToListings() {
    var target = stickyFilter || listingsGrid;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ========================================================================
     Pill Click Handlers
     ======================================================================== */

  regionRow.addEventListener('click', function (e) {
    var pill = e.target.closest('[data-region]');
    if (!pill || pill.classList.contains('is-active')) return;

    regionPills.forEach(function (p) { p.classList.remove('is-active'); });
    pill.classList.add('is-active');

    activeRegion = pill.getAttribute('data-region');
    currentPage = 1;
    updateURL();
    fetchListings();
  });

  causeRow.addEventListener('click', function (e) {
    var pill = e.target.closest('[data-cause]');
    if (!pill) return;

    var cause = pill.getAttribute('data-cause');

    if (pill.classList.contains('is-active')) {
      pill.classList.remove('is-active');
      activeCauses.delete(cause);
    } else {
      pill.classList.add('is-active');
      activeCauses.add(cause);
    }

    currentPage = 1;
    updateURL();
    fetchListings();
  });

  /* ========================================================================
     Text Search with Debounce
     ======================================================================== */

  var searchTimer = null;

  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      searchTerm = searchInput.value.trim().toLowerCase();
      currentPage = 1;
      fetchListings();
    }, DEBOUNCE_MS);
  });

  /* ========================================================================
     Clear Filters
     ======================================================================== */

  function clearAllFilters() {
    regionPills.forEach(function (p) { p.classList.remove('is-active'); });
    var allRegionPill = regionRow.querySelector('[data-region="all"]');
    if (allRegionPill) allRegionPill.classList.add('is-active');
    activeRegion = 'all';

    causePills.forEach(function (p) { p.classList.remove('is-active'); });
    activeCauses.clear();

    searchInput.value = '';
    searchTerm = '';
    currentPage = 1;

    updateURL();
    fetchListings();
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
    var totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    if (currentPage < totalPages) goToPage(currentPage + 1);
  });

  /* ========================================================================
     Retry Button
     ======================================================================== */

  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      fetchListings();
    });
  }

  /* ========================================================================
     URL Query Parameter Support
     ======================================================================== */

  function readURL() {
    var params = new URLSearchParams(window.location.search);

    var regionParam = params.get('region');
    if (regionParam) {
      var pill = regionRow.querySelector('[data-region="' + regionParam + '"]');
      if (pill) {
        regionPills.forEach(function (p) { p.classList.remove('is-active'); });
        pill.classList.add('is-active');
        activeRegion = regionParam;
      }
    }

    var causeParam = params.get('cause');
    if (causeParam) {
      var causes = causeParam.split(',');
      causes.forEach(function (c) {
        var pill = causeRow.querySelector('[data-cause="' + c.trim() + '"]');
        if (pill) {
          pill.classList.add('is-active');
          activeCauses.add(c.trim());
        }
      });
    }

    var searchParam = params.get('q');
    if (searchParam) {
      searchInput.value = searchParam;
      searchTerm = searchParam.trim().toLowerCase();
    }
  }

  function updateURL() {
    var params = new URLSearchParams();

    if (activeRegion !== 'all') {
      params.set('region', activeRegion);
    }

    if (activeCauses.size > 0) {
      params.set('cause', Array.from(activeCauses).join(','));
    }

    var queryString = params.toString();
    var newURL = window.location.pathname + (queryString ? '?' + queryString : '');

    history.pushState(null, '', newURL);
  }

  /* ========================================================================
     Sticky Filter Bar — Scroll Shadow
     ======================================================================== */

  if (stickyFilter) {
    var ticking = false;
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
    activeRegion = 'all';
    activeCauses.clear();
    searchTerm = '';
    searchInput.value = '';
    regionPills.forEach(function (p) { p.classList.remove('is-active'); });
    var allRegionPill = regionRow.querySelector('[data-region="all"]');
    if (allRegionPill) allRegionPill.classList.add('is-active');
    causePills.forEach(function (p) { p.classList.remove('is-active'); });

    readURL();
    currentPage = 1;
    fetchListings();
  });

  /* ========================================================================
     Utility — HTML/Attribute Escaping
     ======================================================================== */

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ========================================================================
     Initialize
     ======================================================================== */

  readURL();
  fetchListings();
}

/* ========================================================================
   Boot — readyState guard pattern per project standard
   ======================================================================== */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
</script>
