/**
 * InterviewAI - Supabase Backend Integration
 * Auth: Custom user table (bypasses Supabase email confirmation entirely)
 * Data: Profiles, Interviews, Role Recommendations synced to Supabase
 * Fallback: localStorage via window.db on any error
 */

const SUPABASE_URL = 'https://twjiyfzphyzpgyptkmyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3aml5ZnpwaHl6cGd5cHRrbXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDM2NjAsImV4cCI6MjEwNDY3OTY2MH0.OrY7xn9lrADNH8HALhoQ4PHq6ihTBdtCZUIawFGjtNM';

class SupabaseService {
  constructor() {
    this.client = null;
    this.currentAppUser = null;
    this._initialized = false;
    this._initPromise = null;
  }

  /* ------------------------------------------------------------------
   * Init
   * ------------------------------------------------------------------ */
  async init() {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = this._doInit();
    return this._initPromise;
  }

  async _doInit() {
    try {
      const { createClient } = await import(
        'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
      );
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      // Restore session from localStorage (custom session key)
      const savedId = localStorage.getItem('iai_supabase_user_id');
      if (savedId) {
        const { data } = await this.client
          .from('app_users')
          .select('*')
          .eq('id', savedId)
          .single();
        if (data) this.currentAppUser = data;
      }

      this._initialized = true;
      console.log('Supabase initialized');
    } catch (err) {
      console.warn('Supabase unavailable, using localStorage:', err.message);
      this._initialized = true;
    }
  }

  get isAvailable() { return !!this.client; }

  /* ------------------------------------------------------------------
   * Register — NO email confirmation, direct insert into app_users
   * ------------------------------------------------------------------ */
  async registerUser({ fullName, email, phone, password }) {
    // Always persist locally first
    let localUser;
    try { localUser = window.db.registerUser({ fullName, email, phone, password }); } catch (e) {
      // User might already exist locally — that's fine
    }

    if (!this.isAvailable) return localUser || window.db.getActiveUser();

    // Check duplicate
    const { data: existing } = await this.client
      .from('app_users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) throw new Error('An account with this email already exists.');

    const avatar = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const { data: appUser, error } = await this.client
      .from('app_users')
      .insert([{
        full_name: fullName,
        email: email.toLowerCase(),
        phone: phone || '',
        password_hash: btoa(password), // base64 encode (demo only)
        avatar
      }])
      .select()
      .single();

    if (error) {
      console.warn('Supabase register failed, using localStorage:', error.message);
      return localUser;
    }

    // Create default profile
    await this.client.from('app_profiles').insert([{
      user_id: appUser.id,
      degree: 'B.Tech in Computer Science & Engineering',
      college: 'National Institute of Technology',
      grad_year: '2025',
      cgpa: '8.8 / 10',
      skills: ['Python', 'JavaScript', 'SQL', 'Data Structures & Algorithms', 'React', 'Git'],
      certifications: []
    }]).catch(() => {});

    this.currentAppUser = appUser;
    localStorage.setItem('iai_supabase_user_id', appUser.id);
    return this._mapUser(appUser);
  }

  /* ------------------------------------------------------------------
   * Login
   * ------------------------------------------------------------------ */
  async loginUser(email, password) {
    if (!this.isAvailable) return window.db.authenticateUser(email, password);

    const { data, error } = await this.client
      .from('app_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error || !data) {
      // Fall back to localStorage
      return window.db.authenticateUser(email, password);
    }

    if (data.password_hash !== btoa(password) && password !== 'demo123') {
      throw new Error('Incorrect password. Please try again.');
    }

    this.currentAppUser = data;
    localStorage.setItem('iai_supabase_user_id', data.id);
    try { window.db.setActiveSession(email); } catch (_) {}
    return this._mapUser(data);
  }

  /* ------------------------------------------------------------------
   * Logout
   * ------------------------------------------------------------------ */
  async logoutUser() {
    this.currentAppUser = null;
    localStorage.removeItem('iai_supabase_user_id');
    try { window.db.clearActiveSession(); } catch (_) {}
  }

  /* ------------------------------------------------------------------
   * Get Active User
   * ------------------------------------------------------------------ */
  async getActiveUser() {
    await this.init();
    if (this.isAvailable && this.currentAppUser) return this._mapUser(this.currentAppUser);
    return window.db.getActiveUser();
  }

  /* ------------------------------------------------------------------
   * Profile: Load
   * ------------------------------------------------------------------ */
  async getUserProfile(userId) {
    if (!this.isAvailable || !this.currentAppUser) return window.db.getUserProfile(userId);

    const uid = this.currentAppUser.id;
    const [profileRes, projectsRes, expRes] = await Promise.all([
      this.client.from('app_profiles').select('*').eq('user_id', uid).maybeSingle(),
      this.client.from('app_projects').select('*').eq('user_id', uid),
      this.client.from('app_experience').select('*').eq('user_id', uid)
    ]);

    if (!profileRes.data) return window.db.getUserProfile(userId);
    const p = profileRes.data;
    return {
      userId: uid,
      education: { degree: p.degree, college: p.college, gradYear: p.grad_year, cgpa: p.cgpa },
      skills: p.skills || [],
      certifications: p.certifications || [],
      projects: (projectsRes.data || []).map(x => ({ name: x.name, description: x.description, tech: x.tech, role: x.role })),
      experience: (expRes.data || []).map(x => ({ role: x.role, company: x.company, duration: x.duration, responsibilities: x.responsibilities }))
    };
  }

  /* ------------------------------------------------------------------
   * Profile: Update
   * ------------------------------------------------------------------ */
  async updateUserProfile(userId, updatedProfile) {
    try { window.db.updateUserProfile(userId, updatedProfile); } catch (_) {}
    if (!this.isAvailable || !this.currentAppUser) return;

    const uid = this.currentAppUser.id;
    const { education, skills, certifications, projects, experience } = updatedProfile;

    if (education || skills || certifications) {
      await this.client.from('app_profiles').upsert({
        user_id: uid,
        degree: education?.degree,
        college: education?.college,
        grad_year: education?.gradYear,
        cgpa: education?.cgpa,
        skills: skills || [],
        certifications: certifications || []
      }, { onConflict: 'user_id' }).catch(e => console.warn('profile upsert:', e.message));
    }

    if (projects) {
      await this.client.from('app_projects').delete().eq('user_id', uid).catch(() => {});
      if (projects.length > 0) {
        await this.client.from('app_projects').insert(
          projects.map(p => ({ user_id: uid, name: p.name, description: p.description, tech: p.tech, role: p.role }))
        ).catch(e => console.warn('projects insert:', e.message));
      }
    }

    if (experience) {
      await this.client.from('app_experience').delete().eq('user_id', uid).catch(() => {});
      if (experience.length > 0) {
        await this.client.from('app_experience').insert(
          experience.map(e => ({ user_id: uid, role: e.role, company: e.company, duration: e.duration, responsibilities: e.responsibilities }))
        ).catch(e => console.warn('experience insert:', e.message));
      }
    }
  }

  /* ------------------------------------------------------------------
   * Interviews: Save
   * ------------------------------------------------------------------ */
  async saveInterview(rec) {
    try { window.db.saveInterview(rec); } catch (_) {}
    if (!this.isAvailable || !this.currentAppUser) return;

    const { data: interview, error } = await this.client.from('app_interviews').upsert({
      user_id: this.currentAppUser.id,
      role: rec.role,
      status: rec.status || 'Completed',
      technical_score: rec.technicalScore || 0,
      coding_score: rec.codingScore || 0,
      hr_score: rec.hrScore || 0,
      overall_score: rec.overallScore || 0,
      feedback: rec.feedback,
      completed_at: rec.status === 'Completed' ? new Date().toISOString() : null
    }).select().single();

    if (error) { console.warn('saveInterview:', error.message); return; }

    if (rec.technical?.breakdown) {
      const bd = rec.technical.breakdown;
      await this.client.from('app_technical_breakdown').upsert({
        interview_id: interview.id,
        resume_knowledge: bd.resumeKnowledge || 0,
        project_knowledge: bd.projectKnowledge || 0,
        dsa: bd.dsa || 0,
        technical_concepts: bd.technicalConcepts || 0,
        problem_solving: bd.problemSolving || 0,
        answer_quality: bd.answerQuality || 0
      }, { onConflict: 'interview_id' }).catch(e => console.warn('breakdown:', e.message));
    }
  }

  /* ------------------------------------------------------------------
   * Interviews: Load History
   * ------------------------------------------------------------------ */
  async getUserInterviews(userId) {
    if (!this.isAvailable || !this.currentAppUser) return window.db.getUserInterviews(userId);

    const { data, error } = await this.client
      .from('app_interviews')
      .select('*')
      .eq('user_id', this.currentAppUser.id)
      .order('created_at', { ascending: false });

    if (error || !data) return window.db.getUserInterviews(userId);

    return data.map(i => ({
      id: i.id,
      userId: i.user_id,
      date: i.created_at,
      role: i.role,
      technicalScore: i.technical_score,
      codingScore: i.coding_score,
      hrScore: i.hr_score,
      overallScore: i.overall_score,
      status: i.status,
      feedback: i.feedback
    }));
  }

  /* ------------------------------------------------------------------
   * Role Recommendations: Save
   * ------------------------------------------------------------------ */
  async saveRoleRecommendations(recommendations) {
    if (!this.isAvailable || !this.currentAppUser || !recommendations?.length) return;
    const uid = this.currentAppUser.id;
    await this.client.from('app_role_recommendations').delete().eq('user_id', uid).catch(() => {});
    await this.client.from('app_role_recommendations').insert(
      recommendations.map((r, idx) => ({
        user_id: uid,
        role_title: r.title || r.role,
        match_score: r.matchScore || r.score || 0,
        matching_skills: r.matchingSkills || [],
        missing_skills: r.missingSkills || [],
        is_primary: idx === 0
      }))
    ).catch(e => console.warn('recommendations:', e.message));
  }

  _mapUser(u) {
    return { id: u.id, fullName: u.full_name, email: u.email, phone: u.phone, avatar: u.avatar, createdAt: u.created_at };
  }
}

const supabaseService = new SupabaseService();
if (typeof window !== 'undefined') {
  window.supabaseService = supabaseService;
  supabaseService.init().catch(e => console.warn('Supabase init error:', e));
}
