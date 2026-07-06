/**
 * lib/aiService.js
 * Structured AI content generation for resume sections.
 * Uses OpenAI when OPENAI_API_KEY is set; otherwise enhanced local generation.
 */
'use strict';

const SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist.
Write professional, human-like resume content that is:
- ATS-friendly (use industry keywords, action verbs, no tables or special characters)
- Concise and specific — never generic filler like "team player" or "hard worker"
- Grammar-perfect with varied sentence structure
- Tailored to the candidate's job title and experience
- Quantified with realistic metrics where appropriate
Return ONLY the requested content with no preamble, labels, or markdown formatting unless bullet points are requested.`;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.filter(Boolean);
  return String(skills).split(',').map(s => s.trim()).filter(Boolean);
}

function inferDomain(jobTitle) {
  const jt = (jobTitle || '').toLowerCase();
  if (/front|ui|ux|react|vue|angular|web/.test(jt)) return 'frontend';
  if (/back|api|server|node|java|python|\.net/.test(jt)) return 'backend';
  if (/data|analyst|scientist|ml|machine learning|ai/.test(jt)) return 'data';
  if (/devops|sre|cloud|infrastructure|platform/.test(jt)) return 'devops';
  if (/mobile|ios|android|flutter/.test(jt)) return 'mobile';
  if (/design|creative|graphic|brand/.test(jt)) return 'design';
  if (/market|seo|content|social media|growth/.test(jt)) return 'marketing';
  if (/product|pm|program manager/.test(jt)) return 'product';
  if (/security|cyber|infosec/.test(jt)) return 'security';
  if (/full.?stack|software|engineer|developer/.test(jt)) return 'fullstack';
  return 'general';
}

const SKILL_SETS = {
  frontend: {
    technical: ['JavaScript (ES6+)', 'TypeScript', 'React.js', 'Next.js', 'HTML5', 'CSS3', 'Tailwind CSS', 'Redux', 'Webpack', 'REST APIs', 'Git', 'Jest', 'Responsive Design', 'Web Accessibility (WCAG)'],
    soft: ['Cross-functional Collaboration', 'UI/UX Awareness', 'Agile/Scrum', 'Code Review', 'Technical Documentation', 'Problem Solving'],
  },
  backend: {
    technical: ['Node.js', 'Express.js', 'Python', 'PostgreSQL', 'MongoDB', 'Redis', 'REST APIs', 'GraphQL', 'Docker', 'Microservices', 'JWT Authentication', 'AWS', 'Git', 'Unit Testing'],
    soft: ['System Design', 'API Documentation', 'Performance Optimization', 'Cross-team Communication', 'Incident Response', 'Mentoring'],
  },
  fullstack: {
    technical: ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'Express.js', 'MongoDB', 'PostgreSQL', 'REST APIs', 'Docker', 'Git', 'CI/CD', 'AWS', 'Redis', 'GraphQL'],
    soft: ['End-to-End Ownership', 'Agile Development', 'Technical Leadership', 'Stakeholder Communication', 'Code Quality', 'Problem Solving'],
  },
  data: {
    technical: ['Python', 'SQL', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'Tableau', 'Power BI', 'Apache Spark', 'ETL Pipelines', 'Statistical Analysis', 'A/B Testing'],
    soft: ['Data Storytelling', 'Business Acumen', 'Stakeholder Presentation', 'Critical Thinking', 'Research Methodology', 'Cross-functional Collaboration'],
  },
  devops: {
    technical: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Jenkins', 'GitHub Actions', 'Linux', 'Prometheus', 'Grafana', 'Ansible', 'Shell Scripting', 'Nginx'],
    soft: ['Incident Management', 'Automation Mindset', 'Documentation', 'On-call Leadership', 'Security Best Practices', 'Cost Optimization'],
  },
  mobile: {
    technical: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase', 'REST APIs', 'SQLite', 'Push Notifications', 'App Store Deployment', 'Git', 'Redux'],
    soft: ['User-Centric Design', 'Performance Optimization', 'Agile Sprints', 'Cross-platform Development', 'QA Collaboration', 'App Analytics'],
  },
  design: {
    technical: ['Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator', 'Design Systems', 'Prototyping', 'User Research', 'Wireframing', 'CSS', 'Accessibility Standards'],
    soft: ['Visual Communication', 'Creative Direction', 'Client Presentation', 'Design Critique', 'Brand Consistency', 'Iterative Design'],
  },
  marketing: {
    technical: ['Google Analytics', 'SEO/SEM', 'HubSpot', 'Mailchimp', 'Content Strategy', 'Social Media Management', 'A/B Testing', 'CRM Systems', 'Marketing Automation', 'Canva'],
    soft: ['Campaign Management', 'Copywriting', 'Brand Strategy', 'Data-Driven Decision Making', 'Audience Segmentation', 'Cross-channel Marketing'],
  },
  product: {
    technical: ['Jira', 'Confluence', 'Figma', 'SQL', 'Google Analytics', 'Mixpanel', 'Roadmapping', 'User Stories', 'Wireframing', 'A/B Testing', 'API Concepts'],
    soft: ['Product Strategy', 'Stakeholder Management', 'Prioritization', 'User Research', 'Agile/Scrum', 'Go-to-Market Planning'],
  },
  security: {
    technical: ['Penetration Testing', 'OWASP Top 10', 'SIEM', 'Network Security', 'Python', 'Burp Suite', 'Wireshark', 'Vulnerability Assessment', 'ISO 27001', 'Cloud Security'],
    soft: ['Risk Assessment', 'Security Awareness Training', 'Incident Response', 'Compliance Documentation', 'Threat Modeling', 'Cross-team Security Reviews'],
  },
  general: {
    technical: ['Microsoft Office Suite', 'Project Management Tools', 'CRM Software', 'Data Analysis', 'Process Documentation', 'Reporting', 'Database Management'],
    soft: ['Communication', 'Time Management', 'Leadership', 'Problem Solving', 'Adaptability', 'Attention to Detail'],
  },
};

const ACTION_VERBS = ['Architected', 'Engineered', 'Spearheaded', 'Optimized', 'Delivered', 'Implemented', 'Streamlined', 'Automated', 'Led', 'Designed', 'Reduced', 'Increased', 'Built', 'Migrated', 'Established'];

function generateSummary(ctx) {
  const jt = ctx.jobTitle || 'Professional';
  const yr = ctx.years || randInt(2, 8);
  const skills = parseSkills(ctx.skills);
  const topSkills = skills.slice(0, 4).join(', ') || pick(['modern technologies', 'industry best practices', 'cross-functional collaboration']);
  const edu = ctx.education || '';
  const expHint = ctx.experienceSummary ? ` Background includes ${ctx.experienceSummary.slice(0, 120)}.` : '';
  const eduHint = edu ? ` ${edu}.` : '';

  const templates = [
    `${jt} with ${yr}+ years of experience specializing in ${topSkills}. Proven track record of delivering scalable solutions that improve efficiency and drive measurable business outcomes.${expHint}${eduHint} Known for translating complex requirements into clean, maintainable deliverables while collaborating effectively across engineering, product, and leadership teams.`,
    `Results-oriented ${jt} bringing ${yr} years of hands-on expertise in ${topSkills}. Consistently delivers high-impact projects on schedule while maintaining rigorous quality standards.${expHint}${eduHint} Combines deep technical knowledge with strong communication skills to align solutions with strategic business goals.`,
    `Accomplished ${jt} with ${yr}+ years driving innovation through ${topSkills.split(',')[0] || 'technology'} and data-informed decision-making.${expHint}${eduHint} Adept at owning projects end-to-end — from requirements gathering through deployment — with a focus on performance, reliability, and user experience.`,
  ];
  return pick(templates);
}

function generateSkills(ctx) {
  const domain = inferDomain(ctx.jobTitle);
  const set = SKILL_SETS[domain] || SKILL_SETS.general;
  const existing = parseSkills(ctx.skills);
  const technical = [...new Set([...existing, ...set.technical])].slice(0, 14);
  const soft = set.soft.slice(0, 6);
  return [...technical, ...soft].join(', ');
}

function generateExperience(ctx) {
  const jt = ctx.jobTitle || 'Professional';
  const co = ctx.company || 'the organization';
  const skills = parseSkills(ctx.skills);
  const tech = skills[0] || pick(['cloud infrastructure', 'microservices', 'REST APIs', 'React applications']);
  const tech2 = skills[1] || pick(['PostgreSQL', 'MongoDB', 'Docker', 'Kubernetes']);
  const pct = randInt(15, 45);
  const num = randInt(3, 12);
  const k = randInt(1, 9) * 10;

  const bullets = [
    `${pick(ACTION_VERBS)} development of ${tech}-based features at ${co}, improving application performance by ${pct}% and reducing page load times`,
    `Collaborated with cross-functional teams of ${num}+ members to deliver ${randInt(2, 5)} major product releases on schedule, maintaining 99.${randInt(5, 9)}% uptime`,
    `${pick(ACTION_VERBS)} RESTful API endpoints processing ${k}k+ daily requests, implementing caching strategies that cut response latency by ${randInt(20, 60)}%`,
    `Mentored ${randInt(2, 4)} junior ${jt.toLowerCase().includes('engineer') ? 'engineers' : 'team members'} through structured code reviews, increasing team delivery velocity by ${randInt(15, 35)}%`,
    `${pick(ACTION_VERBS)} legacy system migration to ${tech2} architecture, reducing deployment cycles from ${randInt(2, 4)} hours to under ${randInt(5, 15)} minutes`,
    `${pick(ACTION_VERBS)} automated testing framework achieving ${randInt(85, 95)}%+ code coverage, decreasing production defects by ${randInt(30, 55)}% quarter-over-quarter`,
    `${pick(ACTION_VERBS)} CI/CD pipeline integration that eliminated ${randInt(60, 80)}% of manual release steps and improved release confidence`,
    `Partnered with product and design stakeholders to translate business requirements into technical specifications for ${randInt(3, 8)} customer-facing features`,
  ];

  // Shuffle and pick 4 unique bullets
  const shuffled = bullets.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4).join('\n');
}

function generateProjects(ctx) {
  const skills = parseSkills(ctx.skills);
  const stack = skills.slice(0, 3).join(', ') || 'React, Node.js, MongoDB';
  const jt = ctx.jobTitle || 'Developer';
  const name = ctx.projectName || pick(['Analytics Dashboard', 'E-Commerce Platform', 'Task Management System', 'Real-Time Chat Application', 'Inventory Management Portal']);

  const templates = [
    `Built a full-stack ${name.toLowerCase()} using ${stack}, serving ${randInt(500, 5000)}+ active users with sub-${randInt(100, 300)}ms API response times. Implemented role-based authentication, responsive UI, and automated deployment pipeline.`,
    `Designed and deployed a ${name.toLowerCase()} leveraging ${stack} to streamline workflows for ${randInt(10, 50)}+ team members. Reduced manual data entry by ${randInt(40, 70)}% through intelligent form validation and batch processing features.`,
    `Developed a scalable ${name.toLowerCase()} with ${stack}, integrating third-party APIs and real-time WebSocket updates. Achieved ${randInt(90, 99)}% test coverage and maintained zero critical bugs across ${randInt(3, 6)} production releases.`,
    `Created a ${jt}-focused ${name.toLowerCase()} using ${stack} that processed ${randInt(10, 100)}k+ records daily. Optimized database queries and caching to improve query performance by ${randInt(35, 65)}%.`,
  ];
  return pick(templates);
}

function generateAchievements(ctx) {
  const jt = ctx.jobTitle || 'Professional';
  const pct = randInt(20, 60);
  const num = randInt(50, 500);

  const templates = [
    `Reduced operational costs by ${pct}% through process automation initiatives, saving an estimated $${randInt(20, 150)}k annually while maintaining service quality standards`,
    `Led a cross-department initiative that improved customer satisfaction scores from ${randInt(72, 82)}% to ${randInt(88, 96)}% within ${randInt(2, 4)} quarters`,
    `Recognized as top performer among ${randInt(20, 80)}+ ${jt.toLowerCase()}s for delivering ${randInt(3, 8)} critical projects ahead of schedule with zero rollback incidents`,
    `Increased team productivity by ${pct}% by introducing standardized workflows and documentation, cutting onboarding time for new hires from ${randInt(4, 8)} weeks to ${randInt(1, 3)} weeks`,
    `Generated $${randInt(100, 800)}k in revenue impact by launching features that increased user conversion rates by ${randInt(12, 35)}% over ${randInt(2, 4)} months`,
    `Resolved ${num}+ production incidents with an average MTTR under ${randInt(15, 45)} minutes, earning recognition for operational excellence`,
    `Won internal innovation award for designing a solution that eliminated ${randInt(200, 2000)}+ hours of manual work annually across ${randInt(3, 6)} departments`,
  ];
  return pick(templates);
}

function generateCoverLetter(ctx) {
  const name = ctx.fullName || 'Candidate';
  const jt = ctx.jobTitle || 'the open position';
  const company = ctx.company || 'your company';
  const manager = ctx.hiringManager || 'Hiring Manager';
  const skills = parseSkills(ctx.skills).slice(0, 3).join(', ') || 'relevant technical and interpersonal skills';

  return `Dear ${manager},

I am writing to express my strong interest in the ${jt} role at ${company}. With a proven background in delivering high-quality results and a passion for continuous improvement, I am confident my experience aligns well with your team's needs.

In my recent roles, I have applied ${skills} to solve complex challenges and deliver measurable outcomes. I thrive in collaborative environments where clear communication and ownership drive success. Your organization's reputation for innovation and excellence makes this opportunity particularly compelling.

I would welcome the chance to discuss how my skills and experience can contribute to ${company}'s continued growth. Thank you for considering my application.

Sincerely,
${name}`;
}

function improveText(type, inputText, ctx) {
  const text = (inputText || '').trim();
  if (!text || text.length < 5) {
    if (type === 'summary') return generateSummary(ctx);
    if (type === 'experience') return generateExperience(ctx);
    return `Delivered measurable results through strategic execution and cross-functional collaboration, improving operational efficiency by ${randInt(15, 40)}%.`;
  }

  if (type === 'shorten') {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    return (sentences[0] || text).trim() + '.';
  }

  if (type === 'expand') {
    const extra = ` This initiative directly contributed to improved team productivity and stakeholder satisfaction, demonstrating a commitment to excellence and continuous improvement.`;
    return text.endsWith('.') ? text.slice(0, -1) + extra : text + extra;
  }

  // rewrite / improve
  let improved = text
    .replace(/\b(did|made|worked on|was responsible for)\b/gi, m => pick(ACTION_VERBS))
    .replace(/\b(good|great|nice)\b/gi, pick(['exceptional', 'significant', 'measurable', 'substantial']))
    .replace(/\b(helped|assisted)\b/gi, pick(['Collaborated with', 'Partnered with', 'Supported']));

  if (!/\d/.test(improved)) {
    improved = improved.replace(/\.$/, '') + `, achieving a ${randInt(15, 45)}% improvement in key performance metrics.`;
  }

  if (type === 'rewrite' && !improved.startsWith(pick(ACTION_VERBS))) {
    improved = `${pick(ACTION_VERBS)} ${improved.charAt(0).toLowerCase()}${improved.slice(1)}`;
  }

  return improved;
}

function buildUserPrompt(type, ctx) {
  const jt = ctx.jobTitle || 'Professional';
  const skills = parseSkills(ctx.skills).join(', ') || 'Not specified';
  const company = ctx.company || 'Not specified';
  const years = ctx.years || 'Not specified';
  const education = ctx.education || 'Not specified';
  const experience = ctx.experienceSummary || ctx.inputText || 'Not specified';

  const prompts = {
    summary: `Write a professional resume summary (3-4 sentences, max 80 words) for a ${jt}.
Years of experience: ${years}
Key skills: ${skills}
Education: ${education}
Work background: ${experience}
Requirements: ATS-friendly, specific to ${jt}, include 1-2 skills naturally, no clichés, no first person.`,

    skills: `Suggest 12-16 relevant skills for a ${jt} resume.
Include both technical/hard skills and soft skills.
Current skills (avoid duplicates): ${skills}
Format: comma-separated list only, no categories or numbering.`,

    experience: `Write 4 ATS-friendly bullet points for a ${jt} role at ${company}.
Technologies/skills to weave in: ${skills}
Each bullet must: start with a strong action verb, include a quantifiable metric, be 1-2 lines max.
Format: one bullet per line, no bullet symbols.`,

    projects: `Write a professional project description (2-3 sentences) for a ${jt}.
Tech stack: ${skills}
Project name hint: ${ctx.projectName || 'a relevant portfolio project'}
Include: problem solved, technologies used, measurable impact. No bullet symbols.`,

    achievements: `Write one measurable professional achievement (2 sentences) for a ${jt}.
Must include specific numbers/percentages. Avoid generic awards. Tailored to ${jt} role.`,

    coverletter: `Write a professional cover letter body (3 paragraphs, ~200 words) for ${ctx.fullName || 'the candidate'} applying for ${jt} at ${company}.
Hiring manager: ${ctx.hiringManager || 'Hiring Manager'}
Skills to highlight: ${skills}
Tone: confident, professional, human. Do not include date/address/header — body paragraphs only starting with "Dear ...".`,

    rewrite: `Rewrite this resume text to be more professional and ATS-friendly for a ${jt}:
"${ctx.inputText}"
Use strong action verbs, add a metric if missing, keep similar length. Return only the rewritten text.`,

    improve: `Improve this resume text for a ${jt} — make it more impactful and ATS-optimized:
"${ctx.inputText}"
Return only the improved text.`,

    shorten: `Shorten this resume text to one concise sentence while keeping the key impact:
"${ctx.inputText}"`,

    expand: `Expand this resume bullet point with one additional detail about impact or scope:
"${ctx.inputText}"`,
  };

  return prompts[type] || prompts.improve;
}

async function callOpenAI(type, ctx) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const userPrompt = buildUserPrompt(type, ctx);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.75,
        max_tokens: 600,
      }),
    });

    if (!res.ok) {
      console.error('OpenAI API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (err) {
    console.error('OpenAI request failed:', err.message);
    return null;
  }
}

function generateLocal(type, ctx) {
  switch (type) {
    case 'summary':      return generateSummary(ctx);
    case 'skills':       return generateSkills(ctx);
    case 'experience':   return generateExperience(ctx);
    case 'projects':     return generateProjects(ctx);
    case 'achievements': return generateAchievements(ctx);
    case 'coverletter':  return generateCoverLetter(ctx);
    case 'rewrite':
    case 'improve':
    case 'shorten':
    case 'expand':
      return improveText(type, ctx.inputText, ctx);
    default:
      return improveText('improve', ctx.inputText, ctx);
  }
}

/**
 * Generate AI content for a resume/cover letter section.
 * @param {string} type - summary|skills|experience|projects|achievements|rewrite|improve|shorten|expand|coverletter
 * @param {object} ctx - context fields
 * @returns {Promise<string>}
 */
async function generateContent(type, ctx = {}) {
  const normalized = {
    jobTitle: (ctx.jobTitle || '').trim(),
    company: (ctx.company || '').trim(),
    skills: ctx.skills || '',
    years: parseInt(ctx.years, 10) || randInt(2, 7),
    inputText: (ctx.inputText || '').trim(),
    education: (ctx.education || '').trim(),
    experienceSummary: (ctx.experienceSummary || '').trim(),
    projectName: (ctx.projectName || '').trim(),
    fullName: (ctx.fullName || '').trim(),
    hiringManager: (ctx.hiringManager || '').trim(),
  };

  const aiResult = await callOpenAI(type, normalized);
  if (aiResult) return aiResult;

  return generateLocal(type, normalized);
}

module.exports = { generateContent, generateLocal };
