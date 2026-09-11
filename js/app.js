/**
 * InterviewAI - Main Application Controller
 * Handles Navigation, Persistent Top Round Bar, 15-Min Continuous Timer,
 * Strict Question Validation, Question Palette (1-6), Code Runner, HR WebRTC, and Analytics.
 */

class InterviewApp {
  constructor() {
    this.currentUser = null;
    this.currentProfile = null;
    this.selectedRole = 'Data Scientist';
    this.currentScreen = 'screen-auth';
    
    // Interview Flow State
    this.interviewState = {
      id: 'int_' + Date.now(),
      date: new Date().toISOString(),
      role: 'Data Scientist',
      technical: {
        score: 0,
        currentQuestionIdx: 0,
        questions: [],
        answers: {}, // map of qIdx -> { answer, evaluation, timestamp }
        status: 'Not Started', // Not Started, In Progress, Passed, Failed
        timeRemainingSeconds: 900, // 15 minutes = 900 seconds
        timerStarted: false,
        timerWarnings: { w10: false, w5: false, w1: false },
        breakdown: {
          resumeKnowledge: 85,
          projectKnowledge: 84,
          dsa: 78,
          technicalConcepts: 82,
          problemSolving: 80,
          answerQuality: 82
        }
      },
      coding: {
        score: 0,
        currentProblemIdx: 0,
        currentProblem: null,
        language: 'javascript',
        codeSolutions: {},
        status: 'Not Started' // Not Started, In Progress, Passed, Failed
      },
      hr: {
        score: 0,
        currentQuestionIdx: 0,
        questions: [],
        answers: {},
        status: 'Not Started', // Not Started, In Progress, Completed
        hasWebcam: false,
        timeSeconds: 0
      },
      overallScore: 82
    };

    this.charts = {
      radar: null,
      bar: null,
      history: null
    };

    this.mediaStream = null;
    this.isRecording = false;
    this.techTimerInterval = null;
    this.hrTimerInterval = null;

    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  init() {
    this.bindEvents();
    this.checkSession();
  }

  async checkSession() {
    // Wait for supabase to init, then check for active session
    const svc = window.supabaseService;
    await (svc ? svc.init() : Promise.resolve());
    const user = svc ? await svc.getActiveUser() : window.db.getActiveUser();
    if (user) {
      await this.loginUser(user);
    } else {
      this.navigateToScreen('screen-auth');
    }
  }

  async loginUser(user) {
    this.currentUser = user;
    const svc = window.supabaseService;
    this.currentProfile = svc && svc.isAvailable
      ? await svc.getUserProfile(user.id)
      : window.db.getUserProfile(user.id);
    this.updateUserUI();
    this.navigateToScreen('screen-dashboard');
    this.showToast(`Welcome back, ${user.fullName.split(' ')[0]}! 👋`, 'success');
  }

  updateUserUI() {
    if (!this.currentUser) return;
    const firstName = this.currentUser.fullName.split(' ')[0];
    
    document.querySelectorAll('.user-name-display').forEach(el => {
      el.textContent = this.currentUser.fullName;
    });
    document.querySelectorAll('.user-firstname-display').forEach(el => {
      el.textContent = firstName;
    });
    document.querySelectorAll('.user-avatar-text').forEach(el => {
      el.textContent = this.currentUser.avatar || 'RD';
    });
    document.querySelectorAll('.user-role-display').forEach(el => {
      el.textContent = this.selectedRole;
    });

    this.renderDashboardData();
    this.renderPersistentRoundNav();
  }

  // =========================================================================
  // 1. Persistent Top Interview Round Navigation Bar
  // =========================================================================
  renderPersistentRoundNav() {
    const navContainers = document.querySelectorAll('.persistent-interview-nav-container');
    if (!navContainers || navContainers.length === 0) return;

    const techStatus = this.interviewState.technical.status;
    const codingStatus = this.interviewState.coding.status;
    const hrStatus = this.interviewState.hr.status;

    // Determine states: current, completed, locked, failed
    let techClass = 'state-locked';
    let techIcon = '🔒';
    let techText = '01 Technical';

    if (this.currentScreen === 'screen-technical') {
      techClass = 'state-current';
      techIcon = '🔵';
    } else if (techStatus === 'Passed') {
      techClass = 'state-completed';
      techIcon = '✅';
      techText = '01 Technical (Passed)';
    } else if (techStatus === 'Failed') {
      techClass = 'state-failed';
      techIcon = '❌';
      techText = '01 Technical (Failed)';
    } else {
      techClass = 'state-current';
      techIcon = '🔵';
    }

    let codingClass = 'state-locked';
    let codingIcon = '🔒';
    let codingText = '02 Coding';

    if (techStatus !== 'Passed') {
      codingClass = 'state-locked';
      codingIcon = '🔒';
      codingText = '02 Coding (Locked)';
    } else if (this.currentScreen === 'screen-coding') {
      codingClass = 'state-current';
      codingIcon = '🔵';
    } else if (codingStatus === 'Passed') {
      codingClass = 'state-completed';
      codingIcon = '✅';
      codingText = '02 Coding (Passed)';
    } else if (codingStatus === 'Failed') {
      codingClass = 'state-failed';
      codingIcon = '❌';
      codingText = '02 Coding (Failed)';
    } else {
      codingClass = 'state-completed';
      codingIcon = '🔓';
      codingText = '02 Coding (Ready)';
    }

    let hrClass = 'state-locked';
    let hrIcon = '🔒';
    let hrText = '03 HR Behavioral';

    if (techStatus !== 'Passed' || codingStatus !== 'Passed') {
      hrClass = 'state-locked';
      hrIcon = '🔒';
      hrText = '03 HR (Locked)';
    } else if (this.currentScreen === 'screen-hr') {
      hrClass = 'state-current';
      hrIcon = '🔵';
    } else if (hrStatus === 'Completed') {
      hrClass = 'state-completed';
      hrIcon = '✅';
      hrText = '03 HR (Completed)';
    } else {
      hrClass = 'state-completed';
      hrIcon = '🔓';
      hrText = '03 HR (Ready)';
    }

    const html = `
      <div class="persistent-interview-nav">
        <div class="pin-track">
          <div class="pin-node ${techClass}" data-round="technical" onclick="window.app.handleRoundNavClick('technical')">
            <span>${techIcon}</span>
            <span>${techText}</span>
          </div>

          <span class="pin-arrow">→</span>

          <div class="pin-node ${codingClass}" data-round="coding" onclick="window.app.handleRoundNavClick('coding')">
            <span>${codingIcon}</span>
            <span>${codingText}</span>
          </div>

          <span class="pin-arrow">→</span>

          <div class="pin-node ${hrClass}" data-round="hr" onclick="window.app.handleRoundNavClick('hr')">
            <span>${hrIcon}</span>
            <span>${hrText}</span>
          </div>
        </div>

        <div class="pin-meta">
          ${this.currentScreen === 'screen-technical' ? `
            <div class="timer-pill ${this.getTimerWarningClass()}" id="global-tech-timer">
              <span>⏱</span>
              <span id="tech-timer-display">${this.formatTime(this.interviewState.technical.timeRemainingSeconds)}</span>
            </div>
          ` : ''}
          <span class="badge badge-blue">Role: ${this.selectedRole}</span>
        </div>
      </div>
    `;

    navContainers.forEach(container => {
      container.innerHTML = html;
    });
  }

  handleRoundNavClick(targetRound) {
    const techStatus = this.interviewState.technical.status;
    const codingStatus = this.interviewState.coding.status;

    if (targetRound === 'technical') {
      this.navigateToScreen('screen-technical');
    } else if (targetRound === 'coding') {
      if (techStatus !== 'Passed') {
        this.showLockedModal(
          'Coding Round Locked 🔒',
          'Complete and pass the Technical Round first (Threshold: 70%) to unlock the Coding Round.'
        );
      } else {
        this.navigateToScreen('screen-coding');
      }
    } else if (targetRound === 'hr') {
      if (techStatus !== 'Passed' || codingStatus !== 'Passed') {
        this.showLockedModal(
          'HR Round Locked 🔒',
          'Complete and pass both Technical and Coding rounds to unlock the HR Round.'
        );
      } else {
        this.navigateToScreen('screen-hr');
      }
    }
  }

  showLockedModal(title, message) {
    const modal = document.getElementById('modal-locked-round');
    if (modal) {
      document.getElementById('locked-modal-title').textContent = title;
      document.getElementById('locked-modal-desc').textContent = message;
      modal.classList.add('active');
    } else {
      this.showToast(message, 'error');
    }
  }

  // Navigation Controller
  navigateToScreen(screenId) {
    document.querySelectorAll('.screen-view').forEach(view => {
      view.classList.remove('active-screen');
    });

    const targetView = document.getElementById(screenId);
    if (targetView) {
      targetView.classList.add('active-screen');
      this.currentScreen = screenId;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screenId) {
          item.classList.add('active');
        }
      });

      const breadcrumbEl = document.getElementById('breadcrumb-current');
      if (breadcrumbEl) {
        breadcrumbEl.textContent = this.getScreenTitle(screenId);
      }

      this.handleScreenActivation(screenId);
      this.renderPersistentRoundNav();
    }
  }

  getScreenTitle(screenId) {
    switch(screenId) {
      case 'screen-auth': return 'Authentication';
      case 'screen-dashboard': return 'Dashboard';
      case 'screen-env': return 'Interview Environment';
      case 'screen-technical': return 'Technical Round (15 Min)';
      case 'screen-coding': return 'Coding Round';
      case 'screen-hr': return 'HR Behavioral Round';
      case 'screen-results': return 'Results & Analysis';
      default: return 'InterviewAI';
    }
  }

  handleScreenActivation(screenId) {
    window.speechEngine.stopSpeaking();
    window.speechEngine.stopListening();

    if (screenId === 'screen-dashboard') {
      this.renderDashboardData();
    } else if (screenId === 'screen-env') {
      this.renderEnvironmentScreen();
    } else if (screenId === 'screen-technical') {
      this.initTechnicalRoundView();
    } else if (screenId === 'screen-coding') {
      this.initCodingRoundView();
    } else if (screenId === 'screen-hr') {
      this.initHRRoundView();
    } else if (screenId === 'screen-results') {
      this.renderResultsDashboard();
    }
  }

  renderDashboardData() {
    if (!this.currentUser) return;

    const pastInterviews = window.db.getUserInterviews(this.currentUser.id);
    const avgScoreEl = document.getElementById('dash-avg-score');
    const bestScoreEl = document.getElementById('dash-best-score');
    const lastDateEl = document.getElementById('dash-last-date');
    const totalCountEl = document.getElementById('dash-total-count');

    if (pastInterviews.length > 0) {
      const avg = Math.round(pastInterviews.reduce((sum, i) => sum + (i.overallScore || 0), 0) / pastInterviews.length);
      const best = Math.max(...pastInterviews.map(i => i.overallScore || 0));
      const latest = new Date(pastInterviews[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      if (avgScoreEl) avgScoreEl.textContent = avg + '%';
      if (bestScoreEl) bestScoreEl.textContent = best + '%';
      if (lastDateEl) lastDateEl.textContent = latest;
      if (totalCountEl) totalCountEl.textContent = pastInterviews.length;
    }

    this.updateInterviewStatusWidgets();
  }

  updateInterviewStatusWidgets() {
    const techStatus = this.interviewState.technical.status;
    const codingStatus = this.interviewState.coding.status;
    const hrStatus = this.interviewState.hr.status;

    const setPill = (elemId, status) => {
      const el = document.getElementById(elemId);
      if (!el) return;
      el.textContent = status;
      el.className = 'step-pill ' + (status === 'Passed' || status === 'Completed' ? 'badge-emerald' : (status === 'In Progress' ? 'badge-blue' : 'badge-amber'));
    };

    setPill('dash-tech-status', techStatus);
    setPill('dash-coding-status', codingStatus);
    setPill('dash-hr-status', hrStatus);

    setPill('sidebar-tech-pill', techStatus);
    setPill('sidebar-coding-pill', codingStatus);
    setPill('sidebar-hr-pill', hrStatus);
  }

  // =========================================================================
  // Screen 3: Environment Setup (Resume & AI Role Recommendations)
  // =========================================================================
  async renderEnvironmentScreen() {
    const roleGrid = document.getElementById('recommended-roles-grid');
    if (!roleGrid) return;

    const skills = this.currentProfile?.skills || ['Python', 'SQL', 'Machine Learning'];
    const roles = await window.aiService.getRoleRecommendations(skills);

    roleGrid.innerHTML = roles.map(role => `
      <div class="role-card ${role.title === this.selectedRole ? 'selected-role' : ''}" data-role="${role.title}">
        <div>
          <div class="rc-top">
            <h4>${role.title}</h4>
            <span class="rc-match-badge ${role.matchPercentage >= 80 ? 'match-high' : 'match-med'}">
              ${role.matchPercentage}% Match
            </span>
          </div>
          <p style="font-size:0.83rem; color:var(--text-secondary); margin-bottom:12px;">${role.description}</p>
          
          <div class="rc-skills-section">
            <span style="font-size:0.75rem; font-weight:700; color:var(--emerald-primary);">✓ Matching Skills:</span>
            <div class="rc-skill-list">
              ${role.matchingSkills.map(s => `<span class="badge badge-emerald">✓ ${s}</span>`).join('')}
            </div>
          </div>

          <div class="rc-skills-section">
            <span style="font-size:0.75rem; font-weight:700; color:var(--amber-primary);">⚠ Skills to Improve:</span>
            <div class="rc-skill-list">
              ${role.missingSkills.map(s => `<span class="badge badge-amber">⚠ ${s}</span>`).join('')}
            </div>
          </div>
        </div>

        <button class="btn ${role.title === this.selectedRole ? 'btn-primary' : 'btn-secondary'} btn-sm btn-choose-role" style="width:100%; margin-top:16px;" data-role="${role.title}">
          ${role.title === this.selectedRole ? '✓ Selected Role' : 'Choose This Role'}
        </button>
      </div>
    `).join('');

    roleGrid.querySelectorAll('.btn-choose-role').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const role = e.currentTarget.dataset.role;
        this.selectRole(role);
      });
    });
  }

  selectRole(roleTitle) {
    this.selectedRole = roleTitle;
    this.interviewState.role = roleTitle;
    this.updateUserUI();
    this.renderEnvironmentScreen();
    this.showToast(`Selected role: ${roleTitle}`, 'info');
  }


  // =========================================================================
  // Option B: Resume Builder Step Switcher (Hover & Click) & Submission
  // =========================================================================
  switchResumeBuilderStep(stepNum) {
    const targetStep = parseInt(stepNum, 10) || 1;

    // Update Nav Buttons
    document.querySelectorAll('.rb-step-btn').forEach(btn => {
      const btnStep = parseInt(btn.getAttribute('data-step') || btn.textContent.trim().charAt(0), 10);
      if (btnStep === targetStep) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Step Contents
    document.querySelectorAll('.rb-step-content').forEach(content => {
      const contentId = content.id;
      if (contentId === `rb-step-${targetStep}`) {
        content.style.display = 'block';
        content.classList.add('active');
      } else {
        content.style.display = 'none';
        content.classList.remove('active');
      }
    });
  }

  getResumeBuilderData() {
    const fullName = document.getElementById('rb-fullname')?.value || this.currentUser?.fullName || 'Ramya Durgam';
    const email = document.getElementById('rb-email')?.value || this.currentUser?.email || 'ramya@interviewai.io';
    const phone = document.getElementById('rb-phone')?.value || '+91 98765 43210';
    const location = document.getElementById('rb-location')?.value || 'Hyderabad, India';

    const degree = document.getElementById('rb-degree')?.value || 'B.Tech in Computer Science';
    const college = document.getElementById('rb-college')?.value || 'National Institute of Technology';
    const gradYear = document.getElementById('rb-gradyear')?.value || '2025';
    const cgpa = document.getElementById('rb-cgpa')?.value || '8.9 / 10';

    const langSkills = (document.getElementById('rb-skills-lang')?.value || 'Python, SQL, JavaScript, C++').split(',').map(s => s.trim()).filter(Boolean);
    const fwSkills = (document.getElementById('rb-skills-fw')?.value || 'React, FastAPI, Scikit-Learn').split(',').map(s => s.trim()).filter(Boolean);
    const toolSkills = (document.getElementById('rb-skills-tools')?.value || 'Git, Docker, PostgreSQL').split(',').map(s => s.trim()).filter(Boolean);
    const combinedSkills = Array.from(new Set([...langSkills, ...fwSkills, ...toolSkills]));

    const projName = document.getElementById('rb-proj-name')?.value || 'AI Smart Mock Interview Platform';
    const projTech = document.getElementById('rb-proj-tech')?.value || 'Python, FastAPI, React';
    const projDesc = document.getElementById('rb-proj-desc')?.value || 'Lead full-stack & ML developer. Built automated assessment scoring & role matching.';

    const expCompany = document.getElementById('rb-exp-company')?.value || 'HyperScale AI Labs';
    const expRole = document.getElementById('rb-exp-role')?.value || 'Software Intern';
    const expResp = document.getElementById('rb-exp-resp')?.value || 'Optimized ML query latency, deployed microservices on AWS, authored unit tests.';

    const certsText = document.getElementById('rb-certs')?.value || 'AWS Certified Cloud Practitioner, TensorFlow Developer Certificate';
    const certsList = certsText.split(',').map(c => c.trim()).filter(Boolean);

    return {
      fullName,
      email,
      phone,
      location,
      education: { degree, college, gradYear, cgpa },
      skills: combinedSkills.length > 0 ? combinedSkills : ['Python', 'SQL', 'Machine Learning', 'React'],
      projects: [
        {
          name: projName,
          tech: projTech,
          description: projDesc,
          role: 'Lead Developer'
        }
      ],
      experience: [
        {
          company: expCompany,
          role: expRole,
          duration: '6 Months',
          responsibilities: expResp
        }
      ],
      certifications: certsList
    };
  }

  submitResumeBuilder() {
    const resumeData = this.getResumeBuilderData();
    this.triggerAIProfileScan(resumeData);
  }

  previewBuilderResume() {
    const resumeData = this.getResumeBuilderData();
    window.resumeService.downloadResumePDF(resumeData);
  }

  downloadBuilderResume() {
    const resumeData = this.getResumeBuilderData();
    window.resumeService.downloadResumePDF(resumeData);
  }


  async triggerAIProfileScan(resumeData) {
    const scanPanel = document.getElementById('ai-scan-panel');
    const scanItems = document.querySelectorAll('.ai-scan-item');
    if (!scanPanel) return;

    scanPanel.style.display = 'block';
    scanPanel.scrollIntoView({ behavior: 'smooth' });

    for (let i = 0; i < scanItems.length; i++) {
      scanItems[i].className = 'ai-scan-item processing';
      await new Promise(r => setTimeout(r, 600));
      scanItems[i].className = 'ai-scan-item done';
    }

    if (this.currentUser && resumeData) {
      const svc = window.supabaseService;
      if (svc && svc.isAvailable) {
        await svc.updateUserProfile(this.currentUser.id, resumeData);
        this.currentProfile = await svc.getUserProfile(this.currentUser.id);
      } else {
        window.db.updateUserProfile(this.currentUser.id, resumeData);
        this.currentProfile = window.db.getUserProfile(this.currentUser.id);
      }
    }

    this.showToast('Profile analyzed successfully by AI!', 'success');
    this.renderEnvironmentScreen();
  }

  // =========================================================================
  // 4, 5, 6, 7. Technical Round: 15-Min Continuous Timer, 6 Questions, Palette, Strict Validation
  // =========================================================================
  initTechnicalRoundView() {
    const tState = this.interviewState.technical;
    
    // Generate questions if not yet created (Strictly up to 6)
    if (!tState.questions || tState.questions.length === 0) {
      tState.questions = window.aiService.getTechnicalQuestions(
        this.selectedRole,
        this.currentProfile,
        window.db.getUserInterviews(this.currentUser?.id)
      );
      tState.status = 'In Progress';
    }

    // Start 15-Minute Continuous Timer once
    if (!tState.timerStarted && tState.status !== 'Passed') {
      this.startTechnicalTimer();
    }

    this.updateInterviewStatusWidgets();
    this.renderPersistentRoundNav();
    this.renderTechnicalQuestion();
  }

  startTechnicalTimer() {
    const tState = this.interviewState.technical;
    tState.timerStarted = true;
    clearInterval(this.techTimerInterval);

    this.techTimerInterval = setInterval(() => {
      if (tState.timeRemainingSeconds > 0) {
        tState.timeRemainingSeconds--;
        this.updateTimerDisplay();

        // 10 Min Warning (600s)
        if (tState.timeRemainingSeconds === 600 && !tState.timerWarnings.w10) {
          tState.timerWarnings.w10 = true;
          this.showToast('⚠️ 10 minutes remaining in Technical Round', 'info');
        }
        // 5 Min Warning (300s)
        if (tState.timeRemainingSeconds === 300 && !tState.timerWarnings.w5) {
          tState.timerWarnings.w5 = true;
          this.showToast('⚠️ 5 minutes remaining in Technical Round', 'error');
        }
        // 1 Min Warning (60s)
        if (tState.timeRemainingSeconds === 60 && !tState.timerWarnings.w1) {
          tState.timerWarnings.w1 = true;
          this.showToast('🔴 1 minute remaining! Round will auto-submit at 00:00.', 'error');
        }
      } else {
        // Auto submit at 00:00
        clearInterval(this.techTimerInterval);
        this.showToast('⏱ Time is up! Automatically submitting Technical Round...', 'error');
        this.finishTechnicalRound(true);
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const tState = this.interviewState.technical;
    const timerDisplay = document.getElementById('tech-timer-display');
    const timerPill = document.getElementById('global-tech-timer');
    const formatted = this.formatTime(tState.timeRemainingSeconds);

    if (timerDisplay) timerDisplay.textContent = formatted;
    if (timerPill) {
      timerPill.className = `timer-pill ${this.getTimerWarningClass()}`;
    }
  }

  getTimerWarningClass() {
    const secs = this.interviewState.technical.timeRemainingSeconds;
    if (secs <= 60) return 'timer-warning-1';
    if (secs <= 300) return 'timer-warning-5';
    if (secs <= 600) return 'timer-warning-10';
    return '';
  }

  formatTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  renderTechnicalQuestion() {
    const tState = this.interviewState.technical;
    const idx = tState.currentQuestionIdx;
    const totalQ = tState.questions.length; // Max 6
    const qObj = tState.questions[idx];
    if (!qObj) return;

    // Header & Question
    const qNumEl = document.getElementById('tech-q-num');
    const qCatEl = document.getElementById('tech-q-cat');
    const qTextEl = document.getElementById('tech-q-text');
    const qTipEl = document.getElementById('tech-q-tip');
    const ansTextarea = document.getElementById('tech-answer-input');
    const validationMsg = document.getElementById('tech-validation-msg');
    const feedbackBox = document.getElementById('tech-feedback-box');

    if (qNumEl) qNumEl.textContent = `Question ${idx + 1} of ${totalQ}`;
    if (qCatEl) qCatEl.textContent = qObj.category;
    if (qTextEl) qTextEl.textContent = qObj.question;
    if (qTipEl) qTipEl.textContent = '💡 Focus Area: ' + qObj.tip;

    // Restore previous answer if already answered!
    const existing = tState.answers[idx];
    if (existing && existing.answer) {
      if (ansTextarea) ansTextarea.value = existing.answer;
      if (feedbackBox) {
        feedbackBox.style.display = 'block';
        feedbackBox.innerHTML = `
          <div style="font-weight:700; color:var(--cyan-primary); margin-bottom:4px;">🤖 Previous AI Feedback (Score: ${existing.evaluation.score}/100)</div>
          <p>${existing.evaluation.feedback}</p>
        `;
      }
    } else {
      if (ansTextarea) ansTextarea.value = '';
      if (feedbackBox) feedbackBox.style.display = 'none';
    }

    if (validationMsg) validationMsg.classList.remove('visible');

    // Update Question Palette (1 ✓ | 2 ✓ | 3 ● | 4 ○ | 5 ○ | 6 ○)
    this.renderQuestionPalette();

    // Update Bottom Navigation buttons state & validation
    this.updateTechnicalNavButtons();

    // Auto-read question if voice enabled
    window.speechEngine.speak(qObj.question);
  }

  renderQuestionPalette() {
    const paletteContainer = document.getElementById('tech-question-palette');
    if (!paletteContainer) return;

    const tState = this.interviewState.technical;
    const currentIdx = tState.currentQuestionIdx;

    let html = `<span class="qp-label">Question Palette:</span>`;
    tState.questions.forEach((q, i) => {
      const isAnswered = Boolean(tState.answers[i] && tState.answers[i].answer.trim().length > 0);
      const isCurrent = (i === currentIdx);

      let statusClass = 'status-unanswered';
      let symbol = '○';

      if (isCurrent) {
        statusClass = 'status-current';
        symbol = '●';
      } else if (isAnswered) {
        statusClass = 'status-answered';
        symbol = '✓';
      }

      html += `
        <div class="qp-item ${statusClass}" onclick="window.app.jumpToTechnicalQuestion(${i})" title="Go to Question ${i + 1}">
          <span>${i + 1}</span>
          <span>${symbol}</span>
        </div>
      `;
    });

    paletteContainer.innerHTML = html;
  }

  jumpToTechnicalQuestion(targetIdx) {
    const tState = this.interviewState.technical;
    if (targetIdx >= 0 && targetIdx < tState.questions.length) {
      // Save current answer draft if any
      const input = document.getElementById('tech-answer-input');
      if (input && input.value.trim().length > 0) {
        if (!tState.answers[tState.currentQuestionIdx]) {
          tState.answers[tState.currentQuestionIdx] = { answer: input.value.trim(), evaluation: { score: 75, breakdown: {} } };
        } else {
          tState.answers[tState.currentQuestionIdx].answer = input.value.trim();
        }
      }

      tState.currentQuestionIdx = targetIdx;
      this.renderTechnicalQuestion();
    }
  }

  updateTechnicalNavButtons() {
    const tState = this.interviewState.technical;
    const idx = tState.currentQuestionIdx;
    const totalQ = tState.questions.length;
    const input = document.getElementById('tech-answer-input');
    const isAnswerEmpty = !input || input.value.trim().length === 0;

    const btnPrev = document.getElementById('btn-tech-prev');
    const btnSubmit = document.getElementById('btn-submit-tech-ans');

    if (btnPrev) {
      btnPrev.disabled = (idx === 0);
    }

    if (btnSubmit) {
      // If on last question (idx === totalQ - 1)
      if (idx === totalQ - 1) {
        btnSubmit.innerHTML = 'Complete Technical Round →';
      } else {
        btnSubmit.innerHTML = 'Submit & Next Question →';
      }
      
      // Strict button state: Disabled when empty
      btnSubmit.disabled = isAnswerEmpty;
    }
  }

  handleTechnicalInputValidation() {
    const input = document.getElementById('tech-answer-input');
    const validationMsg = document.getElementById('tech-validation-msg');
    const btnSubmit = document.getElementById('btn-submit-tech-ans');

    if (!input || !btnSubmit) return;
    const trimmed = input.value.trim();

    if (trimmed.length === 0) {
      btnSubmit.disabled = true;
    } else {
      btnSubmit.disabled = false;
      if (validationMsg) validationMsg.classList.remove('visible');
    }
  }

  handleTechnicalPrevQuestion() {
    const tState = this.interviewState.technical;
    if (tState.currentQuestionIdx > 0) {
      // Save draft of current
      const input = document.getElementById('tech-answer-input');
      if (input && input.value.trim().length > 0) {
        if (!tState.answers[tState.currentQuestionIdx]) {
          tState.answers[tState.currentQuestionIdx] = { answer: input.value.trim(), evaluation: { score: 75, breakdown: {} } };
        } else {
          tState.answers[tState.currentQuestionIdx].answer = input.value.trim();
        }
      }

      tState.currentQuestionIdx--;
      this.renderTechnicalQuestion();
    }
  }

  async submitTechnicalAnswer() {
    const ansTextarea = document.getElementById('tech-answer-input');
    const validationMsg = document.getElementById('tech-validation-msg');
    const answer = ansTextarea ? ansTextarea.value.trim() : '';
    const tState = this.interviewState.technical;
    const currentQ = tState.questions[tState.currentQuestionIdx];

    // STRICT VALIDATION (NOT NULL / REQUIRED)
    if (!answer || answer.length === 0) {
      if (validationMsg) {
        validationMsg.textContent = '⚠️ Please enter an answer before continuing.';
        validationMsg.classList.add('visible');
      }
      this.showToast('Please enter an answer before continuing.', 'error');
      ansTextarea?.focus();
      return;
    }

    const submitBtn = document.getElementById('btn-submit-tech-ans');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Evaluating with AI...';
    }

    const evaluation = await window.aiService.evaluateTechnicalAnswer(currentQ, answer);
    
    // Store or update answer in state
    tState.answers[tState.currentQuestionIdx] = {
      question: currentQ.question,
      answer,
      evaluation,
      timestamp: new Date().toISOString()
    };

    // Update live metrics on right panel
    this.updateTechnicalMetricsUI(evaluation.breakdown, evaluation.score);

    // Show feedback
    const feedbackBox = document.getElementById('tech-feedback-box');
    if (feedbackBox) {
      feedbackBox.style.display = 'block';
      feedbackBox.innerHTML = `
        <div style="font-weight:700; color:var(--cyan-primary); margin-bottom:4px;">🤖 AI Feedback (Score: ${evaluation.score}/100)</div>
        <p>${evaluation.feedback}</p>
      `;
    }

    // Refresh palette
    this.renderQuestionPalette();

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = (tState.currentQuestionIdx === tState.questions.length - 1) ? 'Complete Technical Round →' : 'Submit & Next Question →';
    }

    // Move to next question or complete round
    setTimeout(() => {
      if (tState.currentQuestionIdx < tState.questions.length - 1) {
        tState.currentQuestionIdx++;
        this.renderTechnicalQuestion();
      } else {
        this.finishTechnicalRound(false);
      }
    }, 1800);
  }

  updateTechnicalMetricsUI(breakdown, liveScore) {
    const setBar = (id, val) => {
      const fill = document.getElementById(`metric-${id}-fill`);
      const text = document.getElementById(`metric-${id}-val`);
      if (fill) fill.style.width = (val || 80) + '%';
      if (text) text.textContent = (val || 80) + '%';
    };

    setBar('resume', breakdown.resumeKnowledge);
    setBar('project', breakdown.projectKnowledge);
    setBar('dsa', breakdown.dsa);
    setBar('techconcepts', breakdown.technicalConcepts);
    setBar('problem', breakdown.problemSolving);
    setBar('quality', breakdown.answerQuality);

    const overallEl = document.getElementById('tech-live-overall');
    if (overallEl) overallEl.textContent = liveScore + '/100';
  }

  finishTechnicalRound(isAutoSubmit = false) {
    clearInterval(this.techTimerInterval);
    const answersObj = this.interviewState.technical.answers;
    const answerValues = Object.values(answersObj);

    const avgScore = answerValues.length > 0 
      ? Math.round(answerValues.reduce((acc, a) => acc + (a.evaluation?.score || 70), 0) / answerValues.length)
      : 82;

    this.interviewState.technical.score = avgScore;
    const passed = avgScore >= 70;
    this.interviewState.technical.status = passed ? 'Passed' : 'Failed';

    this.updateInterviewStatusWidgets();
    this.renderPersistentRoundNav();

    const banner = document.getElementById('tech-result-banner');
    if (banner) {
      banner.style.display = 'block';
      if (passed) {
        banner.innerHTML = `
          <div style="background:linear-gradient(90deg, rgba(16,185,129,0.2), rgba(59,130,246,0.15)); border:1px solid rgba(16,185,129,0.4); border-radius:12px; padding:20px; text-align:center; margin-top:20px;">
            <h3 style="color:#34d399; margin-bottom:6px;">🎉 Technical Round Passed! (Score: ${avgScore}/100)</h3>
            <p style="color:var(--text-secondary); margin-bottom:16px;">You met the passing threshold (>=70%). Coding Round is now unlocked.</p>
            <button class="btn btn-primary btn-lg" onclick="window.app.navigateToScreen('screen-coding')">Continue to Coding Round →</button>
          </div>
        `;
      } else {
        banner.innerHTML = `
          <div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.35); border-radius:12px; padding:20px; text-align:center; margin-top:20px;">
            <h3 style="color:#f87171; margin-bottom:6px;">Technical Round Needs Improvement (Score: ${avgScore}/100)</h3>
            <p style="color:var(--text-secondary); margin-bottom:14px;">Minimum passing threshold is 70%. Focus on DSA complexities and system design principles.</p>
            <button class="btn btn-secondary" onclick="window.app.retryTechnicalRound()">Practice & Retry Technical Round ↺</button>
          </div>
        `;
      }
    }

    if (passed) {
      this.showToast(`🎉 Technical Round Passed with ${avgScore}%! Coding Round unlocked.`, 'success');
    } else {
      this.showToast(`Technical Round Score: ${avgScore}%. Minimum 70% required to unlock Coding Round.`, 'error');
    }
  }

  retryTechnicalRound() {
    this.interviewState.technical.answers = {};
    this.interviewState.technical.currentQuestionIdx = 0;
    this.interviewState.technical.timeRemainingSeconds = 900;
    this.interviewState.technical.timerStarted = false;
    this.interviewState.technical.status = 'In Progress';
    document.getElementById('tech-result-banner').style.display = 'none';
    this.initTechnicalRoundView();
  }

  // =========================================================================
  // Screen 4: Round 2 - Coding Interview (Unlocked only after Technical Passed)
  // =========================================================================
  initCodingRoundView() {
    if (this.interviewState.technical.status !== 'Passed') {
      this.showLockedModal(
        'Coding Round Locked 🔒',
        'You must complete and pass the Technical Round before accessing the Coding Round.'
      );
      this.navigateToScreen('screen-technical');
      return;
    }

    if (this.interviewState.coding.status === 'Not Started') {
      this.interviewState.coding.status = 'In Progress';
    }

    this.renderPersistentRoundNav();
    this.updateInterviewStatusWidgets();

    const problem = window.codeRunnerService.currentProblem;
    this.interviewState.coding.currentProblem = problem;

    const titleEl = document.getElementById('coding-prob-title');
    const diffEl = document.getElementById('coding-prob-difficulty');
    const timeEl = document.getElementById('coding-prob-time');
    const spaceEl = document.getElementById('coding-prob-space');
    const descEl = document.getElementById('coding-prob-desc');
    const examplesEl = document.getElementById('coding-prob-examples');
    const constrEl = document.getElementById('coding-prob-constraints');

    if (titleEl) titleEl.textContent = problem.title;
    if (diffEl) diffEl.textContent = problem.difficulty;
    if (timeEl) timeEl.textContent = 'Time: ' + problem.timeComplexity;
    if (spaceEl) spaceEl.textContent = 'Space: ' + problem.spaceComplexity;
    if (descEl) descEl.innerHTML = problem.description;

    if (examplesEl) {
      examplesEl.innerHTML = problem.examples.map((ex, i) => `
        <div class="problem-example-box">
          <strong>Example ${i + 1}:</strong><br>
          <strong>Input:</strong> ${ex.input}<br>
          <strong>Output:</strong> ${ex.output}<br>
          ${ex.explanation ? `<strong>Explanation:</strong> ${ex.explanation}` : ''}
        </div>
      `).join('');
    }

    if (constrEl) {
      constrEl.innerHTML = problem.constraints.map(c => `<li><code>${c}</code></li>`).join('');
    }

    this.setEditorLanguage(this.interviewState.coding.language || 'javascript');
  }

  setEditorLanguage(lang) {
    this.interviewState.coding.language = lang;
    const problem = this.interviewState.coding.currentProblem || window.codeRunnerService.currentProblem;
    const editor = document.getElementById('code-editor-textarea');
    if (editor && problem.templates[lang]) {
      // Restore previous code if saved
      editor.value = this.interviewState.coding.codeSolutions[lang] || problem.templates[lang];
      this.updateLineNumbers();
    }
  }

  updateLineNumbers() {
    const editor = document.getElementById('code-editor-textarea');
    const lineNumContainer = document.getElementById('editor-line-numbers');
    if (!editor || !lineNumContainer) return;

    const lines = editor.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= Math.max(lines, 18); i++) {
      numbers += i + '<br>';
    }
    lineNumContainer.innerHTML = numbers;
  }

  async runCode() {
    const editor = document.getElementById('code-editor-textarea');
    const consoleOutput = document.getElementById('console-output-body');
    const lang = this.interviewState.coding.language;
    const problem = this.interviewState.coding.currentProblem;

    if (consoleOutput) {
      consoleOutput.innerHTML = '<span style="color:var(--cyan-primary)">Running test cases...</span>';
    }

    const execResult = await window.codeRunnerService.executeCode(lang, editor.value, problem);

    if (consoleOutput) {
      if (execResult.error) {
        consoleOutput.innerHTML = `<span style="color:var(--rose-primary)">✖ Error: ${execResult.error}</span>`;
      } else {
        const passedCount = execResult.results.filter(r => r.passed).length;
        const allPassed = passedCount === execResult.results.length;

        consoleOutput.innerHTML = `
          <div style="margin-bottom:8px;">
            <span class="badge ${allPassed ? 'badge-emerald' : 'badge-amber'}">
              ${allPassed ? '✓ All Test Cases Passed' : `⚠ ${passedCount}/${execResult.results.length} Passed`}
            </span>
            <span style="color:var(--text-muted); margin-left:8px;">Runtime: ${execResult.runtime}ms | Memory: ${execResult.memory}</span>
          </div>
          ${execResult.results.map(r => `
            <div style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); color:${r.passed ? '#34d399' : '#f87171'}">
              Test ${r.testCaseIndex}: ${r.passed ? 'PASSED' : 'FAILED'} (Expected: ${r.expected}, Got: ${r.actual})
            </div>
          `).join('')}
        `;
      }
    }
  }

  async submitCodingSolution() {
    const editor = document.getElementById('code-editor-textarea');
    const lang = this.interviewState.coding.language;
    const problem = this.interviewState.coding.currentProblem;

    // Save solution
    this.interviewState.coding.codeSolutions[lang] = editor.value;

    const execResult = await window.codeRunnerService.executeCode(lang, editor.value, problem);
    const passedCount = execResult.results.filter(r => r.passed).length;
    const isSuccess = execResult.success || (passedCount >= 2);

    const codingScore = isSuccess ? Math.min(96, Math.max(78, 86 + Math.floor(Math.random() * 8))) : 52;
    this.interviewState.coding.score = codingScore;
    this.interviewState.coding.status = isSuccess ? 'Passed' : 'Failed';

    this.updateInterviewStatusWidgets();
    this.renderPersistentRoundNav();

    const banner = document.getElementById('coding-result-banner');
    if (banner) {
      banner.style.display = 'block';
      if (isSuccess) {
        banner.innerHTML = `
          <div style="background:linear-gradient(90deg, rgba(16,185,129,0.2), rgba(59,130,246,0.15)); border:1px solid rgba(16,185,129,0.4); border-radius:12px; padding:18px; margin-top:16px; text-align:center;">
            <h3 style="color:#34d399; margin-bottom:6px;">🎉 Technical + Coding Rounds Passed! (Coding Score: ${codingScore}/100)</h3>
            <p style="color:var(--text-secondary); margin-bottom:14px;">Both required rounds passed. HR Behavioral Round is now unlocked!</p>
            <button class="btn btn-primary btn-lg" onclick="window.app.navigateToScreen('screen-hr')">CONTINUE TO HR ROUND →</button>
          </div>
        `;
      } else {
        banner.innerHTML = `
          <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:12px; padding:16px; margin-top:16px;">
            <h4 style="color:#f87171;">Your coding fundamentals need improvement (Score: ${codingScore}/100).</h4>
            <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:4px;">Practice similar array & map indexing problems to master linear time complexities.</p>
            <button class="btn btn-secondary btn-sm" style="margin-top:10px;" onclick="window.app.runCode()">Practice Similar Problems</button>
          </div>
        `;
      }
    }
  }

  // =========================================================================
  // Screen 5: Round 3 - HR Behavioral Round (Max 6 Questions)
  // =========================================================================
  initHRRoundView() {
    if (this.interviewState.technical.status !== 'Passed' || this.interviewState.coding.status !== 'Passed') {
      this.showLockedModal(
        'HR Round Locked 🔒',
        'You must complete and pass both Technical and Coding rounds to unlock the HR Behavioral Round.'
      );
      if (this.interviewState.technical.status !== 'Passed') {
        this.navigateToScreen('screen-technical');
      } else {
        this.navigateToScreen('screen-coding');
      }
      return;
    }

    const hrState = this.interviewState.hr;
    if (!hrState.questions || hrState.questions.length === 0) {
      hrState.questions = window.aiService.getHRQuestions(this.selectedRole, this.currentProfile);
      hrState.status = 'In Progress';
    }

    this.renderPersistentRoundNav();
    this.updateInterviewStatusWidgets();
    this.renderHRQuestion();
  }

  renderHRQuestion() {
    const hrState = this.interviewState.hr;
    const qObj = hrState.questions[hrState.currentQuestionIdx];
    if (!qObj) return;

    const countEl = document.getElementById('hr-q-counter');
    const barEl = document.getElementById('hr-progress-fill');
    const textEl = document.getElementById('hr-q-text');
    const criteriaEl = document.getElementById('hr-q-criteria');
    const ansInput = document.getElementById('hr-ans-input');

    const total = hrState.questions.length; // Max 6
    const current = hrState.currentQuestionIdx + 1;
    const pct = Math.round((current / total) * 100);

    if (countEl) countEl.textContent = `Question ${current} of ${total}`;
    if (barEl) barEl.style.width = pct + '%';
    if (textEl) textEl.textContent = qObj.question;
    if (criteriaEl) criteriaEl.textContent = 'Focus: ' + qObj.criteria;
    
    // Restore if answered
    const existing = hrState.answers[hrState.currentQuestionIdx];
    if (existing && existing.answer) {
      if (ansInput) ansInput.value = existing.answer;
    } else {
      if (ansInput) ansInput.value = '';
    }

    const avatarEl = document.getElementById('hr-avatar-art');
    if (avatarEl) avatarEl.classList.add('speaking');

    window.speechEngine.speak(qObj.question, () => {
      if (avatarEl) avatarEl.classList.add('speaking');
    }, () => {
      if (avatarEl) avatarEl.classList.remove('speaking');
    });

    this.startHRTimer();
  }

  startHRTimer() {
    clearInterval(this.hrTimerInterval);
    this.hrTimeSeconds = 0;
    const timerEl = document.getElementById('hr-timer-display');
    this.hrTimerInterval = setInterval(() => {
      this.hrTimeSeconds++;
      const mins = String(Math.floor(this.hrTimeSeconds / 60)).padStart(2, '0');
      const secs = String(this.hrTimeSeconds % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  async toggleWebcam() {
    const video = document.getElementById('webcam-video');
    const overlay = document.getElementById('cam-placeholder');
    const btn = document.getElementById('btn-toggle-camera');

    if (this.mediaStream) {
      window.speechEngine.stopMediaStream(this.mediaStream);
      this.mediaStream = null;
      if (video) video.srcObject = null;
      if (overlay) overlay.style.display = 'flex';
      if (btn) btn.innerHTML = '🎥 Camera: OFF';
      this.interviewState.hr.hasWebcam = false;
      this.showToast('Camera disabled.', 'info');
    } else {
      const stream = await window.speechEngine.startCamera(video);
      if (stream) {
        this.mediaStream = stream;
        if (overlay) overlay.style.display = 'none';
        if (btn) btn.innerHTML = '🎥 Camera: ON';
        this.interviewState.hr.hasWebcam = true;
        this.showToast('Camera active! Presentation indicators enabled.', 'success');
      } else {
        this.showToast('Camera access unavailable. Continuing with audio-only analysis.', 'info');
      }
    }
  }

  toggleMicrophoneRecording() {
    const btn = document.getElementById('btn-hr-record');
    const input = document.getElementById('hr-ans-input');

    if (!this.isRecording) {
      const started = window.speechEngine.startListening((text) => {
        if (input) input.value = text;
      }, (err) => {
        this.showToast('Speech Recognition error: ' + err, 'error');
      });

      if (started) {
        this.isRecording = true;
        if (btn) {
          btn.innerHTML = '⏹ Stop Recording';
          btn.className = 'btn btn-danger';
        }
      }
    } else {
      window.speechEngine.stopListening();
      this.isRecording = false;
      if (btn) {
        btn.innerHTML = '🎤 Record Answer';
        btn.className = 'btn btn-primary';
      }
    }
  }

  async submitHRAnswer() {
    clearInterval(this.hrTimerInterval);
    if (this.isRecording) {
      this.toggleMicrophoneRecording();
    }

    const input = document.getElementById('hr-ans-input');
    const answer = input ? input.value.trim() : '';
    const hrState = this.interviewState.hr;
    const currentQ = hrState.questions[hrState.currentQuestionIdx];

    if (!answer || answer.length === 0) {
      this.showToast('Please provide an answer before moving forward.', 'error');
      return;
    }

    const evaluation = await window.aiService.evaluateHRAnswer(
      currentQ,
      answer,
      this.hrTimeSeconds,
      hrState.hasWebcam
    );

    hrState.answers[hrState.currentQuestionIdx] = {
      question: currentQ.question,
      answer,
      evaluation
    };

    if (hrState.currentQuestionIdx < hrState.questions.length - 1) {
      hrState.currentQuestionIdx++;
      this.renderHRQuestion();
    } else {
      this.finishHRRound();
    }
  }

  finishHRRound() {
    const hrState = this.interviewState.hr;
    const ansList = Object.values(hrState.answers);
    const avgScore = ansList.length > 0
      ? Math.round(ansList.reduce((acc, a) => acc + (a.evaluation?.score || 78), 0) / ansList.length)
      : 78;

    hrState.score = avgScore;
    hrState.status = 'Completed';

    const tech = this.interviewState.technical.score || 82;
    const coding = this.interviewState.coding.score || 86;
    const hr = avgScore;
    const overall = Math.round((tech * 0.35) + (coding * 0.35) + (hr * 0.30));
    this.interviewState.overallScore = overall;

    if (this.currentUser) {
      const interviewRecord = {
        id: this.interviewState.id,
        userId: this.currentUser.id,
        date: new Date().toISOString(),
        role: this.selectedRole,
        technicalScore: tech,
        codingScore: coding,
        hrScore: hr,
        overallScore: overall,
        status: 'Completed',
        technical: this.interviewState.technical,
        coding: this.interviewState.coding,
        hr: this.interviewState.hr,
        feedback: `Overall performance: ${overall}%. Strong fundamentals across ${this.selectedRole} competencies.`
      };
      const svc = window.supabaseService;
      if (svc) svc.saveInterview(interviewRecord);
      else window.db.saveInterview(interviewRecord);
    }

    this.updateInterviewStatusWidgets();
    this.renderPersistentRoundNav();
    this.showToast('🎉 All 3 Interview Rounds Completed! Generating AI Assessment Report...', 'success');

    setTimeout(() => {
      this.navigateToScreen('screen-results');
    }, 1200);
  }

  // =========================================================================
  // Screen 6: Results & Analytics Dashboard
  // =========================================================================
  renderResultsDashboard() {
    const techScore = this.interviewState.technical.score || 82;
    const codingScore = this.interviewState.coding.score || 86;
    const hrScore = this.interviewState.hr.score || 78;
    const overallScore = this.interviewState.overallScore || 82;

    const scoreNum = document.getElementById('overall-score-number');
    const circleFill = document.getElementById('score-circle-fill');
    if (scoreNum) scoreNum.textContent = overallScore;
    if (circleFill) {
      const circumference = 440;
      const offset = circumference - (overallScore / 100) * circumference;
      circleFill.style.strokeDashoffset = offset;
    }

    const rTech = document.getElementById('result-tech-score');
    const rCoding = document.getElementById('result-coding-score');
    const rHr = document.getElementById('result-hr-score');
    if (rTech) rTech.textContent = techScore + '%';
    if (rCoding) rCoding.textContent = codingScore + '%';
    if (rHr) rHr.textContent = hrScore + '%';

    const reviewData = window.aiService.generateComprehensiveReview(
      overallScore, techScore, codingScore, hrScore, this.selectedRole
    );

    const reviewTextEl = document.getElementById('ai-review-narrative');
    if (reviewTextEl) reviewTextEl.textContent = reviewData.narrative;

    const strongWrap = document.getElementById('strong-areas-wrap');
    const weakWrap = document.getElementById('weak-areas-wrap');
    if (strongWrap) {
      strongWrap.innerHTML = reviewData.strongAreas.map(s => `<span class="badge badge-emerald">✓ ${s}</span>`).join('');
    }
    if (weakWrap) {
      weakWrap.innerHTML = reviewData.weakAreas.map(w => `<span class="badge badge-amber">⚠ ${w}</span>`).join('');
    }

    const planGrid = document.getElementById('personalized-plan-grid');
    if (planGrid) {
      planGrid.innerHTML = reviewData.learningPlan.map(p => `
        <div class="lp-action-card">
          <div>
            <h4>${p.title}</h4>
            <p>${p.description}</p>
          </div>
          <button class="btn btn-outline btn-sm" onclick="window.app.handlePlanAction('${p.category}')">
            ${p.actionLabel} →
          </button>
        </div>
      `).join('');
    }

    this.renderResultCharts();
    this.renderHistoryTable();
  }

  handlePlanAction(category) {
    if (category === 'dsa' || category === 'coding') {
      this.navigateToScreen('screen-coding');
    } else {
      this.navigateToScreen('screen-hr');
    }
  }

  renderResultCharts() {
    if (typeof Chart === 'undefined') return;

    const radarCtx = document.getElementById('hr-radar-chart')?.getContext('2d');
    if (radarCtx) {
      if (this.charts.radar) this.charts.radar.destroy();
      this.charts.radar = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: ['Communication', 'Tech Explanation', 'Relevance', 'Problem Solving', 'Presentation', 'Structure'],
          datasets: [{
            label: 'Your Score (%)',
            data: [82, 85, 88, 79, 76, 81],
            backgroundColor: 'rgba(59, 130, 246, 0.25)',
            borderColor: '#3b82f6',
            pointBackgroundColor: '#8b5cf6',
            pointBorderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
              grid: { color: 'rgba(255, 255, 255, 0.08)' },
              pointLabels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } },
              ticks: { backdropColor: 'transparent', color: '#64748b', stepSize: 20 },
              min: 0,
              max: 100
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    const barCtx = document.getElementById('metrics-bar-chart')?.getContext('2d');
    if (barCtx) {
      if (this.charts.bar) this.charts.bar.destroy();
      this.charts.bar = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: ['Technical', 'Coding', 'HR Behavioral', 'Overall Match'],
          datasets: [
            {
              label: 'Your Score',
              data: [
                this.interviewState.technical.score || 82,
                this.interviewState.coding.score || 86,
                this.interviewState.hr.score || 78,
                this.interviewState.overallScore || 82
              ],
              backgroundColor: 'rgba(59, 130, 246, 0.85)',
              borderRadius: 6
            },
            {
              label: 'Benchmark',
              data: [75, 75, 75, 75],
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255, 255, 255, 0.06)' }, ticks: { color: '#64748b' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
          },
          plugins: {
            legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } }
          }
        }
      });
    }
  }

  renderHistoryTable() {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody || !this.currentUser) return;

    const interviews = window.db.getUserInterviews(this.currentUser.id);
    tableBody.innerHTML = interviews.map((item, idx) => `
      <tr>
        <td><strong>Interview ${interviews.length - idx}</strong></td>
        <td><span class="badge badge-blue">${item.role || 'Data Scientist'}</span></td>
        <td>${item.technicalScore}%</td>
        <td>${item.codingScore}%</td>
        <td>${item.hrScore}%</td>
        <td><strong style="color:#34d399">${item.overallScore}%</strong></td>
        <td>${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
      </tr>
    `).join('');
  }

  // Toast Notification System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✖' : 'ℹ');
    toast.innerHTML = `<span style="font-weight:700;">${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Bind All Event Listeners
  bindEvents() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetScreen = el.getAttribute('data-nav');
        this.navigateToScreen(targetScreen);
      });
    });

    const menuBtn = document.getElementById('btn-mobile-menu');
    const sidebar = document.querySelector('.sidebar');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        document.getElementById('form-signin').style.display = mode === 'signin' ? 'block' : 'none';
        document.getElementById('form-register').style.display = mode === 'register' ? 'block' : 'none';
      });
    });

    document.getElementById('form-signin')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value;
      const pass = document.getElementById('signin-password').value;
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Signing in…'; }
      try {
        const svc = window.supabaseService;
        const user = svc ? await svc.loginUser(email, pass) : window.db.authenticateUser(email, pass);
        await this.loginUser(user);
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
      }
    });

    document.getElementById('form-register')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('reg-fullname').value;
      const email = document.getElementById('reg-email').value;
      const phone = document.getElementById('reg-phone').value;
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm').value;

      if (password !== confirmPassword) {
        this.showToast('Passwords do not match!', 'error');
        return;
      }

      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Creating account…'; }
      try {
        const svc = window.supabaseService;
        const user = svc ? await svc.registerUser({ fullName, email, phone, password }) : window.db.registerUser({ fullName, email, phone, password });
        await this.loginUser(user);
        this.showToast('Account created successfully! Welcome to InterviewAI 🎉', 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
      }
    });

    document.querySelectorAll('.btn-google').forEach(btn => {
      btn.addEventListener('click', async () => {
        // Demo login via localStorage fallback (Google OAuth not configured)
        try {
          const svc = window.supabaseService;
          const user = svc && svc.isAvailable
            ? await svc.loginUser('ramya@interviewai.io', 'password123')
            : window.db.authenticateUser('ramya@interviewai.io', 'password123');
          await this.loginUser(user);
        } catch (e) {
          const newUser = window.db.registerUser({
            fullName: 'Ramya Durgam',
            email: 'ramya@interviewai.io',
            phone: '+91 98765 43210',
            password: 'password123'
          });
          await this.loginUser(newUser);
        }
      });
    });

    // Technical Round Inputs & Navigation
    const techInput = document.getElementById('tech-answer-input');
    if (techInput) {
      techInput.addEventListener('input', () => this.handleTechnicalInputValidation());
    }

    document.getElementById('btn-tech-prev')?.addEventListener('click', () => {
      this.handleTechnicalPrevQuestion();
    });

    document.getElementById('btn-submit-tech-ans')?.addEventListener('click', () => {
      this.submitTechnicalAnswer();
    });

    document.getElementById('btn-tech-speak')?.addEventListener('click', () => {
      const q = this.interviewState.technical.questions[this.interviewState.technical.currentQuestionIdx];
      if (q) window.speechEngine.speak(q.question);
    });

    // Resume Dropzone
    const dropzone = document.getElementById('resume-dropzone');
    const fileInput = document.getElementById('resume-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];
          const extracted = await window.resumeService.parseResumeFile(file);
          this.triggerAIProfileScan(extracted);
        }
      });

      fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
          const file = e.target.files[0];
          const extracted = await window.resumeService.parseResumeFile(file);
          this.triggerAIProfileScan(extracted);
        }
      });
    }

    // =========================================================================
    // Option B - Resume Builder Hover & Click Step Switcher
    // =========================================================================
    document.querySelectorAll('.rb-step-btn').forEach(btn => {
      // Switch on HOVER (mouseenter / mouseover)
      btn.addEventListener('mouseenter', () => {
        const step = btn.getAttribute('data-step') || btn.textContent.trim().charAt(0);
        this.switchResumeBuilderStep(step);
      });
      // Also switch on click
      btn.addEventListener('click', () => {
        const step = btn.getAttribute('data-step') || btn.textContent.trim().charAt(0);
        this.switchResumeBuilderStep(step);
      });
    });

    // Coding Round Handlers

    document.getElementById('code-lang-select')?.addEventListener('change', (e) => {
      this.setEditorLanguage(e.target.value);
    });

    document.getElementById('btn-run-code')?.addEventListener('click', () => this.runCode());
    document.getElementById('btn-submit-code')?.addEventListener('click', () => this.submitCodingSolution());
    document.getElementById('btn-reset-code')?.addEventListener('click', () => {
      this.setEditorLanguage(this.interviewState.coding.language);
    });
    document.getElementById('code-editor-textarea')?.addEventListener('input', () => this.updateLineNumbers());

    // HR Handlers
    document.getElementById('btn-toggle-camera')?.addEventListener('click', () => this.toggleWebcam());
    document.getElementById('btn-hr-record')?.addEventListener('click', () => this.toggleMicrophoneRecording());
    document.getElementById('btn-submit-hr-ans')?.addEventListener('click', () => this.submitHRAnswer());

    // Settings Modal
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      document.getElementById('modal-settings')?.classList.add('active');
    });
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
      });
    });

    // Download Resume button
    document.getElementById('btn-download-resume')?.addEventListener('click', () => {
      if (this.currentProfile) {
        window.resumeService.downloadResumePDF({
          fullName: this.currentUser?.fullName || 'Candidate',
          email: this.currentUser?.email || 'candidate@example.com',
          phone: this.currentUser?.phone || '+91 98765 43210',
          ...this.currentProfile
        });
      }
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      const svc = window.supabaseService;
      if (svc) await svc.logoutUser();
      else window.db.clearActiveSession();
      this.currentUser = null;
      this.currentProfile = null;
      this.navigateToScreen('screen-auth');
      this.showToast('Logged out successfully.', 'info');
    });
  }
}

// Global instance export
if (typeof window !== 'undefined') {
  window.app = new InterviewApp();
}
if (typeof module !== 'undefined') {
  module.exports = { InterviewApp };
}
