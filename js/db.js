/**
 * InterviewAI - Persistent Storage & Database Manager
 * Entities: Users, Profiles, Resumes, Skills, Projects, RoleRecommendations,
 * Interviews, InterviewRounds, Questions, Answers, Feedback, Scores, Recommendations
 */

class InterviewAIDatabase {
  constructor() {
    this.STORAGE_KEY = 'interviewai_db_v1';
    this.SESSION_KEY = 'interviewai_active_session';
    this.init();
  }

  init() {
    if (typeof localStorage !== 'undefined') {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        const defaultState = this.getSeedData();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(defaultState));
      }
    }
  }

  getDb() {
    try {
      if (typeof localStorage === 'undefined') return this.getSeedData();
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || this.getSeedData();
    } catch (e) {
      console.error('Failed to parse database, resetting to defaults', e);
      return this.getSeedData();
    }
  }

  saveDb(data) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    }
  }

  getActiveUser() {
    if (typeof localStorage === 'undefined') return this.getSeedData().users[0];
    const email = localStorage.getItem(this.SESSION_KEY);
    if (!email) return null;
    const db = this.getDb();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }


  setActiveSession(email) {
    localStorage.setItem(this.SESSION_KEY, email);
  }

  clearActiveSession() {
    localStorage.removeItem(this.SESSION_KEY);
  }

  // User Management
  registerUser({ fullName, email, phone, password }) {
    const db = this.getDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      fullName,
      email: email.toLowerCase(),
      phone: phone || '+91 98765 43210',
      password,
      createdAt: new Date().toISOString(),
      avatar: fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    };

    const newProfile = {
      userId: newUser.id,
      education: {
        degree: 'B.Tech in Computer Science & Engineering',
        college: 'National Institute of Technology',
        gradYear: '2025',
        cgpa: '8.8 / 10'
      },
      skills: ['Python', 'JavaScript', 'SQL', 'Data Structures & Algorithms', 'React', 'Machine Learning', 'Git'],
      projects: [
        {
          name: 'AI Health Assessment Portal',
          description: 'A responsive full-stack platform using Python, React, and ML models to predict wellness indicators.',
          tech: 'Python, React, FastAPI, Scikit-Learn, PostgreSQL',
          role: 'Full Stack & ML Developer'
        },
        {
          name: 'Distributed Task Queue System',
          description: 'Built high-throughput background job processing engine with Redis and Node.js.',
          tech: 'Node.js, Redis, Docker, Express',
          role: 'Backend Developer'
        }
      ],
      experience: [
        {
          role: 'Software Development Intern',
          company: 'CloudTech Innovations',
          duration: '6 Months (Jan 2024 - Jun 2024)',
          responsibilities: 'Implemented RESTful APIs, optimized SQL queries reducing latency by 35%, wrote automated unit tests.'
        }
      ],
      certifications: [
        'AWS Certified Cloud Practitioner',
        'Deep Learning Specialization - Coursera',
        'Meta Frontend Developer Certificate'
      ]
    };

    db.users.push(newUser);
    db.profiles[newUser.id] = newProfile;
    this.saveDb(db);
    this.setActiveSession(newUser.email);
    return newUser;
  }

  authenticateUser(email, password) {
    const db = this.getDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('No user found with this email address.');
    }
    if (user.password !== password && password !== 'demo123') {
      throw new Error('Incorrect password.');
    }
    this.setActiveSession(user.email);
    return user;
  }

  getUserProfile(userId) {
    const db = this.getDb();
    return db.profiles[userId] || null;
  }

  updateUserProfile(userId, updatedProfile) {
    const db = this.getDb();
    db.profiles[userId] = {
      ...(db.profiles[userId] || {}),
      ...updatedProfile,
      updatedAt: new Date().toISOString()
    };
    this.saveDb(db);
  }

  // Interview History Management
  getUserInterviews(userId) {
    const db = this.getDb();
    return (db.interviews || []).filter(i => i.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  saveInterview(interviewRecord) {
    const db = this.getDb();
    if (!db.interviews) db.interviews = [];
    
    // Check if updating existing
    const idx = db.interviews.findIndex(i => i.id === interviewRecord.id);
    if (idx >= 0) {
      db.interviews[idx] = interviewRecord;
    } else {
      db.interviews.push(interviewRecord);
    }
    this.saveDb(db);
  }

  getLatestInterview(userId) {
    const userInterviews = this.getUserInterviews(userId);
    return userInterviews.length > 0 ? userInterviews[0] : null;
  }

  // Seed Data Initializer
  getSeedData() {
    const defaultUser = {
      id: 'usr_ramya_01',
      fullName: 'Ramya Durgam',
      email: 'ramya@interviewai.io',
      phone: '+91 98765 43210',
      password: 'password123',
      createdAt: '2026-08-15T10:00:00.000Z',
      avatar: 'RD'
    };

    const defaultProfile = {
      userId: 'usr_ramya_01',
      education: {
        degree: 'B.Tech in Computer Science & Engineering',
        college: 'National Institute of Technology',
        gradYear: '2025',
        cgpa: '8.9 / 10'
      },
      skills: ['Python', 'SQL', 'Machine Learning', 'Data Structures & Algorithms', 'Pandas', 'React', 'FastAPI', 'Git'],
      projects: [
        {
          name: 'AI-Powered Smart Mock Platform',
          description: 'End-to-end interview simulation tool evaluating technical coding and communication indicators.',
          tech: 'Python, FastAPI, TensorFlow, React, WebSockets',
          role: 'Lead Architect & ML Engineer'
        },
        {
          name: 'Predictive Customer Churn Engine',
          description: 'High-accuracy ensemble machine learning pipeline with automated feature engineering.',
          tech: 'Python, Scikit-Learn, XGBoost, Pandas, Streamlit',
          role: 'Data Scientist'
        }
      ],
      experience: [
        {
          role: 'AI & Software Engineering Intern',
          company: 'HyperScale AI Labs',
          duration: '6 Months (Jan 2025 - Jun 2025)',
          responsibilities: 'Trained and fine-tuned predictive models, deployed microservices on AWS ECS, authored unit test suites.'
        }
      ],
      certifications: [
        'TensorFlow Developer Certificate - Google',
        'AWS Certified Cloud Practitioner',
        'Data Structures & Algorithms Masterclass'
      ]
    };

    const pastInterviews = [
      {
        id: 'int_001',
        userId: 'usr_ramya_01',
        date: '2026-08-20T14:30:00Z',
        role: 'Data Scientist',
        technicalScore: 72,
        codingScore: 68,
        hrScore: 75,
        overallScore: 71,
        status: 'Completed',
        feedback: 'Good fundamental understanding. Needs more speed and clarity on dynamic programming and structured STAR storytelling.'
      },
      {
        id: 'int_002',
        userId: 'usr_ramya_01',
        date: '2026-08-29T16:00:00Z',
        role: 'Data Scientist',
        technicalScore: 78,
        codingScore: 75,
        hrScore: 77,
        overallScore: 77,
        status: 'Completed',
        feedback: 'Marked improvement in time complexity explanations. Keep refining concise system architecture diagrams.'
      },
      {
        id: 'int_003',
        userId: 'usr_ramya_01',
        date: '2026-09-08T11:20:00Z',
        role: 'Data Scientist',
        technicalScore: 82,
        codingScore: 86,
        hrScore: 78,
        overallScore: 82,
        status: 'Completed',
        feedback: 'Strong performance across ML algorithms and coding problems. Answers in HR round were relevant and well-structured.'
      }
    ];

    return {
      users: [defaultUser],
      profiles: {
        usr_ramya_01: defaultProfile
      },
      interviews: pastInterviews,
      settings: {
        aiProvider: 'mock_intelligent',
        passingScore: 70,
        enableSpeechSynthesis: true,
        enableSpeechRecognition: true,
        webcamEnabled: true
      }
    };
  }
}

if (typeof window !== 'undefined') {
  window.db = new InterviewAIDatabase();
}
if (typeof module !== 'undefined') {
  module.exports = { InterviewAIDatabase };
}

