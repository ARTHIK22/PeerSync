const editStudent = PeerAuth.requireAuthentication();
const editForm = document.getElementById('edit-profile-form');
const editNotice = document.getElementById('edit-notice');
const skillCatalog = ['Python','Java','C++','JavaScript','TypeScript','HTML','CSS','React','Next.js','Node.js','FastAPI','Flask','Express.js','Machine Learning','Deep Learning','NLP','Computer Vision','MySQL','PostgreSQL','MongoDB','SQLite','Git','GitHub','Docker','Figma','Postman','React Native','Unity','Linux','Firebase','User Research','Data Visualization'];
const interestCatalog = ['Artificial Intelligence','Web Development','Mobile App Development','Cybersecurity','Cloud Computing','Data Science','Open Source','Competitive Programming','Entrepreneurship','Research','UI/UX Design','Game Development'];
const lookingOptions = ['Project collaboration','Hackathon teammates','Study partners','Open-source contributions','Research collaboration','Internship opportunities'];
const modeOptions = ['Remote','On-campus','Hybrid'];
const roleOptions = ['Frontend Developer','Backend Developer','AI/ML Engineer','UI/UX Designer','Data Analyst','Full-Stack Developer','Researcher','Project Manager'];
let editProfile = null;
let hasUnsavedChanges = false;
let initialProfileCompletion = 0;
let originalSkillNames = new Set();

function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char])); }
function setValue(id, value) { const el=document.getElementById(id);if(el)el.value=value||''; }
function getValue(id) { return document.getElementById(id).value.trim(); }
function showEditNotice(message, kind='error') { editNotice.textContent=message;editNotice.className=`edit-notice ${kind}`;editNotice.hidden=false; }
function setDirty() { hasUnsavedChanges=true; editNotice.hidden=true; }
function idFor(prefix) { return PeerStorage.createId(prefix); }
function toggleCheckboxGroup(containerId, options, selected=[]) {
  const container=document.getElementById(containerId);container.replaceChildren();
  options.forEach((label,index)=>{const id=`${containerId}-${index}`;const wrapper=document.createElement('label');wrapper.className='choice-pill';const input=document.createElement('input');input.type='checkbox';input.value=label;input.checked=selected.includes(label);const text=document.createElement('span');text.textContent=label;wrapper.append(input,text);container.append(wrapper);});
}
function selectedValues(containerId) { return [...document.querySelectorAll(`#${containerId} input:checked`)].map((input)=>input.value); }
function fillFieldSets(profile) {
  originalSkillNames=new Set((profile.skills||[]).map((skill)=>String(skill.name||'').trim().toLocaleLowerCase()));
  const p=profile.personal,e=profile.education;
  setValue('personal-name',p.name||editStudent.name);setValue('personal-email',editStudent.email);setValue('headline',p.headline);setValue('about',p.about);setValue('country',p.country||editStudent.country);setValue('city',p.city);
  setValue('college',e.college||editStudent.college);setValue('degree',e.degree);setValue('branch',e.branch);setValue('graduation-year',e.graduationYear);setValue('academic-year',e.academicYear);setValue('education-level',e.educationLevel);
  const datalist=document.getElementById('skill-options');skillCatalog.forEach((skill)=>{const option=document.createElement('option');option.value=skill;datalist.append(option);});
  renderSkills(profile.skills);
  const customInterests=profile.interests.filter((interest)=>!interestCatalog.includes(interest));
  toggleCheckboxGroup('interest-choices',[...interestCatalog,...customInterests],profile.interests);
  renderEntries('experience-entries',profile.experience,'experience');renderEntries('project-entries',profile.projects,'project');
  Object.entries(profile.socialLinks).forEach(([key,value])=>setValue(key,value));
  toggleCheckboxGroup('looking-choices',lookingOptions,profile.collaboration.lookingFor);toggleCheckboxGroup('mode-choices',modeOptions,profile.collaboration.mode);toggleCheckboxGroup('role-choices',roleOptions,profile.collaboration.preferredRoles);
  setValue('availability-select',profile.collaboration.availability);
  const fileImage=profile.personal.profileImage||'';editProfile.personal.profileImage=fileImage;updateAvatarPreview();updateCharacterCount();updateCompletionPreview();
}
function renderSkills(skills) {
  const list=document.getElementById('selected-skills');list.replaceChildren();
  skills.forEach((skill,index)=>{const item=document.createElement('div');item.className='selected-skill';const title=document.createElement('div');title.className='selected-skill-title';const name=document.createElement('b');name.textContent=skill.name;const remove=document.createElement('button');remove.type='button';remove.className='remove-skill';remove.dataset.removeSkill=String(index);remove.setAttribute('aria-label',`Remove ${skill.name}`);remove.textContent='×';title.append(name,remove);const controls=document.createElement('div');controls.className='selected-skill-controls';const category=document.createElement('select');category.setAttribute('aria-label',`${skill.name} category`);['Programming','Frontend','Backend','AI / ML','Database','Tools','Design','Other'].forEach((option)=>{const opt=document.createElement('option');opt.value=option;opt.textContent=option;category.append(opt);});category.value=skill.category||'Other';category.dataset.skillCategory=String(index);const level=document.createElement('select');level.setAttribute('aria-label',`${skill.name} proficiency`);['Beginner','Intermediate','Advanced','Expert'].forEach((option)=>{const opt=document.createElement('option');opt.value=option;opt.textContent=option;level.append(opt);});level.value=skill.proficiency||'Beginner';level.dataset.skillLevel=String(index);controls.append(category,level);item.append(title,controls);list.append(item);});
}
function renderEntries(containerId,entries,type) {
  const list=document.getElementById(containerId);list.replaceChildren();
  entries.forEach((entry,index)=>{
    const experience=type==='experience';const heading=experience?'Experience entry':'Project';const values=experience?entry:{...entry,technologies:(entry.technologies||[]).join(', ')};
    const card=document.createElement('article');card.className='dynamic-entry';card.dataset.entryId=entry.id||idFor(type);card.innerHTML=`<div class="dynamic-entry-head"><b>${heading} ${index+1}</b><button type="button" class="remove-entry" data-remove-entry="${type}" data-index="${index}" aria-label="Remove ${heading.toLowerCase()} ${index+1}">Remove</button></div>
      <div class="edit-grid"><div class="edit-field"><label for="${type}-title-${index}">${experience?'Title':'Project name'}</label><input id="${type}-title-${index}" data-entry="${type}" data-index="${index}" data-key="title" value="${escapeHtml(values.title)}" maxlength="120" placeholder="${experience?'e.g. Research assistant':'e.g. Campus study planner'}"></div><div class="edit-field"><label for="${type}-organization-${index}">${experience?'Organization or company':'Your role'}</label><input id="${type}-organization-${index}" data-entry="${type}" data-index="${index}" data-key="${experience?'organization':'role'}" value="${escapeHtml(experience?values.organization:values.role)}" maxlength="120" placeholder="${experience?'Organization':'e.g. Frontend developer'}"></div></div>
      ${experience?`<div class="edit-grid three-col"><div class="edit-field"><label for="experience-type-${index}">Experience type</label><select id="experience-type-${index}" data-entry="experience" data-index="${index}" data-key="type"><option value="">Select type</option>${['Internship','Part-time','Freelance','Research','Volunteering','Other'].map((o)=>`<option ${values.type===o?'selected':''}>${o}</option>`).join('')}</select></div><div class="edit-field"><label for="experience-startDate-${index}">Start date</label><input id="experience-startDate-${index}" type="date" data-entry="experience" data-index="${index}" data-key="startDate" value="${escapeHtml(values.startDate)}"></div><div class="edit-field"><label for="experience-endDate-${index}">End date</label><input id="experience-endDate-${index}" type="date" data-entry="experience" data-index="${index}" data-key="endDate" value="${escapeHtml(values.endDate)}" ${values.currentlyWorking?'disabled':''}></div></div><label class="working-check"><input type="checkbox" data-entry="experience" data-index="${index}" data-key="currentlyWorking" ${values.currentlyWorking?'checked':''}><span>I'm currently here</span></label><div class="edit-field"><label for="experience-description-${index}">Description</label><textarea id="experience-description-${index}" rows="3" data-entry="experience" data-index="${index}" data-key="description" maxlength="500" placeholder="What did you work on or learn?">${escapeHtml(values.description)}</textarea></div>`:
      `<div class="edit-field"><label for="project-description-${index}">Description</label><textarea id="project-description-${index}" rows="3" data-entry="project" data-index="${index}" data-key="description" maxlength="500" placeholder="What does this project do?">${escapeHtml(values.description)}</textarea></div><div class="edit-grid"><div class="edit-field"><label for="project-technologies-${index}">Technologies <span>Comma separated</span></label><input id="project-technologies-${index}" data-entry="project" data-index="${index}" data-key="technologies" value="${escapeHtml(values.technologies)}" placeholder="JavaScript, Figma"></div><div class="edit-field"><label for="project-category-${index}">Project category</label><input id="project-category-${index}" data-entry="project" data-index="${index}" data-key="category" value="${escapeHtml(values.category)}" placeholder="e.g. Education"></div></div><div class="edit-grid"><div class="edit-field"><label for="project-githubUrl-${index}">GitHub repository URL</label><input id="project-githubUrl-${index}" type="url" data-entry="project" data-index="${index}" data-key="githubUrl" value="${escapeHtml(values.githubUrl)}" placeholder="https://github.com/..."></div><div class="edit-field"><label for="project-liveUrl-${index}">Live project URL</label><input id="project-liveUrl-${index}" type="url" data-entry="project" data-index="${index}" data-key="liveUrl" value="${escapeHtml(values.liveUrl)}" placeholder="https://..."></div></div>`}`;
    list.append(card);
  });
}
function readEntries(type) {
  const entries=[];const cards=[...document.querySelectorAll(`#${type==='experience'?'experience':'project'}-entries .dynamic-entry`)];
  cards.forEach((card)=>{const entry={id:card.dataset.entryId};card.querySelectorAll(`[data-entry="${type}"]`).forEach((field)=>{entry[field.dataset.key]=field.type==='checkbox'?field.checked:field.value.trim();});const hasContent=Object.entries(entry).some(([key,value])=>key==='id'?false:key==='currentlyWorking'?value:Boolean(String(value||'').trim()));if(!hasContent)return;if(type==='project')entry.technologies=String(entry.technologies||'').split(',').map((value)=>value.trim()).filter(Boolean);entries.push(entry);});
  return entries;
}
function removeEntry(type,index) {
  const container=document.getElementById(`${type==='experience'?'experience':'project'}-entries`);
  const cards=[...container.querySelectorAll('.dynamic-entry')];
  cards[Number(index)]?.remove();
  [...container.querySelectorAll('.dynamic-entry')].forEach((card,newIndex)=>{
    const title=card.querySelector('.dynamic-entry-head b');
    title.textContent=`${type==='experience'?'Experience entry':'Project'} ${newIndex+1}`;
    card.querySelectorAll('[data-index]').forEach((item)=>{item.dataset.index=String(newIndex);});
  });
  setDirty();updateCompletionPreview();
}
function collectProfile() {
  return {
    ...editProfile,
    personal:{...editProfile.personal,name:getValue('personal-name'),headline:getValue('headline'),about:getValue('about'),country:getValue('country'),city:getValue('city')},
    education:{college:getValue('college'),degree:getValue('degree'),branch:getValue('branch'),graduationYear:getValue('graduation-year'),academicYear:getValue('academic-year'),educationLevel:getValue('education-level')},
    skills:editProfile.skills,interests:selectedValues('interest-choices'),experience:readEntries('experience'),projects:readEntries('project'),
    socialLinks:{github:getValue('github'),linkedin:getValue('linkedin'),portfolio:getValue('portfolio'),website:getValue('website')},
    collaboration:{lookingFor:selectedValues('looking-choices'),availability:getValue('availability-select'),mode:selectedValues('mode-choices'),preferredRoles:selectedValues('role-choices')}
  };
}
function updateCompletionPreview() {
  if(!editProfile)return;const completion=PeerStorage.calculateProfileCompletion(collectProfile());document.getElementById('edit-completion-number').textContent=`${completion}%`;const circumference=2*Math.PI*23;const ring=document.getElementById('edit-completion-ring');ring.style.strokeDasharray=String(circumference);ring.style.strokeDashoffset=String(circumference*(1-completion/100));
}
function updateCharacterCount() { const about=document.getElementById('about');document.querySelector('[data-count="about"]').textContent=`${about.value.length} / 800`; }
function updateAvatarPreview() { const image=document.getElementById('edit-avatar-image');const initials=document.getElementById('edit-initials');const name=getValue('personal-name')||editStudent.name;initials.textContent=name.trim().split(/\s+/).slice(0,2).map((part)=>part[0]).join('').toUpperCase();if(editProfile.personal.profileImage){image.src=editProfile.personal.profileImage;image.hidden=false;initials.hidden=true;}else{image.hidden=true;initials.hidden=false;} }
function addSkill() {
  const name=getValue('skill-search');const error=document.getElementById('skill-error');error.hidden=true;
  if(!name){error.textContent='Enter a skill to add.';error.hidden=false;return;}
  if(editProfile.skills.some((skill)=>skill.name.toLocaleLowerCase()===name.toLocaleLowerCase())){error.textContent='That skill is already on your profile.';error.hidden=false;return;}
  editProfile.skills.push({name,category:getValue('skill-category'),proficiency:getValue('skill-proficiency')});editProfile.skills.sort((a,b)=>a.name.localeCompare(b.name));document.getElementById('skill-search').value='';renderSkills(editProfile.skills);setDirty();updateCompletionPreview();
}
function addCustomInterest() {
  const input=document.getElementById('custom-interest');const value=input.value.trim();if(!value)return;
  const existing=[...document.querySelectorAll('#interest-choices input')].some((checkbox)=>checkbox.value.toLocaleLowerCase()===value.toLocaleLowerCase());if(existing){const checkbox=[...document.querySelectorAll('#interest-choices input')].find((item)=>item.value.toLocaleLowerCase()===value.toLocaleLowerCase());checkbox.checked=true;input.value='';setDirty();updateCompletionPreview();return;}
  const current=selectedValues('interest-choices');toggleCheckboxGroup('interest-choices',[...interestCatalog,...[...document.querySelectorAll('#interest-choices input')].map((item)=>item.value).filter((item)=>!interestCatalog.includes(item)),value],[...current,value]);input.value='';setDirty();updateCompletionPreview();
}
function addExperience() { const entries=readEntries('experience');entries.push({id:idFor('experience'),title:'',organization:'',type:'',startDate:'',endDate:'',currentlyWorking:false,description:''});renderEntries('experience-entries',entries,'experience');setDirty(); }
function addProject() { const entries=readEntries('project');entries.push({id:idFor('project'),title:'',description:'',technologies:[],category:'',githubUrl:'',liveUrl:'',role:''});renderEntries('project-entries',entries,'project');setDirty(); }
function validOptionalUrl(value) { if(!value)return true;try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&Boolean(url.hostname.includes('.'));}catch(_){return false;} }
function validateProfile(profile) {
  const errors=[];if(!profile.personal.name)errors.push('Add your full name.');if(!profile.personal.country)errors.push('Add your country.');if(!profile.education.college)errors.push('Add your college or university.');
  profile.experience.forEach((item,index)=>{if(!item.title)errors.push(`Experience ${index+1}: add a title or remove the empty entry.`);if(item.startDate&&item.endDate&&!item.currentlyWorking&&item.endDate<item.startDate)errors.push(`Experience ${index+1}: end date must be after the start date.`);});
  profile.projects.forEach((item,index)=>{if(!item.title)errors.push(`Project ${index+1}: add a name or remove the empty entry.`);['githubUrl','liveUrl'].forEach((key)=>{if(!validOptionalUrl(item[key]))errors.push(`Project ${index+1}: enter a valid http or https URL.`);});});
  Object.entries(profile.socialLinks).forEach(([key,value])=>{if(!validOptionalUrl(value))errors.push(`${key[0].toUpperCase()+key.slice(1)} must be a valid http or https URL.`);});
  return errors;
}

if(editStudent){
  const result=PeerStorage.getStudentProfile(editStudent.id);
  if(result.ok){editProfile=result.profile;initialProfileCompletion=PeerStorage.calculateProfileCompletion(editProfile);fillFieldSets(editProfile);}
  else { showEditNotice('Profile data could not be read. Check browser storage and reload.', 'error'); editForm.hidden = true; }
}

document.getElementById('add-skill').addEventListener('click',addSkill);
document.getElementById('skill-search').addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();addSkill();}});
document.getElementById('selected-skills').addEventListener('click',(event)=>{const button=event.target.closest('[data-remove-skill]');if(!button)return;editProfile.skills.splice(Number(button.dataset.removeSkill),1);renderSkills(editProfile.skills);setDirty();updateCompletionPreview();});
document.getElementById('selected-skills').addEventListener('change',(event)=>{const target=event.target;if(target.dataset.skillLevel!==undefined)editProfile.skills[Number(target.dataset.skillLevel)].proficiency=target.value;if(target.dataset.skillCategory!==undefined)editProfile.skills[Number(target.dataset.skillCategory)].category=target.value;setDirty();updateCompletionPreview();});
document.getElementById('experience-entries').addEventListener('click',(event)=>{const button=event.target.closest('[data-remove-entry]');if(button)removeEntry('experience',button.dataset.index);});
document.getElementById('project-entries').addEventListener('click',(event)=>{const button=event.target.closest('[data-remove-entry]');if(button)removeEntry('project',button.dataset.index);});
document.getElementById('experience-entries').addEventListener('change',(event)=>{const input=event.target;if(input.dataset.key==='currentlyWorking'){const end=document.querySelector(`[data-entry="experience"][data-index="${input.dataset.index}"][data-key="endDate"]`);end.disabled=input.checked;if(input.checked)end.value='';}setDirty();updateCompletionPreview();});
document.getElementById('add-experience').addEventListener('click',addExperience);document.getElementById('add-project').addEventListener('click',addProject);document.getElementById('add-interest').addEventListener('click',addCustomInterest);document.getElementById('custom-interest').addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();addCustomInterest();}});
document.getElementById('profile-image-file').addEventListener('change',(event)=>{const file=event.target.files[0];const error=document.getElementById('image-error');error.textContent='';if(!file)return;if(!file.type.startsWith('image/')){error.textContent='Choose a PNG, JPG, or WebP image.';event.target.value='';return;}if(file.size>1.5*1024*1024){error.textContent='Choose an image smaller than 1.5 MB.';event.target.value='';return;}const reader=new FileReader();reader.onload=()=>{editProfile.personal.profileImage=String(reader.result);updateAvatarPreview();setDirty();updateCompletionPreview();};reader.onerror=()=>{error.textContent='The image could not be read. Try another file.';};reader.readAsDataURL(file);});
document.getElementById('remove-image').addEventListener('click',()=>{editProfile.personal.profileImage='';document.getElementById('profile-image-file').value='';updateAvatarPreview();setDirty();updateCompletionPreview();});
editForm.addEventListener('input',(event)=>{if(event.target.matches('input,textarea'))setDirty();updateCharacterCount();updateAvatarPreview();updateCompletionPreview();});
editForm.addEventListener('change',(event)=>{if(event.target.matches('select,input[type="checkbox"]'))setDirty();updateCompletionPreview();});
document.getElementById('cancel-edit').addEventListener('click',()=>{if(hasUnsavedChanges&&!window.confirm('Discard your unsaved profile changes?'))return;window.location.href='profile.html';});
editForm.addEventListener('submit',(event)=>{event.preventDefault();const profile=collectProfile();const errors=validateProfile(profile);if(errors.length){showEditNotice(errors.slice(0,4).join(' '));return;}profile.userId=editStudent.id;profile.profileCompletion=PeerStorage.calculateProfileCompletion(profile);const result=PeerStorage.saveStudentProfile(editStudent.id,profile);if(!result.ok){showEditNotice('Could not save your profile. Browser storage may be unavailable or full.');return;}const eventId=Date.now();profile.skills.filter((skill)=>skill.name&&!originalSkillNames.has(String(skill.name).trim().toLocaleLowerCase())).forEach((skill)=>PeerAnalytics?.track('skill_added',editStudent.id,'skill',skill.name,{skillName:skill.name,category:skill.category||'Other'}));PeerNotifications?.createActivity({userId:editStudent.id,type:'profile_updated',title:'Profile updated',description:'You updated your student profile.',eventKey:`profile_updated:${eventId}`});PeerNotifications?.createNotification({userId:editStudent.id,type:'system',title:'Profile updated',message:'Your student profile was updated.',referenceType:'profile',referenceId:editStudent.id,destination:'profile.html',eventKey:`profile_updated:${eventId}`});if(initialProfileCompletion<100&&profile.profileCompletion===100)PeerNotifications?.createActivity({userId:editStudent.id,type:'profile_completed',title:'Profile completed',description:'You completed your student profile.',eventKey:`profile_completed:${eventId}`});hasUnsavedChanges=false;showEditNotice('Your profile is saved. Opening your updated profile…','success');window.setTimeout(()=>{window.location.href='profile.html';},650);});
document.getElementById('profile-logout').addEventListener('click',()=>{if(hasUnsavedChanges&&!window.confirm('Log out and discard your unsaved changes?'))return;PeerAuth.logoutUser();window.location.href='login.html?loggedOut=1';});
window.addEventListener('beforeunload',(event)=>{if(hasUnsavedChanges){event.preventDefault();event.returnValue='';}});
document.querySelectorAll('.edit-section-nav a').forEach((link)=>link.addEventListener('click',()=>{document.querySelectorAll('.edit-section-nav a').forEach((item)=>item.classList.remove('current'));link.classList.add('current');}));
