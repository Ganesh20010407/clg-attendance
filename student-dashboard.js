import { auth, db } from "./firebase.js";

import {
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
collection,
addDoc,
getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


/* MENU */
menuBtn.onclick=()=>{
sidebar.classList.toggle("hidden");
};


/* NAVIGATION */
document.querySelectorAll(".sidebar div").forEach(btn=>{

btn.onclick=()=>{
document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
document.getElementById(btn.dataset.page+"Page").classList.add("active");
};

});


/* LOGOUT */
logoutBtn.onclick=()=>{
logoutModal.classList.remove("hidden");
};

confirmLogout.onclick=()=>{
signOut(auth);
};

cancelLogout.onclick=()=>{
logoutModal.classList.add("hidden");
};


/* AUTH */
onAuthStateChanged(auth,user=>{

if(!user) location="login.html";

studentName.innerText=user.email+" (Student)";

});


/* SESSION */
function detectSession(){

const hour=new Date().getHours();

return hour<12?"FN":"AN";

}

sessionText.innerText="Session: "+detectSession();


/* LOAD MODELS */
await faceapi.nets.tinyFaceDetector.loadFromUri("models");


/* MARK ATTENDANCE */
markBtn.onclick=()=>{

navigator.geolocation.getCurrentPosition(async pos=>{

gpsStep.className="step green";

faceStep.classList.remove("hidden");

startCamera();

},
err=>{
gpsStep.className="step red";
});

};


/* CAMERA */
async function startCamera(){

const stream=await navigator.mediaDevices.getUserMedia({video:true});

video.srcObject=stream;

video.classList.remove("hidden");

captureBtn.classList.remove("hidden");

}


/* CAPTURE */
captureBtn.onclick=async()=>{

const detection=await faceapi.detectSingleFace(
video,
new faceapi.TinyFaceDetectorOptions()
);

if(detection){

faceStep.className="step green";

saveAttendance(true,false);

stopCamera();

}
else{

faceStep.className="step red";

manualStep.classList.remove("hidden");

manualStep.className="step yellow";

}

};


/* STOP CAMERA */
function stopCamera(){

video.srcObject.getTracks().forEach(track=>track.stop());

video.classList.add("hidden");

captureBtn.classList.add("hidden");

}


/* SAVE */
async function saveAttendance(face,manual){

await addDoc(collection(db,"attendanceRecords"),{

date:new Date().toLocaleDateString(),
session:detectSession(),
gps:true,
face:face,
manual:manual,
status:"present"

});

}


/* LOAD RECORD */
async function loadRecords(){

const snap=await getDocs(collection(db,"attendanceRecords"));

snap.forEach(d=>{

const r=d.data();

recordTable.innerHTML+=`

<tr>
<td>${r.date}</td>
<td>${r.session}</td>
<td>${r.gps?"✔":"✖"}</td>
<td>${r.face?"✔":"✖"}</td>
<td>${r.manual?"✔":"✖"}</td>
<td>${r.status=="present"?"✔":"✖"}</td>
</tr>

`;

});

}

loadRecords();