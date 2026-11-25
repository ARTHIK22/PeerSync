const CollaborationUI={
  profile(userId){const result=PeerStorage.getAllStudentProfiles();return result.ok?result.profiles.find((profile)=>profile.userId===userId)||null:null;},
  avatar(profile,className='collab-avatar'){const node=document.createElement('span');node.className=className;const image=profile?.personal?.profileImage;if(image&&image.startsWith('data:image/')){const img=document.createElement('img');img.src=image;img.alt='';node.append(img);}else node.textContent=(profile?.personal?.name||'Student').split(/\s+/).map((part)=>part[0]).slice(0,2).join('').toUpperCase();return node;},
  date(value,withTime=false){const date=value?new Date(value):null;if(!date||Number.isNaN(date.getTime()))return'';const now=new Date();const sameDay=date.toDateString()===now.toDateString();if(withTime&&sameDay)return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(date);return new Intl.DateTimeFormat(undefined,withTime?{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}:{month:'short',day:'numeric',year:'numeric'}).format(date);},
  toast(message){const node=document.getElementById('collab-toast');if(!node)return;node.textContent=message;node.hidden=false;clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>node.hidden=true,3300);},
  messageName(profile){return profile?.personal?.name||'PeerSync student';},
  profileLink(userId){return`student-profile.html?id=${encodeURIComponent(userId)}`;}
};
