/* Demo-only administrator authentication. These credentials are intentionally public. */
(function(global){
  const CONFIG=Object.freeze({id:'peersync_demo_admin',email:'admin@peersync.local',password:'PeerSyncAdmin2026!'});
  const SESSION_KEY='peersync_admin_session';
  const read=()=>{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');}catch(_){return null;}};
  function login(email,password){if(String(email||'').trim().toLowerCase()!==CONFIG.email||String(password||'')!==CONFIG.password)return{ok:false,error:'invalid-credentials'};const session={adminId:CONFIG.id,role:'admin',loginAt:new Date().toISOString()};try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));global.PeerAdminData?.log('admin_login','admin',CONFIG.id,'');return{ok:true,admin:{id:CONFIG.id,email:CONFIG.email,role:'admin'}};}catch(_){return{ok:false,error:'storage-unavailable'};}}
  function current(){const item=read();return item?.adminId===CONFIG.id&&item.role==='admin'?{id:CONFIG.id,email:CONFIG.email,role:'admin'}:null;}
  function requireAdmin(){const admin=current();if(!admin){global.location.replace('admin-login.html');return null;}return admin;}
  function logout(){try{sessionStorage.removeItem(SESSION_KEY);}catch(_){}global.location.replace('admin-login.html?loggedOut=1');}
  global.PeerAdminAuth=Object.freeze({config:CONFIG,sessionKey:SESSION_KEY,login,current,requireAdmin,logout});
}(window));
