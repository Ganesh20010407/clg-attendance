// ================= FIREBASE IMPORT =================

import { initializeApp }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
getAuth,
onAuthStateChanged,
signOut
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
getFirestore,
doc,
getDoc,
getDocs,
setDoc,
collection,
serverTimestamp
}
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ================= FIREBASE CONFIG =================

const firebaseConfig = {

apiKey: "AIzaSyAFUziq6QGKCwujtiTL-4Rk823FE12ZDGU",

authDomain: "markattnedance.firebaseapp.com",

projectId: "markattnedance"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ================= GLOBAL VARIABLES =================

let currentUser = null;

let settings = null;

let faceMatcher = null;


// ================= MENU =================

menuBtn.onclick = () =>
{
sidebar.classList.toggle("show");
};


// ================= PAGE SWITCH =================

window.showPage = function(pageId)
{

document.querySelectorAll(".page")
.forEach(page => page.classList.remove("active"));

document.getElementById(pageId)
.classList.add("active");

sidebar.classList.remove("show");

};


// ================= HOME MARK BUTTON =================

homeMarkBtn.onclick = () =>
{
showPage("markPage");
};


// ================= LOGOUT =================

logoutBtn.onclick = async () =>
{

const confirmLogout =
confirm("Are you sure you want to logout?");

if(!confirmLogout) return;

await signOut(auth);

location = "login.html";

};


// ================= AUTH STATE =================

onAuthStateChanged(auth, async(user)=>
{

if(!user)
{
location = "login.html";
return;
}

currentUser = user;

await loadProfile();

await loadAttendanceSettings();

await autoMarkAbsent();   // important

await loadFaceModels();

await loadFaceDescriptor();

await loadRecords();

});


// ================= GREETING =================

function setGreeting(name)
{

const hour = new Date().getHours();

let greeting = "";

if(hour < 12)
greeting = "Good Morning";

else if(hour < 17)
greeting = "Good Afternoon";

else
greeting = "Good Evening";

greetingText.innerText =
greeting + ", " + name + " 👋";

}


// ================= PROFILE =================

async function loadProfile()
{

const snap =
await getDoc(doc(db,"users",currentUser.uid));

const data = snap.data();

studentName.innerText = data.name;

studentRole.innerText = data.role;

profileName.innerText = data.name;

profileStudentId.innerText = data.studentId;

profileEmail.innerText = data.email;

profilePhone.innerText = data.phone;

profileDepartment.innerText = data.department;

profileYear.innerText = data.year;

profileIncharge.innerText = data.incharge;

profileRole.innerText = data.role;

setGreeting(data.name);

}


// ================= SESSION =================

function getCurrentSession()
{

const hour = new Date().getHours();

const session = hour < 12 ? "FN" : "AN";

sessionText.innerText = session;

return session;

}


// ================= LOAD SETTINGS =================

async function loadAttendanceSettings()
{

const today =
new Date().toISOString().split("T")[0];

const snap =
await getDoc(doc(db,"attendanceSettings",today));


if(!snap.exists())
{

attendanceMessage.innerText =
"Attendance not started yet";

markBtn.disabled = true;

fnStatus.innerText = "Not Started";

anStatus.innerText = "Not Started";

return;

}


settings = snap.data();


// HOLIDAY

if(settings.holiday)
{

attendanceMessage.innerText =
"Today is Holiday";

markBtn.disabled = true;

fnStatus.innerText = "Holiday";

anStatus.innerText = "Holiday";

return;

}


// GPS NOT SET

if(!settings.latitude)
{

attendanceMessage.innerText =
"GPS not set by admin";

markBtn.disabled = true;

return;

}


// TIME CHECK

const now = new Date();

const minutes =
now.getHours()*60 + now.getMinutes();

function toMin(time)
{
const [h,m] = time.split(":");
return parseInt(h)*60 + parseInt(m);
}

const fnStart = toMin(settings.fnStart);

const fnEnd   = toMin(settings.fnEnd);

const anStart = toMin(settings.anStart);

const anEnd   = toMin(settings.anEnd);


// BEFORE FN

if(minutes < fnStart)
{

attendanceMessage.innerText =
"Attendance will start at " + settings.fnStart;

markBtn.disabled = true;

fnStatus.innerText = "Not Started";

anStatus.innerText = "Not Started";

}


// FN TIME

else if(minutes >= fnStart && minutes <= fnEnd)
{

attendanceMessage.innerText =
"All set to go for mark attendance";

markBtn.disabled = false;

fnStatus.innerText = "Pending ⌛";

anStatus.innerText = "Not Started";

}


// BETWEEN FN AN

else if(minutes > fnEnd && minutes < anStart)
{

attendanceMessage.innerText =
"AN attendance will start at " + settings.anStart;

markBtn.disabled = true;

fnStatus.innerText = "Closed";

anStatus.innerText = "Not Started";

}


// AN TIME

else if(minutes >= anStart && minutes <= anEnd)
{

attendanceMessage.innerText =
"All set to go for mark attendance";

markBtn.disabled = false;

fnStatus.innerText = "Closed";

anStatus.innerText = "Pending ⌛";

}


// CLOSED

else
{

attendanceMessage.innerText =
"Attendance closed";

markBtn.disabled = true;

fnStatus.innerText = "Closed";

anStatus.innerText = "Closed";

}

getCurrentSession();

}


// ================= AUTO ABSENT =================

async function autoMarkAbsent()
{

if(!settings) return;

const today =
new Date().toISOString().split("T")[0];

const now = new Date();

const minutes =
now.getHours()*60 + now.getMinutes();

function toMin(t)
{
const [h,m] = t.split(":");
return parseInt(h)*60 + parseInt(m);
}


// FN ABSENT

if(minutes > toMin(settings.fnEnd))
{

const ref =
doc(db,"attendance",currentUser.uid,"records",today+"_FN");

const snap = await getDoc(ref);

if(!snap.exists())
{

await setDoc(ref,
{
date:today,
session:"FN",
status:"Absent",
method:"--",
gps:false,
time:"--",
timestamp:serverTimestamp()
});

}

}


// AN ABSENT

if(minutes > toMin(settings.anEnd))
{

const ref =
doc(db,"attendance",currentUser.uid,"records",today+"_AN");

const snap = await getDoc(ref);

if(!snap.exists())
{

await setDoc(ref,
{
date:today,
session:"AN",
status:"Absent",
method:"--",
gps:false,
time:"--",
timestamp:serverTimestamp()
});

}

}

}


// ================= FACE MODELS =================

async function loadFaceModels()
{

await faceapi.nets.tinyFaceDetector.loadFromUri("models");

await faceapi.nets.faceLandmark68Net.loadFromUri("models");

await faceapi.nets.faceRecognitionNet.loadFromUri("models");

}


// ================= FACE DESCRIPTOR =================

async function loadFaceDescriptor()
{

const snap =
await getDoc(doc(db,"users",currentUser.uid));

const desc =
new Float32Array(snap.data().faceDescriptor);

faceMatcher =
new faceapi.FaceMatcher(
[new faceapi.LabeledFaceDescriptors(
currentUser.uid,
[desc]
)]
);

}


// ================= GPS VERIFY =================

function verifyGPS()
{

return new Promise((resolve,reject)=>
{

gpsBlock.className="progress yellow";

navigator.geolocation.getCurrentPosition(

(pos)=>
{

if(pos.coords.accuracy > 100)
{
gpsBlock.className="progress red";
reject("Fake GPS detected");
return;
}

const dist =
getDistance(
pos.coords.latitude,
pos.coords.longitude,
settings.latitude,
settings.longitude
);

if(dist <= settings.radius)
{

gpsBlock.className="progress green";

resolve();

}
else
{

gpsBlock.className="progress red";

reject("Outside college");

}

},

()=>
{
gpsBlock.className="progress red";
reject("GPS denied");
}

);

});

}


// ================= FACE VERIFY =================

async function verifyFace()
{

faceBlock.className="progress yellow";

const stream =
await navigator.mediaDevices.getUserMedia({video:true});

video.srcObject = stream;

const detection =
await faceapi.detectSingleFace(
video,
new faceapi.TinyFaceDetectorOptions()
)
.withFaceLandmarks()
.withFaceDescriptor();

if(!detection)
{
faceBlock.className="progress red";
manualBlock.className="progress blue";
throw "Face not detected";
}

const match =
faceMatcher.findBestMatch(detection.descriptor);

if(match.label === currentUser.uid)
{

faceBlock.className="progress green";

}
else
{

faceBlock.className="progress red";
manualBlock.className="progress blue";

throw "Face mismatch";

}

}


// ================= SAVE ATTENDANCE =================

async function saveAttendance()
{

const today =
new Date().toISOString().split("T")[0];

const session =
getCurrentSession();

await setDoc(
doc(db,"attendance",currentUser.uid,"records",today+"_"+session),
{

date:today,
session:session,
time:new Date().toLocaleTimeString(),
gps:true,
method:"Facial",
status:"Present",
timestamp:serverTimestamp()

});

alert("Attendance marked successfully");

}


// ================= MARK BUTTON =================

markBtn.onclick = async () =>
{

try
{

await verifyGPS();

await verifyFace();

await saveAttendance();

await loadRecords();

}
catch(e)
{
alert(e);
}

};


// ================= LOAD RECORDS =================

async function loadRecords()
{

recordsTable.innerHTML="";

const snap =
await getDocs(collection(db,"attendance",currentUser.uid,"records"));

let i=1;

snap.forEach(docSnap=>
{

const data=docSnap.data();

recordsTable.innerHTML +=
`
<tr>
<td>${i++}</td>
<td>${data.date}</td>
<td>${data.session}</td>
<td>${data.time}</td>
<td>${data.gps?"Verified":"--"}</td>
<td>${data.method}</td>
<td>${data.status}</td>
</tr>
`;

});

}


// ================= DISTANCE =================

function getDistance(lat1,lon1,lat2,lon2)
{

const R=6371000;

const dLat=(lat2-lat1)*Math.PI/180;
const dLon=(lon2-lon1)*Math.PI/180;

const a=
Math.sin(dLat/2)**2 +
Math.cos(lat1*Math.PI/180) *
Math.cos(lat2*Math.PI/180) *
Math.sin(dLon/2)**2;

return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

}


// ================ HEADER DATE & TIME ================
function updateHeaderDateTime()
{
	const now = new Date();
	const date = now.toLocaleDateString();
	const time = now.toLocaleTimeString();
	const dateEl = document.getElementById("currentDate");
	const timeEl = document.getElementById("currentTime");
	if(dateEl) dateEl.innerText = date;
	if(timeEl) timeEl.innerText = time;
}

// start clock
setInterval(updateHeaderDateTime, 1000);
updateHeaderDateTime();
