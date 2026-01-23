/* =========================================================
   1. FIREBASE IMPORTS & INIT
========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyAFUziq6QGKCwujtiTL-4Rk823FE12ZDGU",
  authDomain: "markattnedance.firebaseapp.com",
  projectId: "markattnedance"
});

const auth = getAuth(app);
const db = getFirestore(app);

/* =========================================================
   2. DOM + MENU HANDLING
========================================================= */
const menu = document.getElementById("menu");
const menuToggle = document.getElementById("menuToggle");
const views = document.querySelectorAll(".view");

menuToggle.onclick = () => menu.classList.toggle("show");

function showView(id) {
  views.forEach(v => v.style.display = "none");
  document.getElementById(id).style.display = "block";
  menu.classList.remove("show");
}
window.showView = showView;

/* =========================================================
   3. GLOBAL SETTINGS (ADMIN CONTROLLED)
========================================================= */
let settings = {
  collegeLat: 16.5062,
  collegeLng: 80.6480,
  radius: 150,
  maxAccuracy: 50,
  locked: false,
  fnStart: "09:00",
  fnEnd: "11:00",
  anStart: "13:00",
  anEnd: "16:00"
};

/* =========================================================
   4. AUTH STATE & ROLE ROUTER
========================================================= */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    alert("Profile missing. Please re-register.");
    await signOut(auth);
    return;
  }

  const u = snap.data();

  /* PROFILE COMMON */
  pName.innerText = u.name || "-";
  pEmail.innerText = u.email || "-";
  pRole.innerText = u.role || "-";
  pPhone.innerText = u.phone || "-";
  pIncharge.innerText = u.inchargeId || "-";
  pHod.innerText = u.hodId || "-";

  const sSnap = await getDoc(doc(db, "settings", "attendance"));
  if (sSnap.exists()) settings = sSnap.data();

  if (u.role === "student") loadStudent(user, u);
  if (u.role === "incharge") loadIncharge(user, u);
  if (u.role === "hod") loadHod(u);
  if (u.role === "admin") loadAdmin(u);
});

/* =========================================================
   5. TIME & GPS HELPERS
========================================================= */
function allowedSession() {
  const t = new Date().toTimeString().slice(0, 5);
  if (t >= settings.fnStart && t <= settings.fnEnd) return "FN";
  if (t >= settings.anStart && t <= settings.anEnd) return "AN";
  return null;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkGPS() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > settings.maxAccuracy)
          return reject("Low GPS accuracy");

        const dist = getDistance(
          latitude, longitude,
          settings.collegeLat, settings.collegeLng
        );

        resolve({
          inside: dist <= settings.radius,
          latitude, longitude,
          accuracy,
          distance: Math.round(dist)
        });
      },
      () => reject("GPS permission denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/* =========================================================
   6. STUDENT DASHBOARD
========================================================= */
async function loadStudent(user, u) {
  menu.innerHTML = `
    <a onclick="showView('profileView')">Profile</a>
    <a onclick="showView('studentAttendanceView')">Attendance</a>
    <a onclick="logout()">Logout</a>`;
  showView("studentAttendanceView");

  markAttendanceBtn.onclick = async () => {
    if (settings.locked) return alert("Attendance locked");
    const session = allowedSession();
    if (!session) return alert("Not allowed time");

    try {
      const gps = await checkGPS();
      if (!gps.inside) throw "Outside college";

      await addDoc(collection(db, "attendance"), {
        uid: user.uid,
        name: u.name,
        roll: u.roll,
        session,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        present: true,
        manual: false,
        markedBy: "student",
        gpsStatus: true,
        ...gps,
        timestamp: new Date()
      });
      location.reload();
    } catch (e) {
      alert(e + ". You can request manual attendance.");
    }
  };

  requestManualBtn.onclick = async () => {
    await addDoc(collection(db, "manualRequests"), {
      uid: user.uid,
      name: u.name,
      roll: u.roll,
      requestedBy: "student",
      session: allowedSession(),
      status: "pending",
      timestamp: new Date()
    });
    alert("Manual request sent");
  };

  const snap = await getDocs(collection(db, "attendance"));
  let total = 0, present = 0;
  studentAttendanceTable.innerHTML = "";

  snap.forEach(d => {
    const a = d.data();
    if (a.uid === user.uid) {
      total++;
      if (a.present) present++;
      studentAttendanceTable.innerHTML += `
        <tr>
          <td>${a.date}</td>
          <td>${a.session}</td>
          <td>${a.present ? "✔" : "✖"}</td>
          <td>${a.gpsStatus ? "✔" : "✖"}</td>
          <td>${a.manual ? "✔" : "✖"}</td>
        </tr>`;
    }
  });

  stuPercent.innerText = total ? Math.round((present / total) * 100) + "%" : "0%";
}

/* =========================================================
   7. INCHARGE DASHBOARD
========================================================= */
async function loadIncharge(user, u) {
  menu.innerHTML = `
    <a onclick="showView('profileView')">Profile</a>
    <a onclick="showView('inchargeStudentsView')">Students</a>
    <a onclick="showView('inchargeAttendanceView')">Attendance</a>
    <a onclick="logout()">Logout</a>`;
  showView("inchargeStudentsView");

  const usersSnap = await getDocs(collection(db, "users"));
  inchargeStudentTable.innerHTML = "";

  usersSnap.forEach(d => {
    const s = d.data();
    if (s.role === "student" && s.inchargeId === u.uid) {
      inchargeStudentTable.innerHTML += `
        <tr>
          <td>${s.name}</td>
          <td>${s.roll}</td>
          <td>
            <button onclick="requestManual('${s.uid}','${s.name}','${s.roll}')">
              Manual
            </button>
          </td>
        </tr>`;
    }
  });
}

window.requestManual = async (uid, name, roll) => {
  await addDoc(collection(db, "manualRequests"), {
    uid, name, roll,
    requestedBy: "incharge",
    status: "pending",
    timestamp: new Date()
  });
  alert("Manual request sent");
};

/* =========================================================
   8. HOD DASHBOARD (VIEW ONLY)
========================================================= */
async function loadHod(u) {
  menu.innerHTML = `
    <a onclick="showView('profileView')">Profile</a>
    <a onclick="showView('hodAttendanceView')">Attendance</a>
    <a onclick="logout()">Logout</a>`;
  showView("hodAttendanceView");

  const snap = await getDocs(collection(db, "attendance"));
  hodAttendanceTable.innerHTML = "";

  snap.forEach(d => {
    const a = d.data();
    hodAttendanceTable.innerHTML += `
      <tr>
        <td>${a.name}</td>
        <td>${a.roll}</td>
        <td>${a.date}</td>
        <td>${a.session}</td>
        <td>${a.gpsStatus ? "✔" : "✖"}</td>
      </tr>`;
  });
}

/* =========================================================
   9. ADMIN DASHBOARD
========================================================= */
async function loadAdmin(u) {
  menu.innerHTML = `
    <a onclick="showView('profileView')">Profile</a>
    <a onclick="showView('adminAttendanceView')">Attendance</a>
    <a onclick="showView('adminManualView')">Manual Requests</a>
    <a onclick="showView('adminSettingsView')">Settings</a>
    <a onclick="logout()">Logout</a>`;
  showView("adminAttendanceView");

  const attSnap = await getDocs(collection(db, "attendance"));
  adminAttendanceTable.innerHTML = "";

  attSnap.forEach(d => {
    const a = d.data();
    adminAttendanceTable.innerHTML += `
      <tr>
        <td>${a.name}</td>
        <td>${a.roll}</td>
        <td>${a.date}</td>
        <td>${a.session}</td>
        <td>${a.gpsStatus ? "✔" : "✖"}</td>
        <td>${a.manual ? "✔" : "✖"}</td>
      </tr>`;
  });

  const reqSnap = await getDocs(collection(db, "manualRequests"));
  adminManualTable.innerHTML = "";

  reqSnap.forEach(d => {
    const r = d.data();
    if (r.status === "pending") {
      adminManualTable.innerHTML += `
        <tr>
          <td>${r.name}</td>
          <td>${r.roll}</td>
          <td>${r.requestedBy}</td>
          <td>
            <button onclick="approveManual('${d.id}')">Approve</button>
            <button onclick="rejectManual('${d.id}')">Reject</button>
          </td>
        </tr>`;
    }
  });

  saveSettingsBtn.onclick = async () => {
    await setDoc(doc(db, "settings", "attendance"), {
      ...settings,
      fnStart: fnStart.value,
      fnEnd: fnEnd.value,
      anStart: anStart.value,
      anEnd: anEnd.value,
      locked: lockAttendance.checked
    });
    alert("Settings saved");
  };
}

window.approveManual = async (id) => {
  const ref = doc(db, "manualRequests", id);
  const snap = await getDoc(ref);
  const r = snap.data();

  await addDoc(collection(db, "attendance"), {
    ...r,
    present: true,
    manual: true,
    markedBy: "admin",
    timestamp: new Date()
  });

  await updateDoc(ref, { status: "approved" });
  location.reload();
};

window.rejectManual = async (id) => {
  await updateDoc(doc(db, "manualRequests", id), { status: "rejected" });
  location.reload();
};

/* =========================================================
   10. LOGOUT
========================================================= */
window.logout = async () => {
  await signOut(auth);
  location.href = "login.html";
};
