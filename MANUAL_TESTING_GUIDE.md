# Manual Testing Guide - Resume Editor Buttons
## Step-by-Step Testing Instructions

---

## 🎯 Pre-Testing Setup

### 1. Start the Application
```bash
cd "c:\Users\User\Desktop\AI Resume Builder\ai-resume-builder"
npm start
```

### 2. Open Browser with DevTools
- Open Chrome/Edge/Firefox
- Press `F12` to open Developer Tools
- Navigate to: `http://localhost:3000`

### 3. Login/Register
- Create a test account or login
- Navigate to Dashboard

---

## 🧪 Test Procedure for Each Button

### Test 1: Add Work Experience Button

#### Step 1: Navigate to Resume Editor
1. Click "New Resume" or edit an existing resume
2. Scroll to "Work Experience" section
3. Open Browser Console (F12 → Console tab)

#### Step 2: Click "Add Work Experience"
**Expected Console Output**:
```
[addItem] Called: workList workExperience ["jobTitle","company","location","startDate","endDate","description"]
[addItem] Item added successfully to workList
[AJAX Cards] Converting new item to editable card
```

**Expected Visual Result**:
- ✅ New card appears below existing items
- ✅ Card has empty input fields
- ✅ Card shows Save/Cancel buttons
- ✅ Card is in "edit mode" (fields are editable)

#### Step 3: Fill in Fields
Fill in the new form:
- **Job Title**: "Senior Software Engineer"
- **Company**: "Google"
- **Location**: "San Francisco, CA"
- **Start Date**: "Jan 2020"
- **End Date**: "Present"
- **Description**: "Led development of cloud infrastructure"

#### Step 4: Click "Save" Button
**Monitor Network Tab** (F12 → Network):
```
Request URL: http://localhost:3000/resume/{resumeId}/section/workExperience
Request Method: POST
Status Code: 200 OK
```

**Expected Response**:
```json
{
  "success": true,
  "item": {
    "_id": "507f1f77bcf86cd799439011",
    "jobTitle": "Senior Software Engineer",
    "company": "Google",
    "location": "San Francisco, CA",
    "startDate": "Jan 2020",
    "endDate": "Present",
    "description": "Led development of cloud infrastructure"
  }
}
```

**Expected Visual Result**:
- ✅ Card exits edit mode
- ✅ Toast notification: "Item added successfully!"
- ✅ Save/Cancel buttons disappear
- ✅ Edit/Delete/Duplicate buttons appear

#### Step 5: Verify Persistence
1. **Refresh the page** (F5)
2. Navigate back to the resume
3. Check if the work experience item is still there

**Expected Result**: ✅ Item persists after page refresh

---

### Test 2: Add Education Button

#### Click "Add Education"
**Expected Fields**:
- Institution
- Degree
- Field of Study
- Start Date
- End Date
- Description

**Test Data**:
```
Institution: Stanford University
Degree: Bachelor of Science
Field of Study: Computer Science
Start Date: 2016
End Date: 2020
Description: GPA 3.9/4.0
```

**Network Request**:
```
POST /resume/{resumeId}/section/education
```

**Expected Response**: `{success: true, item: {...}}`

---

### Test 3: Add Project Button

#### Click "Add Project"
**Expected Fields**:
- Project Name
- Tech Stack
- Link
- Description

**Test Data**:
```
Project Name: AI Resume Builder
Tech Stack: Node.js, Express, MongoDB, EJS
Link: https://github.com/user/ai-resume-builder
Description: Full-stack SaaS application for resume building
```

**Network Request**:
```
POST /resume/{resumeId}/section/projects
```

---

### Test 4: Add Certification Button

#### Click "Add Certification"
**Expected Fields**:
- Name
- Issuer
- Issue Date
- URL

**Test Data**:
```
Name: AWS Certified Solutions Architect
Issuer: Amazon Web Services
Issue Date: 2023
URL: https://aws.amazon.com/certification/
```

**Network Request**:
```
POST /resume/{resumeId}/section/certifications
```

---

### Test 5: Add Language Button

#### Click "Add Language"
**Expected Fields**:
- Language
- Proficiency (dropdown)

**Test Data**:
```
Language: Spanish
Proficiency: Intermediate
```

**Network Request**:
```
POST /resume/{resumeId}/section/languages
```

---

### Test 6: Add Achievement Button

#### Click "Add Achievement"
**Expected Fields**:
- Title
- Date
- Description

**Test Data**:
```
Title: Employee of the Year
Date: 2023
Description: Awarded for exceptional performance
```

**Network Request**:
```
POST /resume/{resumeId}/section/achievements
```

---

### Test 7: Add Social Link Button

#### Click "Add Social Link"
**Expected Fields**:
- Platform
- URL

**Test Data**:
```
Platform: GitHub
URL: https://github.com/johndoe
```

**Network Request**:
```
POST /resume/{resumeId}/section/socialLinks
```

---

### Test 8: Edit Existing Item

#### Steps:
1. Find any existing work experience card
2. Click the "Edit" button (pencil icon)
3. Modify any field
4. Click "Save"

**Expected Network Request**:
```
PUT /resume/{resumeId}/section/workExperience/{itemId}
```

**Expected Response**: `{success: true, item: {...}}`

---

### Test 9: Delete Item

#### Steps:
1. Click "Delete" button (trash icon) on any item
2. Confirm deletion in dialog
3. Observe item removal

**Expected Network Request**:
```
DELETE /resume/{resumeId}/section/workExperience/{itemId}
```

**Expected Visual Result**:
- ✅ Confirmation dialog appears
- ✅ Card fades out
- ✅ Card is removed from DOM
- ✅ Toast: "Item deleted successfully!"

---

### Test 10: Duplicate Item

#### Steps:
1. Click "Duplicate" button (copy icon) on any item
2. Observe new card creation

**Expected Network Request**:
```
POST /resume/{resumeId}/section/workExperience/{itemId}/duplicate
```

**Expected Visual Result**:
- ✅ New card appears below original
- ✅ New card has same data
- ✅ New card has different _id
- ✅ Toast: "Item duplicated successfully!"

---

### Test 11: Drag and Drop Reorder

#### Steps:
1. Grab the drag handle (⋮⋮ icon) on any card
2. Drag card up or down
3. Drop in new position
4. Release

**Expected Network Request**:
```
POST /resume/{resumeId}/section/workExperience/reorder
Body: {"order": ["id1", "id2", "id3"]}
```

**Expected Visual Result**:
- ✅ Card moves to new position
- ✅ Order is preserved
- ✅ Toast: "Order saved!"

---

## 🔍 Debugging Checklist

### If Button Does Nothing:

#### Check 1: Console Errors
Open Console (F12) and look for:
```
Uncaught ReferenceError: addItem is not defined
Uncaught TypeError: Cannot read property 'appendChild' of null
```

**Solution**: Verify `window.addItem` is defined in form.ejs

#### Check 2: onclick Attribute
Inspect button HTML:
```html
<button onclick="addItem('workList','workExperience',['jobTitle','company',...])" >
```

**Verify**:
- ✅ Function name is correct
- ✅ Parameters are correct
- ✅ List ID exists

#### Check 3: List Container Exists
In Console, type:
```javascript
document.getElementById('workList')
```

**Expected**: Should return the DOM element, not `null`

#### Check 4: Network Request Fails
If form appears but save fails:
1. Check Network tab for 404 or 500 errors
2. Check request payload is correct JSON
3. Check server console for errors

---

## 🚨 Common Issues and Solutions

### Issue 1: "List not found" in Console
**Symptom**: Console shows `[addItem] List not found: workList`  
**Cause**: List container ID doesn't exist  
**Solution**: Verify `<div id="workList">` exists in form.ejs

### Issue 2: Form Appears But Save Returns 400
**Symptom**: Network request returns `400 Bad Request`  
**Cause**: Field naming format incorrect  
**Solution**: Verify fields use `name="workExperience[0][jobTitle]"` format

### Issue 3: Item Disappears After Refresh
**Symptom**: Item saves but doesn't persist  
**Cause**: MongoDB save failed or controller error  
**Solution**: Check server console for database errors

### Issue 4: AJAX Request Returns 404
**Symptom**: `POST /resume/undefined/section/workExperience` returns 404  
**Cause**: Resume ID not extracted correctly  
**Solution**: Verify URL contains `/resume/{id}/edit`

### Issue 5: Card Actions Not Appearing
**Symptom**: Save/Edit buttons don't appear  
**Cause**: AJAX card system not initializing  
**Solution**: Verify `main.js` is loaded and `initAJAXCardSystem()` runs

---

## ✅ Success Criteria

### All buttons PASS if:
1. ✅ Button click creates form instantly
2. ✅ Form has all expected fields
3. ✅ Fields use correct naming format
4. ✅ Save button sends AJAX request
5. ✅ Request returns 200 with `{success: true}`
6. ✅ Card exits edit mode after save
7. ✅ Toast notification appears
8. ✅ Item persists after page refresh
9. ✅ No console errors
10. ✅ No network errors (404/500)

---

## 📊 Test Results Template

Copy and fill out after testing:

```
=== RESUME EDITOR BUTTON TEST RESULTS ===
Date: _______________
Tester: _______________

[ ] Add Work Experience
    [ ] Button creates form
    [ ] Save sends AJAX request
    [ ] Item persists after refresh
    [ ] Edit/Delete/Duplicate work
    Issues: _______________

[ ] Add Education
    [ ] Button creates form
    [ ] Save sends AJAX request
    [ ] Item persists after refresh
    Issues: _______________

[ ] Add Project
    [ ] Button creates form
    [ ] Save sends AJAX request
    [ ] Item persists after refresh
    Issues: _______________

[ ] Add Certification
    [ ] Button creates form
    [ ] Save sends AJAX request
    [ ] Item persists after refresh
    Issues: _______________

[ ] Add Language
    [ ] Button creates form
    [ ] Save sends AJAX request
    [ ] Item persists after refresh
    Issues: _______________

[ ] Add Achievement
    [ ] Button creates form
    [ ] Save sends AJAX request
    [ ] Item persists after refresh
    Issues: _______________

[ ] Add Social Link
    [ ] Button creates form
    [ ] Save sends AJAX request
    [ ] Item persists after refresh
    Issues: _______________

[ ] Edit Existing Item
    [ ] Edit mode activates
    [ ] Changes save via AJAX
    Issues: _______________

[ ] Delete Item
    [ ] Confirmation appears
    [ ] Item removed from database
    Issues: _______________

[ ] Duplicate Item
    [ ] Copy created successfully
    [ ] New item has unique ID
    Issues: _______________

[ ] Drag & Drop Reorder
    [ ] Cards reorder visually
    [ ] Order saved to database
    Issues: _______________

Overall Status: [ ] PASS  [ ] FAIL
Notes: _______________
```

---

## 🎓 Understanding the Fix

### What Was Broken:
The `addItem()` function was creating form fields with **dot notation**:
```javascript
name="workExperience[0].jobTitle"  // ❌ WRONG
```

### What Was Fixed:
Changed to **bracket notation**:
```javascript
name="workExperience[0][jobTitle]"  // ✅ CORRECT
```

### Why It Matters:
Express.js `urlencoded` middleware parses bracket notation correctly:
```
workExperience[0][jobTitle]=Engineer
```

But fails with dot notation because the regex in `parseResumeBody()` expects:
```javascript
/^workExperience\[(\d+)\]\[(.+)\]$/
```

---

## 📞 Need Help?

If tests fail, check:
1. **Server logs** for backend errors
2. **Browser console** for JavaScript errors
3. **Network tab** for failed requests
4. **MongoDB** to verify data structure

**All fixes have been applied to**: `views/resume/form.ejs`

**Test Status**: Ready for manual testing

---

**Testing Guide Created By**: Kiro AI Assistant  
**Date**: July 10, 2026  
**Expected Test Duration**: 15-20 minutes for complete suite
