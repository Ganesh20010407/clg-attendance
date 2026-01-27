import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  doc, getDoc, collection, addDoc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* MENU */
menuBtn.onclick = () => sidebar.classList.toggle("hidden");
logout.onclick = () => signOut(auth).then(() => location.href = "login.html");

/* AUTH */
let me = null;

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "login.html";

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists() || snap.data().role !== "student")
    return location.href = "login.html";

  me = snap.data();
  loadProfile();
  loadAttendance();
});

/* PROFILE */
function loadProfile() {
  welcomeText.innerText = `Welcome, ${me.name}`;
  wish.innerText = `Hello ${me.name} 👋`;

  pName.innerText = me.name;
  pEmail.innerText = me.email;
  pPhone.innerText = me.phone;
  pId.innerText = me.studentId;
  pDept.innerText = me.department;
  pYear.innerText = me.year;
  pIncharge.innerText = me.inchargeName || "-";
}

/* GPS */
function checkGPS() {
  return new Promise(r =>
    navigator.geolocation.getCurrentPosition(
      () => r(true),
      () => r(false)
    )
  );
}

/* MARK ATTENDANCE */
facialBtn.onclick = async () => {
  if (!(await checkGPS())) return gpsStatus.innerText = "GPS failed";
  if (!me.canMarkAttendance)
    return permissionStatus.innerText = "Permission required";

  await addDoc(collection(db, "attendanceRecords"), {
    studentUid: auth.currentUser.uid,
    studentName: me.name,
    studentId: me.studentId,
    inchargeId: me.inchargeId,
    date: new Date().toISOString().split("T")[0],
    session: "FN",
    academicYear: me.year,
    method: "facial",
    gpsVerified: true,
    status: "Present"
  });

  markMsg.innerText = "Attendance marked";
};

manualBtn.onclick = async () => {
  if (!(await checkGPS())) return gpsStatus.innerText = "GPS failed";

  await addDoc(collection(db, "attendanceRecords"), {
    studentUid: auth.currentUser.uid,
    studentName: me.name,
    studentId: me.studentId,
    inchargeId: me.inchargeId,
    date: new Date().toISOString().split("T")[0],
    session: "FN",
    academicYear: me.year,
    method: "manual",
    gpsVerified: true,
    status: "Pending"
  });

  markMsg.innerText = "Manual request sent";
};

/* HISTORY */
async function loadAttendance() {
  attTable.innerHTML = "";
  const q = query(
    collection(db, "attendanceRecords"),
    where("studentUid", "==", auth.currentUser.uid)
  );
  const snap = await getDocs(q);

  snap.forEach(d => {
    const r = d.data();
    attTable.innerHTML += `
      <tr>
        <td>${r.date}</td>
        <td>${r.session}</td>
        <td>${r.method}</td>
        <td>${r.gpsVerified ? "✔" : "✖"}</td>
        <td>${r.status}</td>
      </tr>`;
  });
}
