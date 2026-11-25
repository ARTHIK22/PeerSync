/* Project applications are a specialized project workflow, separate from connection requests. */
(function(global){
  const storage=global.PeerStorage;
  function listForProject(projectId){return storage.getProjectApplications(projectId);}
  function apply(input){return storage.createProjectApplication({...input,kind:'application'});}
  function invite(input){return storage.createProjectApplication({...input,kind:'invitation'});}
  function review(applicationId,creatorId,status){return storage.updateApplicationStatus(applicationId,creatorId,status);}
  function respondToInvitation(applicationId,studentId,status){return storage.updateApplicationStatus(applicationId,studentId,status);}
  function withdraw(applicationId,studentId){return storage.updateApplicationStatus(applicationId,studentId,'Withdrawn');}
  global.ProjectApplications=Object.freeze({listForProject,apply,invite,review,respondToInvitation,withdraw});
}(window));
