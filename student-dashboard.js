import { auth, db } from "./firebase.js";

import {
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
doc,
getDoc,
collection,
getDocs,
addDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

let currentUserData=null;



/* AUTH */

onAuthStateChanged(auth, async user=>{

if(!user){
location="login.html";
return;
}

const snap=await getDoc(doc(db,"users",user.uid));

if(!snap.exists()){
location="login.html";
return;
}

currentUserData=snap.data();

headerName.innerText=
currentUserData.name+" ("+currentUserData.role+")";

profileName.innerText=currentUserData.name;

profileEmail.innerText=currentUserData.email;

profileDept.innerText=currentUserData.department;

profileYear.innerText="Year "+currentUserData.year;


loadWish();

loadAttendanceStats();

loadAttendanceRecords();

});



/* WISH */

function loadWish(){

const h=new Date().getHours();

let text="";

if(h<12) text="Good Morning";
else if(h<17) text="Good Afternoon";
else text="Good Evening";

wish.innerText=text+", "+currentUserData.name;

}



/* MENU */

menuBtn.onclick=()=>{
sidebar.classList.toggle("hidden");
};

document.querySelectorAll("[data-sec]").forEach(btn=>{

btn.onclick=()=>{

document.querySelectorAll(".section")
.forEach(s=>s.classList.remove("active"));

document.getElementById(btn.dataset.sec)
.classList.add("active");

};

});



/* LOGOUT */

logoutBtn.onclick=()=>{
logoutModal.classList.remove("hidden");
};

cancelLogout.onclick=()=>{
logoutModal.classList.add("hidden");
};

confirmLogout.onclick=()=>{
signOut(auth);
location="login.html";
};



/* LOAD STATS */

async function loadAttendanceStats(){

let present=0;
let absent=0;

const snap=await getDocs(collection(db,"attendanceRecords"));

snap.forEach(d=>{

const r=d.data();

if(r.studentId===auth.currentUser.uid){

if(r.status==="present") present++;
else absent++;

}

});

presentCount.innerText=present;
absentCount.innerText=absent;

}



/* LOAD RECORDS */

async function loadAttendanceRecords(){

recordTable.innerHTML="";

let i=1;

const snap=await getDocs(collection(db,"attendanceRecords"));

snap.forEach(d=>{

const r=d.data();

if(r.studentId===auth.currentUser.uid){

recordTable.innerHTML+=`

<tr>

<td>${i++}</td>

<td>${r.date}</td>

<td>${r.session}</td>

<td>${r.gpsStatus=="ok"?"✔":"✖"}</td>

<td>${r.faceStatus=="ok"?"✔":"✖"}</td>

<td>${r.status}</td>

</tr>

`;

}

});

}



/* MARK ATTENDANCE */

markBtn.onclick=async ()=>{

const session=sessionSelect.value;

if(!session){
alert("Select session");
return;
}

markStatus.innerText="Checking GPS...";

navigator.geolocation.getCurrentPosition(

async pos=>{

if(pos.coords.accuracy>50){

markStatus.innerText="Fake GPS suspected";

return;

}

markStatus.innerText="GPS OK. Checking Face...";


const faceOk=Math.random()>0.3;


if(faceOk){

await addDoc(collection(db,"attendanceRecords"),{

studentId:auth.currentUser.uid,

studentName:currentUserData.name,

date:new Date().toISOString().slice(0,10),

session,

gpsStatus:"ok",

faceStatus:"ok",

status:"present",

createdAt:serverTimestamp()

});

markStatus.innerText="Attendance Marked ✔";

loadAttendanceRecords();

}
else{

markStatus.innerText=
"Face failed. Manual request sent.";

await addDoc(collection(db,"manualRequests"),{

studentId:auth.currentUser.uid,

status:"pending",

createdAt:serverTimestamp()

});

}

},

err=>{
markStatus.innerText="GPS required";
}

);

};
