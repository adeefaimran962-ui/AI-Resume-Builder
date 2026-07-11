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
    { name:'description', label:'Description',  type:'textarea', placeholder:'Describe key responsibilities and achievements...', col:'col-12', aiGenerate: 'experience' },
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
    { name:'description', label:'Description',  type:'textarea', placeholder:'What the project does, your role, impact...', col:'col-12', aiGenerate: 'projects' },
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
    { name:'description', label:'Description', type:'textarea', placeholder:'Describe the achievement...',col:'col-12', aiGenerate: 'achievements' },
  ],
  socialLinks: [
    { name:'platform', label:'Platform', type:'text', placeholder:'LinkedIn',                         col:'col-4' },
    { name:'url',      label:'URL',      type:'url',  placeholder:'https://linkedin.com/in/yourname', col:'col-8' },
  ],
  skills: [
    { name:'skill',       label:'Skill Name',    type:'text',     placeholder:'JavaScript',           col:'col-6' },
    { name:'proficiency', label:'Proficiency',   type:'select',   placeholder:'',                    col:'col-6',
      options:['Beginner','Intermediate','Advanced','Expert'] },
  ],
  references: [
    { name:'name',        label:'Reference Name', type:'text',     placeholder:'John Smith',           col:'col-6' },
    { name:'position',    label:'Position',       type:'text',     placeholder:'Hiring Manager',       col:'col-6' },
    { name:'company',     label:'Company',        type:'text',     placeholder:'Company Name',         col:'col-6' },
    { name:'email',       label:'Email',          type:'email',    placeholder:'john@example.com',    col:'col-6' },
    { name:'phone',       label:'Phone',          type:'tel',      placeholder:'+1 234 567 8900',     col:'col-6' },
  ],
  volunteerExperience: [
    { name:'organization', label:'Organization',  type:'text',     placeholder:'Red Cross',              col:'col-6' },
    { name:'role',         label:'Role',          type:'text',     placeholder:'Volunteer',             col:'col-6' },
    { name:'startDate',    label:'Start Date',    type:'text',     placeholder:'Jan 2020',              col:'col-4' },
    { name:'endDate',      label:'End Date',      type:'text',     placeholder:'Present',              col:'col-4' },
    { name:'description',  label:'Description',   type:'textarea', placeholder:'Describe your volunteer work...', col:'col-12' },
  ],
  interests: [
    { name:'interest', label:'Interest', type:'text', placeholder:'Photography', col:'col-12' },
  ],
};

/** Human-readable labels */
var LABELS = {
  workExperience:'Work Experience', education:'Education', projects:'Project',
  certifications:'Certification',   languages:'Language',  achievements:'Achievement',
  socialLinks:'Social Link', skills:'Skill', references:'Reference',
  volunteerExperience:'Volunteer Experience', interests:'Interest'
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
    var inpId = 'input_' + prefix + '_' + idx + '_' + def.name;
    var inp;

    if (def.type === 'textarea') {
      inp = document.createElement('textarea');
      inp.className = 'form-control';
      inp.name = inputName;
      inp.id = inpId;
      inp.rows = 3;
      inp.placeholder = def.placeholder || '';
    } else if (def.type === 'select') {
      inp = document.createElement('select');
      inp.className = 'form-control';
      inp.name = inputName;
      inp.id = inpId;
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
      inp.id = inpId;
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

    if (def.aiGenerate) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-outline mt-2';
      btn.style.marginTop = '8px';
      btn.dataset.aiGenerate = def.aiGenerate;
      btn.dataset.target = inpId;
      btn.innerHTML = '<i class="fas fa-magic"></i> Improve with AI';
      
      // We must attach the same event listener logic from DOMContentLoaded
      btn.addEventListener('click', function() {
        var form = document.querySelector('#resumeWizard, .resume-form');
        var jobTitle = form ? (form.querySelector('[name="jobTitle"]') || {}).value : '';
        var company = form ? (form.querySelector('[name*="workExperience"][name*="company"]') || {}).value : '';
        var skills = form ? (form.querySelector('[name="skillsRaw"]') || {}).value : '';
        var inputText = inp ? inp.value : '';
        
        var original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;

        fetch('/resume/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: def.aiGenerate, jobTitle: jobTitle, company: company, skills: skills, years: 3, inputText: inputText })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          btn.innerHTML = original;
          btn.disabled = false;
          if (data.success && data.result) {
            inp.value = data.result;
            inp.dispatchEvent(new Event('input'));
            showToast('AI suggestion applied!', 'success');
          }
        })
        .catch(function(err) {
          btn.innerHTML = original;
          btn.disabled = false;
          showToast('AI generation failed.', 'error');
        });
      });
      
      grp.appendChild(btn);
    }

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

      // Get current input text
      var inputText = targetEl ? targetEl.value : '';

      // Show loading state
      var original = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
      btn.disabled  = true;

      fetch('/resume/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, jobTitle: jobTitle, company: company, skills: skills, years: 3, inputText: inputText })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        btn.innerHTML = original;
        btn.disabled  = false;
        if (data.success && data.result) {
          var accept = confirm("AI Suggestion:\n\n" + data.result + "\n\nDo you want to accept this suggestion?");
          if (accept) {
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
          } else {
            showToast('AI suggestion declined.', 'info');
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
     10. FORM SUBMIT: Loading, Validation, Duplicate Prevention
     ---------------------------------------------------------- */
  var resumeForm = document.querySelector('#resumeWizard, .resume-form');
  if (resumeForm) {
    var isSubmitting = false;

    // ── Inline validation helpers ───────────────────────────
    function validateField(input) {
      var value = input.value.trim();
      var name = input.name || input.id;
      var errorEl = input.nextElementSibling;
      if (errorEl && errorEl.classList.contains('field-error')) {
        if (input.required && value === '') {
          input.classList.add('field-invalid');
          errorEl.textContent = '⚠ This field is required.';
          errorEl.classList.add('show');
          return false;
        } else {
          input.classList.remove('field-invalid');
          errorEl.classList.remove('show');
        }
      }
      // XSS: warn on script tags
      if (/<script/i.test(value)) {
        input.value = value.replace(/<script.*?>.*?<\/script>/gi, '');
        showToast('Script tags are not allowed.', 'warning');
        return false;
      }
      return true;
    }

    // Add error elements after required inputs
    resumeForm.querySelectorAll('[required]').forEach(function(input) {
      if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('field-error')) {
        var err = document.createElement('div');
        err.className = 'field-error';
        err.innerHTML = '<i class="fas fa-exclamation-circle"></i> <span></span>';
        input.parentNode.insertBefore(err, input.nextSibling);
      }
      input.addEventListener('blur', function() { validateField(this); });
      input.addEventListener('input', function() {
        if (this.classList.contains('field-invalid')) validateField(this);
      });
    });

    resumeForm.addEventListener('submit', function(e) {
      // Prevent duplicate submissions
      if (isSubmitting) {
        e.preventDefault();
        showToast('Already saving, please wait…', 'warning');
        return;
      }

      // Run validation
      var allValid = true;
      resumeForm.querySelectorAll('[required]').forEach(function(input) {
        if (!validateField(input)) allValid = false;
      });
      if (!allValid) {
        e.preventDefault();
        showToast('Please fill in all required fields.', 'error');
        var firstInvalid = resumeForm.querySelector('.field-invalid');
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      isSubmitting = true;

      // Show spinner overlay
      var overlay = document.getElementById('spinnerOverlay');
      if (overlay) overlay.classList.add('active');

      var submitBtns = this.querySelectorAll('[type="submit"]');
      submitBtns.forEach(function(b) {
        b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
        b.classList.add('btn-submitting');
        b.disabled = true;
      });

      // Re-enable after 10s safety net
      setTimeout(function() { isSubmitting = false; }, 10000);
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


/* ============================================================
   C. AJAX CARD SYSTEM FOR RESUME SECTIONS
   Production-quality individual item management with:
   - View/Edit modes
   - Save/Cancel/Delete/Duplicate actions
   - Drag-and-drop reordering
   - Loading states and animations
   - Toast notifications
   ============================================================ */

/**
 * Initialize AJAX card system for resume edit page
 */
function initAJAXCardSystem() {
  const form = document.querySelector('.resume-form');
  if (!form) return;

  const resumeId = extractResumeId();
  if (!resumeId) {
    console.log('[AJAX Cards] No resume ID found - skipping AJAX initialization (new resume mode)');
    return;
  }

  // Don't initialize AJAX on the 'new' page
  if (window.location.pathname.includes('/resume/new')) {
    console.log('[AJAX Cards] Skipping AJAX initialization on new resume page');
    return;
  }

  console.log('[AJAX Cards] Initializing for resume:', resumeId);

  // Convert existing static items to editable cards
  convertExistingItemsToCards(resumeId);

  // Initialize drag-and-drop for all sections
  initializeDragAndDrop(resumeId);

  // Update Add buttons to create editable cards
  enhanceAddButtons(resumeId);
}

/**
 * Extract resume ID from URL or form action
 */
function extractResumeId() {
  const match = window.location.pathname.match(/\/resume\/([a-f0-9]{24})/);
  return match ? match[1] : null;
}

/**
 * Convert existing server-rendered items to editable card format
 */
function convertExistingItemsToCards(resumeId) {
  const sections = ['workExperience', 'education', 'projects', 'certifications', 'languages', 'achievements', 'socialLinks'];
  
  sections.forEach(section => {
    const listId = getSectionListId(section);
    const container = document.getElementById(listId);
    if (!container) return;

    const items = container.querySelectorAll('.dynamic-item');
    items.forEach(item => {
      const itemId = extractItemId(item);
      if (itemId) {
        convertToEditableCard(item, section, itemId, resumeId);
      }
    });
  });
}

/**
 * Convert a dynamic item to an editable card with actions
 */
function convertToEditableCard(item, section, itemId, resumeId) {
  // Add data attributes
  item.dataset.section = section;
  item.dataset.itemId = itemId;
  item.dataset.resumeId = resumeId;

  // Add action buttons if not already present
  if (!item.querySelector('.card-actions')) {
    const header = item.querySelector('.item-header');
    if (header) {
      const actions = createCardActions();
      header.appendChild(actions);

      // Attach event listeners
      attachCardEventListeners(item, resumeId);
    }
  }

  // Wrap form content in view/edit modes
  if (!item.querySelector('.card-view-mode')) {
    const formRow = item.querySelector('.form-row');
    if (formRow) {
      formRow.style.display = 'block'; // Always show in edit mode initially
    }
  }
}

/**
 * Create action buttons for a card
 */
function createCardActions() {
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'card-actions';
  actionsDiv.innerHTML = `
    <button type="button" class="btn-card-action btn-save" title="Save" style="display:none;">
      <i class="fas fa-check"></i>
    </button>
    <button type="button" class="btn-card-action btn-cancel" title="Cancel" style="display:none;">
      <i class="fas fa-times"></i>
    </button>
    <button type="button" class="btn-card-action btn-edit" title="Edit">
      <i class="fas fa-edit"></i>
    </button>
    <button type="button" class="btn-card-action btn-duplicate" title="Duplicate">
      <i class="fas fa-copy"></i>
    </button>
    <button type="button" class="btn-card-action btn-delete" title="Delete">
      <i class="fas fa-trash"></i>
    </button>
    <button type="button" class="btn-card-action btn-drag" title="Drag to reorder" style="cursor:grab;">
      <i class="fas fa-grip-vertical"></i>
    </button>
  `;
  return actionsDiv;
}

/**
 * Attach event listeners to card action buttons
 */
function attachCardEventListeners(card, resumeId) {
  const section = card.dataset.section;
  const itemId = card.dataset.itemId;

  // Edit button
  const editBtn = card.querySelector('.btn-edit');
  if (editBtn) {
    editBtn.addEventListener('click', () => enterEditMode(card));
  }

  // Save button
  const saveBtn = card.querySelector('.btn-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveCard(card, resumeId));
  }

  // Cancel button
  const cancelBtn = card.querySelector('.btn-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => cancelEdit(card));
  }

  // Delete button
  const deleteBtn = card.querySelector('.btn-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => deleteCard(card, resumeId));
  }

  // Duplicate button
  const duplicateBtn = card.querySelector('.btn-duplicate');
  if (duplicateBtn) {
    duplicateBtn.addEventListener('click', () => duplicateCard(card, resumeId));
  }
}

/**
 * Enter edit mode for a card
 */
function enterEditMode(card) {
  card.classList.add('editing');
  card.querySelector('.btn-edit').style.display = 'none';
  card.querySelector('.btn-duplicate').style.display = 'none';
  card.querySelector('.btn-delete').style.display = 'none';
  card.querySelector('.btn-save').style.display = 'inline-block';
  card.querySelector('.btn-cancel').style.display = 'inline-block';

  // Focus first input
  const firstInput = card.querySelector('input, textarea, select');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

/**
 * Cancel edit mode
 */
function cancelEdit(card) {
  card.classList.remove('editing');
  card.querySelector('.btn-edit').style.display = 'inline-block';
  card.querySelector('.btn-duplicate').style.display = 'inline-block';
  card.querySelector('.btn-delete').style.display = 'inline-block';
  card.querySelector('.btn-save').style.display = 'none';
  card.querySelector('.btn-cancel').style.display = 'none';
}

/**
 * Save card data via AJAX
 */
async function saveCard(card, resumeId) {
  const section = card.dataset.section;
  const itemId = card.dataset.itemId;
  const isNew = !itemId || itemId === 'new';

  // Extract form data
  const formData = extractCardFormData(card);

  // Show loading state
  card.classList.add('saving');
  const saveBtn = card.querySelector('.btn-save');
  const originalHTML = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  saveBtn.disabled = true;

  try {
    const url = isNew
      ? `/resume/${resumeId}/section/${section}`
      : `/resume/${resumeId}/section/${section}/${itemId}`;
    const method = isNew ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      // Update card with returned item ID if new
      if (isNew && data.item._id) {
        card.dataset.itemId = data.item._id;
      }

      // Exit edit mode
      cancelEdit(card);

      // Show success toast
      if (window.showToast) {
        window.showToast(isNew ? 'Item added successfully!' : 'Changes saved!', 'success');
      }

      // Update card title
      updateCardTitle(card, formData);
    } else {
      throw new Error(data.message || 'Save failed');
    }
  } catch (err) {
    console.error('Save card error:', err);
    if (window.showToast) {
      window.showToast('Failed to save. Please try again.', 'error');
    }
  } finally {
    card.classList.remove('saving');
    saveBtn.innerHTML = originalHTML;
    saveBtn.disabled = false;
  }
}

/**
 * Delete card via AJAX
 */
async function deleteCard(card, resumeId) {
  const section = card.dataset.section;
  const itemId = card.dataset.itemId;

  if (!confirm('Are you sure you want to delete this item?')) return;

  // Show loading state
  card.style.opacity = '0.5';
  card.style.pointerEvents = 'none';

  try {
    const response = await fetch(`/resume/${resumeId}/section/${section}/${itemId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.success) {
      // Animate out
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '0';
      card.style.transform = 'translateX(20px)';

      setTimeout(() => {
        card.remove();
        if (window.showToast) {
          window.showToast('Item deleted successfully!', 'success');
        }
      }, 300);
    } else {
      throw new Error(data.message || 'Delete failed');
    }
  } catch (err) {
    console.error('Delete card error:', err);
    card.style.opacity = '1';
    card.style.pointerEvents = 'auto';
    if (window.showToast) {
      window.showToast('Failed to delete. Please try again.', 'error');
    }
  }
}

/**
 * Duplicate card via AJAX
 */
async function duplicateCard(card, resumeId) {
  const section = card.dataset.section;
  const itemId = card.dataset.itemId;

  // Show loading state
  if (window.showToast) {
    window.showToast('Duplicating...', 'info');
  }

  try {
    const response = await fetch(`/resume/${resumeId}/section/${section}/${itemId}/duplicate`, {
      method: 'POST'
    });

    const data = await response.json();

    if (data.success && data.item) {
      // Create new card element
      const container = card.parentNode;
      const newCard = card.cloneNode(true);
      
      // Update with new item ID
      newCard.dataset.itemId = data.item._id;
      
      // Update form values with duplicated data
      Object.keys(data.item).forEach(key => {
        const input = newCard.querySelector(`[name*="[${key}]"]`);
        if (input && data.item[key]) {
          input.value = data.item[key];
        }
      });

      // Re-attach event listeners
      attachCardEventListeners(newCard, resumeId);

      // Insert after original card
      card.after(newCard);

      // Animate in
      newCard.style.opacity = '0';
      newCard.style.transform = 'translateY(-10px)';
      requestAnimationFrame(() => {
        newCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        newCard.style.opacity = '1';
        newCard.style.transform = 'translateY(0)';
      });

      if (window.showToast) {
        window.showToast('Item duplicated successfully!', 'success');
      }
    } else {
      throw new Error(data.message || 'Duplicate failed');
    }
  } catch (err) {
    console.error('Duplicate card error:', err);
    if (window.showToast) {
      window.showToast('Failed to duplicate. Please try again.', 'error');
    }
  }
}

/**
 * Extract form data from a card
 */
function extractCardFormData(card) {
  const formData = {};
  const inputs = card.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    if (input.name) {
      // Extract field name from name attribute (e.g., "workExperience[0][jobTitle]" -> "jobTitle")
      const match = input.name.match(/\[([^\]]+)\]$/);
      if (match) {
        const fieldName = match[1];
        formData[fieldName] = input.type === 'checkbox' ? input.checked : input.value;
      }
    }
  });

  return formData;
}

/**
 * Update card title based on form data
 */
function updateCardTitle(card, formData) {
  const titleSpan = card.querySelector('.item-title');
  if (!titleSpan) return;

  // Determine which field to use for title
  const titleValue = formData.jobTitle || formData.institution || formData.name || 
                     formData.title || formData.language || formData.platform || 'Item';
  
  titleSpan.textContent = titleValue;
}

/**
 * Get list container ID for a section
 */
function getSectionListId(section) {
  const map = {
    workExperience: 'workList',
    education: 'eduList',
    projects: 'projectList',
    certifications: 'certList',
    languages: 'langList',
    achievements: 'achieveList',
    socialLinks: 'socialList'
  };
  return map[section] || section + 'List';
}

/**
 * Extract item ID from a card element
 */
function extractItemId(card) {
  // Try to extract from data attribute or hidden input
  const inputs = card.querySelectorAll('input, textarea, select');
  for (let input of inputs) {
    if (input.name && input.name.includes('[_id]')) {
      return input.value;
    }
  }
  return null;
}

/**
 * Initialize drag-and-drop for section reordering
 */
function initializeDragAndDrop(resumeId) {
  const sections = ['workExperience', 'education', 'projects', 'certifications', 'languages', 'achievements', 'socialLinks'];
  
  sections.forEach(section => {
    const listId = getSectionListId(section);
    const container = document.getElementById(listId);
    if (!container) return;

    container.dataset.section = section;
    let draggedCard = null;

    // Make cards draggable
    container.addEventListener('dragstart', function(e) {
      const dragHandle = e.target.closest('.btn-drag');
      if (!dragHandle) return;

      draggedCard = e.target.closest('.dynamic-item');
      if (draggedCard) {
        draggedCard.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    container.addEventListener('dragover', function(e) {
      e.preventDefault();
      if (!draggedCard) return;

      const afterElement = getDragAfterElement(container, e.clientY);
      if (afterElement == null) {
        container.appendChild(draggedCard);
      } else {
        container.insertBefore(draggedCard, afterElement);
      }
    });

    container.addEventListener('dragend', function(e) {
      if (draggedCard) {
        draggedCard.classList.remove('dragging');
        saveNewOrder(container, resumeId);
        draggedCard = null;
      }
    });
  });
}

/**
 * Get the element after which the dragged element should be placed
 */
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.dynamic-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/**
 * Save new order after drag-and-drop
 */
async function saveNewOrder(container, resumeId) {
  const section = container.dataset.section;
  const cards = container.querySelectorAll('.dynamic-item');
  const order = Array.from(cards).map(card => card.dataset.itemId).filter(Boolean);

  try {
    const response = await fetch(`/resume/${resumeId}/section/${section}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    });

    const data = await response.json();

    if (data.success) {
      if (window.showToast) {
        window.showToast('Order saved!', 'success');
      }
    }
  } catch (err) {
    console.error('Reorder error:', err);
  }
}

/**
 * Enhance Add buttons to create new editable cards
 */
function enhanceAddButtons(resumeId) {
  // Override the global addItem function to create editable cards
  const originalAddItem = window.addItem;
  
  window.addItem = function(listId, prefix, _fields) {
    // Call original to create the DOM structure
    originalAddItem(listId, prefix, _fields);

    // Get the newly created item
    const container = document.getElementById(listId);
    if (!container) return;

    const items = container.querySelectorAll('.dynamic-item');
    const newItem = items[items.length - 1];

    if (newItem) {
      // Mark as new (no itemId yet)
      newItem.dataset.section = prefix;
      newItem.dataset.itemId = 'new';
      newItem.dataset.resumeId = resumeId;

      // Add action buttons
      const header = newItem.querySelector('.item-header');
      if (header && !header.querySelector('.card-actions')) {
        const actions = createCardActions();
        header.appendChild(actions);
        attachCardEventListeners(newItem, resumeId);

        // Start in edit mode
        enterEditMode(newItem);
      }
    }
  };
}

/* ─── Initialize on page load ─── */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize AJAX card system if on resume edit page
  if (document.querySelector('.resume-form')) {
    const isNewPage = window.location.pathname.includes('/resume/new');
    const isEditPage = window.location.pathname.match(/\/resume\/[a-f0-9]{24}\/edit/);
    
    console.log('[Page Load] Resume form detected');
    console.log('[Page Load] Is new page:', isNewPage);
    console.log('[Page Load] Is edit page:', !!isEditPage);
    console.log('[Page Load] Current URL:', window.location.pathname);
    
    if (isNewPage) {
      console.log('[Page Load] New resume mode - using traditional form submission');
      console.log('[Page Load] Add buttons will add items to form, saved on Submit');
    } else if (isEditPage) {
      console.log('[Page Load] Edit mode - initializing AJAX card system');
      initAJAXCardSystem();
    } else {
      console.log('[Page Load] Unknown mode - attempting AJAX initialization');
      initAJAXCardSystem();
    }
  }
});

