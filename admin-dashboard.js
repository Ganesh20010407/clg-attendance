import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection, getDocs, getDoc, doc,
  updateDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ================= TOAST ================= */
function showToast(msg, type="success"){
  const c=document.getElementById("toast-container");
  const t=document.createElement("div");
  t.className=`toast ${type}`;
  t.innerText=msg;
  c.appendChild(t);
  setTimeout(()=>t.remove(),3000);
}

/* ================= AUTH ================= */
let records=[];

onAuthStateChanged(auth, async user=>{
  if(!user) return location.replace("login.html");

  const snap=await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()) return location.replace("login.html");

  const me=snap.data();
  if(!["admin","principal"].includes(me.role))
    return location.replace("login.html");

  welcome.innerText=`Welcome, ${me.name}`;
  roleLabel.innerText=me.role.toUpperCase();

  loadApprovals();
});

/* ================= MENU ================= */
menuBtn.onclick=()=>sidebar.classList.toggle("hidden");

document.querySelectorAll("[data-sec]").forEach(d=>{
  d.onclick=()=>show(d.dataset.sec);
});

function show(id){
  document.querySelectorAll(".section").forEach(s=>s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  sidebar.classList.add("hidden");

  if(id==="approvals") loadApprovals();
  if(id==="staff") loadIncharge();
  if(id==="attendance") loadAttendance();
}

/* ================= LOGOUT ================= */
logout.onclick=()=>{
  if(confirm("Are you sure you want to logout?")){
    signOut(auth).then(()=>location.replace("login.html"));
  }
};

/* ================= APPROVALS ================= */
async function loadApprovals(){
  approvalTable.innerHTML="";
  let count=0;

  const snap=await getDocs(collection(db,"users"));
  snap.forEach(d=>{
    const u=d.data();
    if(!u.approved){
      count++;
      approvalTable.innerHTML+=`
        <tr>
          <td>${u.name}</td>
          <td>${u.role}</td>
          <td>
            <button onclick="approveUser('${d.id}')">Approve</button>
          </td>
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

notifyBtn.onclick=()=>show("approvals");

/* ================= STAFF ================= */
btnIncharge.onclick=loadIncharge;
btnHod.onclick=loadHod;

async function loadIncharge(){
  staffTable.innerHTML="";
  const snap=await getDocs(collection(db,"users"));
  snap.forEach(d=>{
    const u=d.data();
    if(u.role==="incharge"){
      staffTable.innerHTML+=`
        <tr><td>${u.name}</td><td>${u.email}</td><td>${u.department||"-"}</td></tr>`;
    }
  });
}

async function loadHod(){
  staffTable.innerHTML="";
  const snap=await getDocs(collection(db,"users"));
  snap.forEach(d=>{
    const u=d.data();
    if(u.role==="hod"){
      staffTable.innerHTML+=`
        <tr><td>${u.name}</td><td>${u.email}</td><td>${u.department||"-"}</td></tr>`;
    }
  });
}

/* ================= SETTINGS ================= */
btnTiming.onclick=()=>toggle("timingBox");
btnGps.onclick=()=>toggle("gpsBox");
btnHoliday.onclick=()=>toggle("holidayBox");

function toggle(id){
  timingBox.classList.add("hidden");
  gpsBox.classList.add("hidden");
  holidayBox.classList.add("hidden");
  document.getElementById(id).classList.remove("hidden");
}

saveTiming.onclick=async()=>{
  await setDoc(doc(db,"settings","attendance"),{
    fnStart:fnStart.value,
    fnEnd:fnEnd.value,
    anStart:anStart.value,
    anEnd:anEnd.value
  },{merge:true});
  showToast("Timing saved");
};

saveGps.onclick=async()=>{
  await setDoc(doc(db,"settings","attendance"),{
    lat:lat.value,
    lng:lng.value,
    radius:radius.value
  },{merge:true});
  showToast("GPS saved");
};

/* ================= ATTENDANCE ================= */
async function loadAttendance(){
  records=[];
  const snap=await getDocs(collection(db,"attendanceRecords"));
  snap.forEach(d=>records.push(d.data()));
  renderAttendance();
}

function renderAttendance(){
  attTable.innerHTML="";
  const q=searchAtt.value.toLowerCase();
  records.filter(r=>
    (r.studentName||"").toLowerCase().includes(q) ||
    (r.roll||"").toLowerCase().includes(q)
  ).forEach(r=>{
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

/* ================= BACK PROTECTION ================= */
history.pushState(null,null,location.href);
window.onpopstate=()=>{
  signOut(auth).then(()=>location.replace("login.html"));
};
