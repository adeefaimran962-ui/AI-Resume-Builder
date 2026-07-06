/**
 * public/js/main.js  –  ResumeAI v3.0
 * ============================================================
 * Sections:
 *  A. GLOBAL SCOPE  – addItem / removeItem (must be global for onclick="")
 *  B. DOMContentLoaded  – all UI enhancements
 *     1. Dark mode
 *     2. Navbar toggle + scroll effect
 *     3. Flash auto-dismiss
 *     4. Scroll animations
 *     5. Counter animation
 *     6. Dashboard search + filter
 *     7. Sidebar toggle
 *     8. Wizard (multi-step form)
 *     9. AI Generate buttons
 *    10. Form submit loading state
 *    11. Toast notifications
 *    12. Smooth scroll
 * ============================================================
 */

/* ============================================================
   A. GLOBAL – Dynamic form items
   addItem() and removeItem() must be GLOBAL because they are
   called via onclick="" attributes in EJS templates.
   ============================================================ */

/** Field definitions for each dynamic section */
var FIELDS = {
  workExperience: [
    { name:'jobTitle',    label:'Job Title',    type:'text',     placeholder:'Software Engineer',           col:'col-6' },
    { name:'company',     label:'Company',      type:'text',     placeholder:'Google Inc.',                 col:'col-6' },
    { name:'location',    label:'Location',     type:'text',     placeholder:'New York, USA',               col:'col-4' },
    { name:'startDate',   label:'Start Date',   type:'text',     placeholder:'Jan 2020',                    col:'col-4' },
    { name:'endDate',     label:'End Date',     type:'text',     placeholder:'Present',                     col:'col-4' },
    { name:'description', label:'Description',  type:'textarea', placeholder:'Describe key responsibilities and achievements...', col:'col-12' },
  ],
  education: [
    { name:'institution',  label:'Institution',    type:'text', placeholder:'MIT',              col:'col-6' },
    { name:'degree',       label:'Degree',         type:'text', placeholder:'Bachelor of Science', col:'col-6' },
    { name:'fieldOfStudy', label:'Field of Study', type:'text', placeholder:'Computer Science', col:'col-6' },
    { name:'startDate',    label:'Start',          type:'text', placeholder:'2018',             col:'col-3' },
    { name:'endDate',      label:'End',            type:'text', placeholder:'2022',             col:'col-3' },
    { name:'description',  label:'Notes',          type:'textarea', placeholder:'GPA, achievements, thesis...', col:'col-12' },
  ],
  projects: [
    { name:'name',        label:'Project Name', type:'text',     placeholder:'My Awesome App',          col:'col-6' },
    { name:'techStack',   label:'Tech Stack',   type:'text',     placeholder:'React, Node.js, MongoDB',  col:'col-6' },
    { name:'link',        label:'Project Link', type:'url',      placeholder:'https://github.com/...',   col:'col-12' },
    { name:'description', label:'Description',  type:'textarea', placeholder:'What the project does, your role, impact...', col:'col-12' },
  ],
  certifications: [
    { name:'name',      label:'Certificate Name', type:'text', placeholder:'AWS Certified Developer',         col:'col-6' },
    { name:'issuer',    label:'Issuer',           type:'text', placeholder:'Amazon Web Services',              col:'col-6' },
    { name:'issueDate', label:'Issue Date',       type:'text', placeholder:'June 2023',                       col:'col-6' },
    { name:'url',       label:'Credential URL',   type:'url',  placeholder:'https://credly.com/...',          col:'col-6' },
  ],
  languages: [
    { name:'language',    label:'Language',    type:'text',   placeholder:'English',       col:'col-6' },
    { name:'proficiency', label:'Proficiency', type:'select', placeholder:'',              col:'col-6',
      options:['Beginner','Elementary','Intermediate','Upper-Intermediate','Advanced','Native'] },
  ],
  achievements: [
    { name:'title',       label:'Title',       type:'text',     placeholder:'1st Place – Hackathon 2023', col:'col-8' },
    { name:'date',        label:'Date',        type:'text',     placeholder:'Oct 2023',                   col:'col-4' },
    { name:'description', label:'Description', type:'textarea', placeholder:'Describe the achievement...',col:'col-12' },
  ],
  socialLinks: [
    { name:'platform', label:'Platform', type:'text', placeholder:'LinkedIn',                         col:'col-4' },
    { name:'url',      label:'URL',      type:'url',  placeholder:'https://linkedin.com/in/yourname', col:'col-8' },
  ],
};

/** Human-readable labels */
var LABELS = {
  workExperience:'Work Experience', education:'Education', projects:'Project',
  certifications:'Certification',   languages:'Language',  achievements:'Achievement',
  socialLinks:'Social Link'
};

/**
 * addItem(listId, prefix, _fields)
 * Called by onclick attributes in form.ejs.
 * Creates a new collapsible dynamic item block.
 */
function addItem(listId, prefix, _fields) {
  var container = document.getElementById(listId);
  if (!container) { console.error('addItem: container not found:', listId); return; }

  var idx       = container.querySelectorAll('.dynamic-item').length;
  var fieldDefs = FIELDS[prefix] || [];
  var label     = LABELS[prefix] || prefix;

  var wrapper = document.createElement('div');
  wrapper.className = 'dynamic-item';
  wrapper.dataset.index = idx;

  // Header
  var hdr = document.createElement('div');
  hdr.className = 'item-header';

  var titleSpan = document.createElement('span');
  titleSpan.className = 'item-title';
  titleSpan.textContent = label + ' ' + (idx + 1);

  var removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove-item';
  removeBtn.title = 'Remove';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.onclick = function() { removeItem(this); };

  hdr.appendChild(titleSpan);
  hdr.appendChild(removeBtn);

  // Form row
  var row = document.createElement('div');
  row.className = 'form-row';

  fieldDefs.forEach(function(def) {
    var grp = document.createElement('div');
    grp.className = 'form-group ' + (def.col || 'col-6');

    var lbl = document.createElement('label');
    lbl.textContent = def.label;

    var inputName = prefix + '[' + idx + '][' + def.name + ']';
    var inp;

    if (def.type === 'textarea') {
      inp = document.createElement('textarea');
      inp.className = 'form-control';
      inp.name = inputName;
      inp.rows = 3;
      inp.placeholder = def.placeholder || '';
    } else if (def.type === 'select') {
      inp = document.createElement('select');
      inp.className = 'form-control';
      inp.name = inputName;
      (def.options || []).forEach(function(opt) {
        var o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        inp.appendChild(o);
      });
    } else {
      inp = document.createElement('input');
      inp.type = def.type || 'text';
      inp.className = 'form-control';
      inp.name = inputName;
      inp.placeholder = def.placeholder || '';
      inp.autocomplete = 'off';
    }

    // Live-update header title from first text field
    if (def === fieldDefs[0] && def.type === 'text') {
      inp.addEventListener('input', function() {
        titleSpan.textContent = this.value.trim() || (label + ' ' + (idx + 1));
      });
    }

    grp.appendChild(lbl);
    grp.appendChild(inp);
    row.appendChild(grp);
  });

  wrapper.appendChild(hdr);
  wrapper.appendChild(row);
  container.appendChild(wrapper);

  // Animate in
  wrapper.style.opacity = '0';
  wrapper.style.transform = 'translateY(12px)';
  requestAnimationFrame(function() {
    wrapper.style.transition = 'opacity .25s ease, transform .25s ease';
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translateY(0)';
  });

  // Focus first input
  var fi = wrapper.querySelector('input,textarea,select');
  if (fi) setTimeout(function(){ fi.focus(); }, 50);

  // Scroll into view
  wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * removeItem(btn)
 * Removes the .dynamic-item and re-indexes siblings.
 */
function removeItem(btn) {
  var item = btn.closest('.dynamic-item');
  if (!item) return;
  var container = item.parentNode;

  item.style.transition = 'opacity .2s ease, transform .2s ease';
  item.style.opacity = '0';
  item.style.transform = 'translateX(16px)';

  setTimeout(function() {
    container.removeChild(item);
    // Re-index remaining items
    var items = container.querySelectorAll('.dynamic-item');
    items.forEach(function(el, newIdx) {
      el.dataset.index = newIdx;
      el.querySelectorAll('input,textarea,select').forEach(function(inp) {
        if (inp.name) {
          inp.name = inp.name.replace(/\[(\d+)\]/, '[' + newIdx + ']');
        }
      });
      var ts = el.querySelector('.item-title');
      if (ts && /\s\d+$/.test(ts.textContent)) {
        ts.textContent = ts.textContent.replace(/\s\d+$/, ' ' + (newIdx + 1));
      }
    });
  }, 220);
}

/* ============================================================
   B. DOM-READY
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {

  /* ----------------------------------------------------------
     1. DARK MODE
     ---------------------------------------------------------- */
  var darkBtn    = document.getElementById('darkModeToggle');
  var htmlEl     = document.documentElement;
  var stored     = localStorage.getItem('resumeai-theme');

  function applyTheme(dark) {
    htmlEl.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('resumeai-theme', dark ? 'dark' : 'light');
    if (darkBtn) {
      darkBtn.innerHTML = dark
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
      darkBtn.title = dark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }

  // Apply saved or system preference
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(stored === 'dark' || (stored === null && prefersDark));

  if (darkBtn) {
    darkBtn.addEventListener('click', function() {
      applyTheme(htmlEl.getAttribute('data-theme') !== 'dark');
    });
  }

  /* ----------------------------------------------------------
     2. NAVBAR
     ---------------------------------------------------------- */
  var navToggle = document.getElementById('navToggle');
  var navMenu   = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      var open = navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open);
      var ic = navToggle.querySelector('i');
      if (ic) ic.className = open ? 'fas fa-times' : 'fas fa-bars';
    });
    document.addEventListener('click', function(e) {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('open');
        var ic = navToggle.querySelector('i');
        if (ic) ic.className = 'fas fa-bars';
      }
    });
  }

  // Scroll effect
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', function() {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     3. FLASH ALERTS – auto-dismiss after 4s
     ---------------------------------------------------------- */
  document.querySelectorAll('.alert').forEach(function(al) {
    setTimeout(function() {
      al.style.transition = 'opacity .4s ease, transform .4s ease';
      al.style.opacity = '0';
      al.style.transform = 'translateY(-8px)';
      setTimeout(function() { if (al.parentNode) al.remove(); }, 400);
    }, 4000);
  });

  /* ----------------------------------------------------------
     4. SCROLL ANIMATIONS
     ---------------------------------------------------------- */
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll, .fade-in-up').forEach(function(el) {
      obs.observe(el);
    });
  } else {
    document.querySelectorAll('.animate-on-scroll, .fade-in-up').forEach(function(el) {
      el.classList.add('visible');
    });
  }

  /* ----------------------------------------------------------
     5. COUNTER ANIMATION
     ---------------------------------------------------------- */
  function animateCounter(el) {
    var target = parseInt(el.dataset.target, 10) || 0;
    var dur = 1600, step = target / (dur / 16), cur = 0;
    var t = setInterval(function() {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(t); }
      el.textContent = Math.floor(cur).toLocaleString();
    }, 16);
  }
  if ('IntersectionObserver' in window) {
    var cntObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) { animateCounter(e.target); cntObs.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('.counter[data-target]').forEach(function(el) { cntObs.observe(el); });
  }

  /* ----------------------------------------------------------
     6. DASHBOARD SEARCH + FILTER
     ---------------------------------------------------------- */
  var searchInput  = document.getElementById('resumeSearch');
  var filterSelect = document.getElementById('templateFilter');
  var cards        = document.querySelectorAll('.resume-card[data-title]');

  function filterCards() {
    var q  = searchInput  ? searchInput.value.toLowerCase()  : '';
    var tp = filterSelect ? filterSelect.value.toLowerCase() : '';
    var visible = 0;
    cards.forEach(function(card) {
      var title    = (card.dataset.title    || '').toLowerCase();
      var name     = (card.dataset.name     || '').toLowerCase();
      var template = (card.dataset.template || '').toLowerCase();
      var show = (!q || title.includes(q) || name.includes(q)) && (!tp || template === tp);
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var empty = document.getElementById('dashEmptyFiltered');
    if (empty) empty.style.display = (visible === 0 && cards.length > 0) ? 'block' : 'none';
  }

  if (searchInput)  searchInput.addEventListener('input', filterCards);
  if (filterSelect) filterSelect.addEventListener('change', filterCards);

  /* ----------------------------------------------------------
     7. SIDEBAR TOGGLE (dashboard)
     ---------------------------------------------------------- */
  var sidebarToggle = document.getElementById('sidebarToggle');
  var dashSidebar   = document.getElementById('dashSidebar');

  if (sidebarToggle && dashSidebar) {
    sidebarToggle.addEventListener('click', function() {
      dashSidebar.classList.toggle('sidebar-open');
    });
    document.addEventListener('click', function(e) {
      if (dashSidebar.classList.contains('sidebar-open') &&
          !dashSidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
        dashSidebar.classList.remove('sidebar-open');
      }
    });
  }

  /* ----------------------------------------------------------
     8. MULTI-STEP WIZARD
     ---------------------------------------------------------- */
  var wizardForm  = document.getElementById('resumeWizard');
  var steps       = [];
  var currentStep = 0;

  if (wizardForm) {
    steps = Array.from(wizardForm.querySelectorAll('.wizard-step'));
    var progressBar  = document.getElementById('wizardProgressBar');
    var progressText = document.getElementById('wizardProgressText');
    var prevBtn      = document.getElementById('wizardPrev');
    var nextBtn      = document.getElementById('wizardNext');
    var submitBtn    = document.getElementById('wizardSubmit');
    var stepDots     = document.querySelectorAll('.step-dot');

    function showStep(idx) {
      steps.forEach(function(s, i) {
        s.classList.toggle('active',   i === idx);
        s.classList.toggle('complete', i < idx);
      });
      stepDots.forEach(function(dot, i) {
        dot.classList.toggle('active',   i === idx);
        dot.classList.toggle('done',     i < idx);
      });
      var pct = Math.round(((idx + 1) / steps.length) * 100);
      if (progressBar)  progressBar.style.width = pct + '%';
      if (progressText) progressText.textContent = 'Step ' + (idx+1) + ' of ' + steps.length;
      if (prevBtn)   prevBtn.style.display  = idx === 0 ? 'none' : '';
      if (nextBtn)   nextBtn.style.display  = idx === steps.length - 1 ? 'none' : '';
      if (submitBtn) submitBtn.style.display = idx === steps.length - 1 ? '' : 'none';
      // Scroll to top of form
      wizardForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (steps.length > 0) {
      showStep(0);

      if (nextBtn) {
        nextBtn.addEventListener('click', function() {
          if (currentStep < steps.length - 1) { currentStep++; showStep(currentStep); }
        });
      }
      if (prevBtn) {
        prevBtn.addEventListener('click', function() {
          if (currentStep > 0) { currentStep--; showStep(currentStep); }
        });
      }

      // Clicking step dots
      stepDots.forEach(function(dot, i) {
        dot.addEventListener('click', function() {
          currentStep = i; showStep(i);
        });
      });
    }
  }

  /* ----------------------------------------------------------
     9. AI GENERATE BUTTONS
     ---------------------------------------------------------- */
  document.querySelectorAll('[data-ai-generate]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var type      = btn.dataset.aiGenerate;
      var targetId  = btn.dataset.target;
      var targetEl  = targetId ? document.getElementById(targetId) : null;

      // Collect context from the form
      var form     = document.querySelector('#resumeWizard, .resume-form');
      var jobTitle = form ? (form.querySelector('[name="jobTitle"]') || {}).value : '';
      var company  = '';
      var skillsEl = form ? form.querySelector('[name="skillsRaw"]') : null;
      var skills   = skillsEl ? skillsEl.value : '';

      // For experience type, get company from first work item
      var firstCompany = form ? form.querySelector('[name*="workExperience"][name*="company"]') : null;
      if (firstCompany) company = firstCompany.value;

      // Show loading state
      var original = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
      btn.disabled  = true;

      fetch('/resume/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, jobTitle: jobTitle, company: company, skills: skills, years: 3 })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        btn.innerHTML = original;
        btn.disabled  = false;
        if (data.success && data.result) {
          if (targetEl) {
            targetEl.value = data.result;
            targetEl.dispatchEvent(new Event('input'));
            showToast('AI suggestion applied!', 'success');
          } else {
            // For skills: fill the skillsRaw field
            if (type === 'skills' && skillsEl) {
              skillsEl.value = data.result;
              showToast('AI skills applied!', 'success');
            }
          }
        }
      })
      .catch(function(err) {
        btn.innerHTML = original;
        btn.disabled  = false;
        console.error('AI generate error:', err);
        showToast('AI generation failed. Please try again.', 'error');
      });
    });
  });

  /* ----------------------------------------------------------
     10. FORM SUBMIT LOADING STATE
     ---------------------------------------------------------- */
  var resumeForm = document.querySelector('#resumeWizard, .resume-form');
  if (resumeForm) {
    resumeForm.addEventListener('submit', function() {
      var submitBtns = this.querySelectorAll('[type="submit"]');
      submitBtns.forEach(function(b) {
        b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        b.disabled  = true;
      });
    });
  }

  /* ----------------------------------------------------------
     11. TOAST NOTIFICATIONS
     ---------------------------------------------------------- */
  window.showToast = function(message, type) {
    var container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.innerHTML = '<i class="fas ' +
      (type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle') +
      '"></i><span>' + message + '</span>';
    container.appendChild(toast);
    // Animate in
    requestAnimationFrame(function() { toast.classList.add('show'); });
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 400);
    }, 3500);
  };

  /* ----------------------------------------------------------
     12. SMOOTH SCROLL
     ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var t = document.querySelector(this.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ----------------------------------------------------------
     Wire up live title updates for server-rendered items
     ---------------------------------------------------------- */
  document.querySelectorAll('.dynamic-item').forEach(function(item) {
    var ts = item.querySelector('.item-title');
    var fi = item.querySelector('input[type="text"]');
    if (ts && fi) {
      fi.addEventListener('input', function() {
        if (this.value.trim()) ts.textContent = this.value.trim();
      });
    }
  });

}); // end DOMContentLoaded
