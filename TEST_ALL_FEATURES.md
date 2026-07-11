# Complete Feature Testing Guide
## AI Resume Builder - All Features Testing Checklist

---

## 🚀 Quick Start Testing

### Prerequisites
1. MongoDB is running
2. Environment variables set in `.env`:
   ```
   MONGODB_URI=mongodb://localhost:27017/resume-builder
   SESSION_SECRET=your-secret-key-here
   OPENAI_API_KEY=sk-your-key-here (optional, for AI features)
   ```

3. Start the application:
   ```bash
   npm start
   ```

4. Open browser: http://localhost:3000

---

## ✅ TESTING CHECKLIST

### 1. USER AUTHENTICATION (5 tests)
- [ ] **Register**: Create new account at `/auth/register`
  - Should redirect to dashboard after successful registration
  - Password should be at least 6 characters
- [ ] **Login**: Login at `/auth/login`
  - Should set session and redirect to dashboard
- [ ] **Session Persistence**: Refresh page
  - Should remain logged in
- [ ] **Protected Routes**: Try accessing `/dashboard` without login
  - Should redirect to login page
- [ ] **Logout**: Click logout button
  - Should clear session and redirect to home

**Status:** All Pass ✅ / Some Fail ❌

---

### 2. DASHBOARD UI (15 tests)

#### Sidebar Navigation
- [ ] All 16 sidebar menu items have icons
- [ ] Active state highlights current page
- [ ] Collapse button works (sidebar shrinks to 70px)
- [ ] Mobile menu (hamburger) appears on small screens
- [ ] User profile section shows avatar/initials
- [ ] Logout button works

#### Top Bar
- [ ] Page title displays correctly
- [ ] "New Resume" button visible
- [ ] User avatar clickable (links to profile)

#### Stats Cards
- [ ] "Total Resumes" card shows correct count with file icon
- [ ] "Downloads" card shows total downloads with download icon
- [ ] "ATS Score" card shows average with target icon
- [ ] "Last Updated" card shows date with clock icon
- [ ] All cards have hover animation (lift effect)

#### Resume Grid
- [ ] All resume cards display correctly
- [ ] Each card shows: template badge, title, name, job title, ATS score, download count, date
- [ ] Hover effect on cards (lift + shadow)

**Status:** All Pass ✅ / Some Fail ❌

---

### 3. RESUME CRUD - CREATE (12 tests)

#### Form Load
- [ ] Navigate to `/resume/new`
- [ ] Form renders with all sections
- [ ] All 11 "Add" buttons visible:
  - Add Work Experience
  - Add Education
  - Add Projects
  - Add Certifications
  - Add Languages
  - Add Achievements
  - Add Social Links
  - Add Skills (proficiency-based)
  - Add References
  - Add Volunteer Experience
  - Add Interests

#### Adding Items
**Test Work Experience:**
- [ ] Click "Add Work Experience"
- [ ] New form section appears with fields:
  - Job Title
  - Company
  - Location
  - Start Date
  - End Date
  - Description
- [ ] Click "Add Work Experience" again
- [ ] Second entry appears below first
- [ ] Both entries maintain independent values

**Test Education:**
- [ ] Click "Add Education"
- [ ] Fields appear: Institution, Degree, Field of Study, Start, End, Description
- [ ] Add multiple entries (at least 3)
- [ ] All entries persist

**Test Projects:**
- [ ] Click "Add Project"
- [ ] Fields: Name, Tech Stack, Link, Description
- [ ] Add 2-3 projects

**Test Other Sections:**
- [ ] Add Certifications (Name, Issuer, Issue Date, URL)
- [ ] Add Languages (Language, Proficiency dropdown)
- [ ] Add Achievements (Title, Date, Description)
- [ ] Add Social Links (Platform, URL)
- [ ] Add Skills with proficiency (Skill Name, Proficiency dropdown)
- [ ] Add References (Name, Position, Company, Email, Phone)
- [ ] Add Volunteer Experience (Organization, Role, Dates, Description)
- [ ] Add Interests (Interest name)

#### Form Submission
- [ ] Fill in Resume Title (required)
- [ ] Fill in Personal Information:
  - Full Name
  - Job Title
  - Email
  - Phone
  - City
  - Country
  - Website
  - Address
- [ ] Fill Professional Summary
- [ ] Add comma-separated skills (e.g., "JavaScript, React, Node.js")
- [ ] Select a template from dropdown
- [ ] Click "Create Resume"
- [ ] Should redirect to preview page
- [ ] URL should be `/resume/{id}/preview`

**Status:** All Pass ✅ / Some Fail ❌

---

### 4. RESUME CRUD - READ/PREVIEW (8 tests)

#### Preview Page
- [ ] Preview page loads without errors
- [ ] Resume displays in selected template
- [ ] All entered data visible:
  - Personal info
  - Summary
  - Work experience (all entries)
  - Education (all entries)
  - Projects
  - Skills
  - All other sections
- [ ] Action buttons present:
  - Edit
  - Download PDF
  - Download DOCX
  - Share
  - Back to Dashboard

#### Template Switching
- [ ] Try changing template using `?tpl=modern` in URL
- [ ] Try `?tpl=classic`
- [ ] Try `?tpl=minimal`
- [ ] All 13 templates should work:
  - modern, classic, minimal, professional, executive
  - creative, compact, tech, elegant, ats-professional
  - minimal-pro, modern-gradient, sharp

**Status:** All Pass ✅ / Some Fail ❌

---

### 5. RESUME CRUD - UPDATE/EDIT (10 tests)

#### Edit Form Load
- [ ] Click "Edit" from dashboard or preview
- [ ] Form loads with all existing data pre-filled
- [ ] All sections display correct number of items
- [ ] All field values are correct

#### Modifying Data
- [ ] Change resume title
- [ ] Modify personal info (name, email, etc.)
- [ ] Edit existing work experience entry
- [ ] Add a new work experience entry
- [ ] Remove an existing education entry (click X button)
- [ ] Should show confirmation or remove immediately
- [ ] Entry should disappear from form
- [ ] Add new project
- [ ] Modify skills (add/remove)
- [ ] Change template selection

#### Saving Changes
- [ ] Click "Save Changes"
- [ ] Should redirect to preview
- [ ] **CRITICAL TEST**: All changes must persist
  - Modified title visible
  - New work experience shows up
  - Deleted education entry is gone
  - New project appears
  - Template change applied

**Status:** All Pass ✅ / Some Fail ❌

---

### 6. RESUME CRUD - DELETE (6 tests)

#### Soft Delete
- [ ] From dashboard, click dropdown menu on resume card (three dots)
- [ ] Click "Delete"
- [ ] Should show confirmation dialog
- [ ] Click "Yes/OK"
- [ ] Resume should disappear from main dashboard
- [ ] Success message should appear

#### Trash/Recycle Bin
- [ ] Navigate to `/dashboard/trash` or click "Trash" in sidebar
- [ ] Deleted resume should appear in trash
- [ ] "Restore" button visible
- [ ] "Permanent Delete" button visible

#### Restore
- [ ] Click "Restore" on trashed resume
- [ ] Resume should disappear from trash
- [ ] Go back to dashboard
- [ ] Resume should reappear in main list

#### Permanent Delete
- [ ] Delete resume again (move to trash)
- [ ] Go to trash
- [ ] Click "Permanent Delete"
- [ ] Should show confirmation (this is irreversible)
- [ ] Confirm deletion
- [ ] Resume should be completely removed from database

**Status:** All Pass ✅ / Some Fail ❌

---

### 7. RESUME - ALL ADD BUTTONS (33 tests)

**Test EACH button individually with this sequence:**

#### Work Experience ✅
- [ ] Click "Add Work Experience"
- [ ] All 6 fields appear (Job Title, Company, Location, Start Date, End Date, Description)
- [ ] Fill all fields with test data
- [ ] Click "Add Work Experience" again
- [ ] Add 3 total work experiences
- [ ] Fill with different data
- [ ] Remove the middle entry (click X on item 2)
- [ ] Remaining entries should re-index automatically
- [ ] Save resume
- [ ] Go to preview
- [ ] All 2 remaining work experiences should display
- [ ] Edit resume again
- [ ] Both entries still present with correct data

#### Education ✅
- [ ] Repeat same test sequence as Work Experience
- [ ] Test with 3 entries, remove 1, verify persistence

#### Projects ✅
- [ ] Click "Add Project" 
- [ ] Fields: Name, Tech Stack, Link, Description
- [ ] Add 2 projects
- [ ] Remove 1
- [ ] Save and verify

#### Certifications ✅
- [ ] Add 2 certifications
- [ ] Fields: Name, Issuer, Issue Date, URL
- [ ] Verify all appear in preview

#### Languages ✅
- [ ] Add 2 languages
- [ ] Test proficiency dropdown (Beginner to Native)
- [ ] Save and verify

#### Achievements ✅
- [ ] Add 2 achievements
- [ ] Fields: Title, Date, Description
- [ ] Remove one, verify remaining persists

#### Social Links ✅
- [ ] Add 3 social links (LinkedIn, GitHub, Twitter)
- [ ] Fields: Platform, URL
- [ ] Verify all show in preview

#### Skills with Proficiency ✅
- [ ] Click "Add Skill" (NOT the comma-separated input at top)
- [ ] Fields: Skill Name, Proficiency (Beginner/Intermediate/Advanced/Expert)
- [ ] Add 3 skills
- [ ] Verify dropdown works
- [ ] Save and verify

#### References ✅
- [ ] Add 2 references
- [ ] Fields: Name, Position, Company, Email, Phone
- [ ] Save and verify

#### Volunteer Experience ✅
- [ ] Add 2 volunteer experiences
- [ ] Fields: Organization, Role, Start Date, End Date, Description
- [ ] Save and verify

#### Interests ✅
- [ ] Add 3 interests
- [ ] Single field: Interest
- [ ] Save and verify

**CRITICAL VERIFICATION:**
After testing all buttons:
- [ ] Create a resume with at least 2 items in EVERY section
- [ ] Save
- [ ] Go to preview - all should display
- [ ] Edit again - all items should still be there
- [ ] Remove 1 item from each section
- [ ] Save
- [ ] Preview again - removed items should be gone, remaining items intact
- [ ] Download PDF - all sections should be in PDF

**Status:** All Pass ✅ / Some Fail ❌

---

### 8. RESUME ACTIONS (12 tests)

#### Download PDF
- [ ] Click "Download PDF" from preview or dashboard
- [ ] PDF file should download
- [ ] Open PDF - verify all content present
- [ ] Check template styling is applied
- [ ] Verify file name format: `{name}_resume.pdf`

#### Download DOCX
- [ ] Click "Download DOCX" (if button available)
- [ ] DOCX file should download
- [ ] Open in Word/LibreOffice - content should be formatted

#### Duplicate Resume
- [ ] From dashboard dropdown menu, click "Duplicate"
- [ ] New resume card should appear
- [ ] Title should be "{original title} (Copy)"
- [ ] Edit the copy - should be independent from original
- [ ] Both resumes should exist separately

#### Share Resume
- [ ] Click "Share" from dropdown or preview
- [ ] Should generate a public link
- [ ] Copy the link
- [ ] Open in incognito/private window (logged out)
- [ ] Resume should be viewable
- [ ] Edit/delete buttons should NOT be visible

#### Rename Resume
- [ ] Via API: POST to `/resume/{id}/rename` with body `{ title: "New Name" }`
- [ ] Or if UI button exists, use that
- [ ] Resume title should update
- [ ] Verify in dashboard list

#### Upload Profile Photo
- [ ] Edit a resume
- [ ] Drag an image onto the photo upload zone
- [ ] Should show preview immediately
- [ ] Wait for upload to complete
- [ ] "Remove" button should appear
- [ ] Save resume and preview
- [ ] Photo should appear in resume preview

#### Remove Profile Photo
- [ ] Click "Remove" button on photo
- [ ] Photo should disappear from form
- [ ] Placeholder should reappear
- [ ] Save and verify photo is removed from preview

**Status:** All Pass ✅ / Some Fail ❌

---

### 9. COVER LETTER MODULE (10 tests)

#### Create Cover Letter
- [ ] Click "Cover Letters" in sidebar or "New Cover Letter" button
- [ ] Navigate to `/cover-letter/new`
- [ ] Form should render with fields:
  - Title
  - Select Resume (dropdown)
  - Personal Info (Full Name, Email, Phone, Address)
  - Employer Info (Company Name, Hiring Manager, Address)
  - Job Title
  - Date
  - Content (textarea)
- [ ] Fill all fields
- [ ] Click "Create Cover Letter"
- [ ] Should redirect to preview

#### Link to Resume
- [ ] Create cover letter from resume edit page
- [ ] Click "Create Cover Letter" in the Cover Letter section
- [ ] URL should include `?resumeId={id}`
- [ ] Personal info should auto-populate from resume
- [ ] Verify link is saved

#### AI Generation
- [ ] On cover letter form, find "AI Generate" button
- [ ] Click it
- [ ] Should generate professional cover letter content
- [ ] Content should populate the textarea
- [ ] (Requires OPENAI_API_KEY in .env)

#### Edit Cover Letter
- [ ] From dashboard, find cover letter card
- [ ] Click "Edit"
- [ ] Modify content
- [ ] Save
- [ ] Verify changes persist

#### Preview & Download
- [ ] Click "Preview" on cover letter
- [ ] Should render formatted letter
- [ ] Click "Download PDF"
- [ ] PDF should download with proper formatting

#### Delete & Restore
- [ ] Delete a cover letter (should move to trash)
- [ ] Go to trash
- [ ] Cover letter should be there
- [ ] Restore it
- [ ] Should reappear in dashboard

**Status:** All Pass ✅ / Some Fail ❌

---

### 10. BACKEND API ROUTES (20 tests)

#### Resume Endpoints
Test with Postman or curl:

```bash
# Create Resume (requires authentication)
POST http://localhost:3000/resume
Content-Type: application/x-www-form-urlencoded
Body: title=Test Resume&fullName=John Doe&email=john@example.com

# Get Resume Preview
GET http://localhost:3000/resume/{id}/preview

# Update Resume
PUT http://localhost:3000/resume/{id}
Body: title=Updated Title&fullName=Jane Doe

# Delete Resume (soft delete)
DELETE http://localhost:3000/resume/{id}

# Restore Resume
POST http://localhost:3000/resume/{id}/restore

# Permanent Delete
DELETE http://localhost:3000/resume/{id}/permanent

# Duplicate Resume
POST http://localhost:3000/resume/{id}/duplicate

# Rename Resume
POST http://localhost:3000/resume/{id}/rename
Body: title=New Name

# Upload Photo
POST http://localhost:3000/resume/{id}/upload-photo
Content-Type: multipart/form-data
Body: profilePhoto=[file]

# Remove Photo
POST http://localhost:3000/resume/{id}/remove-photo

# Download PDF
GET http://localhost:3000/resume/{id}/download

# Download DOCX
GET http://localhost:3000/resume/{id}/download-docx

# Share Resume
GET http://localhost:3000/resume/{id}/share

# View Shared (public, no auth)
GET http://localhost:3000/resume/{id}/share/{token}

# ATS Score
GET http://localhost:3000/resume/{id}/score

# Job Match
GET http://localhost:3000/resume/{id}/match
POST http://localhost:3000/resume/{id}/match
Body: jobDescription=...

# AI Generate
POST http://localhost:3000/resume/ai/generate
Body: { type: "summary", jobTitle: "Engineer", ... }

# Section Management
POST http://localhost:3000/resume/{id}/section/workExperience
PUT http://localhost:3000/resume/{id}/section/workExperience/{itemId}
DELETE http://localhost:3000/resume/{id}/section/workExperience/{itemId}
```

#### Cover Letter Endpoints
```bash
# Create
POST http://localhost:3000/cover-letter

# Get by Resume
GET http://localhost:3000/cover-letter/by-resume/{resumeId}

# Preview
GET http://localhost:3000/cover-letter/{id}/preview

# Download
GET http://localhost:3000/cover-letter/{id}/download

# Edit
GET http://localhost:3000/cover-letter/{id}/edit
PUT http://localhost:3000/cover-letter/{id}

# Delete/Restore
DELETE http://localhost:3000/cover-letter/{id}
POST http://localhost:3000/cover-letter/{id}/restore
```

**Status:** All Pass ✅ / Some Fail ❌

---

### 11. ERROR HANDLING (8 tests)

#### Loading States
- [ ] During form submission, button should show "Loading..." or spinner
- [ ] During AI generation, button should be disabled with spinner

#### Success Messages
- [ ] After creating resume: "Resume created successfully!"
- [ ] After updating: "Resume updated successfully!"
- [ ] After deleting: "Resume moved to Trash..."
- [ ] After restoring: "Resume restored successfully!"

#### Error Messages
- [ ] Try creating resume without title (required field)
- [ ] Should show "Resume title is required"
- [ ] Try uploading file > 2MB
- [ ] Should show "File is too large. Maximum size is 2 MB."
- [ ] Try uploading non-image file
- [ ] Should show "Only JPG, PNG, and WebP images are allowed."

#### Toast Notifications
- [ ] Success toasts should be green
- [ ] Error toasts should be red
- [ ] Toasts should auto-dismiss after 5 seconds
- [ ] Multiple toasts should stack properly

**Status:** All Pass ✅ / Some Fail ❌

---

### 12. DATA FLOW VALIDATION (5 tests)

**Complete Flow Test:**

1. **Create:**
   - [ ] Create new resume with full data (all 11 sections populated)
   - [ ] Note the generated ID from URL

2. **Save:**
   - [ ] Verify redirect to `/resume/{id}/preview`
   - [ ] Check MongoDB database directly:
     ```bash
     # Connect to MongoDB
     mongosh
     use resume-builder
     db.resumes.findOne({_id: ObjectId("...")})
     ```
   - [ ] Verify all fields saved correctly
   - [ ] Verify nested arrays (workExperience, education, etc.) have correct structure

3. **Edit:**
   - [ ] Edit the resume
   - [ ] Modify: 1 personal field, add 1 work experience, remove 1 education
   - [ ] Save
   - [ ] Check database again
   - [ ] Verify changes applied

4. **Preview:**
   - [ ] View preview
   - [ ] All modified data should display
   - [ ] No data loss

5. **Download:**
   - [ ] Download PDF
   - [ ] Open PDF
   - [ ] All data from database should be in PDF
   - [ ] Verify template styling

**CRITICAL CHECKS:**
- [ ] No data disappears during edit/save cycle
- [ ] Arrays maintain correct indices
- [ ] Deleted items actually removed from database
- [ ] Profile photo path persists across saves
- [ ] Template selection persists

**Status:** All Pass ✅ / Some Fail ❌

---

### 13. UI/UX POLISH (12 tests)

#### Dashboard
- [ ] Hover over resume card - should lift and show shadow
- [ ] Hover over Quick Action card - should change background
- [ ] Stats cards have gradient icons
- [ ] Sidebar collapse animation smooth
- [ ] Mobile menu slides in from left

#### Forms
- [ ] Progress bar updates as you fill fields
- [ ] Dynamic items have smooth appearance
- [ ] Remove button shows on hover
- [ ] AI generate buttons have loading state
- [ ] Photo drag & drop zone highlights on hover
- [ ] Drag overlay appears when dragging file over zone

#### Theme
- [ ] Click theme switcher (top right)
- [ ] Should toggle between light and dark mode
- [ ] Preference saved in localStorage
- [ ] Persists across page reloads

#### Responsiveness
- [ ] Test on mobile (400px width)
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1920px)
- [ ] All layouts should adapt properly

**Status:** All Pass ✅ / Some Fail ❌

---

### 14. PERFORMANCE (5 tests)

#### Page Load Times
- [ ] Dashboard loads in < 2 seconds
- [ ] Resume form loads in < 2 seconds
- [ ] Preview loads in < 2 seconds

#### Large Data Handling
- [ ] Create resume with 10 work experiences
- [ ] 10 education entries
- [ ] 20 skills
- [ ] Form should remain responsive
- [ ] Save should complete within 3 seconds

#### PDF Generation
- [ ] Generate PDF of large resume (10+ sections)
- [ ] Should complete within 5 seconds
- [ ] PDF should be < 1 MB in size

**Status:** All Pass ✅ / Some Fail ❌

---

### 15. SECURITY (8 tests)

#### Authentication
- [ ] Try accessing `/dashboard` without login
- [ ] Should redirect to `/auth/login`
- [ ] Try accessing `/resume/new` without login
- [ ] Should redirect to login

#### Authorization
- [ ] Create resume as User A
- [ ] Logout
- [ ] Login as User B
- [ ] Try accessing User A's resume by URL
- [ ] Should show "Not authorized" and redirect

#### Session Security
- [ ] Check browser cookies
- [ ] Session cookie should have:
  - httpOnly: true
  - secure: true (in production)
  - SameSite attribute

#### File Upload Security
- [ ] Try uploading .exe file as photo
- [ ] Should reject with error
- [ ] Try uploading 10MB file
- [ ] Should reject with error

#### XSS Protection
- [ ] Try entering `<script>alert('XSS')</script>` in resume title
- [ ] Should be escaped in preview
- [ ] No alert should execute

**Status:** All Pass ✅ / Some Fail ❌

---

## 🏆 FINAL SCORE

**Total Tests:** 180+

**Passed:** _____ / 180+  
**Failed:** _____ / 180+

**Pass Rate:** _____%

---

## 🐛 BUG TRACKING

### Critical Bugs (App Unusable)
```
Issue #1: [Description]
Status: [ ] Open [ ] Fixed
Steps to Reproduce:
1. 
2. 
3. 
Expected: 
Actual: 
```

### Major Bugs (Feature Broken)
```
Issue #2: [Description]
Status: [ ] Open [ ] Fixed
```

### Minor Bugs (Cosmetic/Non-Critical)
```
Issue #3: [Description]
Status: [ ] Open [ ] Fixed
```

---

## 📊 TESTED BY

**Name:** ___________________  
**Date:** ___________________  
**Browser:** Chrome / Firefox / Safari / Edge  
**OS:** Windows / macOS / Linux  
**MongoDB Version:** ___________________  
**Node Version:** ___________________

---

## ✅ SIGN-OFF

- [ ] All critical tests passed
- [ ] All major features working
- [ ] No data loss issues
- [ ] Security checks passed
- [ ] Ready for production

**Tester Signature:** ___________________  
**Date:** ___________________

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] All environment variables set
- [ ] MongoDB backup configured
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Email SMTP configured (for password reset)
- [ ] OpenAI API key set (if using AI features)
- [ ] Error monitoring set up (e.g., Sentry)
- [ ] Rate limiting configured
- [ ] CORS configured if needed
- [ ] Session secret is strong (32+ characters)
- [ ] All dependencies updated
- [ ] Security headers verified (Helmet)
- [ ] File upload limits configured
- [ ] Database indexes created

---

**End of Testing Guide**
