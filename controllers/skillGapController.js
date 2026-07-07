/**
 * controllers/skillGapController.js
 * Skill Gap Analyzer Controller
 */
const Resume = require('../models/Resume');
const aiService = require('../lib/aiService');

/* ───────────────────────────────────────────────────────────────────── */
/*  SKILL GAP ANALYZER                                                   */
/* ───────────────────────────────────────────────────────────────────── */

// GET /skill-gap - Show skill gap analyzer
exports.index = async (req, res) => {
  try {
    // Get user's resumes for dropdown
    const resumes = await Resume.find({ 
      user: req.session.userId, 
      isDeleted: { $ne: true } 
    })
    .select('title personalInfo.fullName skills')
    .sort({ updatedAt: -1 })
    .lean();

    res.render('skill-gap/index', {
      title: 'Skill Gap Analyzer – ResumeAI',
      resumes,
    });
  } catch (err) {
    console.error('Skill Gap Index Error:', err);
    req.flash('error', 'Could not load skill gap analyzer.');
    res.redirect('/dashboard');
  }
};

// POST /skill-gap/analyze - Analyze skill gaps
exports.analyze = async (req, res) => {
  try {
    const { resumeId, targetJobTitle, jobDescription, targetSkills } = req.body;
    
    if (!targetJobTitle) {
      return res.status(400).json({ 
        success: false, 
        error: 'Target job title is required' 
      });
    }

    // Get current skills from resume
    let currentSkills = [];
    if (resumeId) {
      const resume = await Resume.findOne({
        _id: resumeId,
        user: req.session.userId,
      }).lean();

      if (resume && resume.skills) {
        currentSkills = resume.skills.map(s => {
          if (typeof s === 'string') return { name: s, level: 'intermediate' };
          return { name: s.name || s, level: s.level || 'intermediate' };
        });
      }
    }

    // Build target skills from job description and manual input
    let targetSkillsList = [];
    if (targetSkills && targetSkills.trim()) {
      targetSkillsList = targetSkills.split(',').map(s => s.trim()).filter(Boolean);
    }

    const prompt = `
Analyze the skill gap for transitioning to a ${targetJobTitle} role.

Current Skills:
${currentSkills.map(s => `- ${s.name} (${s.level})`).join('\n')}

Target Job: ${targetJobTitle}
${jobDescription ? `Job Description: ${jobDescription}` : ''}
${targetSkillsList.length > 0 ? `Additional Target Skills: ${targetSkillsList.join(', ')}` : ''}

Please provide a comprehensive skill gap analysis in JSON format:

{
  "analysis": {
    "matchingSkills": [
      {
        "skill": "JavaScript",
        "currentLevel": "intermediate",
        "requiredLevel": "advanced",
        "gap": "minor"
      }
    ],
    "missingSkills": [
      {
        "skill": "React",
        "importance": "critical",
        "category": "frontend",
        "estimatedLearningTime": "2-3 months"
      }
    ],
    "strengthSkills": [
      {
        "skill": "Problem Solving",
        "note": "Strong foundation that transfers well"
      }
    ]
  },
  "recommendations": {
    "immediate": [
      {
        "skill": "React",
        "action": "Complete online course and build projects",
        "resources": ["React Official Tutorial", "freeCodeCamp"],
        "timeline": "1-2 months"
      }
    ],
    "intermediate": [
      {
        "skill": "Node.js",
        "action": "Build backend projects",
        "resources": ["Node.js Guide", "Express.js tutorial"],
        "timeline": "2-3 months"
      }
    ],
    "advanced": [
      {
        "skill": "System Design",
        "action": "Study architecture patterns",
        "resources": ["System Design Primer", "High Scalability"],
        "timeline": "6+ months"
      }
    ]
  },
  "learningPath": {
    "phase1": {
      "duration": "1-3 months",
      "focus": "Core missing skills",
      "skills": ["React", "TypeScript"],
      "projects": ["Build a todo app with React", "Convert to TypeScript"]
    },
    "phase2": {
      "duration": "3-6 months", 
      "focus": "Advanced concepts",
      "skills": ["State Management", "Testing"],
      "projects": ["Build full-stack app", "Add comprehensive tests"]
    },
    "phase3": {
      "duration": "6+ months",
      "focus": "Specialization",
      "skills": ["Performance Optimization", "System Design"],
      "projects": ["Optimize app performance", "Design system architecture"]
    }
  },
  "marketability": {
    "currentScore": 65,
    "targetScore": 85,
    "keyImprovements": ["Add React experience", "Build portfolio projects"],
    "timeToMarketReady": "3-6 months"
  }
}

Make the analysis realistic and actionable based on the current skill set and target role.
    `.trim();

    const response = await aiService.generateContent(prompt);
    
    let analysis;
    try {
      analysis = JSON.parse(response);
    } catch (parseErr) {
      console.error('Failed to parse AI analysis as JSON:', parseErr);
      // Create a fallback analysis
      analysis = createFallbackAnalysis(currentSkills, targetJobTitle, targetSkillsList);
    }

    res.json({
      success: true,
      analysis,
      metadata: {
        targetJobTitle,
        currentSkillsCount: currentSkills.length,
        analyzedAt: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error('Skill Gap Analysis Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze skill gap. Please try again.',
    });
  }
};

// Helper function to create fallback analysis
function createFallbackAnalysis(currentSkills, targetJob, targetSkillsList) {
  const commonTechSkills = {
    'software engineer': ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git'],
    'data scientist': ['Python', 'R', 'Machine Learning', 'SQL', 'Statistics', 'Pandas'],
    'product manager': ['Analytics', 'SQL', 'Agile', 'User Research', 'Roadmapping'],
    'designer': ['Figma', 'Sketch', 'User Research', 'Prototyping', 'CSS'],
    'marketing': ['Analytics', 'SEO', 'Content Marketing', 'Social Media', 'Email Marketing'],
  };

  const jobKey = Object.keys(commonTechSkills).find(key => 
    targetJob.toLowerCase().includes(key)
  );
  
  const requiredSkills = jobKey ? commonTechSkills[jobKey] : targetSkillsList;
  const currentSkillNames = currentSkills.map(s => s.name.toLowerCase());
  
  const missingSkills = requiredSkills
    .filter(skill => !currentSkillNames.some(cs => cs.includes(skill.toLowerCase())))
    .map(skill => ({
      skill,
      importance: 'important',
      category: 'technical',
      estimatedLearningTime: '2-3 months',
    }));

  const matchingSkills = requiredSkills
    .filter(skill => currentSkillNames.some(cs => cs.includes(skill.toLowerCase())))
    .map(skill => ({
      skill,
      currentLevel: 'intermediate',
      requiredLevel: 'advanced',
      gap: 'minor',
    }));

  return {
    analysis: {
      matchingSkills,
      missingSkills,
      strengthSkills: currentSkills.slice(0, 3).map(s => ({
        skill: s.name,
        note: 'Existing strength to build upon',
      })),
    },
    recommendations: {
      immediate: missingSkills.slice(0, 2).map(s => ({
        skill: s.skill,
        action: `Learn ${s.skill} through online courses and practice projects`,
        resources: ['Online courses', 'Documentation', 'Practice projects'],
        timeline: '1-2 months',
      })),
      intermediate: missingSkills.slice(2, 4).map(s => ({
        skill: s.skill,
        action: `Deepen ${s.skill} knowledge with advanced concepts`,
        resources: ['Advanced tutorials', 'Real projects', 'Mentorship'],
        timeline: '2-4 months',
      })),
      advanced: [{
        skill: 'Industry Best Practices',
        action: 'Gain experience with industry standards and practices',
        resources: ['Industry blogs', 'Open source contributions', 'Networking'],
        timeline: '6+ months',
      }],
    },
    learningPath: {
      phase1: {
        duration: '1-3 months',
        focus: 'Foundation skills',
        skills: missingSkills.slice(0, 2).map(s => s.skill),
        projects: ['Build basic projects', 'Complete tutorials'],
      },
      phase2: {
        duration: '3-6 months',
        focus: 'Applied skills',
        skills: missingSkills.slice(2, 4).map(s => s.skill),
        projects: ['Build portfolio projects', 'Contribute to open source'],
      },
      phase3: {
        duration: '6+ months',
        focus: 'Advanced expertise',
        skills: ['System Design', 'Leadership', 'Architecture'],
        projects: ['Complex projects', 'Lead initiatives'],
      },
    },
    marketability: {
      currentScore: Math.max(30, 60 - (missingSkills.length * 5)),
      targetScore: 85,
      keyImprovements: missingSkills.slice(0, 3).map(s => `Learn ${s.skill}`),
      timeToMarketReady: '3-6 months',
    },
  };
}