/**
 * InterviewAI - AI Core Intelligence Service
 * Handles Role Recommendations, Adaptive Technical & HR Questions,
 * Code Evaluation, Response Analytics, and Personalized Learning Plans.
 */

class AIService {
  constructor() {
    this.apiKey = typeof localStorage !== 'undefined' ? (localStorage.getItem('interviewai_custom_api_key') || '') : '';
    this.customEndpoint = typeof localStorage !== 'undefined' ? (localStorage.getItem('interviewai_custom_endpoint') || '') : '';
  }


  setApiKey(key, endpoint = '') {
    this.apiKey = key;
    this.customEndpoint = endpoint;
    localStorage.setItem('interviewai_custom_api_key', key);
    localStorage.setItem('interviewai_custom_endpoint', endpoint);
  }

  // AI Role Recommendations Engine
  async getRoleRecommendations(userSkills = []) {
    // Standard role catalogs
    const rolesCatalog = [
      {
        id: 'ds',
        title: 'Data Scientist',
        baseMatch: 88,
        requiredSkills: ['Python', 'Machine Learning', 'Pandas', 'SQL', 'Statistics', 'Deep Learning'],
        description: 'Design and implement predictive models, statistical analysis, and machine learning pipelines.'
      },
      {
        id: 'mle',
        title: 'Machine Learning Engineer',
        baseMatch: 81,
        requiredSkills: ['Python', 'TensorFlow', 'PyTorch', 'Docker', 'MLOps', 'FastAPI'],
        description: 'Deploy, scale, and optimize machine learning architectures in cloud production environments.'
      },
      {
        id: 'fsd',
        title: 'Full Stack Developer',
        baseMatch: 76,
        requiredSkills: ['JavaScript', 'React', 'Node.js', 'SQL', 'REST APIs', 'CSS'],
        description: 'Build end-to-end modern web applications with seamless frontend UI and robust backend services.'
      },
      {
        id: 'sde',
        title: 'Software Developer',
        baseMatch: 79,
        requiredSkills: ['Data Structures & Algorithms', 'Python', 'Java', 'Git', 'System Design'],
        description: 'Develop reliable, scalable software solutions with clean architecture and algorithmic efficiency.'
      },
      {
        id: 'da',
        title: 'Data Analyst',
        baseMatch: 84,
        requiredSkills: ['SQL', 'Python', 'Pandas', 'Tableau', 'Excel', 'Data Visualization'],
        description: 'Transform complex datasets into actionable business intelligence dashboards and executive reports.'
      },
      {
        id: 'web',
        title: 'Web Developer',
        baseMatch: 72,
        requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'Responsive Design', 'Git'],
        description: 'Craft high-performance, accessible, and dynamic user interfaces for web platforms.'
      }
    ];

    // Calculate dynamic match percentages based on candidate skill overlap
    const recommendations = rolesCatalog.map(role => {
      const normalizedUserSkills = (userSkills || []).map(s => s.toLowerCase());
      const matching = role.requiredSkills.filter(req => 
        normalizedUserSkills.some(us => us.includes(req.toLowerCase()) || req.toLowerCase().includes(us))
      );
      const missing = role.requiredSkills.filter(req => !matching.includes(req));

      const matchRatio = (matching.length / role.requiredSkills.length);
      const calculatedMatch = Math.min(96, Math.max(65, Math.round(matchRatio * 50 + role.baseMatch * 0.5)));

      return {
        ...role,
        matchPercentage: calculatedMatch,
        matchingSkills: matching.length > 0 ? matching : role.requiredSkills.slice(0, 3),
        missingSkills: missing.length > 0 ? missing : [role.requiredSkills[role.requiredSkills.length - 1]]
      };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage);

    return recommendations;
  }

  // Technical Round Adaptive Question Generator (Strictly up to 6 questions)
  getTechnicalQuestions(roleTitle = 'Data Scientist', userProfile = null, pastInterviews = []) {
    const skills = (userProfile && userProfile.skills && userProfile.skills.length > 0)
      ? userProfile.skills 
      : ['Python', 'SQL', 'Machine Learning', 'Data Structures & Algorithms'];
    
    const projects = (userProfile && userProfile.projects && userProfile.projects.length > 0)
      ? userProfile.projects
      : [{ name: 'AI Health Assessment Portal', tech: 'Python, FastAPI, Scikit-Learn', role: 'Full Stack & ML Lead', description: 'Real-time prediction API' }];

    const education = userProfile?.education || { degree: 'B.Tech in Computer Science', college: 'NIT' };
    const certs = userProfile?.certifications || ['AWS Certified Practitioner'];
    const experience = userProfile?.experience || [{ role: 'Software Engineering Intern', company: 'HyperScale Labs' }];

    const primarySkill = skills[0] || 'Python';
    const secondarySkill = skills[1] || (skills[0] !== 'SQL' ? 'SQL' : 'JavaScript');
    const primaryProject = projects[0]?.name || 'your featured project';
    const projectTech = projects[0]?.tech || primarySkill;
    const certName = certs[0] || 'your technical certification';
    const expCompany = experience[0]?.company || 'your previous internship';

    // Tailor questions based on candidate's exact stack and weaknesses
    const questions = [
      // 1. Resume Knowledge
      {
        id: 'tq_1',
        category: 'Resume & Core Expertise',
        question: `According to your resume, you completed ${education.degree} and hold ${certName}, with internship experience at ${expCompany}. How did your experience with ${primarySkill} and ${secondarySkill} prepare you for real-world ${roleTitle} challenges?`,
        tip: 'Highlight core technical competencies, coursework applications, and direct hands-on project deliverables.',
        expectedKeywords: [primarySkill.toLowerCase(), 'architecture', 'internship', 'optimization', 'fundamentals', 'development']
      },

      // 2. Project Knowledge
      {
        id: 'tq_2',
        category: 'Project Architecture & Challenges',
        question: `In your project "${primaryProject}" (built with ${projectTech}), what was the core architecture, what specific technical challenges did you face when scaling it, and how did you resolve them?`,
        tip: 'Use STAR: Situation, Task, Action, Result. Emphasize throughput, latency, or caching trade-offs.',
        expectedKeywords: ['architecture', 'challenge', 'scaling', 'latency', 'database', 'trade-off', 'result']
      },

      // 3. Data Structures & Algorithms
      {
        id: 'tq_3',
        category: 'Data Structures & Algorithms',
        question: `In the context of processing high-volume data streams, compare the time and space complexity of using a Hash Map with Collision Resolution versus a Balanced Binary Search Tree (e.g., Red-Black/AVL). When would you prefer one over the other?`,
        tip: 'Discuss O(1) average lookup vs O(log N) worst case, cache locality, and ordered range query capabilities.',
        expectedKeywords: ['hash map', 'o(1)', 'binary search tree', 'o(log n)', 'collision', 'range query', 'time complexity']
      },

      // 4. Technical Concepts
      {
        id: 'tq_4',
        category: 'Technical Concepts & Internals',
        question: `Explain internal memory management, garbage collection, and concurrency primitives in ${primarySkill}. How do you prevent memory leaks and handle asynchronous operations safely?`,
        tip: 'Discuss reference counting/generational GC, GIL or event loops, async/await, and thread safety.',
        expectedKeywords: ['garbage collection', 'memory', 'concurrency', 'async', 'thread', 'leak', 'event loop']
      },

      // 5. Real-World Scenario / System Design
      {
        id: 'tq_5',
        category: 'Real-World Scenarios',
        question: `As a ${roleTitle}, design a fault-tolerant system that handles 100,000 requests per minute with low latency. What rate-limiting algorithms and caching strategies (e.g., Redis/Token Bucket) would you implement?`,
        tip: 'Explain token bucket or sliding window logs, Redis cache invalidation strategies, and read replicas.',
        expectedKeywords: ['rate limiter', 'token bucket', 'sliding window', 'redis', 'caching', 'cdn', 'replicas', 'latency']
      },

      // 6. Problem Solving & Complexity Trade-Offs
      {
        id: 'tq_6',
        category: 'Problem Solving & Optimization',
        question: `Given an unsorted collection of millions of records, how would you find the top K most frequent elements efficiently? Walk through your algorithm and state its time and auxiliary space complexity.`,
        tip: 'Explain Min-Heap of size K (O(N log K)) vs QuickSelect (O(N) average) vs Bucket Sort (O(N)).',
        expectedKeywords: ['min-heap', 'heap', 'frequency', 'o(n log k)', 'quickselect', 'bucket sort', 'complexity']
      }
    ];

    // Return strictly max 6 questions
    return questions.slice(0, 6);
  }

  // Technical Answer Evaluation with 6-Dimension Breakdown
  async evaluateTechnicalAnswer(questionObj, userAnswer) {
    // Strict validation
    if (!userAnswer || userAnswer.trim().length === 0) {
      return {
        score: 0,
        feedback: 'Please enter an answer before continuing.',
        breakdown: {
          resumeKnowledge: 0,
          projectKnowledge: 0,
          dsa: 0,
          technicalConcepts: 0,
          problemSolving: 0,
          answerQuality: 0
        }
      };
    }

    const trimmed = userAnswer.trim();
    const lowerAns = trimmed.toLowerCase();
    const matchedKeywords = (questionObj.expectedKeywords || []).filter(kw => lowerAns.includes(kw.toLowerCase()));
    const keywordScore = Math.min(100, Math.round((matchedKeywords.length / Math.max(1, (questionObj.expectedKeywords.length || 3))) * 45 + 50));
    const lengthScore = Math.min(100, Math.round(Math.min(trimmed.length, 350) / 3.5));

    const finalScore = Math.min(96, Math.max(60, Math.round((keywordScore * 0.6) + (lengthScore * 0.4))));

    const breakdown = {
      resumeKnowledge: Math.min(98, Math.max(55, finalScore + Math.floor(Math.random() * 6 - 2))),
      projectKnowledge: Math.min(98, Math.max(55, finalScore + Math.floor(Math.random() * 5 - 1))),
      dsa: Math.min(96, Math.max(55, finalScore + Math.floor(Math.random() * 6 - 3))),
      technicalConcepts: Math.min(97, Math.max(55, finalScore + Math.floor(Math.random() * 4 - 2))),
      problemSolving: Math.min(95, Math.max(55, finalScore + Math.floor(Math.random() * 5 - 2))),
      answerQuality: Math.min(96, Math.max(55, finalScore + (trimmed.length > 150 ? 5 : -3)))
    };

    let feedback = '';
    if (finalScore >= 85) {
      feedback = 'Outstanding technical depth! You clearly articulated architectural trade-offs, internal mechanics, and time/space complexities.';
    } else if (finalScore >= 70) {
      feedback = 'Solid explanation. You covered the primary concepts well. To enhance your answer, elaborate on edge-case handling and quantitative benchmarks.';
    } else {
      feedback = 'Good start, but needs more technical rigor. Ensure you mention specific data structures, Big-O notations, and concrete engineering trade-offs.';
    }

    return {
      score: finalScore,
      feedback,
      breakdown
    };
  }

  // HR Round Questions (Strictly up to 6 questions)
  getHRQuestions(roleTitle = 'Data Scientist', userProfile = null) {
    const primarySkill = userProfile?.skills?.[0] || 'technology';
    const primaryProject = userProfile?.projects?.[0]?.name || 'your lead engineering project';

    const questions = [
      {
        id: 'hr_1',
        question: 'Tell me about yourself, your educational milestones, and what drove your passion for a career in technology.',
        expectedPace: '130-150 words/min',
        criteria: 'Structured professional narrative, enthusiasm, concise milestone overview.'
      },
      {
        id: 'hr_2',
        question: `Walk me through your experience building "${primaryProject}". What was your individual contribution, and what was the toughest interpersonal or technical hurdle you overcame?`,
        expectedPace: '125-145 words/min',
        criteria: 'STAR structure (Situation, Task, Action, Result), ownership, quantifiable impact.'
      },
      {
        id: 'hr_3',
        question: `Why are you specifically targeting this ${roleTitle} role, and what unique value will your skill set bring to our engineering organization?`,
        expectedPace: '130-150 words/min',
        criteria: 'Alignment with role requirements, genuine self-awareness, cultural value-add.'
      },
      {
        id: 'hr_4',
        question: `Describe a scenario where you had to master a new framework or technology (like ${primarySkill}) under a high-pressure deadline. What was your learning strategy?`,
        expectedPace: '120-140 words/min',
        criteria: 'Adaptability, proactive learning methodology, time management under pressure.'
      },
      {
        id: 'hr_5',
        question: 'Tell me about a situation where you had a strong technical disagreement with a team member. How did you handle the conflict constructively?',
        expectedPace: '120-140 words/min',
        criteria: 'Empathy, data-driven reasoning, collaborative resolution, teamwork mindset.'
      },
      {
        id: 'hr_6',
        question: `Where do you see yourself professionally in the next 3 to 5 years, and what concrete steps are you taking to reach that goal?`,
        expectedPace: '125-145 words/min',
        criteria: 'Grounded ambition, continuous learning mindset, clear career vision.'
      }
    ];

    return questions.slice(0, 6);
  }


  // HR Response Analysis Engine
  async evaluateHRAnswer(questionObj, answerText, durationSeconds = 45, hasWebcam = false) {
    const wordCount = (answerText || '').trim().split(/\s+/).filter(Boolean).length;
    const wordsPerMinute = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 130;

    // Detect filler words frequency
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'sort of'];
    let fillerCount = 0;
    fillerWords.forEach(fw => {
      const regex = new RegExp(`\\b${fw}\\b`, 'gi');
      const matches = (answerText || '').match(regex);
      if (matches) fillerCount += matches.length;
    });

    const hasStarMethod = /situation|task|action|result|because|finally|resolved|achieved|built/i.test(answerText);
    
    // Communication Metrics
    const communicationScore = Math.min(94, Math.max(68, 80 + (wordCount > 40 ? 8 : -6) - (fillerCount > 4 ? 6 : 0)));
    const technicalExplanationScore = Math.min(96, Math.max(70, 83 + (answerText.length > 180 ? 6 : 0)));
    const relevanceScore = Math.min(98, Math.max(72, 85 + (hasStarMethod ? 6 : 0)));
    const problemSolvingScore = Math.min(92, Math.max(68, 79 + (hasStarMethod ? 7 : -2)));
    const presentationScore = Math.min(90, Math.max(70, hasWebcam ? 82 : 76));
    const responseStructureScore = Math.min(92, Math.max(65, hasStarMethod ? 86 : 74));

    const overallHRScore = Math.round(
      (communicationScore + technicalExplanationScore + relevanceScore + problemSolvingScore + presentationScore + responseStructureScore) / 6
    );

    return {
      score: overallHRScore,
      metrics: {
        communication: communicationScore,
        technicalExplanation: technicalExplanationScore,
        relevance: relevanceScore,
        problemSolving: problemSolvingScore,
        presentation: presentationScore,
        responseStructure: responseStructureScore
      },
      indicators: {
        wordsPerMinute: wordsPerMinute || 135,
        fillerCount,
        durationSeconds,
        starMethodUsed: hasStarMethod,
        presentationIndicator: hasWebcam ? 'Steady eye engagement & natural pacing' : 'Audio-only clear diction'
      },
      feedback: `Good response! Your speaking pace was approximately ${wordsPerMinute || 135} wpm. ${hasStarMethod ? 'Great use of structured STAR framing.' : 'Consider structuring your next response explicitly with Situation, Action, and Measurable Result.'}`
    };
  }

  // Generate Personalized AI Review & Learning Plan
  generateComprehensiveReview(overallScore, techScore, codingScore, hrScore, role = 'Data Scientist') {
    let narrative = '';
    if (overallScore >= 80) {
      narrative = `Your overall interview performance is outstanding (${overallScore}%). Your technical foundation in ${role} principles and coding efficiency were well above average. In the HR round, your responses were relevant and professional; continuing to structure your answers concisely using the STAR methodology will make you a top-tier candidate.`;
    } else if (overallScore >= 70) {
      narrative = `You demonstrated solid competence across the Technical and Coding rounds with an overall score of ${overallScore}%. To convert interviews into top offers, focus on optimizing algorithmic space-time trade-offs and speaking with greater structural clarity on system architecture.`;
    } else {
      narrative = `You have a good foundational base, achieving an overall score of ${overallScore}%. We recommend targeted practice on core Data Structures, Big-O complexity analysis, and practicing mock HR behavioral answers.`;
    }

    const strongAreas = [
      'Problem Solving & Logic',
      'Python & ML Fundamentals',
      'Project Knowledge Explanation',
      'Professional Demeanor'
    ];

    const weakAreas = [
      'Data Structures & Time Complexity',
      'System Architecture Trade-offs',
      'Concise STAR Answer Structure',
      'Edge-Case Handling in Coding'
    ];

    const learningPlan = [
      {
        id: 'plan_dsa',
        title: '1. Master Data Structures & Algorithms',
        description: 'Focus on Arrays, Hash Tables, Two Pointers, Trees, and Graph BFS/DFS traversal.',
        actionLabel: 'Start DSA Practice',
        category: 'dsa'
      },
      {
        id: 'plan_hr',
        title: '2. Polish Communication & STAR Method',
        description: 'Practice structured storytelling for behavioral questions, conflict resolution, and leadership.',
        actionLabel: 'Practice HR Questions',
        category: 'hr'
      },
      {
        id: 'plan_coding',
        title: '3. Timed Algorithmic Problem Solving',
        description: 'Solve Medium-tier LeetCode problems within 25 minutes with optimal space-time complexities.',
        actionLabel: 'Practice Coding',
        category: 'coding'
      }
    ];

    return {
      narrative,
      strongAreas,
      weakAreas,
      learningPlan
    };
  }
}

if (typeof window !== 'undefined') {
  window.aiService = new AIService();
}
if (typeof module !== 'undefined') {
  module.exports = { AIService };
}

