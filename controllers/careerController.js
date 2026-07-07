/**
 * controllers/careerController.js
 * Career Roadmap Generator Controller
 */
const Resume = require('../models/Resume');
const aiService = require('../lib/aiService');

/* ───────────────────────────────────────────────────────────────────── */
/*  CAREER ROADMAP GENERATOR                                             */
/* ───────────────────────────────────────────────────────────────────── */

// GET /career-roadmap - Show career roadmap generator
exports.index = async (req, res) => {
  try {
    // Get user's resumes for dropdown
    const resumes = await Resume.find({ 
      user: req.session.userId, 
      isDeleted: { $ne: true } 
    })
    .select('title personalInfo.fullName personalInfo.jobTitle skills')
    .sort({ updatedAt: -1 })
    .lean();

    res.render('career/index', {
      title: 'Career Roadmap Generator – ResumeAI',
      resumes,
    });
  } catch (err) {
    console.error('Career Roadmap Index Error:', err);
    req.flash('error', 'Could not load career roadmap generator.');
    res.redirect('/dashboard');
  }
};

// POST /career-roadmap/generate - Generate career roadmap
exports.generate = async (req, res) => {
  try {
    const { resumeId, targetRole, timeframe, currentLevel, focusAreas, industry } = req.body;
    
    if (!targetRole) {
      return res.status(400).json({ 
        success: false, 
        error: 'Target role is required' 
      });
    }

    let currentContext = '';
    if (resumeId) {
      const resume = await Resume.findOne({
        _id: resumeId,
        user: req.session.userId,
      }).lean();

      if (resume) {
        // Extract current skills and experience
        const currentSkills = resume.skills ? resume.skills.map(s => s.name || s).join(', ') : '';
        const currentRole = resume.personalInfo.jobTitle || '';
        const experience = resume.workExperience ? resume.workExperience.map(e => 
          `${e.jobTitle} at ${e.company} (${e.duration || e.startDate + ' - ' + (e.endDate || 'Present')})`
        ).join('; ') : '';
        const education = resume.education ? resume.education.map(e => 
          `${e.degree} in ${e.fieldOfStudy || e.field} from ${e.institution}`
        ).join('; ') : '';

        currentContext = `
Current Profile:
- Current Role: ${currentRole}
- Skills: ${currentSkills}
- Experience: ${experience}
- Education: ${education}
        `.trim();
      }
    }

    const prompt = `
Create a comprehensive career roadmap to transition from the current profile to ${targetRole}.

${currentContext}

Target Role: ${targetRole}
Industry: ${industry || 'Technology'}
Current Level: ${currentLevel || 'Mid-level'}
Timeframe: ${timeframe || '12 months'}
Focus Areas: ${focusAreas || 'Technical skills, Leadership'}

Generate a detailed roadmap in JSON format:

{
  "overview": {
    "currentRole": "Current position title",
    "targetRole": "${targetRole}",
    "timeframe": "${timeframe}",
    "difficultyLevel": "Easy/Moderate/Challenging",
    "successProbability": "High/Medium/Low"
  },
  "phases": {
    "foundation": {
      "duration": "1-3 months",
      "title": "Build Core Foundation",
      "skills": [
        {
          "skill": "JavaScript Fundamentals",
          "priority": "Critical",
          "timeRequired": "40 hours",
          "resources": ["freeCodeCamp", "MDN Documentation"],
          "projects": ["Build a calculator app"],
          "milestones": ["Complete basic syntax", "Build first project"]
        }
      ],
      "certifications": ["AWS Cloud Practitioner", "Google Analytics"],
      "keyActivities": ["Complete online courses", "Build portfolio projects"]
    },
    "intermediate": {
      "duration": "3-6 months", 
      "title": "Develop Specialized Skills",
      "skills": [...],
      "certifications": [...],
      "keyActivities": [...]
    },
    "advanced": {
      "duration": "6-12 months",
      "title": "Master Advanced Concepts",
      "skills": [...],
      "certifications": [...],
      "keyActivities": [...]
    }
  },
  "skillGaps": [
    {
      "skill": "React.js",
      "currentLevel": "Beginner",
      "requiredLevel": "Advanced",
      "priority": "High",
      "learningPath": "Online courses → Practice projects → Contribute to open source"
    }
  ],
  "recommendedCertifications": [
    {
      "name": "AWS Solutions Architect",
      "issuer": "Amazon",
      "relevance": "Critical for cloud roles",
      "estimatedTime": "3-4 months",
      "cost": "$150",
      "prerequisites": ["AWS Cloud Practitioner"]
    }
  ],
  "portfolioProjects": [
    {
      "project": "E-commerce Web App",
      "skills": ["React", "Node.js", "MongoDB"],
      "timeline": "6-8 weeks",
      "difficulty": "Intermediate",
      "impact": "Demonstrates full-stack capabilities"
    }
  ],
  "networkingStrategy": {
    "platforms": ["LinkedIn", "GitHub", "Twitter"],
    "events": ["Local meetups", "Tech conferences", "Webinars"],
    "communities": ["Stack Overflow", "Reddit", "Discord servers"],
    "mentorship": "Find senior developer mentor"
  },
  "monthlyMilestones": {
    "month1": ["Complete JavaScript course", "Build first project"],
    "month3": ["Master React basics", "Deploy portfolio site"],
    "month6": ["Complete advanced projects", "Earn first certification"],
    "month12": ["Apply for target roles", "Complete technical interviews"]
  },
  "resources": {
    "freeLearning": ["freeCodeCamp", "Codecademy", "YouTube"],
    "paidCourses": ["Udemy", "Pluralsight", "Frontend Masters"],
    "books": ["You Don't Know JS", "Clean Code"],
    "practiceplatforms": ["LeetCode", "HackerRank", "Codewars"]
  },
  "budgetEstimate": {
    "courses": "$200-500",
    "certifications": "$300-800", 
    "books": "$100-200",
    "total": "$600-1500",
    "monthlyAverage": "$50-125"
  }
}

Make the roadmap realistic, actionable, and tailored to the specific role transition.
    `.trim();

    const response = await aiService.generateContent(prompt);
    
    let roadmap;
    try {
      roadmap = JSON.parse(response);
    } catch (parseErr) {
      console.error('Failed to parse AI roadmap as JSON:', parseErr);
      // Create a fallback roadmap
      roadmap = createFallbackRoadmap(targetRole, timeframe, currentLevel);
    }

    res.json({
      success: true,
      roadmap,
      metadata: {
        targetRole,
        timeframe,
        currentLevel,
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error('Generate Career Roadmap Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate career roadmap. Please try again.',
    });
  }
};

// Helper function to create fallback roadmap
function createFallbackRoadmap(targetRole, timeframe, currentLevel) {
  const commonRoles = {
    'software engineer': {
      skills: ['JavaScript', 'React', 'Node.js', 'Databases', 'Git', 'Testing'],
      certifications: ['AWS Cloud Practitioner', 'Google Cloud Digital Leader'],
    },
    'data scientist': {
      skills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Pandas', 'Visualization'],
      certifications: ['Google Data Analytics', 'Microsoft Azure Data Scientist'],
    },
    'product manager': {
      skills: ['Analytics', 'User Research', 'Agile', 'SQL', 'Product Strategy'],
      certifications: ['Google Project Management', 'Scrum Master'],
    },
    'digital marketer': {
      skills: ['SEO', 'Google Analytics', 'Content Marketing', 'Social Media', 'Email Marketing'],
      certifications: ['Google Ads', 'HubSpot Content Marketing'],
    },
  };

  const roleKey = Object.keys(commonRoles).find(key => 
    targetRole.toLowerCase().includes(key)
  );
  
  const roleData = commonRoles[roleKey] || commonRoles['software engineer'];

  return {
    overview: {
      currentRole: 'Current Position',
      targetRole: targetRole,
      timeframe: timeframe || '12 months',
      difficultyLevel: 'Moderate',
      successProbability: 'High',
    },
    phases: {
      foundation: {
        duration: '1-3 months',
        title: 'Build Core Foundation',
        skills: roleData.skills.slice(0, 2).map(skill => ({
          skill,
          priority: 'Critical',
          timeRequired: '40-60 hours',
          resources: ['Online courses', 'Documentation', 'Tutorials'],
          projects: [`Build a ${skill.toLowerCase()} project`],
          milestones: [`Complete ${skill} fundamentals`, 'Build first project'],
        })),
        certifications: roleData.certifications.slice(0, 1),
        keyActivities: ['Complete foundational courses', 'Build practice projects', 'Join relevant communities'],
      },
      intermediate: {
        duration: '3-6 months',
        title: 'Develop Specialized Skills',
        skills: roleData.skills.slice(2, 4).map(skill => ({
          skill,
          priority: 'High',
          timeRequired: '60-80 hours',
          resources: ['Advanced courses', 'Real projects', 'Mentorship'],
          projects: [`Advanced ${skill.toLowerCase()} project`],
          milestones: [`Master ${skill} concepts`, 'Complete intermediate projects'],
        })),
        certifications: roleData.certifications.slice(1, 2),
        keyActivities: ['Build portfolio projects', 'Contribute to open source', 'Network with professionals'],
      },
      advanced: {
        duration: '6-12 months',
        title: 'Master Advanced Concepts',
        skills: roleData.skills.slice(4).map(skill => ({
          skill,
          priority: 'Medium',
          timeRequired: '80-100 hours',
          resources: ['Expert-level courses', 'Industry projects', 'Professional experience'],
          projects: [`Complex ${skill.toLowerCase()} implementation`],
          milestones: [`Advanced ${skill} proficiency`, 'Lead project initiatives'],
        })),
        certifications: roleData.certifications,
        keyActivities: ['Lead complex projects', 'Mentor others', 'Prepare for interviews'],
      },
    },
    skillGaps: roleData.skills.map(skill => ({
      skill,
      currentLevel: 'Beginner',
      requiredLevel: 'Intermediate',
      priority: 'High',
      learningPath: 'Online courses → Practice projects → Real-world application',
    })),
    recommendedCertifications: roleData.certifications.map(cert => ({
      name: cert,
      issuer: cert.includes('Google') ? 'Google' : cert.includes('AWS') ? 'Amazon' : 'Industry Leader',
      relevance: 'Important for role credibility',
      estimatedTime: '2-3 months',
      cost: '$100-300',
      prerequisites: ['Basic knowledge of relevant skills'],
    })),
    portfolioProjects: [
      {
        project: 'Personal Website/Portfolio',
        skills: roleData.skills.slice(0, 3),
        timeline: '4-6 weeks',
        difficulty: 'Beginner',
        impact: 'Showcases basic skills and personal brand',
      },
      {
        project: 'Industry-Specific Application',
        skills: roleData.skills,
        timeline: '8-12 weeks',
        difficulty: 'Intermediate',
        impact: 'Demonstrates role-specific capabilities',
      },
    ],
    networkingStrategy: {
      platforms: ['LinkedIn', 'GitHub', 'Twitter'],
      events: ['Industry meetups', 'Conferences', 'Webinars'],
      communities: ['Professional forums', 'Slack groups', 'Discord servers'],
      mentorship: 'Connect with senior professionals in target role',
    },
    monthlyMilestones: {
      month1: ['Complete first course', 'Build basic project'],
      month3: ['Complete foundation phase', 'Start networking'],
      month6: ['Complete intermediate projects', 'Earn first certification'],
      month12: ['Complete advanced projects', 'Start job applications'],
    },
    resources: {
      freeLearning: ['Coursera', 'edX', 'YouTube', 'Khan Academy'],
      paidCourses: ['Udemy', 'Pluralsight', 'LinkedIn Learning'],
      books: ['Industry-standard books', 'Best practices guides'],
      practiceplatforms: ['LeetCode', 'HackerRank', 'Kaggle'],
    },
    budgetEstimate: {
      courses: '$200-500',
      certifications: '$300-600',
      books: '$100-200',
      tools: '$50-100',
      total: '$650-1400',
      monthlyAverage: '$55-115',
    },
  };
}