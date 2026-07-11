# 🧪 Dashboard Testing Guide

## 🚀 Quick Start

```bash
# 1. Start the server
npm start

# 2. Open browser
http://localhost:3000/dashboard

# 3. Open DevTools (F12) to see console logs
```

---

## ✅ What to Test

### 1. Visual Appearance

**Desktop View (>1024px):**
- [ ] Sidebar is visible on the left
- [ ] Lucide icons appear (sparkle, file, mail, etc.)
- [ ] Top bar shows "Dashboard" title and "New Resume" button
- [ ] Hero section has gradient purple background
- [ ] Stats cards display with colored gradient icons
- [ ] Quick actions section shows 4 cards
- [ ] Resume cards are in a grid (up to 3 columns)
- [ ] Cover letter section appears if you have cover letters

**Mobile View (<768px):**
- [ ] Sidebar is hidden by default
- [ ] Hamburger menu (☰) appears in top bar
- [ ] All cards stack vertically (1 column)
- [ ] Buttons are touch-friendly
- [ ] No horizontal scroll

---

### 2. Sidebar Navigation

**Desktop:**
- [ ] Click collapse button (←) - sidebar shrinks to icons only
- [ ] Click again (→) - sidebar expands with text
- [ ] Hover over menu items - background changes
- [ ] Active page (Dashboard) has purple background
- [ ] All menu items have icons

**Mobile:**
- [ ] Click hamburger menu (☰) - sidebar slides in from left
- [ ] Click outside sidebar - sidebar closes
- [ ] Sidebar has overlay/shadow effect
- [ ] All links accessible

**Test Each Link:**
- [ ] Dashboard - `/dashboard`
- [ ] New Resume - `/resume/new`
- [ ] My Resumes - `/dashboard`
- [ ] Cover Letters - `/cover-letter/new`
- [ ] Certificates - `/certificates`
- [ ] Trash - `/dashboard/trash`
- [ ] Job Tracker - `/jobs`
- [ ] Interview Prep - `/interview`
- [ ] Skill Analysis - `/skill-gap`
- [ ] Career Roadmap - `/career-roadmap`
- [ ] ATS Checker - `/resume/ats-checker`
- [ ] Profile - `/dashboard/profile`
- [ ] Settings - `/dashboard/settings`
- [ ] Logout - `/auth/logout`

---

### 3. Hero Section

**Empty State (No Resumes):**
- [ ] Shows "Welcome back, [Your Name]!"
- [ ] Has AI-Powered badge with sparkles icon
- [ ] Has 3 action buttons:
  - Create Resume
  - Import Resume
  - Check ATS Score
- [ ] Animated circular illustration (desktop only)
- [ ] All buttons navigate correctly

**With Resumes:**
- [ ] Smaller hero with greeting
- [ ] Shows resume count
- [ ] "New Resume" button in hero

---

### 4. Statistics Cards

**Check Each Card:**
- [ ] Total Resumes - purple gradient icon
- [ ] Downloads - green gradient icon
- [ ] Avg ATS Score - blue gradient icon
- [ ] Last Updated - orange gradient icon
- [ ] Numbers display correctly
- [ ] Hover effect - card lifts with shadow
- [ ] Icons are visible (Lucide)

---

### 5. Quick Actions (Only shows if you have resumes)

**Test Each Card:**
- [ ] New Resume - purple icon, clicks to `/resume/new`
- [ ] Cover Letter - green icon, clicks to `/cover-letter/new`
- [ ] ATS Checker - orange icon, clicks to ATS checker
- [ ] Interview Prep - purple icon, clicks to `/interview`
- [ ] Hover effect - background darkens, card lifts
- [ ] Icons are visible

---

### 6. Resume Cards

**For Each Resume:**
- [ ] Template badge shows (Modern, Classic, etc.) with palette icon
- [ ] Resume title is visible and bold
- [ ] User name and job title display
- [ ] Stats row shows:
  - ATS score with target icon
  - Downloads with download icon
  - Date with calendar icon
- [ ] Hover effect - card lifts with shadow

**Action Buttons:**
- [ ] Edit button - purple, navigates to edit page
- [ ] Preview button - outlined, opens preview
- [ ] PDF button - outlined, downloads PDF
- [ ] All icons visible

---

### 7. Cover Letter Section

**If No Cover Letters:**
- [ ] Shows CTA card with mail icon
- [ ] "Create Your First Cover Letter" message
- [ ] "Create Cover Letter" button works

**If Cover Letters Exist:**
- [ ] Section header shows "My Cover Letters"
- [ ] Cover letter cards display in grid
- [ ] Each card shows:
  - Mail icon in header
  - Cover letter title
  - Job title and company (if available)
  - Last updated date
- [ ] Action buttons work (Edit, Preview, PDF)

---

### 8. Empty State (No Resumes)

- [ ] Large emoji icon (📄)
- [ ] "No resumes yet" title
- [ ] Helpful description text
- [ ] "Create My First Resume" button
- [ ] Button navigates to `/resume/new`

---

### 9. Pagination (If >6 Resumes)

- [ ] "Prev" button disabled on page 1
- [ ] "Next" button works
- [ ] Page indicator shows "Page X of Y"
- [ ] Maintains filters when navigating
- [ ] "Next" button disabled on last page

---

### 10. Console Logs (F12 → Console)

**Expected Logs:**
```
✅ Lucide icons initialized
🎨 Dashboard initialized successfully
```

**No Errors:**
- [ ] No red error messages
- [ ] No "undefined" warnings
- [ ] Lucide loads successfully

---

### 11. Responsive Breakpoints

**Test at These Widths:**

**1400px+ (Large Desktop):**
- [ ] All cards visible
- [ ] Sidebar at 260px
- [ ] Resume grid: 3 columns

**1024px (Tablet):**
- [ ] Sidebar becomes hamburger menu
- [ ] Resume grid: 2 columns
- [ ] Hero stacks (no illustration)

**768px (Mobile):**
- [ ] Everything stacks vertically
- [ ] Stats cards: 1 column
- [ ] Resume cards: 1 column
- [ ] Touch-friendly buttons
- [ ] No horizontal scroll

---

### 12. Hover Effects

**Test Hover On:**
- [ ] Sidebar menu items
- [ ] Stats cards
- [ ] Quick action cards
- [ ] Resume cards
- [ ] Buttons
- [ ] All show visual feedback

---

### 13. Browser Console Checks

**Type in Console:**

```javascript
// Check if Lucide loaded
typeof lucide
// Expected: "object"

// Check icons initialized
document.querySelectorAll('[data-lucide]').length
// Expected: > 0

// Check sidebar exists
document.getElementById('sidebar')
// Expected: <aside class="sidebar">

// Check current user
typeof currentUser
// Expected: May be "undefined" (that's okay)
```

---

### 14. Data Display

**Verify Correct Data Shows:**
- [ ] Your name in greeting
- [ ] Correct resume count
- [ ] Actual download numbers
- [ ] Real ATS scores
- [ ] Correct last updated dates
- [ ] Your resume titles
- [ ] Your cover letter titles

---

## 🐛 Common Issues & Fixes

### Issue 1: Icons Not Showing

**Symptom:** Boxes or text instead of icons

**Check:**
```javascript
// In console:
typeof lucide
```

**If "undefined":**
- Lucide CDN didn't load
- Check internet connection
- Check header.ejs includes Lucide script

**Fix:** Refresh page (Ctrl+F5)

---

### Issue 2: Sidebar Doesn't Toggle

**Symptom:** Hamburger menu doesn't open sidebar

**Check Console for errors**

**Fix:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check JavaScript console for errors

---

### Issue 3: Buttons Don't Work

**Symptom:** Clicking buttons does nothing

**Check:**
- Are you logged in?
- Does the route exist in `routes/`?
- Check console for 404 errors

**Test:** Click and watch Network tab (F12 → Network)

---

### Issue 4: Layout Broken

**Symptom:** Elements overlapping or misaligned

**Check:**
- Browser zoom (should be 100%)
- Browser window width
- Clear cache

**Fix:** Ctrl+F5 (hard refresh)

---

### Issue 5: Cover Letters Missing

**Symptom:** Cover letter section doesn't show

**Check:**
- Do you have any cover letters?
- Is `coverLetters` array passed to view?

**Create Test Cover Letter:**
- Navigate to `/cover-letter/new`
- Create a cover letter
- Return to dashboard

---

## 📊 Testing Matrix

| Feature | Desktop | Tablet | Mobile | Status |
|---------|---------|--------|--------|--------|
| Sidebar | ✅ | ✅ | ✅ | |
| Top Bar | ✅ | ✅ | ✅ | |
| Hero | ✅ | ✅ | ✅ | |
| Stats | ✅ | ✅ | ✅ | |
| Quick Actions | ✅ | ✅ | ✅ | |
| Resume Cards | ✅ | ✅ | ✅ | |
| Cover Letters | ✅ | ✅ | ✅ | |
| Pagination | ✅ | ✅ | ✅ | |
| Empty State | ✅ | ✅ | ✅ | |
| All Links | ✅ | ✅ | ✅ | |

---

## ✅ Success Criteria

Dashboard is working if:

1. ✅ All icons visible (Lucide)
2. ✅ Sidebar navigation works
3. ✅ All links navigate correctly
4. ✅ Stats display real data
5. ✅ Resume cards show with hover
6. ✅ Cover letter section visible
7. ✅ Quick actions work
8. ✅ Responsive on all sizes
9. ✅ No console errors
10. ✅ Buttons are functional

---

## 🎯 Final Test

**Complete User Journey:**

1. Login to dashboard
2. See hero and stats
3. Click "New Resume" from quick actions
4. Create a resume
5. Return to dashboard
6. See resume card appear
7. Click "Edit" on resume
8. Make changes
9. Return to dashboard
10. Click "Cover Letter" from quick actions
11. Create a cover letter
12. Return to dashboard
13. See cover letter section appear
14. Test all sidebar links
15. Test mobile view (resize browser)
16. Logout

**If all steps work:** ✅ Dashboard is perfect!

---

## 📸 Screenshot Checklist

Take screenshots of:
- [ ] Desktop dashboard (full view)
- [ ] Mobile dashboard (sidebar open)
- [ ] Hover effect on resume card
- [ ] Cover letter section
- [ ] Empty state
- [ ] Stats cards with icons

---

**Ready to test?** Start the server and open `http://localhost:3000/dashboard`!

