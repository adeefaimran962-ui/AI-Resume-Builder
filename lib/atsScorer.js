/**
 * lib/atsScorer.js
 * ============================================================
 * Pure function ATS resume scorer.
 * No external dependencies — works entirely from the resume
 * object that Mongoose returns.
 *
 * Returns an object with:
 *  {
 *    score        : Number  0-100  overall ATS score
 *    grade        : String  A+/A/B/C/D
 *    categories   : Array   [ { name, score, max, icon, tips } ]
 *    strengths    : Array   of strings
 *    improvements : Array   of strings
 *    keywords     : Object  { found, missing }
 *  }
 * ============================================================
 */

// ── Power keywords ATS systems look for ──────────────────────
const ATS_KEYWORDS = [
  'managed','led','developed','implemented','designed','built',
  'created','improved','increased','reduced','delivered','launched',
  'collaborated','analysed','optimised','automated','scaled',
  'architected','mentored','integrated','deployed','maintained',
  'researched','presented','negotiated','achieved','exceeded',
  'streamlined','coordinated','established','generated',
];

// ── Helpers ───────────────────────────────────────────────────
const has  = (v) => v && String(v).trim().length > 0;
const len  = (v) => (v || '').toString().trim().length;
const arr  = (v) => Array.isArray(v) ? v : [];
const pct  = (n, max) => Math.min(Math.round((n / max) * 100), 100);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/**
 * scoreResume(resume)
 * @param {Object} resume  - Mongoose lean document
 * @returns {Object}
 */
function scoreResume(resume) {
  const pi   = resume.personalInfo || {};
  const cats = [];
  const strengths    = [];
  const improvements = [];

  /* ── 1. Contact Information  (max 15) ── */
  let contactScore = 0;
  const contactFields = [
    { key: 'fullName', label: 'Full Name',   pts: 3 },
    { key: 'email',    label: 'Email',       pts: 3 },
    { key: 'phone',    label: 'Phone',       pts: 3 },
    { key: 'jobTitle', label: 'Job Title',   pts: 2 },
    { key: 'city',     label: 'City',        pts: 1 },
    { key: 'country',  label: 'Country',     pts: 1 },
    { key: 'linkedin', label: 'LinkedIn',    pts: 1 },
    { key: 'website',  label: 'Website',     pts: 1 },
  ];
  const missingContact = [];
  contactFields.forEach(f => {
    if (has(pi[f.key])) contactScore += f.pts;
    else missingContact.push(f.label);
  });
  contactScore = clamp(contactScore, 0, 15);
  const contactTips = missingContact.length
    ? [`Add missing fields: ${missingContact.slice(0,3).join(', ')}`]
    : ['Contact section is complete'];
  if (contactScore >= 12) strengths.push('Strong contact information');
  else improvements.push(`Add ${missingContact.slice(0,2).join(', ')} to contact info`);
  cats.push({ name: 'Contact Info',   score: contactScore, max: 15, pct: pct(contactScore,15), icon: 'fas fa-address-card', color: '#6C63FF', tips: contactTips });

  /* ── 2. Professional Summary  (max 15) ── */
  const summaryLen = len(resume.summary);
  let summaryScore = 0;
  let summaryTips  = [];
  if (summaryLen === 0) {
    summaryTips.push('Add a professional summary (50-300 words recommended)');
    improvements.push('Write a professional summary highlighting your value proposition');
  } else if (summaryLen < 100) {
    summaryScore = 5;
    summaryTips.push('Expand your summary to 100-300 characters for better ATS visibility');
    improvements.push('Expand your summary — it is too brief');
  } else if (summaryLen < 300) {
    summaryScore = 10;
    summaryTips.push('Good summary length. Add more keywords for higher score.');
  } else if (summaryLen <= 800) {
    summaryScore = 15;
    strengths.push('Well-written professional summary');
    summaryTips.push('Excellent summary length and detail');
  } else {
    summaryScore = 10;
    summaryTips.push('Summary is a bit long — try to keep it under 800 characters');
    improvements.push('Shorten your summary — ATS may truncate very long summaries');
  }
  cats.push({ name: 'Summary',        score: summaryScore, max: 15, pct: pct(summaryScore,15), icon: 'fas fa-align-left', color: '#A855F7', tips: summaryTips });

  /* ── 3. Work Experience  (max 20) ── */
  const workArr  = arr(resume.workExperience);
  let workScore  = 0;
  let workTips   = [];
  if (workArr.length === 0) {
    workTips.push('Add at least one work experience entry');
    improvements.push('Add work experience — it is the most important resume section');
  } else {
    workScore += Math.min(workArr.length * 4, 12); // up to 12 pts for count
    const withDesc = workArr.filter(w => has(w.description));
    workScore += Math.min(withDesc.length * 2, 6);  // up to 6 pts for descriptions
    if (withDesc.length < workArr.length) {
      workTips.push('Add descriptions to all work experience entries');
      improvements.push('Add bullet-point descriptions to every job entry');
    }
    const withDates = workArr.filter(w => has(w.startDate));
    if (withDates.length < workArr.length) {
      workTips.push('Add start/end dates to all work experience entries');
    }
    if (workArr.length >= 2) strengths.push(`${workArr.length} work experience entries`);
    workTips.push('Use action verbs (led, built, improved) and quantify results');
  }
  workScore = clamp(workScore, 0, 20);
  cats.push({ name: 'Work Experience', score: workScore, max: 20, pct: pct(workScore,20), icon: 'fas fa-briefcase', color: '#10B981', tips: workTips });

  /* ── 4. Education  (max 10) ── */
  const eduArr  = arr(resume.education);
  let eduScore  = 0;
  let eduTips   = [];
  if (eduArr.length === 0) {
    eduTips.push('Add your educational background');
    improvements.push('Add education history');
  } else {
    eduScore += Math.min(eduArr.length * 4, 8);
    const withInst = eduArr.filter(e => has(e.institution) && has(e.degree));
    if (withInst.length === eduArr.length) { eduScore += 2; strengths.push('Education section complete'); }
    else eduTips.push('Fill in institution and degree for all education entries');
  }
  eduScore = clamp(eduScore, 0, 10);
  cats.push({ name: 'Education',       score: eduScore, max: 10, pct: pct(eduScore,10), icon: 'fas fa-graduation-cap', color: '#F59E0B', tips: eduTips });

  /* ── 5. Skills  (max 15) ── */
  const skillArr = arr(resume.skills);
  let skillScore = 0;
  let skillTips  = [];
  if (skillArr.length === 0) {
    skillTips.push('Add relevant technical and soft skills');
    improvements.push('Skills section is empty — add at least 5-10 relevant skills');
  } else if (skillArr.length < 5) {
    skillScore = 5;
    skillTips.push('Add more skills (aim for 10-20 relevant skills)');
    improvements.push('Add more skills to reach 10+');
  } else if (skillArr.length < 10) {
    skillScore = 10;
    skillTips.push('Good skills list. Adding more industry keywords will help.');
  } else {
    skillScore = 15;
    strengths.push(`Strong skills section with ${skillArr.length} skills`);
    skillTips.push('Excellent skills coverage');
  }
  cats.push({ name: 'Skills',          score: skillScore, max: 15, pct: pct(skillScore,15), icon: 'fas fa-tools', color: '#EF4444', tips: skillTips });

  /* ── 6. Projects  (max 10) ── */
  const projArr  = arr(resume.projects);
  let projScore  = 0;
  let projTips   = [];
  if (projArr.length === 0) {
    projTips.push('Add projects to demonstrate practical experience');
  } else {
    projScore += Math.min(projArr.length * 3, 9);
    const withDesc = projArr.filter(p => has(p.description));
    if (withDesc.length === projArr.length) { projScore += 1; strengths.push(`${projArr.length} projects showcased`); }
    else projTips.push('Add descriptions to all project entries');
    const withStack = projArr.filter(p => has(p.techStack));
    if (withStack.length < projArr.length) projTips.push('Add tech stack to all projects for keyword matching');
  }
  projScore = clamp(projScore, 0, 10);
  cats.push({ name: 'Projects',        score: projScore, max: 10, pct: pct(projScore,10), icon: 'fas fa-code', color: '#3B82F6', tips: projTips });

  /* ── 7. Certifications + Languages + Achievements  (max 10) ── */
  const certArr    = arr(resume.certifications);
  const langArr    = arr(resume.languages);
  const achieveArr = arr(resume.achievements);
  let extraScore   = 0;
  let extraTips    = [];
  if (certArr.length > 0)    { extraScore += Math.min(certArr.length * 2, 4);   strengths.push(`${certArr.length} certification(s) listed`); }
  else extraTips.push('Add certifications to boost credibility');
  if (langArr.length > 0)    { extraScore += Math.min(langArr.length * 1, 3);   }
  else extraTips.push('Add languages you speak');
  if (achieveArr.length > 0) { extraScore += Math.min(achieveArr.length * 1, 3); strengths.push(`${achieveArr.length} achievement(s) highlighted`); }
  else extraTips.push('Add key achievements to stand out');
  extraScore = clamp(extraScore, 0, 10);
  cats.push({ name: 'Certs & Extras',  score: extraScore, max: 10, pct: pct(extraScore,10), icon: 'fas fa-certificate', color: '#8B5CF6', tips: extraTips });

  /* ── 8. ATS Keywords  (max 5) ── */
  // Scan summary + work descriptions for action verbs
  const allText = [
    resume.summary || '',
    ...workArr.map(w => w.description || ''),
    ...projArr.map(p => p.description || ''),
  ].join(' ').toLowerCase();

  const foundKw   = ATS_KEYWORDS.filter(kw => allText.includes(kw));
  const missingKw = ATS_KEYWORDS.filter(kw => !allText.includes(kw)).slice(0, 6);
  let kwScore = Math.min(Math.round((foundKw.length / 10) * 5), 5);
  let kwTips  = [];
  if (foundKw.length < 5) {
    kwTips.push(`Use action verbs: ${missingKw.slice(0,4).join(', ')}`);
    improvements.push('Use more action verbs in descriptions (led, built, reduced, improved)');
  } else {
    strengths.push('Good use of ATS action keywords');
    kwTips.push(`${foundKw.length} action verbs found. Keep it up!`);
  }
  cats.push({ name: 'ATS Keywords',   score: kwScore, max: 5, pct: pct(kwScore,5), icon: 'fas fa-key', color: '#EC4899', tips: kwTips });

  /* ── Total score ── */
  const score = cats.reduce((s, c) => s + c.score, 0); // max 100

  /* ── Grade ── */
  let grade;
  if      (score >= 90) grade = 'A+';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B+';
  else if (score >= 60) grade = 'B';
  else if (score >= 50) grade = 'C+';
  else if (score >= 40) grade = 'C';
  else                  grade = 'D';

  /* ── Grade colour ── */
  let gradeColor;
  if      (score >= 80) gradeColor = '#10B981';
  else if (score >= 60) gradeColor = '#F59E0B';
  else if (score >= 40) gradeColor = '#EF4444';
  else                  gradeColor = '#DC2626';

  // Deduplicate
  const uniqStrengths    = [...new Set(strengths)].slice(0, 6);
  const uniqImprovements = [...new Set(improvements)].slice(0, 6);

  return {
    score,
    grade,
    gradeColor,
    categories:   cats,
    strengths:    uniqStrengths,
    improvements: uniqImprovements,
    keywords: {
      found:   foundKw,
      missing: missingKw,
    },
  };
}

module.exports = { scoreResume };
