/**
 * Resume Form - Add/Remove Item Functions
 * Separate file to avoid caching issues
 */

console.log('[Resume Form] Script loaded successfully');

// Add visual indicator that script loaded
document.addEventListener('DOMContentLoaded', function() {
  const indicator = document.createElement('div');
  indicator.id = 'scriptLoadIndicator';
  indicator.style.cssText = 'position:fixed;top:10px;right:10px;background:#4CAF50;color:white;padding:8px 15px;border-radius:20px;font-size:12px;font-weight:600;z-index:99999;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
  indicator.innerHTML = '✓ Resume Form Script Loaded';
  document.body.appendChild(indicator);
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transition = 'opacity 0.5s';
    setTimeout(() => indicator.remove(), 500);
  }, 3000);
  
  console.log('[Resume Form] Visual indicator added to page');
});

// ── Add Item Function for Dynamic Sections ─────────────────────────────────────
window.addItem = function(listId, arrayName, fields) {
  console.log('[addItem] Called:', listId, arrayName, fields);
  const list = document.getElementById(listId);
  if (!list) {
    console.error('[addItem] List not found:', listId);
    return;
  }

  const index = list.children.length;
  const item = document.createElement('div');
  item.className = 'dynamic-item';
  item.dataset.index = index;

  // FIXED: Using bracket notation [field] instead of dot notation .field
  let html = '<div class="item-header"><span class="item-title">New Item</span><button type="button" class="btn-remove-item" onclick="removeItem(this)"><i class="fas fa-times"></i></button></div><div class="form-row">';

  fields.forEach(field => {
    const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    let inputType = 'text';
    let placeholder = '';
    let colClass = 'col-12';

    if (field === 'startDate' || field === 'endDate' || field === 'issueDate' || field === 'date') {
      placeholder = 'Jan 2020';
      colClass = 'col-6';
    } else if (field === 'description') {
      inputType = 'textarea';
      placeholder = 'Description...';
    } else if (field === 'link' || field === 'url') {
      inputType = 'url';
      placeholder = 'https://...';
    } else if (field === 'email') {
      inputType = 'email';
      placeholder = 'email@example.com';
      colClass = 'col-6';
    } else if (field === 'phone') {
      inputType = 'tel';
      placeholder = '+1 234 567 8900';
      colClass = 'col-6';
    } else if (field === 'proficiency') {
      inputType = 'select';
      colClass = 'col-6';
    } else if (field === 'platform') {
      colClass = 'col-4';
      placeholder = 'LinkedIn';
    } else if (['jobTitle', 'company', 'institution', 'degree', 'name', 'organization', 'role'].includes(field)) {
      colClass = 'col-6';
      placeholder = label;
    } else if (['location', 'fieldOfStudy', 'techStack', 'issuer', 'language', 'title'].includes(field)) {
      colClass = field === 'title' ? 'col-8' : 'col-6';
      placeholder = label;
    } else {
      placeholder = label;
      colClass = 'col-12';
    }

    html += '<div class="form-group ' + colClass + '"><label>' + label + '</label>';
    
    if (inputType === 'textarea') {
      html += '<textarea name="' + arrayName + '[' + index + '][' + field + ']" class="form-control" placeholder="' + placeholder + '" rows="3"></textarea>';
    } else if (inputType === 'select' && field === 'proficiency') {
      html += '<select name="' + arrayName + '[' + index + '][' + field + ']" class="form-control">';
      html += '<option value="">Select proficiency</option>';
      html += '<option value="Beginner">Beginner</option>';
      html += '<option value="Elementary">Elementary</option>';
      html += '<option value="Intermediate">Intermediate</option>';
      html += '<option value="Upper-Intermediate">Upper-Intermediate</option>';
      html += '<option value="Advanced">Advanced</option>';
      html += '<option value="Native">Native</option>';
      html += '</select>';
    } else {
      html += '<input type="' + inputType + '" name="' + arrayName + '[' + index + '][' + field + ']" class="form-control" placeholder="' + placeholder + '" />';
    }
    
    html += '</div>';
  });

  html += '</div>';
  item.innerHTML = html;
  list.appendChild(item);

  // Trigger form change
  const form = document.querySelector('.resume-form');
  if (form) {
    form.dispatchEvent(new Event('change'));
  }

  // Update progress
  if (window.updateProgress) window.updateProgress();

  console.log('[addItem] Item added successfully to', listId);
  console.log('[addItem] Created fields:', Array.from(item.querySelectorAll('input, textarea, select')).map(i => i.name));
};

// ── Remove Item Function ───────────────────────────────────────────────────────
window.removeItem = function(button) {
  console.log('[removeItem] Called');
  const item = button.closest('.dynamic-item');
  if (!item) {
    console.error('[removeItem] Could not find .dynamic-item parent');
    return;
  }
  
  const container = item.parentNode;
  item.remove();
  
  // Reindex remaining items
  if (container) {
    const listId = container.id;
    if (listId && window.reindexList) {
      window.reindexList(listId);
    }
  }
  
  // Trigger form change
  const form = document.querySelector('.resume-form');
  if (form) {
    form.dispatchEvent(new Event('change'));
  }

  // Update progress
  if (window.updateProgress) window.updateProgress();
  
  console.log('[removeItem] Item removed successfully');
};

console.log('[Resume Form] addItem and removeItem functions registered');
console.log('[Resume Form] Ready to accept button clicks');
