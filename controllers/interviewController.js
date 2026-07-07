/**
 * controllers/interviewController.js
 * Interview Questions Generator Controller
 */
const Resume = require('../models/Resume');
const aiService = require('../lib/aiService');

/* ───────────────────────────────────────────────────────────────────── */
/*  INTERVIEW QUESTIONS GENERATOR                                        */
/* ───────────────────────────────────────────────────────────────────── */

// GET /interview - Show interview questions generator
exports.index = async (req, res) => {
  try {
    // Get user's resumes for dropdown
    const resumes = await Resume.find({ 
      user: req.session.userId, 
      isDeleted: { $ne: true } 
    })
    .select('title personalInfo.fullName')
    .sort({ updatedAt: -1 })
    .lean();

    res.render('interview/index', {
      title: 'Interview Questions Generator – ResumeAI',
      resumes,
    });
  } catch (err) {
    console.error('Interview Index Error:', err);
    req.flash('error', 'Could not load interview questions generator.');
    res.redirect('/dashboard');
  }
};

// POST /interview/generate - Generate interview questions
exports.generate = async (req, res) => {
  try {
    const { resumeId, jobTitle, experienceLevel, questionTypes, customSkills } = req.body;
    
    if (!jobTitle) {
      return res.status(400).json({ 
        success: false, 
        error: 'Job title is required' 
      });
    }

    let resumeContext = '';
    if (resumeId) {
      const resume = await Resume.findOne({
        _id: resumeId,
        user: req.session.userId,
      }).lean();

      if (resume) {
        // Extract key information from resume
        const skills = resume.skills ? resume.skills.map(s => s.name || s).join(', ') : '';
        const experience = resume.experience ? resume.experience.map(e => 
          `${e.position} at ${e.company} (${e.duration})`
        ).join('; ') : '';
        const education = resume.education ? resume.education.map(e => 
          `${e.degree} in ${e.field} from ${e.institution}`
        ).join('; ') : '';

        resumeContext = `
Resume Context:
- Skills: ${skills}
- Experience: ${experience}
- Education: ${education}
        `.trim();
      }
    }

    // Build skills context
    let skillsContext = '';
    if (customSkills && customSkills.trim()) {
      skillsContext = `Additional Skills to focus on: ${customSkills}`;
    }

    // Generate different types of questions based on request
    const questionCategories = [];
    
    if (questionTypes.includes('technical')) {
      questionCategories.push('technical');
    }
    if (questionTypes.includes('behavioral')) {
      questionCategories.push('behavioral');
    }
    if (questionTypes.includes('hr')) {
      questionCategories.push('hr/general');
    }

    const prompt = `
Generate comprehensive interview questions for a ${jobTitle} position.

${resumeContext}
${skillsContext}

Experience Level: ${experienceLevel || 'Mid-level'}
Question Categories: ${questionCategories.join(', ')}

Please generate 5-7 questions for each requested category. For each question, provide:
1. The question itself
2. Key points the interviewer is looking for
3. A sample strong answer approach (not a full answer, but guidance)
4. Common mistakes to avoid

Format the response as JSON with this structure:
{
  "technical": [
    {
      "question": "Question here",
      "lookingFor": ["point 1", "point 2", "point 3"],
      "approachTips": "How to approach this question...",
      "avoidMistakes": ["mistake 1", "mistake 2"]
    }
  ],
  "behavioral": [...],
  "hr": [...]
}

Make questions realistic, relevant to the job title, and appropriate for the experience level.
    `.trim();

    const response = await aiService.generateContent(prompt);
    
    let questions;
    try {
      questions = JSON.parse(response);
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON:', parseErr);
      // Fallback: try to extract questions manually
      questions = extractQuestionsFromText(response, questionCategories);
    }

    res.json({
      success: true,
      questions,
      metadata: {
        jobTitle,
        experienceLevel: experienceLevel || 'Mid-level',
        generatedAt: new Date().toISOString(),
      },
    });

  } catch (err) {
    console.error('Generate Interview Questions Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate interview questions. Please try again.',
    });
  }
};

// Helper function to extract questions from text if JSON parsing fails
function extractQuestionsFromText(text, categories) {
  const questions = {};
  
  categories.forEach(category => {
    questions[category] = [];
    
    // Simple extraction - look for question patterns
    const questionRegex = /\d+\.\s*(.+\?)/g;
    let match;
    let count = 0;
    
    while ((match = questionRegex.exec(text)) && count < 5) {
      questions[category].push({
        question: match[1].trim(),
        lookingFor: ['Relevant experience', 'Problem-solving skills', 'Technical knowledge'],
        approachTips: 'Structure your answer with specific examples and clear outcomes.',
        avoidMistakes: ['Being too vague', 'Not providing concrete examples'],
      });
      count++;
    }
    
    // Fallback questions if extraction fails
    if (questions[category].length === 0) {
      questions[category] = getDefaultQuestions(category);
    }
  });
  
  return questions;
}

// Default questions as fallback
function getDefaultQuestions(category) {
  const defaults = {
    technical: [
      {
        question: 'How do you approach solving a complex technical problem?',
        lookingFor: ['Systematic approach', 'Problem breakdown', 'Testing methodology'],
        approachTips: 'Describe your step-by-step process with a specific example.',
        avoidMistakes: ['Being too theoretical', 'Not mentioning testing or validation'],
      },
      {
        question: 'Tell me about a challenging bug you fixed recently.',
        lookingFor: ['Debugging skills', 'Persistence', 'Learning from issues'],
        approachTips: 'Walk through your debugging process and what you learned.',
        avoidMistakes: ['Blaming others', 'Not explaining the resolution clearly'],
      },
    ],
    behavioral: [
      {
        question: 'Describe a time when you had to work with a difficult team member.',
        lookingFor: ['Communication skills', 'Conflict resolution', 'Team collaboration'],
        approachTips: 'Use the STAR method (Situation, Task, Action, Result).',
        avoidMistakes: ['Speaking negatively about others', 'Not showing what you learned'],
      },
      {
        question: 'Tell me about a time when you failed and how you handled it.',
        lookingFor: ['Self-awareness', 'Learning mindset', 'Resilience'],
        approachTips: 'Choose a real failure and focus on the lessons learned.',
        avoidMistakes: ['Choosing a fake weakness', 'Not showing growth from the experience'],
      },
    ],
    hr: [
      {
        question: 'Why are you interested in this position?',
        lookingFor: ['Company research', 'Role alignment', 'Career goals'],
        approachTips: 'Connect your skills and interests to the specific role and company.',
        avoidMistakes: ['Generic answers', 'Only focusing on what you want to get'],
      },
      {
        question: 'Where do you see yourself in 5 years?',
        lookingFor: ['Career ambition', 'Growth mindset', 'Realistic goals'],
        approachTips: 'Show ambition while demonstrating commitment to growing with the company.',
        avoidMistakes: ['Saying you want their job', 'Being too vague or unrealistic'],
      },
    ],
  };
  
  return defaults[category] || [];
}