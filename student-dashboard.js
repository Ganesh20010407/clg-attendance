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
  query,
  where,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ================= MENU ================= */
menuBtn.onclick = () => {
  sidebar.style.display = sidebar.style.display === "block" ? "none" : "block";
};

document.querySelectorAll(".sidebar div[data-sec]").forEach(d => {
  d.onclick = () => show(d.dataset.sec);
});

logout.onclick = () => {
  signOut(auth).then(() => location.href = "login.html");
};

function show(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  sidebar.style.display = "none";
}

/* ================= AUTH ================= */
let currentUserData = null;
let uid = null;

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  uid = user.uid;

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists() || snap.data().role !== "student") {
    location.href = "login.html";
    return;
  }

  currentUserData = snap.data();
  loadProfile(currentUserData);
  loadAttendance();
});

/* ================= PROFILE ================= */
function loadProfile(u) {
  welcomeText.innerText = `Welcome, ${u.name}`;
  wish.innerText = `Welcome, ${u.name} 👋`;

  pName.innerText = u.name;
  pEmail.innerText = u.email;
  pPhone.innerText = u.phone;
  pId.innerText = u.studentId;
  pDept.innerText = u.department;
  pYear.innerText = u.year;
  pIncharge.innerText = u.inchargeName || "-";
}

/* ================= GPS CHECK ================= */
async function checkGPS() {
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve(true),
      () => resolve(false)
    );
  });
}

/* ================= MARK ATTENDANCE ================= */
facialBtn.onclick = async () => {
  markMsg.innerText = "";
  const gps = await checkGPS();

  if (!gps) {
    gpsStatus.innerText = "GPS Not Verified";
    return;
  }

  if (!currentUserData.canMarkAttendance) {
    permissionStatus.innerText = "Attendance permission not enabled";
    return;
  }

  await addDoc(collection(db, "attendanceRecords"), {
    uid,
    date: new Date().toISOString().split("T")[0],
    session: "FN",
    academicYear: currentUserData.year,
    month: new Date().getMonth() + 1,
    method: "facial",
    gpsVerified: true,
    status: "Present"
  });

  markMsg.innerText = "Facial attendance marked";
};

manualBtn.onclick = async () => {
  markMsg.innerText = "";
  const gps = await checkGPS();

  if (!gps) {
    gpsStatus.innerText = "GPS Not Verified";
    return;
  }

  await addDoc(collection(db, "attendanceRecords"), {
    uid,
    date: new Date().toISOString().split("T")[0],
    session: "FN",
    academicYear: currentUserData.year,
    month: new Date().getMonth() + 1,
    method: "manual",
    gpsVerified: true,
    status: "Pending"
  });

  markMsg.innerText = "Manual attendance request sent";
};

/* ================= HISTORY ================= */
async function loadAttendance() {
  attTable.innerHTML = "";

  const snap = await getDocs(
    query(collection(db, "attendanceRecords"), where("uid", "==", uid))
  );

  snap.forEach(d => {
    const r = d.data();
    attTable.innerHTML += `
      <tr>
        <td>${r.date}</td>
        <td>${r.session}</td>
        <td>${r.method}</td>
        <td>${r.gpsVerified ? "Verified" : "Not Verified"}</td>
        <td>${r.status}</td>
      </tr>
    `;
  });
}

yearFilter.onchange = monthFilter.onchange = loadAttendance;
