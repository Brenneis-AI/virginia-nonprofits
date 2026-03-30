<script>
/* ==========================================================================
   File: claim.js
   Page: Claim Your Listing
   Section: Form logic, Supabase insert, GHL webhook — paste into GHL Claim step Footer Tracking Code
   Last Updated: 2026-03-28
   ========================================================================== */

function initClaim() {
  'use strict';

  /* ========================================================================
     Supabase Client
     ======================================================================== */

  var SUPABASE_URL = 'https://irhpxfilazawsweqqymw.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaHB4ZmlsYXphd3N3ZXFxeW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MTA1MzEsImV4cCI6MjA5MDI4NjUzMX0.mxUxkPrp_TY_TraB4NN-i3DJWfXLd1RmXEuB5aQt4GE';

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ========================================================================
     DOM References
     ======================================================================== */

  var form = document.getElementById('claim-form');
  var submitBtn = document.getElementById('claim-submit');
  var successPanel = document.getElementById('claim-success');
  var subhead = document.getElementById('claim-subhead');
  var orgNameInput = document.getElementById('org-name');

  if (!form) return;

  /* ========================================================================
     URL Params — pre-fill org name
     ======================================================================== */

  var params = new URLSearchParams(window.location.search);
  var orgSlug = params.get('org');
  var orgName = params.get('name');

  if (orgName) {
    var decoded = decodeURIComponent(orgName);
    orgNameInput.value = decoded;
    subhead.textContent = 'Take ownership of ' + decoded + '\u2019s profile on Virginia Nonprofits.';
  }

  /* ========================================================================
     Domain Helpers
     ======================================================================== */

  function extractDomain(email) {
    var parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase().trim() : null;
  }

  function extractOrgDomain(websiteUrl) {
    if (!websiteUrl) return null;
    try {
      var url = new URL(
        websiteUrl.indexOf('http') === 0 ? websiteUrl : 'https://' + websiteUrl
      );
      return url.hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {
      return null;
    }
  }

  /* ========================================================================
     Fetch Org from Supabase
     ======================================================================== */

  function fetchOrg(slug) {
    return sb
      .from('nonprofits')
      .select('id,name,slug,website_url,claimed')
      .eq('slug', slug)
      .eq('status', 'active')
      .limit(1)
      .then(function (res) {
        if (res.error || !res.data || res.data.length === 0) return null;
        return res.data[0];
      });
  }

  /* ========================================================================
     Client-Side Validation
     ======================================================================== */

  function validate() {
    var valid = true;

    var name = document.getElementById('claimant-name');
    var title = document.getElementById('claimant-title');
    var email = document.getElementById('claimant-email');
    var checkbox = document.getElementById('confirm-affiliation');

    // Reset
    [name, title, email].forEach(function (el) { el.classList.remove('is-invalid'); });

    if (!name.value.trim()) { name.classList.add('is-invalid'); valid = false; }
    if (!title.value.trim()) { title.classList.add('is-invalid'); valid = false; }

    var emailVal = email.value.trim();
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailPattern.test(emailVal)) { email.classList.add('is-invalid'); valid = false; }

    if (!checkbox.checked) { valid = false; }

    if (!orgSlug) { valid = false; }

    return valid;
  }

  /* ========================================================================
     Submit Handler
     ======================================================================== */

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validate()) return;

    submitBtn.textContent = 'Submitting\u2026';
    submitBtn.disabled = true;

    var claimantName = document.getElementById('claimant-name').value.trim();
    var claimantTitle = document.getElementById('claimant-title').value.trim();
    var claimantEmail = document.getElementById('claimant-email').value.trim();
    var claimantSource = document.getElementById('claimant-source').value;

    fetchOrg(orgSlug).then(function (org) {
      if (!org) {
        submitBtn.textContent = 'Submit Claim Request';
        submitBtn.disabled = false;
        alert('We couldn\u2019t find that listing. Please return to the directory and try again.');
        return;
      }

      if (org.claimed) {
        submitBtn.textContent = 'Submit Claim Request';
        submitBtn.disabled = false;
        alert('This listing has already been claimed. Email hello@virginianonprofits.org if you believe this is an error.');
        return;
      }

      var emailDomain = extractDomain(claimantEmail);
      var orgDomain = extractOrgDomain(org.website_url || '');
      var domainMatch = !!(emailDomain && orgDomain && emailDomain === orgDomain);

      var payload = {
        nonprofit_id: org.id,
        nonprofit_name: org.name,
        nonprofit_slug: org.slug,
        claimant_name: claimantName,
        claimant_email: claimantEmail,
        claimant_title: claimantTitle,
        claimant_source: claimantSource || null,
        email_domain: emailDomain,
        org_domain: orgDomain,
        domain_match: domainMatch,
        status: 'pending'
      };

      return sb
        .from('claims')
        .insert([payload])
        .then(function (res) {
          if (res.error) {
            submitBtn.textContent = 'Submit Claim Request';
            submitBtn.disabled = false;
            alert('Something went wrong. Please try again or email hello@virginianonprofits.org');
            return;
          }

          // Fire GHL webhooks — non-blocking
          var CLAIM_WEBHOOKS = [
            'https://services.leadconnectorhq.com/hooks/3M40xtrRZZRWOmE1zFAN/webhook-trigger/9b980737-2377-42c0-aafe-53859534b0e0',
            'https://services.leadconnectorhq.com/hooks/3M40xtrRZZRWOmE1zFAN/webhook-trigger/129aa923-6f8b-4ebf-ad3b-800608952d9f'
          ];

          var webhookPayload = {
            org_name: org.name,
            claimant_name: claimantName,
            claimant_email: claimantEmail,
            claimant_title: claimantTitle,
            domain_match: domainMatch,
            org_url: 'https://virginianonprofits.org/directory/' + org.slug
          };

          Promise.all(
            CLAIM_WEBHOOKS.map(function(url) {
              return fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webhookPayload)
              });
            })
          ).catch(function() {}); // Non-blocking — form success does not depend on webhook delivery

          // Show success
          form.style.display = 'none';
          document.querySelector('.claim-value-strip').style.display = 'none';
          successPanel.style.display = '';
          successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
  });
}

/* ========================================================================
   Boot — readyState guard pattern per project standard
   ======================================================================== */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initClaim);
} else {
  initClaim();
}
</script>
