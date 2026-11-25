const legacyRoutes={discover:'discover.html',projects:'projects.html',requests:'requests.html?tab=received',network:'network.html',notifications:'notifications.html','create-project':'create-project.html','student-profile':'network.html'}; const legacyTarget=legacyRoutes[new URLSearchParams(window.location.search).get('feature')]; if(legacyTarget){window.location.replace(legacyTarget);}
const featureDetails={
  discover:['Discover students','Student discovery and collaboration requests are planned for a future PeerSync phase.','Phase 5'],
  projects:['Project hub','Project browsing, team management, and project creation are planned for a future PeerSync phase.','Phase 7'],
  requests:['Collaboration requests','Request inboxes and response actions are planned for a future PeerSync phase.','Future phase'],
  network:['Student network','Connection management is planned for a future PeerSync phase.','Future phase'],
  notifications:['Notifications','Your notification center is ready.','Phase 8'],
  settings:['Settings','Account and profile settings are planned for a future PeerSync phase.','Future phase'],
  invite:['Invite collaborators','Invitations are planned for a future PeerSync phase.','Future phase'],
  'create-project':['Start a project','Project creation is planned for a future PeerSync phase.','Phase 7'],
  'student-profile':['Student profile','Public student profile pages are planned for a future PeerSync phase.','Future phase']
};
const requestedFeature=new URLSearchParams(window.location.search).get('feature');
const [title,copy,phase]=featureDetails[requestedFeature]||['This part of PeerSync is coming soon.','We’re bringing the next pieces of the student collaboration experience together.','Planned for a future phase'];
document.getElementById('coming-title').textContent=title;
document.getElementById('coming-copy').textContent=copy;
document.getElementById('coming-phase').textContent=phase;
