import { auth, db } from "./firebase.js";

import {
onAuthStateChanged,
signOut
}
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
doc,
getDoc,
collection,
getDocs,
addDoc
}
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


/* MENU */

menuBtn.onclick = () =>
sidebar.classList.toggle("hidden");


document.querySelectorAll("[data-section]").forEach(btn=>{

btn.onclick = ()=>{

document.querySelectorAll(".section")
.forEach(s=>s.classList.remove("active"));

document.getElementById(btn.dataset.section)
.classList.add("active");

};

});


/* AUTH */

let currentUser;

onAuthStateChanged(auth, async user=>{

if(!user){

location="login.html";
return;

}

currentUser=user;

const snap=await getDoc(doc(db,"users",user.uid));

const data=snap.data();

studentName.innerText =
data.name+" (Student)";

greeting.innerText =
"Good Morning, "+data.name;

loadRecords();

});


/* SESSION */

const hour=new Date().getHours();

const session=hour<12?"FN":"AN";

sessionLabel.innerText="Session: "+session;


/* GPS VERIFY */

gpsBtn.onclick=async()=>{

navigator.geolocation.getCurrentPosition(async pos=>{

const lat=pos.coords.latitude;
const lng=pos.coords.longitude;

const snap=
await getDoc(doc(db,"settings","attendance"));

const college=snap.data();

const dist=getDistance(
lat,lng,
college.lat,
college.lng
);

if(dist<=college.radius){

gpsStatus.innerHTML=
'<span class="tick">✔ GPS Verified</span>';

faceStep.classList.remove("hidden");

}else{

gpsStatus.innerHTML=
'<span class="cross">✖ Outside campus</span>';

}

});

};


/* FACE VERIFY */

faceBtn.onclick=async()=>{

const video=document.getElementById("video");

const stream=
await navigator.mediaDevices.getUserMedia({video:true});

video.srcObject=stream;

await faceapi.nets.tinyFaceDetector
.loadFromUri('/face-api/');

setTimeout(async()=>{

const result=
await faceapi.detectSingleFace(
video,
new faceapi.TinyFaceDetectorOptions()
);

if(result){

faceStatus.innerHTML=
'<span class="tick">✔ Face Verified</span>';

markAttendance();

}else{

faceStatus.innerHTML=
'<span class="cross">✖ Face Failed</span>';

manualStep.classList.remove("hidden");

}

},3000);

};


/* MARK ATTENDANCE */

async function markAttendance(){

await addDoc(collection(db,"attendanceRecords"),{

uid:currentUser.uid,
date:new Date().toISOString().slice(0,10),
session,
status:true

});

finalStatus.innerHTML=
'<span class="tick">✔ Attendance Marked</span>';

}


/* RECORDS */

async function loadRecords(){

const snap=
await getDocs(collection(db,"attendanceRecords"));

let html="";

snap.forEach(d=>{

const r=d.data();

html+=`
<tr>
<td>${r.date}</td>
<td>${r.session}</td>
<td class="tick">✔</td>
</tr>
`;

});

recordTable.innerHTML=html;

}


/* DISTANCE */

function getDistance(lat1,lon1,lat2,lon2){

const R=6371000;

const dLat=(lat2-lat1)*Math.PI/180;

const dLon=(lon2-lon1)*Math.PI/180;

const a=
Math.sin(dLat/2)**2+
Math.cos(lat1*Math.PI/180)*
Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)**2;

return R*(2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));

}


/* LOGOUT FIX */

logoutBtn.onclick=()=>{
logoutConfirm.classList.add("active");
};

confirmNo.onclick=()=>{
logoutConfirm.classList.remove("active");
};

confirmYes.onclick=()=>{
signOut(auth);
};
