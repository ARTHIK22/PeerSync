/* PeerSync browser storage helpers. Client-side storage is for this demo only. */
(function (global) {
  const USERS_KEY = 'peersync_users';
  const SESSION_KEY = 'peersync_session';
  const PROFILES_KEY = 'peersync_profiles';
  const DEMO_PROFILES_KEY = 'peersync_demo_profiles';

  function getStore(storeName) {
    try {
      const store = global[storeName];
      const probe = '__peersync_probe__';
      store.setItem(probe, '1');
      store.removeItem(probe);
      return { ok: true, store };
    } catch (error) {
      return { ok: false, error };
    }
  }

  function readJson(storeName, key, fallback) {
    const result = getStore(storeName);
    if (!result.ok) return { ok: false, value: fallback, error: 'storage-unavailable' };
    try {
      const raw = result.store.getItem(key);
      if (raw === null) return { ok: true, value: fallback };
      return { ok: true, value: JSON.parse(raw) };
    } catch (error) {
      try { result.store.removeItem(key); } catch (_) { /* storage may have become unavailable */ }
      return { ok: false, value: fallback, error: 'invalid-json' };
    }
  }

  function writeJson(storeName, key, value) {
    const result = getStore(storeName);
    if (!result.ok) return { ok: false, error: 'storage-unavailable' };
    try {
      result.store.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'storage-unavailable' };
    }
  }

  function remove(storeName, key) {
    const result = getStore(storeName);
    if (!result.ok) return false;
    try { result.store.removeItem(key); return true; } catch (_) { return false; }
  }

  function getUsersResult() {
    const result = readJson('localStorage', USERS_KEY, []);
    if (result.ok && (!Array.isArray(result.value) || result.value.some((user) => !user || typeof user !== 'object' || typeof user.id !== 'string' || typeof user.name !== 'string' || typeof user.email !== 'string' || typeof user.password !== 'string'))) {
      return { ok: false, value: [], error: 'invalid-data' };
    }
    return result;
  }
  function isStudentSuspended(userId) { try { const rows=JSON.parse(localStorage.getItem('peersync_account_statuses')||'[]'); return Array.isArray(rows)&&rows.some((row)=>row.userId===userId&&row.status==='suspended'); } catch (_) { return false; } }

  function saveUsers(users) {
    return Array.isArray(users) ? writeJson('localStorage', USERS_KEY, users) : { ok: false, error: 'invalid-data' };
  }

  function createEmptyProfile(user) {
    return {
      userId: user.id,
      personal: { name: user.name || '', headline: '', about: '', country: user.country || '', city: '', profileImage: '' },
      education: { college: user.college || '', degree: '', branch: '', graduationYear: '', academicYear: '', educationLevel: '' },
      skills: [], interests: [], experience: [], projects: [],
      socialLinks: { github: '', linkedin: '', portfolio: '', website: '' },
      collaboration: { lookingFor: [], availability: '', mode: [], preferredRoles: [] },
      profileCompletion: 0,
      updatedAt: ''
    };
  }

  function calculateProfileCompletion(profile) {
    if (!profile || typeof profile !== 'object') return 0;
    const personal = profile.personal || {};
    const education = profile.education || {};
    const collaboration = profile.collaboration || {};
    let score = 0;
    // Section weights: personal 20, education 15, skills 20, interests 10,
    // experience 10, projects 10, social links 5, collaboration 10.
    [['name', 5], ['headline', 5], ['about', 5], ['country', 5]].forEach(([key, weight]) => { if (String(personal[key] || '').trim()) score += weight; });
    [['college', 3.75], ['degree', 3.75], ['branch', 3.75], ['graduationYear', 3.75]].forEach(([key, weight]) => { if (String(education[key] || '').trim()) score += weight; });
    if (Array.isArray(profile.skills) && profile.skills.some((skill) => skill && String(skill.name || '').trim())) score += 20;
    if (Array.isArray(profile.interests) && profile.interests.some((interest) => String(interest || '').trim())) score += 10;
    if (Array.isArray(profile.experience) && profile.experience.some((item) => item && String(item.title || '').trim())) score += 10;
    if (Array.isArray(profile.projects) && profile.projects.some((item) => item && String(item.title || '').trim())) score += 10;
    const links = profile.socialLinks || {};
    if (['github', 'linkedin', 'portfolio', 'website'].some((key) => String(links[key] || '').trim())) score += 5;
    if (Array.isArray(collaboration.lookingFor) && collaboration.lookingFor.length) score += 2.5;
    if (['Available', 'Busy', 'Not currently available'].includes(collaboration.availability)) score += 2.5;
    if (Array.isArray(collaboration.mode) && collaboration.mode.length) score += 2.5;
    if (Array.isArray(collaboration.preferredRoles) && collaboration.preferredRoles.length) score += 2.5;
    return Math.min(100, Math.round(score));
  }

  function getProfilesResult() {
    const result = readJson('localStorage', PROFILES_KEY, {});
    const isRecord = (value) => value === undefined || (value && typeof value === 'object' && !Array.isArray(value));
    const validItems = (value, predicate) => value === undefined || (Array.isArray(value) && value.every(predicate));
    const recordItem = (item) => Boolean(item && typeof item === 'object' && !Array.isArray(item));
    if (result.ok && (!result.value || Array.isArray(result.value) || typeof result.value !== 'object' || Object.entries(result.value).some(([userId, profile]) => !profile || typeof profile !== 'object' || Array.isArray(profile) || profile.userId !== userId || !isRecord(profile.personal) || !isRecord(profile.education) || !isRecord(profile.socialLinks) || !isRecord(profile.collaboration) || !validItems(profile.skills, (item) => recordItem(item) && typeof item.name === 'string') || !validItems(profile.interests, (item) => typeof item === 'string') || !validItems(profile.experience, recordItem) || !validItems(profile.projects, recordItem)))) return { ok: false, value: {}, error: 'invalid-data' };
    return result;
  }

  function getStudentProfile(userId) {
    if (!userId || typeof userId !== 'string') return { ok: false, profile: null, error: 'invalid-user' };
    const users = getUsersResult();
    if (!users.ok) return { ok: false, profile: null, error: users.error };
    const user = users.value.find((item) => item.id === userId);
    if (!user) return { ok: false, profile: null, error: 'account-not-found' };
    const profiles = getProfilesResult();
    if (!profiles.ok) return { ok: false, profile: null, error: profiles.error };
    const saved = profiles.value[userId];
    const base = createEmptyProfile(user);
    const profile = saved ? { ...base, ...saved, personal: { ...base.personal, ...(saved.personal || {}) }, education: { ...base.education, ...(saved.education || {}) }, socialLinks: { ...base.socialLinks, ...(saved.socialLinks || {}) }, collaboration: { ...base.collaboration, ...(saved.collaboration || {}) } } : base;
    profile.profileCompletion = calculateProfileCompletion(profile);
    return { ok: true, profile };
  }

  function saveStudentProfile(userId, profile) {
    if (!userId || !profile || typeof profile !== 'object' || profile.userId !== userId) return { ok: false, error: 'invalid-profile' };
    const current = getStudentProfile(userId);
    if (!current.ok) return { ok: false, error: current.error };
    const profiles = getProfilesResult();
    if (!profiles.ok) return { ok: false, error: profiles.error };
    const merged = {
      ...current.profile, ...profile, userId,
      personal: { ...current.profile.personal, ...(profile.personal || {}), email: undefined },
      education: { ...current.profile.education, ...(profile.education || {}) },
      socialLinks: { ...current.profile.socialLinks, ...(profile.socialLinks || {}) },
      collaboration: { ...current.profile.collaboration, ...(profile.collaboration || {}) },
      skills: Array.isArray(profile.skills) ? profile.skills : current.profile.skills,
      interests: Array.isArray(profile.interests) ? profile.interests : current.profile.interests,
      experience: Array.isArray(profile.experience) ? profile.experience : current.profile.experience,
      projects: Array.isArray(profile.projects) ? profile.projects : current.profile.projects,
      updatedAt: new Date().toISOString()
    };
    merged.profileCompletion = calculateProfileCompletion(merged);
    const saved = writeJson('localStorage', PROFILES_KEY, { ...profiles.value, [userId]: merged });
    if (!saved.ok) return saved;
    // Keep the registered account display name aligned while leaving email and credentials untouched.
    if (merged.personal.name.trim() !== current.profile.personal.name.trim()) {
      const users = getUsersResult();
      if (users.ok) {
        const updated = users.value.map((user) => user.id === userId ? { ...user, name: merged.personal.name.trim() } : user);
        saveUsers(updated);
      }
    }
    return { ok: true, profile: merged };
  }

  function updateStudentProfile(userId, updates) {
    const current = getStudentProfile(userId);
    if (!current.ok) return current;
    const merged = { ...current.profile, ...updates };
    ['personal', 'education', 'socialLinks', 'collaboration'].forEach((key) => { if (updates && updates[key]) merged[key] = { ...current.profile[key], ...updates[key] }; });
    return saveStudentProfile(userId, merged);
  }

  function deleteStudentProfile(userId) {
    const result = getProfilesResult();
    if (!result.ok) return result;
    if (!Object.prototype.hasOwnProperty.call(result.value, userId)) return { ok: true, deleted: false };
    const profiles = { ...result.value };
    delete profiles[userId];
    const saved = writeJson('localStorage', PROFILES_KEY, profiles);
    return saved.ok ? { ok: true, deleted: true } : saved;
  }

  function createDemoProfiles() {
    const skillCategories = {
      javascript:'Programming',typescript:'Programming',python:'Programming',java:'Programming','c++':'Programming',r:'Programming',html:'Frontend',css:'Frontend',react:'Frontend','next.js':'Frontend','user research':'Design',figma:'Design',prototyping:'Design',accessibility:'Design',
      'node.js':'Backend',express:'Backend',fastapi:'Backend',flask:'Backend',mongodb:'Database',postgresql:'Database',mysql:'Database',sqlite:'Database',sql:'Database',firebase:'Database',
      'machine learning':'AI / ML','deep learning':'AI / ML',nlp:'AI / ML','computer vision':'AI / ML',docker:'Tools',git:'Tools',github:'Tools',postman:'Tools',linux:'Tools',unity:'Game development',kotlin:'Mobile', 'react native':'Mobile',aws:'Cloud','data visualization':'Data'
    };
    const entries = [
      ['demo_student_01','Maya Chen','Product-minded computer science student building kinder digital tools.','University of California, Berkeley','United States','Frontend Developer',['JavaScript','React','Figma'],['UI/UX Design','Open Source','Artificial Intelligence'],'Campus accessibility map'],
      ['demo_student_02','Aarav Mehta','I turn messy datasets into clear stories and useful products.','National University of Singapore','Singapore','Data Analyst',['Python','Machine Learning','PostgreSQL'],['Data Science','Research','Entrepreneurship'],'Transit patterns explorer'],
      ['demo_student_03','Nina Patel','Curious designer who loves making complex things feel simple.','University of Toronto','Canada','UI/UX Designer',['Figma','User Research','HTML'],['UI/UX Design','Mobile App Development','Open Source'],'Study space finder'],
      ['demo_student_04','Leo Kim','Building dependable web systems and learning in public.','Seoul National University','South Korea','Backend Developer',['TypeScript','Node.js','MongoDB'],['Web Development','Cloud Computing','Competitive Programming'],'Peer learning API'],
      ['demo_student_05','Amara Okafor','Research-focused ML student interested in responsible AI.','Imperial College London','United Kingdom','AI/ML Engineer',['Python','NLP','Deep Learning'],['Artificial Intelligence','Research','Open Source'],'Accessible lecture notes'],
      ['demo_student_06','Sofia Alvarez','Mobile developer and community volunteer working on climate ideas.','Tecnológico de Monterrey','Mexico','Full-Stack Developer',['JavaScript','React Native','Firebase'],['Mobile App Development','Entrepreneurship','Open Source'],'Greener campus steps'],
      ['demo_student_07','Lina Hassan','Cybersecurity learner and patient peer tutor.','American University of Beirut','Lebanon','Researcher',['Python','Linux','Docker'],['Cybersecurity','Research','Competitive Programming'],'Safer student web guide'],
      ['demo_student_08','Noah Williams','Game developer exploring playful ways to learn together.','University of Cape Town','South Africa','Frontend Developer',['C++','Unity','Git'],['Game Development','Education','Open Source'],'Collaborative puzzle lab'],
      ['demo_student_09','Priya Nair','Cloud computing student who enjoys making reliable tools for public-interest work.','University of Melbourne','Australia','Backend Developer',['Python','Docker','PostgreSQL','AWS'],['Cloud Computing','Web Development','Social impact'],'Community resource finder'],
      ['demo_student_10','Mateo Silva','I build friendly mobile experiences and love testing ideas with real people.','University of São Paulo','Brazil','Mobile Developer',['Kotlin','Figma','Firebase','User Research'],['Mobile App Development','UI/UX Design','Entrepreneurship'],'Campus events companion'],
      ['demo_student_11','Fatima Zahra','Data science learner interested in privacy-aware research and open tools.','Mohammed VI Polytechnic University','Morocco','Data Analyst',['R','Python','Data Visualization','SQL'],['Data Science','Research','Open Source'],'Open research dashboard'],
      ['demo_student_12','Ethan Brooks','Design student exploring inclusive learning and playful interfaces.','University of Edinburgh','United Kingdom','UI/UX Designer',['Figma','Prototyping','Accessibility','HTML'],['UI/UX Design','Education','Game Development'],'Accessible course planner']
    ];
    const profiles = entries.map(([userId,name,about,college,country,role,skillNames,interests,projectTitle],index) => ({
      userId, isDemo: true,
      personal: { name, headline: role, about, country, city: '', profileImage: '' },
      education: { college, degree: 'Bachelor of Science', branch: index % 2 ? 'Information Systems' : 'Computer Science', graduationYear: String(2027 + index % 2), academicYear: '3rd year', educationLevel: 'Undergraduate' },
      skills: skillNames.map((skill,skillIndex) => ({ name: skill, category: skillCategories[String(skill).toLocaleLowerCase()] || 'Other', proficiency: skillIndex === 0 ? 'Advanced' : 'Intermediate' })),
      interests, experience: [{ id: `demo_exp_${index+1}`, title: 'Student project contributor', organization: 'Campus Lab', type: 'Research', startDate: '2025-06', endDate: '', currentlyWorking: true, description: 'Collaborated with classmates on a practical student-led project.' }],
      projects: [{ id: `demo_project_${index+1}`, title: projectTitle, description: 'A student-built concept focused on making everyday campus life more useful and inclusive.', technologies: skillNames.slice(0,2), category: 'Student project', githubUrl: '', liveUrl: '', role }],
      socialLinks: { github: '', linkedin: '', portfolio: '', website: '' },
      collaboration: { lookingFor: ['Project collaboration','Study partners'], availability: 'Available', mode: ['Remote','Hybrid'], preferredRoles: [role] },
      profileCompletion: 0, updatedAt: '', createdAt: new Date(Date.UTC(2026, 5 + (index % 5), 2 + index)).toISOString(),
      experienceLevel: ['Beginner','Intermediate','Advanced'][index % 3]
    }));
    profiles.forEach((profile) => { profile.profileCompletion = calculateProfileCompletion(profile); });
    return profiles;
  }

  function getAllStudentProfiles() {
    const realUsers = getUsersResult();
    const demoResult = readJson('localStorage', DEMO_PROFILES_KEY, null);
    if (!demoResult.ok && demoResult.error !== 'invalid-json') return { ok: false, profiles: [], error: demoResult.error };
    let demos = demoResult.value;
    if (!Array.isArray(demos) || demos.length !== 12 || demos.some((profile) => !profile || typeof profile !== 'object' || typeof profile.userId !== 'string' || !Array.isArray(profile.skills) || !Array.isArray(profile.interests) || !Array.isArray(profile.experience) || !Array.isArray(profile.projects))) {
      demos = createDemoProfiles();
    }
    demos = demos.map((profile) => ({ ...profile, isDemo: true, profileCompletion: calculateProfileCompletion(profile) }));
    const savedDemos = writeJson('localStorage', DEMO_PROFILES_KEY, demos);
    if (!savedDemos.ok) return { ok: false, profiles: [], error: savedDemos.error };
    if (!realUsers.ok) return { ok: false, profiles: [], error: realUsers.error };
    const profiles = realUsers.value.filter((user)=>!isStudentSuspended(user.id)).map((user) => getStudentProfile(user.id)).filter((result) => result.ok).map((result) => ({ ...result.profile, createdAt: realUsers.value.find((user) => user.id === result.profile.userId)?.createdAt || '', isDemo: false }));
    return { ok: true, profiles: [...profiles, ...demos] };
  }

  function createId(prefix = 'item') {
    const random = global.crypto && typeof global.crypto.randomUUID === 'function' ? global.crypto.randomUUID() : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}_${random}`;
  }

  const PROJECTS_KEY = 'peersync_projects';
  const APPLICATIONS_KEY = 'peersync_project_applications';
  const projectList = () => {
    const result = readJson('localStorage', PROJECTS_KEY, []);
    return result.ok && Array.isArray(result.value) ? { ok: true, value: result.value } : { ok: false, value: [], error: result.error || 'invalid-data' };
  };
  const applicationList = () => {
    const result = readJson('localStorage', APPLICATIONS_KEY, []);
    return result.ok && Array.isArray(result.value) ? { ok: true, value: result.value } : { ok: false, value: [], error: result.error || 'invalid-data' };
  };
  function normalizedProject(project) {
    const raw = project.team || {};
    const memberIds = Array.isArray(raw.members) ? raw.members : (project.teamMemberIds || []).map((studentId) => ({ studentId, role: studentId === project.creatorId ? 'Project Lead' : 'Collaborator' }));
    if (project.creatorId && !memberIds.some((member) => member.studentId === project.creatorId)) memberIds.unshift({ studentId: project.creatorId, role: 'Project Lead', joinedAt: project.createdAt || new Date().toISOString() });
    const roles = project.requiredRoles || project.requiredTeamRoles || [];
    let rawPositions = Array.isArray(raw.positions) ? raw.positions : roles.map((role, index) => ({ id: `legacy_${project.id}_${index}`, role, requiredSkills: project.requiredSkills || [], openings: Math.max(1, Math.ceil(Number(project.openPositions || 1) / Math.max(1, roles.length))), filled: 0 }));
    if (!rawPositions.length) rawPositions = [{ id: `general_${project.id}`, role: 'General collaborator', requiredSkills: project.requiredSkills || [], openings: Math.max(1, Number(project.openPositions ?? (Number(raw.maxSize || project.maxTeamSize) || 5) - memberIds.length) || 1), filled: 0 }];
    const positions = rawPositions.map((position) => ({ ...position, openings: Math.max(1, Number(position.openings) || 1), filled: memberIds.filter((member) => member.positionId === position.id).length }));
    return { ...project, id: project.id || createId('project'), requirements: { skills: project.requiredSkills || [], interests: [], ...(project.requirements || {}) }, team: { ...raw, maxSize: Number(raw.maxSize || project.maxTeamSize) || 5, members: memberIds, positions }, timeline: { commitment: 'Flexible', ...(project.timeline || {}) }, resources: { ...(project.resources || {}) } };
  }
  function createProject(input) {
    try { const settings=JSON.parse(localStorage.getItem('peersync_platform_settings')||'{}'); if(settings.projectCreationEnabled===false||settings.maintenanceMode===true)return{ok:false,error:'project-creation-disabled'};if(String(input?.description||'').length>Number(settings.maxProjectDescriptionLength||3000))return{ok:false,error:'description-too-long'}; } catch (_) { /* default project rules apply */ }
    try { const statuses=JSON.parse(localStorage.getItem('peersync_account_statuses')||'[]'); if(Array.isArray(statuses)&&statuses.some((row)=>row.userId===input?.creatorId&&row.status==='suspended'))return{ok:false,error:'account-suspended'}; } catch (_) { /* continue with local default */ }
    if (!input || typeof input !== 'object' || !input.creatorId || !String(input.title || '').trim() || !String(input.description || '').trim() || !String(input.category || '').trim()) return { ok: false, error: 'invalid-project' };
    const profiles = getAllStudentProfiles();
    if (!profiles.ok || !profiles.profiles.some((profile) => profile.userId === input.creatorId && !profile.isDemo)) return { ok: false, error: 'creator-not-found' };
    const list = projectList(); if (!list.ok) return list;
    const project = normalizedProject({ ...input, id: input.id || createId('project'), creatorId: input.creatorId, createdAt: input.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(), status: input.status || 'Recruiting' });
    if (list.value.some((item) => item.id === project.id)) return { ok: false, error: 'duplicate-project' };
    if (!Array.isArray(project.team.members)) project.team.members = [];
    if (!project.team.members.some((member) => member.studentId === project.creatorId)) project.team.members.unshift({ studentId: project.creatorId, role: 'Project Lead', joinedAt: project.createdAt });
    project.team.positions = project.team.positions.map((position) => ({ ...position, filled: project.team.members.filter((member) => member.positionId === position.id).length }));
    const saved = writeJson('localStorage', PROJECTS_KEY, [...list.value, project]);
    return saved.ok ? { ok: true, project } : saved;
  }
  function getAllProjects(options = {}) { const result = projectList(); return result.ok ? { ok: true, projects: result.value.filter((project)=>options.includeSuspended===true||String(project.status||'').toLowerCase()!=='suspended').filter((project)=>options.includePrivate||project.visibility !== 'private' || project.creatorId === options.userId || (project.team?.members || []).some((member) => member.studentId === options.userId)) } : { ok: false, projects: [], error: result.error }; }
  function getProjectById(id, options = {}) { const result = getAllProjects({ includePrivate: true }); if (!result.ok) return { ok: false, project: null, error: result.error }; const stored = result.projects.find((item) => item.id === id); const project = stored ? normalizedProject(stored) : null; const member = project && project.team.members.some((entry) => entry.studentId === options.userId); let invited = false; if (project && options.userId && project.visibility === 'private') { const apps = applicationList(); invited = apps.ok && apps.value.some((app) => app.projectId === id && app.applicantId === options.userId && app.kind === 'invitation' && app.status === 'Pending'); } if (!project || project.visibility === 'private' && project.creatorId !== options.userId && !member && !invited) return { ok: false, project: null, error: 'project-not-found' }; return { ok: true, project }; }
  function updateProject(id, actorId, updates) { try { const settings=JSON.parse(localStorage.getItem('peersync_platform_settings')||'{}');if(String(updates?.description||'').length>Number(settings.maxProjectDescriptionLength||3000))return{ok:false,error:'description-too-long'}; } catch (_) {} const result = projectList(); if (!result.ok) return result; const index = result.value.findIndex((item) => item.id === id); if (index < 0) return { ok: false, error: 'project-not-found' }; if (result.value[index].creatorId !== actorId) return { ok: false, error: 'not-owner' }; const current = normalizedProject(result.value[index]); const next = normalizedProject({ ...current, ...updates, id, creatorId: current.creatorId, team: { ...current.team, ...(updates.team || {}) }, requirements: { ...current.requirements, ...(updates.requirements || {}) }, timeline: { ...current.timeline, ...(updates.timeline || {}) }, resources: { ...current.resources, ...(updates.resources || {}) }, updatedAt: new Date().toISOString() }); const saved = writeJson('localStorage', PROJECTS_KEY, result.value.map((item, i) => i === index ? next : item)); return saved.ok ? { ok: true, project: next } : saved; }
  function deleteProject(id, actorId) { const result = projectList(); if (!result.ok) return result; const project = result.value.find((item) => item.id === id); if (!project) return { ok: true, deleted: false }; if (project.creatorId !== actorId) return { ok: false, error: 'not-owner' }; const saved = writeJson('localStorage', PROJECTS_KEY, result.value.filter((item) => item.id !== id)); if (!saved.ok) return saved; const apps = applicationList(); if (apps.ok) writeJson('localStorage', APPLICATIONS_KEY, apps.value.filter((app) => app.projectId !== id)); return { ok: true, deleted: true }; }
  function getProjectsByCreator(id) { const result = projectList(); return result.ok ? { ok: true, projects: result.value.filter((project) => project.creatorId === id) } : { ok: false, projects: [], error: result.error }; }
  function getProjectsByMember(id) { const result = projectList(); return result.ok ? { ok: true, projects: result.value.filter((project) => normalizedProject(project).team.members.some((member) => member.studentId === id) && project.creatorId !== id) } : { ok: false, projects: [], error: result.error }; }
  function addProjectMember(id, studentId, role, actorId = studentId, positionId = '') { const result = projectList(); if (!result.ok) return result; const stored = result.value.find((item) => item.id === id); if (!stored) return { ok: false, error: 'project-not-found' }; const project = normalizedProject(stored); if (actorId !== project.creatorId && actorId !== studentId) return { ok: false, error: 'not-authorized' }; const student = getStudentProfile(studentId); if (!student.ok) return { ok: false, error: 'student-not-found' }; if (project.team.members.some((member) => member.studentId === studentId)) return { ok: false, error: 'already-member' }; if (['Closed','Completed','On Hold'].includes(project.status) || project.team.members.length >= Number(project.team.maxSize)) return { ok: false, error: 'team-unavailable' }; const position = project.team.positions.find((item) => item.id === positionId); if (project.team.positions.length && !position) return { ok: false, error: 'position-unavailable' }; if (position && Number(position.filled) >= Number(position.openings)) return { ok: false, error: 'position-full' }; const next = project; next.team.members.push({ studentId, role: role || position?.role || 'Collaborator', positionId, joinedAt: new Date().toISOString() }); next.team.positions = next.team.positions.map((item) => ({ ...item, filled: next.team.members.filter((member) => member.positionId === item.id).length })); if (next.openPositions !== undefined) next.openPositions = next.team.positions.reduce((sum, item) => sum + Math.max(0, item.openings - item.filled), 0); next.updatedAt = new Date().toISOString(); const saved = writeJson('localStorage', PROJECTS_KEY, result.value.map((item) => item.id === id ? next : item)); return saved.ok ? { ok: true, project: next } : saved; }
  function removeProjectMember(id, studentId, actorId = studentId) { const result = projectList(); if (!result.ok) return result; const stored = result.value.find((item) => item.id === id); if (!stored) return { ok: false, error: 'project-not-found' }; const next = normalizedProject(stored); if (studentId === next.creatorId || actorId !== studentId && actorId !== next.creatorId) return { ok: false, error: 'not-authorized' }; next.team.members = next.team.members.filter((member) => member.studentId !== studentId); next.team.positions = next.team.positions.map((item) => ({ ...item, filled: next.team.members.filter((member) => member.positionId === item.id).length })); if (next.openPositions !== undefined) next.openPositions = next.team.positions.reduce((sum, item) => sum + Math.max(0, item.openings - item.filled), 0); const saved = writeJson('localStorage', PROJECTS_KEY, result.value.map((item) => item.id === id ? next : item)); return saved.ok ? { ok: true, project: next } : saved; }
  function getProjectApplications(projectId) { const result = applicationList(); return result.ok ? { ok: true, applications: result.value.filter((app) => app.projectId === projectId) } : { ok: false, applications: [], error: result.error }; }
  function getMyProjectInvitations(studentId) { const result = applicationList(); if (!result.ok) return { ok: false, invitations: [], error: result.error }; return { ok: true, invitations: result.value.filter((app) => app.kind === 'invitation' && app.applicantId === studentId && app.status === 'Pending').map((app) => ({ ...app, project: getProjectById(app.projectId, { userId: studentId }).project || null })).filter((app) => app.project) }; }
  function createProjectApplication(input) { if (!input?.projectId || !input?.applicantId || !input?.role) return { ok: false, error: 'invalid-application' }; const isInvite = input.kind === 'invitation'; if (!getStudentProfile(input.applicantId).ok || isInvite && !getStudentProfile(input.inviterId).ok) return { ok: false, error: 'student-not-found' }; const projectResult = getProjectById(input.projectId, { userId: isInvite ? input.inviterId : input.applicantId }); if (!projectResult.ok) return projectResult; const project = projectResult.project; if (isInvite && project.creatorId !== input.inviterId) return { ok: false, error: 'not-authorized' }; if (project.creatorId === input.applicantId) return { ok: false, error: 'own-project' }; if (['Closed','Completed','On Hold'].includes(project.status)) return { ok: false, error: 'project-closed' }; if ((project.team?.members || []).some((member) => member.studentId === input.applicantId)) return { ok: false, error: 'already-member' }; if ((project.team?.members || []).length >= Number(project.team?.maxSize)) return { ok: false, error: 'team-full' }; const positions = project.team?.positions || []; const position = positions.find((item) => item.id === input.positionId || item.role === input.role); if (positions.length && !position) return { ok: false, error: 'position-unavailable' }; if (position && Number(position.filled) >= Number(position.openings)) return { ok: false, error: 'position-full' }; const list = applicationList(); if (!list.ok) return list; if (list.value.some((app) => app.projectId === input.projectId && app.applicantId === input.applicantId && ['Pending','Accepted'].includes(app.status))) return { ok: false, error: 'duplicate-application' }; const application = { ...input, kind: isInvite ? 'invitation' : 'application', id: createId(isInvite ? 'invite' : 'application'), status: 'Pending', createdAt: new Date().toISOString() }; const saved = writeJson('localStorage', APPLICATIONS_KEY, [...list.value, application]); return saved.ok ? { ok: true, application } : saved; }
  function updateApplicationStatus(id, actorId, status) { if (!['Accepted','Rejected','Withdrawn'].includes(status)) return { ok: false, error: 'invalid-status' }; const apps = applicationList(); if (!apps.ok) return apps; const app = apps.value.find((item) => item.id === id); if (!app) return { ok: false, error: 'application-not-found' }; const project = getProjectById(app.projectId, { userId: actorId }); if (!project.ok) return project; const applicantControlsInvite = app.kind === 'invitation' && actorId === app.applicantId; if (status === 'Withdrawn' ? app.applicantId !== actorId : applicantControlsInvite ? false : project.project.creatorId !== actorId) return { ok: false, error: 'not-authorized' }; if (app.status !== 'Pending') return { ok: false, error: 'application-not-pending' }; if (status === 'Accepted') { const added = addProjectMember(app.projectId, app.applicantId, app.role, applicantControlsInvite ? project.project.creatorId : actorId, app.positionId); if (!added.ok) return added; } const saved = writeJson('localStorage', APPLICATIONS_KEY, apps.value.map((item) => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item)); if (!saved.ok && status === 'Accepted') removeProjectMember(app.projectId, app.applicantId, project.project.creatorId); return saved.ok ? { ok: true, application: { ...app, status } } : saved; }

  function getSessionResult(storeName) {
    const result = readJson(storeName, SESSION_KEY, null);
    if (!result.ok) return result;
    if (result.value === null) return result;
    const valid = result.value && typeof result.value.userId === 'string' && typeof result.value.loginAt === 'string';
    return valid ? result : { ok: false, value: null, error: 'invalid-session' };
  }

  global.PeerStorage = Object.freeze({
    usersKey: USERS_KEY,
    sessionKey: SESSION_KEY,
    profilesKey: PROFILES_KEY,
    demoProfilesKey: DEMO_PROFILES_KEY,
    getUsersResult,
    isStudentSuspended,
    saveUsers,
    createEmptyProfile,
    getStudentProfile,
    saveStudentProfile,
    updateStudentProfile,
    deleteStudentProfile,
    calculateProfileCompletion,
    getAllStudentProfiles,
    createProject, getProjectById, getAllProjects, updateProject, deleteProject, getProjectsByCreator, getProjectsByMember, addProjectMember, removeProjectMember, getProjectApplications, getMyProjectInvitations, createProjectApplication, updateApplicationStatus,
    createId,
    getSessionResult,
    saveSession: (storeName, session) => writeJson(storeName, SESSION_KEY, session),
    clearSession: () => { remove('sessionStorage', SESSION_KEY); remove('localStorage', SESSION_KEY); },
    hasLocalStorage: () => getStore('localStorage').ok
  });
}(window));
