const profileStudent = PeerAuth.requireAuthentication();
const profileCompletionSections = [
  ['Personal information', (p) => Boolean(p.personal.headline && p.personal.about && p.personal.country)],
  ['Academic information', (p) => Boolean(p.education.degree && p.education.branch && p.education.graduationYear)],
  ['Technical skills', (p) => p.skills.length > 0], ['Interests', (p) => p.interests.length > 0],
  ['Experience', (p) => p.experience.length > 0], ['Projects', (p) => p.projects.length > 0],
  ['Social links', (p) => Object.values(p.socialLinks).some(Boolean)],
  ['Collaboration preferences', (p) => p.collaboration.lookingFor.length && p.collaboration.mode.length && p.collaboration.preferredRoles.length]
];

function profileText(id, value, fallback = '—') { document.getElementById(id).textContent = value || fallback; }
function addProfileTag(parent, value, className = '') {
  if (!value) return;
  const tag = document.createElement('span');
  tag.className = className;
  tag.textContent = value;
  parent.append(tag);
}
function safeWebUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch (_) { return ''; }
}
function setEmptyState(elementId, empty) { document.getElementById(elementId).hidden = !empty; }

function renderProfile(profile) {
  const personal = profile.personal;
  const education = profile.education;
  const collaboration = profile.collaboration;
  profileText('profile-name', personal.name, profileStudent.name);
  profileText('profile-headline', personal.headline, 'Student collaborator · Add a headline');
  profileText('profile-college', education.college, profileStudent.college);
  profileText('profile-location', [personal.city, personal.country || profileStudent.country].filter(Boolean).join(', '));
  profileText('profile-email', profileStudent.email);
  profileText('about-copy', personal.about, 'Share what you care about, what you’re learning, and the kind of things you want to build. Your story helps potential collaborators get to know you.');
  profileText('education-college', education.college, profileStudent.college);
  profileText('education-degree', [education.degree, education.branch].filter(Boolean).join(' · '), 'Add a degree and branch');
  profileText('education-years', [education.educationLevel, education.academicYear, education.graduationYear && `Class of ${education.graduationYear}`].filter(Boolean).join(' · '), 'Add your graduation year');
  profileText('side-degree', education.degree); profileText('side-branch', education.branch);
  profileText('side-year', education.graduationYear); profileText('side-level', education.educationLevel || education.academicYear);
  document.getElementById('demo-label').hidden = !profile.isDemo;
  const initials = personal.name.trim().split(/\s+/).slice(0,2).map((part) => part[0]).join('').toUpperCase() || 'P';
  profileText('avatar-initials', initials);
  const avatar = document.getElementById('avatar-image');
  if (personal.profileImage && personal.profileImage.startsWith('data:image/')) { avatar.src = personal.profileImage; avatar.hidden = false; document.getElementById('avatar-initials').hidden = true; }
  else { avatar.hidden = true; document.getElementById('avatar-initials').hidden = false; }
  const availability = collaboration.availability || 'Not set';
  document.querySelector('#availability').lastChild.textContent = ` ${availability}`;
  document.querySelector('#availability-large span').textContent = availability;
  const availabilityClass = availability === 'Available' ? 'is-available' : availability === 'Busy' ? 'is-busy' : 'is-unavailable';
  document.getElementById('availability').className = `availability ${availabilityClass}`;
  document.getElementById('availability-large').className = `availability-large ${availabilityClass}`;

  const skillList = document.getElementById('skill-list'); skillList.replaceChildren();
  profile.skills.forEach((skill) => { const item = document.createElement('div'); item.className = 'skill-item'; const line = document.createElement('div'); line.className = 'skill-item-head'; const name = document.createElement('b'); name.textContent = skill.name; const level = document.createElement('span'); level.textContent = skill.proficiency; line.append(name, level); const category = document.createElement('small'); category.textContent = skill.category; const dots = document.createElement('div'); dots.className = `skill-level level-${String(skill.proficiency || '').toLowerCase()}`; for (let i=0;i<4;i++) dots.append(document.createElement('i')); item.append(line, category, dots); skillList.append(item); });
  setEmptyState('skills-empty', !profile.skills.length);
  const interestList = document.getElementById('interest-list'); interestList.replaceChildren(); profile.interests.forEach((interest) => addProfileTag(interestList, interest, 'interest-tag'));
  setEmptyState('interests-empty', !profile.interests.length);

  const expList = document.getElementById('experience-list'); expList.replaceChildren();
  profile.experience.forEach((entry) => { const item = document.createElement('article'); item.className = 'timeline-item'; const dot = document.createElement('span'); dot.className = 'timeline-dot'; const body = document.createElement('div'); body.className = 'timeline-content'; const title = document.createElement('h3'); title.textContent = entry.title; const org = document.createElement('p'); org.className = 'timeline-org'; org.textContent = [entry.organization, entry.type].filter(Boolean).join(' · '); const dates = document.createElement('small'); dates.textContent = `${entry.startDate || 'Start date'} — ${entry.currentlyWorking ? 'Present' : entry.endDate || 'End date'}`; body.append(title,org,dates); if(entry.description){const desc=document.createElement('p');desc.className='timeline-description';desc.textContent=entry.description;body.append(desc);} item.append(dot,body);expList.append(item); });
  setEmptyState('experience-empty', !profile.experience.length);

  const projectList = document.getElementById('projects-list'); projectList.replaceChildren();
  profile.projects.forEach((project) => { const card=document.createElement('article');card.className='featured-project';const icon=document.createElement('span');icon.className='featured-project-icon';icon.textContent='✳';const body=document.createElement('div');body.className='featured-project-body';const title=document.createElement('h3');title.textContent=project.title;const category=document.createElement('small');category.textContent=[project.category,project.role].filter(Boolean).join(' · ');const description=document.createElement('p');description.textContent=project.description;const tech=document.createElement('div');tech.className='project-tech';(project.technologies||[]).forEach((t)=>addProfileTag(tech,t,'mini-tag'));body.append(title,category,description,tech);const actions=document.createElement('div');actions.className='project-actions';[['GitHub',project.githubUrl],['Live project',project.liveUrl]].forEach(([label,value])=>{const href=safeWebUrl(value);if(href){const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;actions.append(a);}});card.append(icon,body,actions);projectList.append(card); });
  setEmptyState('projects-empty', !profile.projects.length);
  const socialList=document.getElementById('social-links');socialList.replaceChildren();const socialLabels={github:'GitHub',linkedin:'LinkedIn',portfolio:'Portfolio',website:'Personal website'};Object.entries(socialLabels).forEach(([key,label])=>{const href=safeWebUrl(profile.socialLinks[key]);if(!href)return;const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.className='social-button';a.textContent=`↗ ${label}`;socialList.append(a);});
  setEmptyState('social-empty', !socialList.children.length);
  const renderTags=(id,items)=>{const el=document.getElementById(id);el.replaceChildren();(items||[]).forEach((item)=>addProfileTag(el,item,'preference-tag'));};
  renderTags('looking-for',collaboration.lookingFor);renderTags('collaboration-mode',collaboration.mode);renderTags('preferred-roles',collaboration.preferredRoles);renderTags('sidebar-mode',collaboration.mode);
  const completion=PeerStorage.calculateProfileCompletion(profile);profileText('completion-number',`${completion}%`);const circumference=2*Math.PI*49;const ring=document.getElementById('completion-ring');ring.style.strokeDasharray=String(circumference);ring.style.strokeDashoffset=String(circumference*(1-completion/100));
  const sectionList=document.getElementById('completion-sections');sectionList.replaceChildren();const suggestions=[];profileCompletionSections.forEach(([name,done])=>{const complete=done(profile);const row=document.createElement('div');row.className='completion-row';const icon=document.createElement('i');icon.textContent=complete?'✓':'+';const text=document.createElement('span');text.textContent=name;row.append(icon,text);sectionList.append(row);if(!complete)suggestions.push(name);});
  const suggestionBox=document.getElementById('completion-suggestions');suggestionBox.replaceChildren();if(suggestions.length){const title=document.createElement('b');title.textContent='A few ways to add more';suggestionBox.append(title);suggestions.slice(0,3).forEach((item)=>{const p=document.createElement('p');p.textContent=`+ ${item}`;suggestionBox.append(p);});}
}

if (profileStudent) {
  const result=PeerStorage.getStudentProfile(profileStudent.id);
  if(result.ok) renderProfile(result.profile);
  else { document.querySelector('.profile-main-column').innerHTML='<section class="profile-card"><h1>Profile unavailable</h1><p>Your profile data could not be read. Try reloading the page.</p></section>'; }
}
document.getElementById('profile-logout').addEventListener('click',()=>{PeerAuth.logoutUser();window.location.href='login.html?loggedOut=1';});
