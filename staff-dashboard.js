import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection, getDocs, getDoc, doc, updateDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* MENU */
menuBtn.onclick = () => sidebar.classList.toggle("hidden");
logout.onclick = () => signOut(auth).then(()=>location.href="login.html");

document.querySelectorAll("[data-sec]").forEach(d =>
  d.onclick = () => show(d.dataset.sec)
);

function show(id){
  if(me.role==="incharge" && id==="incharges") return;
  document.querySelectorAll(".section").forEach(s=>s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  sidebar.classList.add("hidden");

  if(id==="students") loadStudents();
  if(id==="attendance") loadAttendance();
  if(id==="approvals") loadApprovals();
}

/* AUTH */
let me=null, selectedIncharge=null, attendanceRecords=[];

onAuthStateChanged(auth, async user=>{
  if(!user) return location.href="login.html";

  const snap = await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()) return location.href="login.html";

  me = snap.data();
  welcome.innerText = `Welcome, ${me.name}`;

  if(me.role==="hod") inchargeMenu.style.display="block";
  if(me.role==="incharge") permMenu.style.display="block";

  pName.innerText = me.name;
  pId.innerText = me.staffId || "-";
  pPhone.innerText = me.phone || "-";
  pDept.innerText = me.department || "-";
  pHod.innerText = me.hodName || "-";
  pEmail.innerText = me.email || "-";

  if(me.role==="hod") loadIncharges();
});

/* INCHARGES */
async function loadIncharges(){
  inchargeTable.innerHTML="";
  const snap = await getDocs(collection(db,"users"));
  snap.forEach(d=>{
    const u=d.data();
    if(u.role==="incharge"){
      inchargeTable.innerHTML+=`
        <tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td><button onclick="selectIncharge('${d.id}','${u.name}')">View</button></td>
        </tr>`;
    }
  });
}

window.selectIncharge=(id,name)=>{
  selectedIncharge=id;
  studentTitle.innerText=`Students under ${name}`;
  show("students");
};

/* STUDENTS */
async function loadStudents(){
  studentTable.innerHTML="";
  const snap=await getDocs(collection(db,"users"));
  snap.forEach(d=>{
    const u=d.data();
    if(u.role!=="student") return;
    if(me.role==="incharge" && u.inchargeId!==auth.currentUser.uid) return;
    if(me.role==="hod" && u.inchargeId!==selectedIncharge) return;

    studentTable.innerHTML+=`
      <tr>
        <td>${u.name}</td>
        <td>${u.roll}</td>
        <td>${u.year}</td>
        <td>${u.approved?"Approved":"Pending"}</td>
        <td>${me.canApproveStudents && !u.approved ?
          `<button onclick="approve('${d.id}')">Approve</button>` : "-"}</td>
      </tr>`;
  });
}

/* ATTENDANCE */
async function loadAttendance(){
  attendanceRecords=[];
  const snap=await getDocs(collection(db,"attendance"));
  snap.forEach(d=>{
    const a=d.data();
    if(me.role==="incharge" && a.inchargeId!==auth.currentUser.uid) return;
    if(me.role==="hod" && a.inchargeId!==selectedIncharge) return;
    attendanceRecords.push(a);
  });
  renderAttendance();
}

function renderAttendance(){
  attTable.innerHTML="";
  const today=new Date().toLocaleDateString();
  let data=[...attendanceRecords];

  if(attType.value==="today"){
    data=data.filter(r=>r.date===today);
  }

  const q=searchAtt.value.toLowerCase();
  if(q){
    data=data.filter(r =>
      (r.studentName||"").toLowerCase().includes(q) ||
      (r.roll||"").toLowerCase().includes(q)
    );
  }

  data.forEach(r=>{
    attTable.innerHTML+=`
      <tr>
        <td>${r.date}</td>
        <td>${r.studentName}</td>
        <td>${r.roll}</td>
        <td>${r.year}</td>
        <td>${r.session}</td>
        <td>${r.status}</td>
      </tr>`;
  });
}

attType.onchange=renderAttendance;
searchAtt.onkeyup=renderAttendance;
sortAtt.onchange=renderAttendance;
attYear.onchange=renderAttendance;

/* APPROVALS */
async function loadApprovals(){
  approveTable.innerHTML="";
  if(!me.canApproveStudents){
    noPermMsg.innerText="Permission not granted";
    return;
  }
  const snap=await getDocs(collection(db,"users"));
  snap.forEach(d=>{
    const u=d.data();
    if(u.role==="student" && !u.approved){
      approveTable.innerHTML+=`
        <tr>
          <td>${u.name}</td>
          <td>${u.roll}</td>
          <td><button onclick="approve('${d.id}')">Approve</button></td>
        </tr>`;
    }
  });
}

window.approve=uid=>updateDoc(doc(db,"users",uid),{approved:true});

/* PERMISSION */
requestPerm.onclick=async()=>{
  await setDoc(doc(db,"permissionRequests",auth.currentUser.uid),{
    status:"pending", date:new Date()
  });
  alert("Permission request sent");
  reqStatus.innerText="Request sent";
};



function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerText = msg;
  document.body.appendChild(t);

  setTimeout(() => t.classList.add("show"), 50);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3000);
}
