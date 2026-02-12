import { auth, db } from "./firebase.js";

import {
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
collection,
getDocs,
getDoc,
doc,
updateDoc,
deleteDoc,
setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";



/* ================= ELEMENTS ================= */

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

const logoutBtn = document.getElementById("logoutBtn");

const notifyBtn = document.getElementById("notifyBtn");

const settingsToggle = document.getElementById("settingsToggle");
const settingsSubmenu = document.getElementById("settingsSubmenu");



/* ================= MENU ================= */

menuBtn.onclick = () => {
sidebar.classList.toggle("hidden");
};



/* ================= SETTINGS DROPDOWN ================= */

settingsToggle.onclick = () => {
settingsSubmenu.classList.toggle("hidden");
};



/* ================= SECTION NAVIGATION ================= */

document.querySelectorAll("[data-sec]").forEach(btn=>{

btn.onclick = ()=>{

const id = btn.dataset.sec;

document.querySelectorAll(".section")
.forEach(sec=>sec.classList.remove("active"));

document.getElementById(id)
.classList.add("active");

};

});



/* ================= LOGOUT ================= */

logoutBtn.onclick = async ()=>{

const confirmLogout =
confirm("Are you sure you want to logout?");

if(!confirmLogout) return;

await signOut(auth);

location = "login.html";

};



/* ================= BELL ================= */

notifyBtn.onclick = ()=>{

document.querySelectorAll(".section")
.forEach(sec=>sec.classList.remove("active"));

approvals.classList.add("active");

};



/* ================= AUTH ================= */

onAuthStateChanged(auth, async user=>{

if(!user){
location="login.html";
return;
}

const snap = await getDoc(doc(db,"users",user.uid));

const me = snap.data();

userDisplay.innerText =
me.name + " (" + me.role.toUpperCase() + ")";


const hour = new Date().getHours();

let wish = "Good Evening";

if(hour<12) wish="Good Morning";
else if(hour<18) wish="Good Afternoon";

welcome.innerText =
wish + ", " + me.name + " (" + me.role.toUpperCase() + ")";


loadStats();
loadApprovals();
loadStaff("all");
loadAttendance();

});



/* ================= DASHBOARD STATS ================= */

async function loadStats(){

let students=0,incharges=0,hods=0,pending=0;
let present=0,absent=0;

const today =
new Date().toISOString().slice(0,10);

const users =
await getDocs(collection(db,"users"));

users.forEach(d=>{

const u=d.data();

if(u.role==="student") students++;
if(u.role==="incharge") incharges++;
if(u.role==="hod") hods++;

if(!u.approved) pending++;

});


const att =
await getDocs(collection(db,"attendanceRecords"));

att.forEach(d=>{

const a=d.data();

if(a.date===today){

if(a.status==="present") present++;
else absent++;

}

});


totalStudents.innerText=students;
totalIncharge.innerText=incharges;
totalHod.innerText=hods;
pendingCount.innerText=pending;
presentCount.innerText=present;
absentCount.innerText=absent;

notifyCount.innerText=pending;

if(pending===0)
notifyCount.classList.add("hidden");
else
notifyCount.classList.remove("hidden");

}



/* ================= APPROVALS ================= */

async function loadApprovals(){

approvalTable.innerHTML="";

let i=1;

const snap =
await getDocs(collection(db,"users"));

snap.forEach(d=>{

const u=d.data();

if(!u.approved){

approvalTable.innerHTML+=`
<tr>

<td>
<input type="checkbox"
class="userCheck"
value="${d.id}">
</td>

<td>${i++}</td>

<td>${u.name||"-"}</td>

<td>${u.email||"-"}</td>

<td>${u.role||"-"}</td>

<td>

<button onclick="approveUser('${d.id}')">
Approve
</button>

<button onclick="rejectUser('${d.id}')">
Reject
</button>

</td>

</tr>
`;

}

});

}



/* SELECT ALL */

selectAll.onclick = ()=>{

document.querySelectorAll(".userCheck")
.forEach(cb=>{
cb.checked = selectAll.checked;
});

};



/* BULK APPROVE */

approveSelected.onclick = async ()=>{

const selected =
document.querySelectorAll(".userCheck:checked");

for(const cb of selected){

await updateDoc(
doc(db,"users",cb.value),
{approved:true}
);

}

loadApprovals();
loadStats();

};



/* BULK REJECT */

rejectSelected.onclick = async ()=>{

const selected =
document.querySelectorAll(".userCheck:checked");

for(const cb of selected){

await deleteDoc(
doc(db,"users",cb.value)
);

}

loadApprovals();
loadStats();

};



/* SINGLE APPROVE */

window.approveUser = async uid=>{

await updateDoc(
doc(db,"users",uid),
{approved:true}
);

loadApprovals();
loadStats();

};



/* SINGLE REJECT */

window.rejectUser = async uid=>{

await deleteDoc(doc(db,"users",uid));

loadApprovals();
loadStats();

};



/* ================= STAFF ================= */

let staffData=[];

window.loadStaff = async role=>{

staffTable.innerHTML="";
staffData=[];

let i=1;

const snap =
await getDocs(collection(db,"users"));

snap.forEach(d=>{

const u=d.data();

if(u.role!=="student"){

if(role==="all" || u.role===role){

staffData.push({id:d.id,...u});

staffTable.innerHTML+=`
<tr onclick="openUserDetails('${d.id}')">

<td>${i++}</td>

<td>${u.name||"-"}</td>

<td>${u.email||"-"}</td>

<td>${u.department||"-"}</td>

</tr>
`;

}

}

});

};



/* STAFF SEARCH */

staffSearch.onkeyup = ()=>{

const q =
staffSearch.value.toLowerCase();

staffTable.querySelectorAll("tr")
.forEach(tr=>{

tr.style.display =
tr.innerText.toLowerCase()
.includes(q)
? ""
: "none";

});

};



/* ================= HIERARCHY ================= */

let detailsData=[];

window.openUserDetails = async uid=>{

const snap =
await getDoc(doc(db,"users",uid));

const user=snap.data();

document.querySelectorAll(".section")
.forEach(sec=>sec.classList.remove("active"));

detailsSection.classList.add("active");

detailsInfo.innerHTML=`
<p>Name: ${user.name}</p>
<p>Email: ${user.email}</p>
<p>Role: ${user.role}</p>
<p>Department: ${user.department||"-"}</p>
`;

detailsBody.innerHTML="";

detailsData=[];

let i=1;

const all =
await getDocs(collection(db,"users"));

all.forEach(d=>{

const u=d.data();

if(
(user.role==="hod" && u.hodId===uid)
||
(user.role==="incharge" && u.inchargeId===uid)
){

detailsData.push({id:d.id,...u});

detailsBody.innerHTML+=`
<tr onclick="openUserDetails('${d.id}')">

<td>${i++}</td>

<td>${u.name}</td>

<td>${u.email}</td>

<td>${u.department||u.roll||"-"}</td>

</tr>
`;

}

});

};



window.goBack = ()=>{
staff.classList.add("active");
detailsSection.classList.remove("active");
};



/* ================= ATTENDANCE ================= */

let attendanceRecords=[];

async function loadAttendance(){

attendanceRecords=[];

const snap =
await getDocs(collection(db,"attendanceRecords"));

snap.forEach(d=>
attendanceRecords.push(d.data())
);

renderAttendance();

}



yearFilter.onchange = renderAttendance;

attendanceSearch.onkeyup = renderAttendance;



function renderAttendance(){

const year = yearFilter.value;
const q =
attendanceSearch.value.toLowerCase();

attTable.innerHTML="";

let i=1;

attendanceRecords.forEach(r=>{

if(
(year==="all"||r.academicYear===year)
&&
(
(r.studentName||"")
.toLowerCase().includes(q)
||
(r.roll||"")
.toLowerCase().includes(q)
)
){

attTable.innerHTML+=`
<tr>

<td>${i++}</td>

<td>${r.studentName}</td>

<td>${r.date}</td>

<td>${r.roll}</td>

<td>${r.academicYear}</td>

<td>${r.session}</td>

<td>${r.gpsStatus||"-"}</td>

<td>${r.faceStatus||"-"}</td>

<td>${r.status}</td>

</tr>
`;

}

});

}



/* ================= SETTINGS ================= */

saveTiming.onclick=()=>{

setDoc(doc(db,"settings","attendance"),{

fnStart:fnStart.value,
fnEnd:fnEnd.value,
anStart:anStart.value,
anEnd:anEnd.value

});

alert("Timing Saved");

};



saveGPS.onclick=()=>{

setDoc(doc(db,"settings","attendance"),{

lat:lat.value,
lng:lng.value,
radius:radius.value

});

alert("GPS Saved");

};



addHoliday.onclick=()=>{

setDoc(doc(db,"holidays",holidayDate.value),{

date:holidayDate.value,
reason:holidayReason.value

});

alert("Holiday Added");

};
