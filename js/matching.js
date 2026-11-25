/* Deterministic PeerSync matching. Scores use profile fields only; this is not AI. */
(function (global) {
  const cache = new Map();
  const proficiencyRank = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
  const aliases = new Map([
    ['js','javascript'],['ml','machine learning'],['ai/ml','artificial intelligence'],
    ['ui ux','ui/ux design'],['ux','ui/ux design'],['sql','database'],['postgres','postgresql'],
    ['reactjs','react'],['nodejs','node.js'],['node js','node.js'],['web dev','web development'],
    ['mobile development','mobile app development'],['cloud','cloud computing']
  ]);
  const normalize = (value) => {
    const clean = String(value || '').toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+#./ ]/g,' ').replace(/\s+/g,' ').trim();
    return aliases.get(clean) || clean;
  };
  const validProfile = (profile) => Boolean(profile && typeof profile === 'object');
  const skillRows = (profile) => Array.isArray(profile?.skills) ? profile.skills.filter((skill) => skill && typeof skill.name === 'string' && skill.name.trim()).map((skill) => ({ name: skill.name.trim(), key: normalize(skill.name), category: normalize(skill.category || 'Other'), proficiency: proficiencyRank[normalize(skill.proficiency)] || 0 })) : [];
  const interestRows = (profile) => Array.isArray(profile?.interests) ? [...new Set(profile.interests.map(normalize).filter(Boolean))] : [];
  const unique = (rows) => [...new Set(rows)];
  const jaccard = (a,b) => { if (!a.length || !b.length) return 0; const right=new Set(b);const intersection=a.filter((item)=>right.has(item)).length;const union=new Set([...a,...b]).size;return union?intersection/union*100:0; };
  const scoreOut = (value) => Math.round(Math.max(0,Math.min(100,value)));
  function calculateSkillCompatibility(profileA,profileB) {
    const a=skillRows(profileA),b=skillRows(profileB);if(!a.length||!b.length)return {score:0,sharedSkills:[],sharedCategories:[]};
    const namesA=unique(a.map((skill)=>skill.key)),namesB=unique(b.map((skill)=>skill.key));
    const categoriesA=unique(a.map((skill)=>skill.category)),categoriesB=unique(b.map((skill)=>skill.category));
    const sharedSkills=namesA.filter((name)=>namesB.includes(name));
    const sharedCategories=categoriesA.filter((category)=>categoriesB.includes(category));
    const score=0.78*jaccard(namesA,namesB)+0.22*jaccard(categoriesA,categoriesB);
    return {score:scoreOut(score),sharedSkills,sharedCategories};
  }
  function calculateComplementarySkills(profileA,profileB) {
    const a=skillRows(profileA),b=skillRows(profileB);if(!a.length||!b.length)return {score:0,skillsForA:[],skillsForB:[],complementarySkills:[]};
    const namesA=unique(a.map((skill)=>skill.key)),namesB=unique(b.map((skill)=>skill.key));
    const uniqueA=a.filter((skill)=>!namesB.includes(skill.key)),uniqueB=b.filter((skill)=>!namesA.includes(skill.key));
    const categoriesA=unique(a.map((skill)=>skill.category)),categoriesB=unique(b.map((skill)=>skill.category));
    const categoryUnion=new Set([...categoriesA,...categoriesB]);
    const categoriesOnlyOne=[...categoryUnion].filter((category)=>categoriesA.includes(category)!==categoriesB.includes(category)).length;
    const categoryComplement=categoryUnion.size?categoriesOnlyOne/categoryUnion.size*100:0;
    const skillUnion=new Set([...namesA,...namesB]).size;
    const skillNovelty=skillUnion?(uniqueA.length+uniqueB.length)/skillUnion*100:0;
    const score=0.65*skillNovelty+0.35*categoryComplement;
    return {score:scoreOut(score),skillsForA:uniqueA.map(({name,category})=>({name,category})),skillsForB:uniqueB.map(({name,category})=>({name,category})),complementarySkills:[...uniqueA.map((skill)=>({name:skill.name,category:skill.category,heldBy:'studentA'})),...uniqueB.map((skill)=>({name:skill.name,category:skill.category,heldBy:'studentB'}))]};
  }
  function calculateInterestCompatibility(profileA,profileB) {
    const a=interestRows(profileA),b=interestRows(profileB);return {score:scoreOut(jaccard(a,b)),sharedInterests:a.filter((interest)=>b.includes(interest))};
  }
  function experienceLevel(profile) {
    const declared=normalize(profile?.experienceLevel);const declaredRank=proficiencyRank[declared];if(declaredRank)return declaredRank;
    const proficiencies=skillRows(profile).map((skill)=>skill.proficiency).filter(Boolean);
    if(proficiencies.length)return proficiencies.reduce((sum,level)=>sum+level,0)/proficiencies.length;
    const entries=Array.isArray(profile?.experience)?profile.experience.filter((item)=>item&&String(item.title||'').trim()).length:0;
    return entries?Math.min(4,1+entries):0;
  }
  function calculateExperienceCompatibility(profileA,profileB) {
    const a=experienceLevel(profileA),b=experienceLevel(profileB);if(!a||!b)return {score:0,levelA:a,levelB:b,comparison:'Experience details are still limited.'};
    const gap=Math.abs(a-b);const score=scoreOut(100-gap*24);
    const comparison=gap<0.35?'You report a similar experience level.':gap<1.25?'Your experience levels are close, with room to learn from each other.':'Your experience levels differ, which may support peer learning if roles are clear.';
    return {score,levelA:a,levelB:b,comparison};
  }
  function calculateCollaborationCompatibility(profileA,profileB) {
    const a=profileA?.collaboration||{},b=profileB?.collaboration||{};
    const goalsA=(a.lookingFor||[]).map(normalize),goalsB=(b.lookingFor||[]).map(normalize);
    const modesA=(a.mode||[]).map(normalize),modesB=(b.mode||[]).map(normalize);
    const goalScore=jaccard(unique(goalsA),unique(goalsB));
    const modeScore=jaccard(unique(modesA),unique(modesB));
    const availabilityScore=(()=>{const aa=normalize(a.availability),bb=normalize(b.availability);if(!aa||!bb)return 0;if(aa==='not currently available'||bb==='not currently available')return 12;if(aa==='available'&&bb==='available')return 100;if(aa==='busy'&&bb==='busy')return 58;return 62;})();
    return {score:scoreOut(goalScore*.4+modeScore*.35+availabilityScore*.25),sharedGoals:unique(goalsA).filter((goal)=>unique(goalsB).includes(goal)),sharedModes:unique(modesA).filter((mode)=>unique(modesB).includes(mode)),availabilityScore};
  }
  function profileCompletion(profile) {
    const stored=Number(profile?.profileCompletion);if(Number.isFinite(stored)&&stored>0)return Math.min(100,stored);
    if(global.PeerStorage?.calculateProfileCompletion)return global.PeerStorage.calculateProfileCompletion(profile);
    return 0;
  }
  function generateMatchExplanation(profileA,profileB,match) {
    const name=profileB?.personal?.name||'This student';const pieces=[];
    if(match.sharedSkills.length)pieces.push(`you share ${match.sharedSkills.slice(0,3).join(', ')}`);
    if(match.complementarySkills.length){const forA=match.complementarySkills.filter((item)=>item.heldBy==='studentB').slice(0,3).map((item)=>item.name);if(forA.length)pieces.push(`${name} brings complementary skills such as ${forA.join(', ')}`);}
    if(match.sharedInterests.length)pieces.push(`you both care about ${match.sharedInterests.slice(0,3).join(', ')}`);
    if(match.components.experience.score>=65)pieces.push(match.components.experience.comparison.toLowerCase());
    if(match.collaboration.sharedModes.length)pieces.push(`you both prefer ${match.collaboration.sharedModes.join(' or ')} collaboration`);
    if(!pieces.length)return `${name} may be worth exploring, but there is not enough profile information yet to point to a strong overlap. Add skills and interests to get more useful recommendations.`;
    return `${name} may be a promising collaborator because ${pieces.join(', while ')}.`;
  }
  function calculateStudentCompatibility(profileA,profileB) {
    if(!validProfile(profileA)||!validProfile(profileB)||profileA.userId===profileB.userId)return {score:0,rawScore:0,components:{skills:0,complementary:0,interests:0,experience:0,collaboration:0},sharedSkills:[],complementarySkills:[],sharedInterests:[],explanation:'Two different student profiles are needed to calculate a match.'};
    const signature=JSON.stringify([profileA.userId,profileA.updatedAt,profileA.profileCompletion,profileA.skills,profileA.interests,profileA.experience,profileA.experienceLevel,profileA.collaboration,profileB.userId,profileB.updatedAt,profileB.profileCompletion,profileB.skills,profileB.interests,profileB.experience,profileB.experienceLevel,profileB.collaboration]);
    if(cache.has(signature))return cache.get(signature);
    const skills=calculateSkillCompatibility(profileA,profileB),complementary=calculateComplementarySkills(profileA,profileB),interests=calculateInterestCompatibility(profileA,profileB),experience=calculateExperienceCompatibility(profileA,profileB),collaboration=calculateCollaborationCompatibility(profileA,profileB);
    const rawScore=scoreOut(skills.score*.40+complementary.score*.30+interests.score*.15+experience.score*.10+collaboration.score*.05);
    const completeness=Math.min(profileCompletion(profileA),profileCompletion(profileB));
    const confidenceFactor=.5+.5*completeness/100;
    const result={score:scoreOut(rawScore*confidenceFactor),rawScore,confidenceFactor,components:{skills:skills.score,complementary:complementary.score,interests:interests.score,experience:experience.score,collaboration:collaboration.score},sharedSkills:skills.sharedSkills,sharedCategories:skills.sharedCategories,complementarySkills:complementary.complementarySkills,skillsForA:complementary.skillsForA,skillsForB:complementary.skillsForB,sharedInterests:interests.sharedInterests,experience,collaboration};
    result.explanation=generateMatchExplanation(profileA,profileB,result);
    if(cache.size>500)cache.clear();cache.set(signature,result);return result;
  }
  function requiredSkillRows(project, options={}) { const required=options.requiredSkills||project?.requiredSkills||project?.requirements?.skills||project?.skills||[];return Array.isArray(required)?required.map((item)=>typeof item==='string'?{name:item,proficiency:'Beginner'}:{name:item?.name||'',proficiency:item?.proficiency||'Beginner'}).filter((item)=>item.name):[]; }
  function calculateProjectCompatibility(project,profile,options={}) {
    const studentSkills=skillRows(profile),requiredRows=requiredSkillRows(project,options),required=requiredRows.map((item)=>item.name),studentMap=new Map(studentSkills.map((skill)=>[skill.key,skill]));
    const matchedSkills=required.filter((name)=>studentMap.has(normalize(name)));
    const missingSkills=required.filter((name)=>!studentMap.has(normalize(name)));
    const additionalSkills=studentSkills.filter((skill)=>!required.some((name)=>normalize(name)===skill.key)).map((skill)=>skill.name);
    const proficiencyScore=matchedSkills.length?matchedSkills.reduce((sum,name)=>{const requirement=requiredRows.find((item)=>normalize(item.name)===normalize(name));const target=proficiencyRank[normalize(requirement?.proficiency)]||1;return sum+Math.min(1,(studentMap.get(normalize(name)).proficiency||1)/target);},0)/matchedSkills.length*100:0;
    const coverageScore=required.length?matchedSkills.length/required.length*100:0;
    const skillsScore=scoreOut(coverageScore*.72+proficiencyScore*.28);
    const projectRoles=(options.role?[options.role]:(project?.requiredRoles||project?.requiredTeamRoles||[])).map(normalize);
    const preferred=(profile?.collaboration?.preferredRoles||[]).map(normalize);
    const roleMatches=projectRoles.filter((role)=>preferred.some((candidate)=>candidate===role||candidate.includes(role)||role.includes(candidate)));
    const roleScore=projectRoles.length?(roleMatches.length?Math.min(100,roleMatches.length/projectRoles.length*100):0):0;
    const category=normalize(project?.category);const interests=interestRows(profile);const categoryMatches=category?interests.filter((interest)=>interest===category||interest.includes(category)||category.includes(interest)):[];const projectInterests=interestRows({interests:project?.requirements?.interests||project?.interests||[]});
    const interestScore=projectInterests.length?scoreOut(jaccard(projectInterests,interests)*.75+(categoryMatches.length?25:0)):category?(categoryMatches.length?100:0):0;
    const collab=profile?.collaboration||{};const availability=normalize(collab.availability);const availabilityScore=availability==='available'?100:availability==='busy'?50:0;
    const projectMode=normalize(project?.collaborationMode);const modes=(collab.mode||[]).map(normalize);const modeScore=projectMode?(modes.includes(projectMode)?100:0):0;
    const collaborationScore=projectMode?(availabilityScore*.65+modeScore*.35):availabilityScore;
    const requiredExperience=normalize(project?.requirements?.experienceLevel||project?.requiredExperienceLevel);const targetExperience=proficiencyRank[requiredExperience]||0;const actualExperience=experienceLevel(profile);const experienceScore=targetExperience?scoreOut(Math.min(100,actualExperience/targetExperience*100)):100;
    const rawScore=scoreOut(skillsScore*.55+roleScore*.20+interestScore*.10+experienceScore*.05+collaborationScore*.10);
    const confidenceFactor=.55+.45*profileCompletion(profile)/100;const score=scoreOut(rawScore*confidenceFactor);
    const matchedRole=roleMatches[0]||projectRoles.find((role)=>studentSkills.some((skill)=>skill.category===role||skill.key.includes(role)))||'';
    const suggestedRole=options.role||matchedRole||'';
    const explanation=matchedSkills.length?`Matches ${matchedSkills.length} of ${required.length} required skills${suggestedRole?` and is a potential fit for ${suggestedRole}`:''}.${missingSkills.length?` Still needed: ${missingSkills.join(', ')}.`:' Covers all listed skills.'}${targetExperience?` Experience fit: ${experienceScore}%.`:''}`:`This student does not currently list the required project skills${required.length?`: ${required.join(', ')}.`:'. Add project requirements to improve this analysis.'}`;
    return {score,rawScore,confidenceFactor,components:{skills:skillsScore,role:roleScore,interest:interestScore,experience:experienceScore,collaboration:scoreOut(collaborationScore)},matchedSkills,missingSkills,additionalSkills,suggestedRole,explanation};
  }
  function findRecommendedStudents(student,profiles,options={}) {
    const limit=Number(options.limit)||profiles.length;
    return (Array.isArray(profiles)?profiles:[]).filter((profile)=>validProfile(profile)&&profile.userId!==student?.userId).map((profile)=>({profile,match:calculateStudentCompatibility(student,profile)})).filter((item)=>item.match.score>0).sort((a,b)=>b.match.score-a.match.score||b.match.components.complementary-a.match.components.complementary||a.profile.personal.name.localeCompare(b.profile.personal.name)).slice(0,limit);
  }
  function findRecommendedProjects(student,projects,options={}) {
    const openPositions=(project)=>project.openPositions!==undefined&&project.openPositions!==null?Number(project.openPositions):Array.isArray(project.team?.positions)?project.team.positions.reduce((sum,position)=>sum+Math.max(0,Number(position.openings||0)-Number(position.filled||0)),0):Math.max(0,Number(project.maxTeamSize||project.team?.maxSize||0)-(project.teamMemberIds||project.team?.members||[]).length);
    return (Array.isArray(projects)?projects:[]).filter((project)=>project&&['active','open','recruiting','in progress','in_progress'].includes(normalize(project.status||'active'))&&openPositions(project)>0).map((project)=>({project,match:calculateProjectCompatibility(project,student)})).sort((a,b)=>b.match.score-a.match.score).slice(0,Number(options.limit)||projects.length);
  }
  function analyzeProjectRequirements(project,profiles,options={}) {
    const excluded=new Set(options.excludeUserIds||[]);const positions=project?.team?.positions||[];const roles=positions.length?positions:(project?.requiredRoles||project?.requiredTeamRoles||[]).map((role)=>({role,requiredSkills:project.requiredSkills||project.requirements?.skills||[],openings:1}));
    const targetRoles=roles.length?roles:[{role:'General collaborator',requiredSkills:project.requiredSkills||project.requirements?.skills||[],openings:1}];const used=new Set();
    return targetRoles.map((position)=>{
      const role=typeof position==='string'?position:position.role;
      const candidates=(Array.isArray(profiles)?profiles:[]).filter((profile)=>profile&&profile.userId&&!excluded.has(profile.userId)).map((profile)=>({profile,match:calculateProjectCompatibility(project,profile,{role,requiredSkills:position.requiredSkills?.length?position.requiredSkills:undefined})})).sort((a,b)=>b.match.score-a.match.score||a.profile.personal.name.localeCompare(b.profile.personal.name));
      const chosen=candidates.find((candidate)=>project.allowMultipleRoles===true||!used.has(candidate.profile.userId));
      if(chosen&&project.allowMultipleRoles!==true)used.add(chosen.profile.userId);
      return {role,positionId:typeof position==='string'?'':position.id||'',openings:Number(position.openings)||1,filled:Number(position.filled)||0,requiredSkills:position.requiredSkills||[],candidate:chosen||null,alternatives:candidates.filter((candidate)=>!chosen||candidate.profile.userId!==chosen.profile.userId).slice(0,2)};
    });
  }
  function clearCache(){cache.clear();}
  global.PeerMatching=Object.freeze({calculateStudentCompatibility,calculateSkillCompatibility,calculateComplementarySkills,calculateInterestCompatibility,calculateExperienceCompatibility,calculateCollaborationCompatibility,calculateProjectCompatibility,generateMatchExplanation,findRecommendedStudents,findRecommendedProjects,analyzeProjectRequirements,clearCache,normalizeSkill:normalize});
}(window));
