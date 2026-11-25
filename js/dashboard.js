const dashboardApp = {
  user: null,
  profile: null,
  profiles: [],
  projects: [],
  requests: [],
  connections: [],
  notifications: [],
  activities: [],
  recommendations: [],
  featuredProjects: []
};

const dashboardKeys = {
  projects: 'peersync_projects',
  demoProjects: 'peersync_demo_projects',
  requests: 'peersync_requests',
  connections: 'peersync_connections',
  notifications: 'peersync_notifications',
  activities: 'peersync_activities'
};

const demoProjectSeed = [
  { id:'demo_project_study_spaces', isDemo:true, title:'Study spaces, without the guesswork', description:'Help students find the right place to focus with a community-powered campus study map.', category:'Education', requiredSkills:['JavaScript','User Research','Figma'], requiredRoles:['Frontend Developer','UI/UX Designer'], maxTeamSize:5, teamMemberIds:['demo_student_03','demo_student_01'], openPositions:3, status:'active', creatorId:'demo_student_03', createdAt:'2026-10-14T12:00:00.000Z' },
  { id:'demo_project_green_steps', isDemo:true, title:'Small Steps, Greener Cities', description:'A playful way to make everyday climate choices add up across student communities.', category:'Social impact', requiredSkills:['Data Science','Mobile App Development','Design'], requiredRoles:['Data Analyst','Mobile developer'], maxTeamSize:5, teamMemberIds:['demo_student_06'], openPositions:4, status:'active', creatorId:'demo_student_06', createdAt:'2026-10-20T12:00:00.000Z' },
  { id:'demo_project_open_study', isDemo:true, title:'Open Study Buddy', description:'Make peer learning feel less like a solo mission with lightweight study groups.', category:'Education', requiredSkills:['React','Mobile App Development','Product thinking'], requiredRoles:['Frontend Developer','Project Manager'], maxTeamSize:4, teamMemberIds:['demo_student_01'], openPositions:3, status:'active', creatorId:'demo_student_01', createdAt:'2026-10-25T12:00:00.000Z' },
  { id:'demo_project_accessible_notes', isDemo:true, title:'Accessible Lecture Notes', description:'Explore tools that help students turn lecture materials into formats that work for them.', category:'AI & accessibility', requiredSkills:['Python','NLP','User Research'], requiredRoles:['AI/ML Engineer','Researcher'], maxTeamSize:5, teamMemberIds:['demo_student_05'], openPositions:4, status:'active', creatorId:'demo_student_05', createdAt:'2026-11-01T12:00:00.000Z' },
  { id:'demo_project_puzzle_lab', isDemo:true, title:'Collaborative Puzzle Lab', description:'Build a small multiplayer puzzle experience for learning logic together.', category:'Creative technology', requiredSkills:['C++','Game Development','UI/UX Design'], requiredRoles:['Frontend Developer','Game designer'], maxTeamSize:4, teamMemberIds:['demo_student_08'], openPositions:3, status:'active', creatorId:'demo_student_08', createdAt:'2026-11-03T12:00:00.000Z' }
];

function safeReadArray(key) {
  try {
    const raw=localStorage.getItem(key);
    if(!raw)return [];
    const parsed=JSON.parse(raw);
    return Array.isArray(parsed)?parsed:[];
  } catch (_) { return []; }
}
function safeReadOrSeedProjects() {
  try {
    const raw=localStorage.getItem(dashboardKeys.demoProjects);
    if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed)&&parsed.length)return parsed;}
    localStorage.setItem(dashboardKeys.demoProjects,JSON.stringify(demoProjectSeed));
  } catch (_) { /* demo data is optional when storage is blocked */ }
  return demoProjectSeed;
}
function greetingForHour(hour=new Date().getHours()) { if(hour<12)return 'Good morning';if(hour<18)return 'Good afternoon';return 'Good evening'; }
function getGreeting() { return greetingForHour(); }
function humanDate(value,includeTime=false) {
  const date=value?new Date(value):null;if(!date||Number.isNaN(date.getTime()))return 'Date not provided';
  return new Intl.DateTimeFormat(undefined,includeTime?{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:{month:'long',day:'numeric'}).format(date);
}
function initialsFor(name='Student') { return String(name).trim().split(/\s+/).filter(Boolean).slice(0,2).map((part)=>part[0]).join('').toUpperCase()||'P'; }
function setDashboardAvatar(element,image,name) {
  element.replaceChildren();
  if(image&&String(image).startsWith('data:image/')){const img=document.createElement('img');img.src=image;img.alt='';element.append(img);}
  else element.textContent=initialsFor(name);
}
function profileForUser(userId) { return dashboardApp.profiles.find((profile)=>profile.userId===userId)||null; }
function getFirstName(name) { return String(name||'Student').trim().split(/\s+/)[0]||'Student'; }
function findUserName(userId) { const profile=profileForUser(userId);if(profile)return profile.personal.name;const users=PeerStorage.getUsersResult();return users.ok?(users.value.find((user)=>user.id===userId)?.name||'PeerSync student'):'PeerSync student'; }
function belongsToUser(record,userId) { return [record.userId,record.studentId,record.ownerId,record.createdBy,record.creatorId].includes(userId); }
function containsUser(record,userId) {
  const ids=[record.fromUserId,record.toUserId,record.senderId,record.receiverId,record.requesterId,record.recipientId,record.userId,record.studentId,record.ownerId,record.creatorId];
  if(ids.includes(userId))return true;
  const members=record.memberIds||record.members||record.userIds||[];
  return Array.isArray(members)&&members.some((member)=>typeof member==='string'?member===userId:member&&[member.userId,member.id,member.studentId].includes(userId));
}
function isActiveProject(project) { return ['active','in progress','in_progress','recruiting','open'].includes(String(project.status||'active').toLowerCase()); }
function projectTeamIds(project) {
  const source=project.team?.members||project.teamMemberIds||project.memberIds||project.members||[];
  const ids=Array.isArray(source)?source.map((member)=>typeof member==='string'?member:member&&(member.studentId||member.userId||member.id)).filter(Boolean):[];
  const creator=project.creatorId||project.ownerId||project.createdBy;
  if(creator&&!ids.includes(creator))ids.unshift(creator);
  return [...new Set(ids)];
}
function hasOpenPositions(project) {
  if(project.openPositions!==undefined&&project.openPositions!==null)return Number(project.openPositions)>0;
  if(Array.isArray(project.team?.positions))return project.team.positions.some((position)=>Number(position.openings)>Number(position.filled||0));
  return Number(project.maxTeamSize||project.team?.maxSize||0)>projectTeamIds(project).length;
}
function projectOpenCount(project) {
  if(project.openPositions!==undefined&&project.openPositions!==null)return Math.max(0,Number(project.openPositions)||0);
  if(Array.isArray(project.team?.positions))return project.team.positions.reduce((total,position)=>total+Math.max(0,Number(position.openings||0)-Number(position.filled||0)),0);
  return Math.max(0,Number(project.maxTeamSize||project.team?.maxSize||0)-projectTeamIds(project).length);
}
function acceptedConnection(connection,userId) { const status=String(connection.status||'').toLowerCase();return (connection.accepted===true||status==='accepted'||status==='connected')&&containsUser(connection,userId); }
function incomingPending(request,userId) { const recipient=request.toUserId||request.receiverId||request.recipientId||request.targetUserId;const status=String(request.status||'pending').toLowerCase();return recipient===userId&&['pending','sent','requested'].includes(status); }

function loadCurrentStudent() {
  dashboardApp.user=PeerAuth.requireAuthentication();
  if(!dashboardApp.user)return false;
  const result=PeerStorage.getStudentProfile(dashboardApp.user.id);
  if(!result.ok)return false;
  dashboardApp.profile=result.profile;
  return true;
}
function loadDashboardStats() {
  const profileResult=PeerStorage.getAllStudentProfiles();
  dashboardApp.profiles=profileResult.ok?profileResult.profiles:[];
  dashboardApp.projects=safeReadArray(dashboardKeys.projects);
  dashboardApp.requests=safeReadArray(dashboardKeys.requests);
  dashboardApp.connections=safeReadArray(dashboardKeys.connections);
  dashboardApp.notifications=safeReadArray(dashboardKeys.notifications);
  dashboardApp.activities=safeReadArray(dashboardKeys.activities);
  const currentId=dashboardApp.user.id;
  const ownProjects=dashboardApp.projects.filter((project)=>project&&isActiveProject(project)&&projectTeamIds(project).includes(currentId));
  const accepted=dashboardApp.connections.filter((connection)=>connection&&acceptedConnection(connection,currentId));
  const pending=dashboardApp.requests.filter((request)=>request&&incomingPending(request,currentId));
  const completion=PeerStorage.calculateProfileCompletion(dashboardApp.profile);
  return {connections:accepted.length,projects:ownProjects.length,requests:pending.length,completion};
}
function renderStats(stats) {
  document.getElementById('stat-connections').textContent=String(stats.connections);
  document.getElementById('stat-connections-note').textContent=stats.connections?`${stats.connections} accepted connection${stats.connections===1?'':'s'}`:'Your network starts here';
  document.getElementById('stat-projects').textContent=String(stats.projects);
  document.getElementById('stat-projects-note').textContent=stats.projects?`${stats.projects} active team project${stats.projects===1?'':'s'}`:'No active team projects yet';
  document.getElementById('stat-requests').textContent=String(stats.requests);
  document.getElementById('stat-requests-note').textContent=stats.requests?`${stats.requests} waiting for your response`:'No requests waiting';
  document.getElementById('stat-completion').textContent=`${stats.completion}%`;
  document.getElementById('stat-completion-note').textContent=stats.completion===100?'Your profile is all set':'Keep adding the details that make you, you';
  document.getElementById('stat-mini-progress').style.width=`${stats.completion}%`;
}
const dashboardCompletionSections=[
  ['Personal information',(p)=>Boolean(p.personal.headline&&p.personal.about&&p.personal.country)],
  ['Academic information',(p)=>Boolean(p.education.degree&&p.education.branch&&p.education.graduationYear)],
  ['Technical skills',(p)=>p.skills.length>0],['Interests',(p)=>p.interests.length>0],
  ['Experience',(p)=>p.experience.length>0],['Projects',(p)=>p.projects.length>0],
  ['Social links',(p)=>Object.values(p.socialLinks).some(Boolean)],
  ['Collaboration preferences',(p)=>p.collaboration.lookingFor.length&&p.collaboration.mode.length&&p.collaboration.preferredRoles.length]
];
function renderProfileCompletion() {
  const profile=dashboardApp.profile,completion=PeerStorage.calculateProfileCompletion(profile);
  const circle=document.getElementById('profile-progress-ring');const circumference=2*Math.PI*49;
  circle.style.strokeDasharray=String(circumference);circle.style.strokeDashoffset=String(circumference*(1-completion/100));
  document.getElementById('profile-progress-number').textContent=`${completion}%`;
  document.getElementById('progress-title').textContent=completion===100?'Your profile is ready to meet its people.':completion>=70?'Your profile is taking shape.':completion>=35?'You’re making a good start.':'Your profile is a work in progress.';
  document.getElementById('progress-copy').textContent=completion===100?'You’ve shared a clear picture of what you know and what you’d like to build.':'A few more details can help future teammates understand what you bring to the table.';
  const list=document.getElementById('progress-sections');list.replaceChildren();const missing=[];
  dashboardCompletionSections.forEach(([label,complete])=>{const done=Boolean(complete(profile));const row=document.createElement('span');row.className=done?'done':'incomplete';const icon=document.createElement('i');icon.textContent=done?'✓':'+';row.append(icon,document.createTextNode(label));list.append(row);if(!done)missing.push(label);});
  const next=document.getElementById('progress-next');const prompt=missing[0];const suggestions={ 'Personal information':['personal','Add a headline and a short introduction'], 'Academic information':['education','Add your degree and graduation year'], 'Technical skills':['skills','Add your technical skills'], 'Interests':['interests','Choose a few interests'], 'Experience':['experience','Add a little experience'], 'Projects':['projects','Show a project you’ve worked on'], 'Social links':['social','Add your GitHub or portfolio'], 'Collaboration preferences':['collaboration','Choose how you’d like to collaborate'] };
  if(prompt){const [anchor,label]=suggestions[prompt];next.href=`edit-profile.html#${anchor}`;next.innerHTML=`${label} <span>→</span>`;next.hidden=false;}else{next.href='profile.html';next.innerHTML='View your profile <span>→</span>';next.hidden=false;}
}
function overlapScore(candidate) {
  const ownSkills=new Set(dashboardApp.profile.skills.map((skill)=>String(skill.name||'').toLowerCase()));
  const ownInterests=new Set(dashboardApp.profile.interests.map((interest)=>String(interest).toLowerCase()));
  const sharedSkills=(candidate.skills||[]).filter((skill)=>ownSkills.has(String(skill.name||'').toLowerCase())).length;
  const sharedInterests=(candidate.interests||[]).filter((interest)=>ownInterests.has(String(interest).toLowerCase())).length;
  return {sharedSkills,sharedInterests,score:sharedSkills*2+sharedInterests};
}
function createPersonAvatar(profile,className='person-card-avatar') {
  const avatar=document.createElement('span');avatar.className=className;
  if(profile.personal.profileImage&&String(profile.personal.profileImage).startsWith('data:image/')){const img=document.createElement('img');img.src=profile.personal.profileImage;img.alt='';avatar.append(img);}else avatar.textContent=initialsFor(profile.personal.name);
  return avatar;
}
function openStudentDetails(profile) {
  const content=document.getElementById('detail-dialog-content');content.replaceChildren();
  const head=document.createElement('div');head.className='detail-dialog-head';head.append(createPersonAvatar(profile,'detail-avatar'));
  const identity=document.createElement('div');const name=document.createElement('h2');name.textContent=profile.personal.name;const headline=document.createElement('p');headline.textContent=profile.personal.headline||'PeerSync student';identity.append(name,headline);head.append(identity);content.append(head);
  const college=document.createElement('p');college.className='dialog-meta';college.textContent=`${profile.education.college||'University not listed'} · ${profile.personal.country||'Country not listed'}`;content.append(college);
  const about=document.createElement('p');about.className='dialog-description';about.textContent=profile.personal.about||'This student is still building their profile.';content.append(about);
  const skills=document.createElement('div');skills.className='dialog-tags';profile.skills.slice(0,8).forEach((skill)=>{const tag=document.createElement('span');tag.textContent=skill.name;skills.append(tag);});content.append(skills);
  const link=document.createElement('a');link.className='button button-primary detail-profile-link';link.href='coming-soon.html?feature=student-profile';link.textContent='Open student profile ↗';content.append(link);
  document.getElementById('detail-dialog').showModal();
}
function renderRecommendedStudents() {
  const list=document.getElementById('recommended-students');list.replaceChildren();
  const currentId=dashboardApp.user.id;
  dashboardApp.recommendations=dashboardApp.profiles.filter((profile)=>profile.userId!==currentId&&profile.personal&&profile.education&&Array.isArray(profile.skills)&&Array.isArray(profile.interests)).map((profile)=>({profile,...overlapScore(profile)})).filter((result)=>result.score>0).sort((a,b)=>b.score-a.score||a.profile.personal.name.localeCompare(b.profile.personal.name)).slice(0,4);
  dashboardApp.recommendations.forEach(({profile,sharedSkills,sharedInterests})=>{
    const card=document.createElement('article');card.className='person-card';const top=document.createElement('div');top.className='person-card-top';top.append(createPersonAvatar(profile));const about=document.createElement('div');about.className='person-card-about';const name=document.createElement('h3');name.textContent=profile.personal.name;const headline=document.createElement('p');headline.textContent=profile.personal.headline||'Student collaborator';const college=document.createElement('small');college.textContent=profile.education.college||'University not listed';about.append(name,headline,college);const availability=document.createElement('span');availability.className=`person-availability ${profile.collaboration.availability==='Available'?'':'not-available'}`;availability.textContent=profile.collaboration.availability||'Availability not set';top.append(about,availability);card.append(top);
    const intro=document.createElement('p');intro.className='person-intro';intro.textContent=profile.personal.about||'Still adding to their PeerSync profile.';card.append(intro);
    const tags=document.createElement('div');tags.className='person-skill-tags';profile.skills.slice(0,3).forEach((skill)=>{const tag=document.createElement('span');tag.textContent=skill.name;tags.append(tag);});card.append(tags);
    const shared=document.createElement('small');shared.className='shared-note';shared.textContent=[sharedSkills&&`${sharedSkills} shared skill${sharedSkills===1?'':'s'}`,sharedInterests&&`${sharedInterests} shared interest${sharedInterests===1?'':'s'}`].filter(Boolean).join(' · ');card.append(shared);
    const view=document.createElement('button');view.type='button';view.className='person-view-button';view.textContent='View profile';view.addEventListener('click',()=>openStudentDetails(profile));card.append(view);list.append(card);
  });
  document.getElementById('students-empty').hidden=dashboardApp.recommendations.length>0;
}
function loadDemoProjects() { return safeReadOrSeedProjects(); }
function renderRecommendedProjects() {
  const list=document.getElementById('recommended-projects');list.replaceChildren();
  const profilesById=new Map(dashboardApp.profiles.map((profile)=>[profile.userId,profile]));
  const actual=dashboardApp.projects.filter((project)=>project&&isActiveProject(project)&&hasOpenPositions(project)).map((project)=>({...project,isDemo:false}));
  const demo=loadDemoProjects().filter((project)=>isActiveProject(project)&&hasOpenPositions(project));
  dashboardApp.featuredProjects=[...actual,...demo].slice(0,4);
  dashboardApp.featuredProjects.forEach((project)=>{
    const card=document.createElement('article');card.className='dashboard-project-card';const main=document.createElement('div');main.className='dashboard-project-main';const mark=document.createElement('span');mark.className='project-mark';mark.textContent=project.isDemo?'✳':'◈';const titleWrap=document.createElement('div');const title=document.createElement('h3');title.textContent=project.title||'Untitled project';const category=document.createElement('small');category.textContent=`${project.category||'Student project'}${project.isDemo?' · Sample':''}`;titleWrap.append(title,category);main.append(mark,titleWrap);card.append(main);
    const description=document.createElement('p');description.className='dashboard-project-description';description.textContent=project.description||'A student project looking for collaborators.';card.append(description);
    const skills=document.createElement('div');skills.className='project-requirements';(project.requiredSkills||project.skills||[]).slice(0,3).forEach((skill)=>{const tag=document.createElement('span');tag.textContent=typeof skill==='string'?skill:skill.name;skills.append(tag);});card.append(skills);
    const teamIds=projectTeamIds(project);const creatorId=project.creatorId||project.ownerId||project.createdBy;const creator=profilesById.get(creatorId);const creatorName=creator?.personal.name||'PeerSync student';const footer=document.createElement('div');footer.className='dashboard-project-footer';const by=document.createElement('span');by.textContent=`By ${creatorName}`;const size=document.createElement('span');size.textContent=`${teamIds.length} teammate${teamIds.length===1?'':'s'}`;const open=document.createElement('b');open.textContent=`${projectOpenCount(project)} spots`;footer.append(by,size,open);card.append(footer);
    const view=document.createElement('button');view.className='project-view-button';view.type='button';view.textContent='View project';view.addEventListener('click',()=>openProjectDetails(project,creatorName,teamIds.length));card.append(view);list.append(card);
  });
  document.getElementById('projects-empty').hidden=dashboardApp.featuredProjects.length>0;
}
function openProjectDetails(project,creatorName,teamSize) {
  const content=document.getElementById('detail-dialog-content');content.replaceChildren();const label=document.createElement('span');label.className='panel-eyebrow';label.textContent=`${project.category||'Student project'}${project.isDemo?' · SAMPLE PROJECT':''}`;const title=document.createElement('h2');title.textContent=project.title;const desc=document.createElement('p');desc.className='dialog-description';desc.textContent=project.description;const info=document.createElement('p');info.className='dialog-meta';info.textContent=`Created by ${creatorName} · ${teamSize} teammate${teamSize===1?'':'s'} · ${project.openPositions} open positions`;const tags=document.createElement('div');tags.className='dialog-tags';(project.requiredSkills||[]).forEach((skill)=>{const tag=document.createElement('span');tag.textContent=skill;tags.append(tag);});content.append(label,title,desc,info,tags);const link=document.createElement('a');link.className='button button-primary detail-profile-link';link.href='projects.html';link.textContent='Explore project hub ↗';content.append(link);document.getElementById('detail-dialog').showModal();
}
function renderRecentActivities() {
  const list=document.getElementById('activity-list');list.replaceChildren();const records=dashboardApp.activities.filter((activity)=>activity&&belongsToUser(activity,dashboardApp.user.id)).sort((a,b)=>new Date(b.createdAt||b.timestamp||b.date||0)-new Date(a.createdAt||a.timestamp||a.date||0)).slice(0,5);
  const icons={profile_updated:'✎',connection_added:'◎',request_received:'↗',request_accepted:'✓',project_created:'◈',project_joined:'＋'};
  records.forEach((activity)=>{const row=document.createElement('article');row.className='activity-item';const icon=document.createElement('span');icon.className='activity-icon';icon.textContent=icons[activity.type]||'✦';const text=document.createElement('div');text.className='activity-copy';const description=document.createElement('p');description.textContent=activity.description||activity.message||activity.title||'A PeerSync update';const date=document.createElement('small');date.textContent=humanDate(activity.createdAt||activity.timestamp||activity.date,true);text.append(description,date);row.append(icon,text);list.append(row);});
  document.getElementById('activity-empty').hidden=records.length>0;
}
function renderRequestPreview() {
  const list=document.getElementById('request-preview');list.replaceChildren();const requests=dashboardApp.requests.filter((request)=>request&&incomingPending(request,dashboardApp.user.id)).sort((a,b)=>new Date(b.createdAt||b.createdOn||0)-new Date(a.createdAt||a.createdOn||0)).slice(0,3);
  requests.forEach((request)=>{const senderId=request.fromUserId||request.senderId||request.requesterId;const profile=profileForUser(senderId);const name=profile?.personal.name||request.senderName||'PeerSync student';const row=document.createElement('article');row.className='request-card';row.append(createPersonAvatar(profile||{personal:{name,profileImage:''}},'request-avatar'));const body=document.createElement('div');body.className='request-body';const title=document.createElement('b');title.textContent=name;const school=document.createElement('small');school.textContent=profile?.education.college||request.senderCollege||'Student collaborator';body.append(title,school);const skills=document.createElement('div');skills.className='request-skills';(profile?.skills||[]).slice(0,2).forEach((skill)=>{const tag=document.createElement('span');tag.textContent=skill.name;skills.append(tag);});const date=document.createElement('small');date.className='request-date';date.textContent=humanDate(request.createdAt||request.createdOn||request.date);body.append(skills,date);const view=document.createElement('a');view.href='requests.html?tab=received';view.className='request-view';view.setAttribute('aria-label',`View request from ${name}`);view.textContent='→';row.append(body,view);list.append(row);});
  document.getElementById('requests-empty').hidden=requests.length>0;
}
function renderNotifications() {
  const items=window.PeerNotifications?PeerNotifications.getUserNotifications(dashboardApp.user.id):dashboardApp.notifications.filter((n)=>n&&n.userId===dashboardApp.user.id).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));const unread=items.filter((notification)=>notification.read!==true&&notification.isRead!==true).length;
  const count=document.getElementById('sidebar-notification-count');count.textContent=String(unread);count.hidden=unread===0;const bell=document.getElementById('notification-bell-count');if(bell){bell.textContent=unread>99?'99+':String(unread);bell.hidden=unread===0;}document.getElementById('top-notification-dot').hidden=true;
  const list=document.getElementById('notification-items');list.replaceChildren();if(!items.length){const empty=document.createElement('p');empty.className='notification-empty';empty.textContent='You’re all caught up. New updates will appear here.';list.append(empty);return;}
  items.slice(0,5).forEach((notification)=>{const item=document.createElement('a');item.className=`notification-item ${notification.read===true||notification.isRead===true?'':'unread'}`;const knownDestination=/^(messages|requests|network|my-projects|project-details|student-profile|discussion|community)\.html(?:\?|$)/.test(String(notification.destination||''));item.href=knownDestination?notification.destination:notification.conversationId?`messages.html?conversation=${encodeURIComponent(notification.conversationId)}`:notification.requestId?`requests.html?tab=${notification.type==='connection_request'?'received':'history'}`:notification.projectId?notification.type==='project_member_removed'?'my-projects.html':`project-details.html?id=${encodeURIComponent(notification.projectId)}`:notification.actorId?`student-profile.html?id=${encodeURIComponent(notification.actorId)}`:'notifications.html';const title=document.createElement('b');title.textContent=notification.title||notification.message||'PeerSync update';const time=document.createElement('small');time.textContent=humanDate(notification.createdAt||notification.timestamp,true);item.append(title,time);item.addEventListener('click',()=>{if(window.PeerNotifications)PeerNotifications.markAsRead(dashboardApp.user.id,notification.id);});list.append(item);});
}
function renderRecommendedStudents() {
  const list=document.getElementById('recommended-students');list.replaceChildren();
  dashboardApp.intelligence=PeerIntelligence?.load(dashboardApp.user.id);
  dashboardApp.recommendations=dashboardApp.intelligence?.ok?PeerIntelligence.getStudentRecommendations(dashboardApp.intelligence).slice(0,4):[];
  dashboardApp.recommendations.forEach(({profile,match,connectionState,feedback})=>{
    const card=document.createElement('article');card.className='person-card';const top=document.createElement('div');top.className='person-card-top';top.append(createPersonAvatar(profile));const about=document.createElement('div');about.className='person-card-about';const name=document.createElement('h3');name.textContent=profile.personal.name;const headline=document.createElement('p');headline.textContent=profile.personal.headline||'Student collaborator';const college=document.createElement('small');college.textContent=profile.education.college||'University not listed';about.append(name,headline,college);top.append(about);card.append(top);
    const score=document.createElement('b');score.className='shared-note';score.textContent=`${match.score}% compatibility`;card.append(score);const tags=document.createElement('div');tags.className='person-skill-tags';(match.skillsForB||[]).slice(0,3).forEach((skill)=>{const tag=document.createElement('span');tag.textContent=skill.name;tags.append(tag);});card.append(tags);const shared=document.createElement('small');shared.className='shared-note';shared.textContent=`${match.sharedSkills.length} shared skills · ${match.sharedInterests.length} shared interests`;card.append(shared);
    const actions=document.createElement('div');actions.className='recommendation-actions';const view=document.createElement('button');view.type='button';view.className='person-view-button';view.textContent='View profile';view.addEventListener('click',()=>openStudentDetails(profile));actions.append(view);const connect=document.createElement('button');connect.type='button';connect.className='person-view-button';connect.textContent=connectionState==='request_sent'?'Request sent':connectionState==='request_received'?'Respond to request':'Connect';connect.disabled=connectionState!=='none';connect.addEventListener('click',()=>{window.location.href=`student-profile.html?id=${encodeURIComponent(profile.userId)}`;});actions.append(connect);const save=document.createElement('button');save.type='button';save.className='person-view-button';save.textContent=feedback?.action==='save_for_later'?'Saved':'Save';save.addEventListener('click',()=>{PeerIntelligence.saveFeedback(dashboardApp.user.id,'student',profile.userId,'save_for_later');renderRecommendedStudents();});actions.append(save);[['Not interested','not_interested'],['Already know','already_know'],['Not relevant','not_relevant']].forEach(([label,action])=>{const button=document.createElement('button');button.type='button';button.className='person-view-button';button.textContent=label;button.addEventListener('click',()=>{PeerIntelligence.saveFeedback(dashboardApp.user.id,'student',profile.userId,action);renderRecommendedStudents();});actions.append(button);});card.append(actions);list.append(card);
  });document.getElementById('students-empty').hidden=dashboardApp.recommendations.length>0;
}
function renderRecommendedProjects() {
  const list=document.getElementById('recommended-projects');list.replaceChildren();const snap=PeerIntelligence?.load(dashboardApp.user.id);dashboardApp.projectRecommendations=snap?.ok?PeerIntelligence.getProjectRecommendations(snap).slice(0,4):[];const profilesById=new Map(dashboardApp.profiles.map((profile)=>[profile.userId,profile]));
  dashboardApp.projectRecommendations.forEach(({project,match,goalFit,feedback})=>{const card=document.createElement('article');card.className='dashboard-project-card';const title=document.createElement('h3');title.textContent=project.title||'Untitled project';const category=document.createElement('small');category.textContent=`${project.category||'Student project'} · ${match.score}% compatibility${goalFit?' · Matches your goals':''}`;card.append(title,category);const desc=document.createElement('p');desc.className='dashboard-project-description';desc.textContent=project.description||'A student project looking for collaborators.';card.append(desc);const tags=document.createElement('div');tags.className='project-requirements';(match.matchedSkills||[]).slice(0,3).forEach((skill)=>{const tag=document.createElement('span');tag.textContent=`✓ ${typeof skill==='string'?skill:skill.name}`;tags.append(tag);});(match.missingSkills||[]).slice(0,2).forEach((skill)=>{const tag=document.createElement('span');tag.textContent=`Learn: ${typeof skill==='string'?skill:skill.name}`;tags.append(tag);});card.append(tags);const footer=document.createElement('div');footer.className='dashboard-project-footer';const creator=profilesById.get(project.creatorId||project.ownerId);const by=document.createElement('span');by.textContent=`By ${creator?.personal.name||'PeerSync student'}`;const spots=document.createElement('b');spots.textContent=`${PeerIntelligence.openPositions(project)} open spots`;footer.append(by,spots);card.append(footer);const actions=document.createElement('div');actions.className='recommendation-actions';const view=document.createElement('a');view.className='project-view-button';view.href=`project-details.html?id=${encodeURIComponent(project.id)}`;view.textContent='View project';actions.append(view);[['Save','save_for_later'],['Not interested','not_interested'],['Already applied','already_applied']].forEach(([label,action])=>{const button=document.createElement('button');button.type='button';button.className='project-view-button';button.textContent=feedback?.action===action&&action==='save_for_later'?'Saved':label;button.addEventListener('click',()=>{PeerIntelligence.saveFeedback(dashboardApp.user.id,'project',project.id,action);renderRecommendedProjects();});actions.append(button);});card.append(actions);list.append(card);});document.getElementById('projects-empty').hidden=dashboardApp.projectRecommendations.length>0;
}
function renderWelcomeSectionData(stats) { renderWelcomeSection();renderStats(stats);renderProfileCompletion();renderRecommendedStudents();renderRecommendedProjects();renderRecentActivities();renderRequestPreview();renderNotifications(); }
function renderWelcomeSection() {
  const profile=dashboardApp.profile,user=dashboardApp.user;document.getElementById('greeting').textContent=getGreeting();document.getElementById('welcome-name').textContent=getFirstName(profile.personal.name||user.name);document.getElementById('welcome-college').textContent=profile.education.college||user.college||'Add your university';document.getElementById('welcome-year').textContent=profile.education.academicYear||profile.education.educationLevel||'Add your academic year';document.getElementById('current-date').textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(new Date()).toUpperCase();document.getElementById('sidebar-student-name').textContent=profile.personal.name||user.name;document.getElementById('sidebar-student-college').textContent=profile.education.college||user.college||'PeerSync student';document.getElementById('topbar-name').textContent=getFirstName(profile.personal.name||user.name);setDashboardAvatar(document.getElementById('sidebar-avatar'),profile.personal.profileImage,profile.personal.name||user.name);setDashboardAvatar(document.getElementById('topbar-avatar'),profile.personal.profileImage,profile.personal.name||user.name);
}
function updateDashboardUI() { const stats=loadDashboardStats();renderWelcomeSectionData(stats); }
function initializeDashboardSearch() {
  const input=document.getElementById('dashboard-search');input.readOnly=true;input.addEventListener('focus',()=>window.PeerGlobalSearch?.open());input.addEventListener('click',()=>window.PeerGlobalSearch?.open());input.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();window.PeerGlobalSearch?.open();}});
}
function initializeDashboard() {
  if(!loadCurrentStudent())return;
  updateDashboardUI();initializeDashboardSearch();
  const mobileMenu=document.getElementById('mobile-menu-button'),sidebar=document.getElementById('dashboard-sidebar'),scrim=document.getElementById('sidebar-scrim');
  const closeSidebar=()=>{sidebar.classList.remove('open');scrim.classList.remove('visible');mobileMenu.setAttribute('aria-expanded','false');};
  mobileMenu.addEventListener('click',()=>{if(window.matchMedia('(max-width: 850px)').matches){const open=sidebar.classList.toggle('open');scrim.classList.toggle('visible',open);mobileMenu.setAttribute('aria-expanded',String(open));}else{document.body.classList.toggle('sidebar-collapsed');mobileMenu.setAttribute('aria-label',document.body.classList.contains('sidebar-collapsed')?'Expand navigation':'Collapse navigation');}});
  scrim.addEventListener('click',closeSidebar);sidebar.querySelectorAll('a').forEach((link)=>link.addEventListener('click',()=>{if(window.matchMedia('(max-width: 850px)').matches)closeSidebar();}));
  document.getElementById('sidebar-user-button').addEventListener('click',()=>{const menu=document.getElementById('sidebar-user-menu');const expanded=menu.hidden;menu.hidden=!expanded;document.getElementById('sidebar-user-button').setAttribute('aria-expanded',String(expanded));});
  document.getElementById('sidebar-logout').addEventListener('click',()=>{PeerAuth.logoutUser();window.location.href='login.html?loggedOut=1';});
  document.getElementById('topbar-profile-button').addEventListener('click',()=>{window.location.href='profile.html';});
  const notify=document.getElementById('notification-button'),popover=document.getElementById('notification-popover');notify.addEventListener('click',()=>{const open=popover.hidden;popover.hidden=!open;notify.setAttribute('aria-expanded',String(open));});
  document.getElementById('popover-mark-all').addEventListener('click',()=>{PeerNotifications?.markAllAsRead(dashboardApp.user.id);renderNotifications();});
  window.addEventListener('peersync:datachange',(event)=>{if(event.detail?.key==='peersync_notifications')renderNotifications();});window.addEventListener('storage',(event)=>{if(event.key==='peersync_notifications')renderNotifications();});
  document.addEventListener('click',(event)=>{if(!event.target.closest('.notification-wrap')){popover.hidden=true;notify.setAttribute('aria-expanded','false');}});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'){closeSidebar();popover.hidden=true;notify.setAttribute('aria-expanded','false');}});
  document.getElementById('detail-dialog').addEventListener('click',(event)=>{if(event.target===event.currentTarget)event.currentTarget.close();});
}

initializeDashboard();

