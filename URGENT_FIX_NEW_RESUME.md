# URGENT: Add Buttons Not Working on New Resume Page

## 🚨 PROBLEM IDENTIFIED

**When creating a NEW resume** (`/resume/new`), the Add buttons for certificates, education, etc. are **not working**.

## 🔍 ROOT CAUSE

There are TWO different workflows:

### 1. Creating New Resume (`/resume/new`)
- ❌ **AJAX system CANNOT work** (no resume ID yet)
- ✅ **Traditional form submission** should work
- ✅ `addItem()` should add fields to DOM
- ✅ Submit entire form → All sections save at once

### 2. Editing Existing Resume (`/resume/{id}/edit`)
- ✅ **AJAX system works** (resume ID exists)
- ✅ Individual save per item
- ✅ Real-time updates

## 🐛 LIKELY ISSUE

The AJAX system in `main.js` is **overriding** the `addItem()` function even on the `/new` page where it shouldn't.

The `enhanceAddButtons()` function checks for resume ID and tries to use AJAX, but fails silently when no ID exists.

## ✅ SOLUTION

We need to make the AJAX system **only activate on edit pages**, not on new resume creation pages.

### Option 1: Check for Resume ID Before Enhancement

The AJAX system should only enhance buttons if a resume ID exists:

```javascript
function enhanceAddButtons(resumeId) {
  if (!resumeId || resumeId === 'new') {
    console.log('[AJAX Cards] Skipping enhancement - no resume ID');
    return; // Don't enhance on new resume page
  }
  
  // Only override addItem() if we have a valid resume ID
  const originalAddItem = window.addItem;
  // ... rest of the code
}
```

### Option 2: Different Initialization Logic

```javascript
document.addEventListener('DOMContentLoaded', function() {
  if (document.querySelector('.resume-form')) {
    const resumeId = extractResumeId();
    
    if (resumeId && resumeId !== 'new') {
      // Edit mode: Use AJAX
      initAJAXCardSystem();
    } else {
      // Create mode: Use traditional form
      console.log('[Form] New resume mode - using traditional submission');
    }
  }
});
```

## 🔧 IMMEDIATE FIX

I'll modify the AJAX initialization to skip enhancement when no valid resume ID exists.

