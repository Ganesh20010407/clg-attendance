import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection, getDocs, getDoc, doc,
  updateDoc, addDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ========== STATE ========== */
let me = null;
let studentsCache = [];
let todayData = [], recordData = [], activeData = [];

/* ========== DOM ========== */
const sections = document.querySelectorAll(".section");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

const welcome = document.getElementById("welcome");

/* Profile */
const pPhoto = document.getElementById("pPhoto");
const pName = document.getElementById("pName");
const pEmail = document.getElementById("pEmail");
const pPhone = document.getElementById("pPhone");
const pDept = document.getElementById("pDept");
const pRole = document.getElementById("pRole");
const pId = document.getElementById("pId");

/* Approval */
const requestPermBtn = document.getElementById("requestPermBtn");
const permStatusText = document.getElementById("permStatusText");
const approvalTable = document.getElementById("approvalTable");

/* Students */
const studentTable = document.getElementById("studentTable");
const studentSearch = document.getElementById("studentSearch");

/* Attendance */
const attType = document.getElementById("attType");
const attSearch = document.getElementById("attSearch");
const attSort = document.getElementById("attSort");
const downloadExcel = document.getElementById("downloadExcel");
const attendanceTable = document.getElementById("attendanceTable");

/* Logout */
const logoutBtn = document.getElementById("logout");
const logoutConfirm = document.getElementById("logoutConfirm");
const confirmLogout = document.getElementById("confirmLogout");
const cancelLogout = document.getElementById("cancelLogout");

/* ========== MENU ========== */
menuBtn.onclick = () => sidebar.classList.toggle("hidden");

document.querySelectorAll("[data-sec]").forEach(item => {
  item.onclick = () => show(item.dataset.sec);
});

function show(id) {
  sections.forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  sidebar.classList.add("hidden");

  if (id === "approval") loadApproval();
  if (id === "students") loadStudents();
  if (id === "attendance") loadAttendance();
}

/* ========== AUTH ========== */
onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "login.html";

  const snap = await getDoc(doc(db, "users", user.uid));
  me = snap.data();

  welcome.innerText = `Welcome, ${me.name}`;

  pPhoto.src = me.photoURL;
  pName.innerText = me.name;
  pEmail.innerText = me.email;
  pPhone.innerText = me.phone || "-";
  pDept.innerText = me.department || "-";
  pRole.innerText = me.role;
  pId.innerText = me.staffId || "-";

  checkPermissionStatus();
  show("home");
});

/* ========== PERMISSION ========== */
async function checkPermissionStatus() {
  requestPermBtn.disabled = false;
  requestPermBtn.classList.remove("disabled");
  permStatusText.innerText = "";

  if (me.canApproveStudents) {
    permStatusText.innerText = "✅ Permission granted";
    requestPermBtn.style.display = "none";
    return;
  }

  const reqQ = query(
    collection(db, "permissionRequests"),
    where("staffUid", "==", auth.currentUser.uid),
    where("status", "==", "pending")
  );
  const reqSnap = await getDocs(reqQ);

  if (!reqSnap.empty) {
    permStatusText.innerText = "⏳ Permission request pending";
    requestPermBtn.disabled = true;
    requestPermBtn.classList.add("disabled");
    return;
  }

  const users = await getDocs(collection(db, "users"));
  let hasPending = false;

  users.forEach(d => {
    const u = d.data();
    if (u.role === "student" && !u.approved) hasPending = true;
  });

  if (!hasPending) {
    permStatusText.innerText = "ℹ️ No students pending for approval";
    requestPermBtn.disabled = true;
    requestPermBtn.classList.add("disabled");
  }
}

requestPermBtn.onclick = async () => {
  if (requestPermBtn.disabled) return alert("No students to approve");

  await addDoc(collection(db, "permissionRequests"), {
    staffUid: auth.currentUser.uid,
    staffName: me.name,
    role: me.role,
    status: "pending",
    requestedAt: new Date()
  });

  alert("Permission request sent");
  checkPermissionStatus();
};

/* ========== APPROVAL ========== */
async function loadApproval() {
  approvalTable.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));
  let found = false;

  snap.forEach(d => {
    const u = d.data();
    if (u.role === "student" && !u.approved) {
      found = true;
      approvalTable.innerHTML += `
      <tr>
        <td>${u.name}</td>
        <td>${u.studentId}</td>
        <td>${u.email}</td>
        <td>${u.createdAt?.toDate?.() || "-"}</td>
        <td>
          <button onclick="approve('${d.id}')">Approve</button>
          <button onclick="reject('${d.id}')">Reject</button>
        </td>
      </tr>`;
    }
  });

  if (!found) {
    approvalTable.innerHTML =
      `<tr><td colspan="5">No students pending approval</td></tr>`;
  }
}

window.approve = async id => {
  await updateDoc(doc(db, "users", id), { approved: true });
  loadApproval();
};

window.reject = async id => {
  await updateDoc(doc(db, "users", id), { approved: false });
  loadApproval();
};

/* ========== STUDENTS ========== */
async function loadStudents() {
  studentsCache = [];
  studentTable.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));
  snap.forEach(d => {
    const u = d.data();
    if (u.role === "student" && u.approved) studentsCache.push(u);
  });

  renderStudents();
}

function renderStudents() {
  const key = studentSearch.value.toLowerCase();
  studentTable.innerHTML = "";

  const list = studentsCache.filter(s =>
    s.name.toLowerCase().includes(key) ||
    s.studentId.toLowerCase().includes(key)
  );

  if (!list.length) {
    studentTable.innerHTML =
      `<tr><td colspan="7">No students found</td></tr>`;
    return;
  }

  list.forEach(s => {
    studentTable.innerHTML += `
    <tr>
      <td><img src="${s.photoURL}" width="40"></td>
      <td>${s.name}</td>
      <td>${s.studentId}</td>
      <td>${s.email}</td>
      <td>${s.phone}</td>
      <td>${s.department}</td>
      <td>${s.year}</td>
    </tr>`;
  });
}

studentSearch.oninput = renderStudents;

/* ========== ATTENDANCE ========== */
async function loadAttendance() {
  todayData = [];
  recordData = [];
  const today = new Date().toDateString();

  const snap = await getDocs(collection(db, "attendanceRecords"));
  snap.forEach(d => {
    const a = d.data();
    const r = {
      name: a.studentName,
      id: a.studentId,
      date: a.date,
      session: a.session,
      gps: a.gpsVerified,
      method: a.method,
      status: a.status
    };
    (new Date(a.date).toDateString() === today ? todayData : recordData).push(r);
  });

  renderAttendance();
}

function renderAttendance() {
  let data = attType.value === "today" ? todayData : recordData;
  const key = attSearch.value.toLowerCase();

  data = data.filter(r =>
    r.name.toLowerCase().includes(key) ||
    r.id.toLowerCase().includes(key)
  );

  activeData = data;
  attendanceTable.innerHTML = "";

  if (!data.length) {
    attendanceTable.innerHTML =
      `<tr><td colspan="8">No data</td></tr>`;
    return;
  }

  data.forEach(r => {
    attendanceTable.innerHTML += `
    <tr>
      <td>${r.name}</td>
      <td>${r.id}</td>
      <td>${r.date}</td>
      <td>${r.session}</td>
      <td>${r.gps ? "✔" : "❌"}</td>
      <td>${r.method === "facial" ? "✔" : "❌"}</td>
      <td>${r.method === "manual" ? "✔" : "❌"}</td>
      <td>${r.status === "Present" ? "✔" : "❌"}</td>
    </tr>`;
  });
}

attType.onchange = renderAttendance;
attSearch.oninput = renderAttendance;

/* ========== DOWNLOAD ========== */
downloadExcel.onclick = () => {
  if (!activeData.length) return alert("No data");

  let csv = "Name,ID,Date,Session,GPS,Method,Status\n";
  activeData.forEach(r => {
    csv += `${r.name},${r.id},${r.date},${r.session},${r.gps},${r.method},${r.status}\n`;
  });

  const blob = new Blob([csv], { type: "application/vnd.ms-excel" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "attendance.xls";
  a.click();
};

/* ========== LOGOUT (WORKING) ========== */
logoutBtn.onclick = () => logoutConfirm.classList.remove("hidden");
cancelLogout.onclick = () => logoutConfirm.classList.add("hidden");
confirmLogout.onclick = async () => {
  await signOut(auth);
  window.location.replace("login.html");
};
