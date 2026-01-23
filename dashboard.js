import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
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

/* ================= FIREBASE ================= */
const app = initializeApp({
  apiKey: "AIzaSyAFUziq6QGKCwujtiTL-4Rk823FE12ZDGU",
  authDomain: "markattnedance.firebaseapp.com",
  projectId: "markattnedance"
});
const auth = getAuth(app);
const db = getFirestore(app);

/* ================= DOM ================= */
const menu = document.getElementById("menu");
const menuToggle = document.getElementById("menuToggle");
const views = document.querySelectorAll(".view");

menuToggle.onclick = () => menu.classList.toggle("show");

document.addEventListener("click", e => {
  if (!menu.contains(e.target) && !menuToggle.contains(e.target)) {
    menu.classList.remove("show");
  }
});

function showView(id) {
  views.forEach(v => (v.style.display = "none"));
  document.getElementById(id).style.display = "block";
  menu.classList.remove("show");
}
window.showView = showView;

/* ================= SETTINGS ================= */
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

/* ================= AUTH ================= */
onAuthStateChanged(auth, async user => {
  if (!user) return (location.href = "login.html");

  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) {
    alert("User record missing");
    await signOut(auth);
    return (location.href = "login.html");
  }

  const u = userSnap.data();

  // block unapproved staff
  if (u.role !== "student" && !u.approved) {
    alert("Waiting for admin approval");
    await signOut(auth);
    return (location.href = "login.html");
  }

  // profile
  pName.innerText = u.name;
  pEmail.innerText = u.email;
  pRole.innerText = u.role;
  pPhone.innerText = u.phone || "-";

  // resolve incharge / hod
  if (u.inchargeId) {
    const incSnap = await getDoc(doc(db, "users", u.inchargeId));
    pIncharge.innerText = incSnap.exists() ? incSnap.data().name : "-";
  } else pIncharge.innerText = "-";

  if (u.hodId) {
    const hodSnap = await getDoc(doc(db, "users", u.hodId));
    pHod.innerText = hodSnap.exists() ? hodSnap.data().name : "-";
  } else pHod.innerText = "-";

  // load settings
  const sSnap = await getDoc(doc(db, "settings", "attendance"));
  if (sSnap.exists()) settings = sSnap.data();

  // route by role
  if (u.role === "student") loadStudent(u);
  if (u.role === "incharge") loadIncharge(user.uid);
  if (u.role === "hod") loadHod();
  if (u.role === "admin") loadAdmin();
});

/* ================= TIME ================= */
function allowedSession() {
  const t = new Date().toTimeString().slice(0, 5);
  if (t >= settings.fnStart && t <= settings.fnEnd) return "FN";
  if (t >= settings.anStart && t <= settings.anEnd) return "AN";
  return null;
}

/* ================= GPS ================= */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkGPSBest() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > settings.maxAccuracy) return reject("accuracy");

        const dist = getDistance(
          latitude,
          longitude,
          settings.collegeLat,
          settings.collegeLng
        );

        resolve({
          inside: dist <= settings.radius,
          latitude,
          longitude,
          accuracy,
          distance: Math.round(dist)
        });
      },
      () => reject("permission"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/* ================= STUDENT ================= */
async function loadStudent(u) {
  menu.innerHTML = `
    <a onclick="showView('profileView')">Profile</a>
    <a onclick="showView('studentAttendanceView')">Attendance</a>
    <a onclick="logout()">Logout</a>`;
  showView("studentAttendanceView");

  markAttendanceBtn.onclick = async () => {
    if (settings.locked) return alert("Attendance locked");

    const session = allowedSession();
    if (!session) return alert("Attendance not allowed now");

    try {
      const gps = await checkGPSBest();
      if (!gps.inside) return alert("Outside college");

      const today = new Date().toLocaleDateString();

      const snap = await getDocs(collection(db, "attendance"));
      let exists = false;

      snap.forEach(d => {
        const a = d.data();
        if (a.email === u.email && a.date === today && a.session === session) {
          exists = true;
        }
      });

      if (exists) return alert("Attendance already marked");

      await addDoc(collection(db, "attendance"), {
        name: u.name,
        roll: u.roll,
        email: u.email,
        date: today,
        time: new Date().toLocaleTimeString(),
        session,
        present: true,
        manual: false,
        markedBy: "student",
        gpsStatus: true,
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy,
        distance: gps.distance,
        timestamp: new Date()
      });

      alert("Attendance marked");
      location.reload();

    } catch (e) {
      if (e === "accuracy") alert("Low GPS accuracy");
      else if (e === "permission") alert("Enable GPS permission");
      else alert("Attendance failed");
    }
  };

  const snap = await getDocs(collection(db, "attendance"));
  let total = 0, present = 0;
  studentAttendanceTable.innerHTML = "";

  snap.forEach(d => {
    const a = d.data();
    if (a.email === u.email) {
      total++;
      if (a.present) present++;
      studentAttendanceTable.innerHTML += `
        <tr>
          <td>${a.date}</td>
          <td>${a.time || "-"}</td>
          <td>${a.session}</td>
          <td>${a.present ? "✔" : "✖"}</td>
          <td>${a.gpsStatus ? "✔" : "✖"}</td>
          <td>${a.manual ? "✔" : "✖"}</td>
        </tr>`;
    }
  });

  stuPercent.innerText = total ? Math.round(present / total * 100) + "%" : "0%";
}

/* ================= INCHARGE ================= */
async function loadIncharge(uid) {
  menu.innerHTML = `
    <a onclick="showView('profileView')">Profile</a>
    <a onclick="showView('inchargeStudentsView')">Students</a>
    <a onclick="logout()">Logout</a>`;
  showView("inchargeStudentsView");

  const users = await getDocs(collection(db, "users"));
  inchargeStudentTable.innerHTML = "";

  users.forEach(d => {
    const s = d.data();
    if (s.role === "student" && s.inchargeId === uid) {
      inchargeStudentTable.innerHTML += `
        <tr>
          <td>${s.name}</td>
          <td>${s.roll}</td>
          <td>
            <button onclick="requestManual('${s.name}','${s.roll}','${s.email}')">
              Request Manual
            </button>
          </td>
        </tr>`;
    }
  });
}

/* ================= HOD ================= */
async function loadHod() {
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

/* ================= ADMIN ================= */
async function loadAdmin() {
  menu.innerHTML = `
    <a onclick="showView('profileView')">Profile</a>
    <a onclick="showView('adminAttendanceView')">Attendance</a>
    <a onclick="showView('adminSettingsView')">Settings</a>
    <a onclick="logout()">Logout</a>`;
  showView("adminAttendanceView");

  const snap = await getDocs(collection(db, "attendance"));
  adminAttendanceTable.innerHTML = "";

  snap.forEach(d => {
    const a = d.data();
    adminAttendanceTable.innerHTML += `
      <tr>
        <td>${a.name}</td>
        <td>${a.roll}</td>
        <td>${a.date}</td>
        <td>${a.time || "-"}</td>
        <td>${a.session}</td>
        <td>${a.gpsStatus ? "✔" : "✖"}</td>
        <td>${a.accuracy || "-"}</td>
        <td>${a.distance || "-"}</td>
        <td>${a.manual ? "✔" : "✖"}</td>
        <td>${a.markedBy}</td>
      </tr>`;
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

/* ================= LOGOUT ================= */
window.logout = async () => {
  await signOut(auth);
  location.href = "login.html";
};
