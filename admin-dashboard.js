import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection, getDocs, getDoc, doc,
  setDoc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ========== TOAST ========== */
function showToast(msg, type="success"){
  const c=document.getElementById("toast-container");
  const t=document.createElement("div");
  t.className=`toast ${type}`;
  t.innerText=msg;
  c.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

/* ========== MENU ========== */
menuBtn.onclick=()=>sidebar.classList.toggle("hidden");
logout.onclick=()=>signOut(auth).then(()=>location.href="login.html");

document.querySelectorAll("[data-sec]").forEach(d =>
  d.onclick=()=>show(d.dataset.sec)
);

function show(id){
  document.querySelectorAll(".section").forEach(s=>s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  sidebar.classList.add("hidden");

  if(id==="staff") loadStaff();
  if(id==="approvals") loadApprovals();
  if(id==="settings") loadSettings();
  if(id==="attendance") loadAttendance();
}

/* ========== AUTH ========== */
let me=null, records=[];

onAuthStateChanged(auth, async user=>{
  if(!user) return location.href="login.html";

  const snap=await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()) return location.href="login.html";

  me=snap.data();
  if(!["admin","principal"].includes(me.role))
    return location.href="login.html";

  welcome.innerText=`Welcome, ${me.name}`;
  roleLabel.innerText=me.role.toUpperCase();
  pName.innerText=me.name;
  pEmail.innerText=me.email;
  pRole.innerText=me.role.toUpperCase();

  loadApprovals();
});

/* ========== STAFF ========== */
async function loadStaff(){
  hodTable.innerHTML="";
  inchargeTable.innerHTML="";
  const snap=await getDocs(collection(db,"users"));

  snap.forEach(d=>{
    const u=d.data();
    if(u.role==="hod"){
      hodTable.innerHTML+=`
        <tr><td>${u.name}</td><td>${u.email}</td>
        <td>${u.approved?"Approved":"Pending"}</td></tr>`;
    }
    if(u.role==="incharge"){
      inchargeTable.innerHTML+=`
        <tr><td>${u.name}</td><td>${u.email}</td>
        <td>${u.canApproveStudents?"Granted":"No"}</td></tr>`;
    }
  });
}

/* ========== APPROVALS + 🔔 ========== */
async function loadApprovals(){
  approvalTable.innerHTML="";
  let count=0;

  const users=await getDocs(collection(db,"users"));
  users.forEach(d=>{
    const u=d.data();
    if(!u.approved){
      count++;
      approvalTable.innerHTML+=`
        <tr>
          <td>Registration</td>
          <td>${u.name}</td>
          <td>${u.role}</td>
          <td><button onclick="approveUser('${d.id}')">Approve</button></td>
        </tr>`;
    }
  });

  const perms=await getDocs(collection(db,"permissionRequests"));
  perms.forEach(d=>{
    const r=d.data();
    if(r.status==="pending"){
      count++;
      approvalTable.innerHTML+=`
        <tr>
          <td>Permission</td>
          <td>${r.name||"-"}</td>
          <td>${r.role||"student"}</td>
          <td><button onclick="approvePerm('${d.id}','${r.uid}')">Approve</button></td>
        </tr>`;
    }
  });

  notifyCount.innerText=count;
  notifyCount.classList.toggle("hidden",count===0);
}

window.approveUser=async uid=>{
  await updateDoc(doc(db,"users",uid),{approved:true});
  showToast("User approved");
  loadApprovals();
};

window.approvePerm=async (id,uid)=>{
  await updateDoc(doc(db,"users",uid),{canMarkAttendance:true});
  await updateDoc(doc(db,"permissionRequests",id),{status:"approved"});
  showToast("Permission approved");
  loadApprovals();
};

notifyBell.onclick=()=>show("approvals");

/* ========== SETTINGS ========== */
async function loadSettings(){
  const s=await getDoc(doc(db,"settings","attendance"));
  if(!s.exists()) return;
  const d=s.data();
  fnStart.value=d.fnStart||"";
  fnEnd.value=d.fnEnd||"";
  anStart.value=d.anStart||"";
  anEnd.value=d.anEnd||"";
  lat.value=d.lat||"";
  lng.value=d.lng||"";
  radius.value=d.radius||"";
}

saveTiming.onclick=async()=>{
  await setDoc(doc(db,"settings","attendance"),{
    fnStart:fnStart.value, fnEnd:fnEnd.value,
    anStart:anStart.value, anEnd:anEnd.value
  },{merge:true});
  showToast("Timing saved");
};

saveGps.onclick=async()=>{
  await setDoc(doc(db,"settings","attendance"),{
    lat:lat.value, lng:lng.value, radius:radius.value
  },{merge:true});
  showToast("GPS saved");
};

/* ========== ATTENDANCE ========== */
async function loadAttendance(){
  records=[];
  const snap=await getDocs(collection(db,"attendanceRecords"));
  snap.forEach(d=>records.push(d.data()));
  renderAttendance();
}

function renderAttendance(){
  attTable.innerHTML="";
  const today=new Date().toISOString().split("T")[0];
  let data=[...records];

  if(attType.value==="today")
    data=data.filter(r=>r.date===today);

  const q=searchAtt.value.toLowerCase();
  if(q)
    data=data.filter(r =>
      (r.studentName||"").toLowerCase().includes(q) ||
      (r.roll||"").toLowerCase().includes(q)
    );

  data.forEach(r=>{
    attTable.innerHTML+=`
      <tr>
        <td>${r.date}</td>
        <td>${r.studentName||"-"}</td>
        <td>${r.roll||"-"}</td>
        <td>${r.academicYear}</td>
        <td>${r.session}</td>
        <td>${r.status}</td>
      </tr>`;
  });
}

attType.onchange=renderAttendance;
searchAtt.onkeyup=renderAttendance;

downloadAtt.onclick=()=>{
  let csv="Date,Name,Roll,Year,Session,Status\n";
  records.forEach(r=>{
    csv+=`${r.date},${r.studentName||""},${r.roll||""},${r.academicYear},${r.session},${r.status}\n`;
  });
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([csv]));
  a.download="attendance.csv";
  a.click();
  showToast("Attendance downloaded","info");
};
