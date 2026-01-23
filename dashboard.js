import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* MENU TOGGLE */
window.toggleMenu = function () {
  const s = document.getElementById("sidebar");
  s.style.display = s.style.display === "block" ? "none" : "block";
};

/* SECTION SWITCH */
window.showSection = function (id) {
  document.querySelectorAll(".section")
    .forEach(sec => sec.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  document.getElementById("sidebar").style.display = "none";
};

/* LOGOUT */
window.logout = function () {
  signOut(auth);
  location.href = "login.html";
};

/* AUTH CHECK */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists() || snap.data().role !== "admin") {
    location.href = "login.html";
    return;
  }

  document.getElementById("pName").innerText = snap.data().name;
  document.getElementById("pEmail").innerText = snap.data().email;
});

/* ================= APPROVALS ================= */

window.openApprovals = function () {
  showSection("approvals");
  loadPendingStaff();
  loadPendingStudents();
  loadApprovalPermissions();
};

/* STAFF APPROVAL */
async function loadPendingStaff() {
  const table = document.getElementById("staffTable");
  table.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));
  snap.forEach(d => {
    const u = d.data();
    if (
      u.approved === false &&
      (u.role === "incharge" || u.role === "hod" || u.role === "principal")
    ) {
      table.innerHTML += `
        <tr>
          <td>${u.name}</td>
          <td>${u.role}</td>
          <td>${u.email}</td>
          <td>
            <button onclick="approveStaff('${d.id}')">Approve</button>
            <button onclick="rejectStaff('${d.id}')">Reject</button>
          </td>
        </tr>
      `;
    }
  });
}

window.approveStaff = async (uid) => {
  await updateDoc(doc(db, "users", uid), { approved: true });
  loadPendingStaff();
};

window.rejectStaff = async (uid) => {
  await deleteDoc(doc(db, "users", uid));
  loadPendingStaff();
};

/* STUDENT APPROVAL */
async function loadPendingStudents() {
  const table = document.getElementById("studentTable");
  table.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));
  snap.forEach(d => {
    const u = d.data();
    if (u.role === "student" && u.approved === false) {
      table.innerHTML += `
        <tr>
          <td>${u.name}</td>
          <td>${u.roll || "-"}</td>
          <td>
            <button onclick="approveStudent('${d.id}')">Approve</button>
          </td>
        </tr>
      `;
    }
  });
}

window.approveStudent = async (uid) => {
  await updateDoc(doc(db, "users", uid), { approved: true });
  loadPendingStudents();
};

/* APPROVAL PERMISSIONS */
async function loadApprovalPermissions() {
  const table = document.getElementById("permissionTable");
  table.innerHTML = "";

  const snap = await getDocs(collection(db, "users"));
  snap.forEach(d => {
    const u = d.data();
    if (u.role === "hod" || u.role === "incharge") {
      table.innerHTML += `
        <tr>
          <td>${u.name}</td>
          <td>${u.role}</td>
          <td>
            <input type="checkbox"
              ${u.canApproveStudents ? "checked" : ""}
              onchange="togglePermission('${d.id}', this.checked)">
          </td>
        </tr>
      `;
    }
  });
}

window.togglePermission = async (uid, val) => {
  await updateDoc(doc(db, "users", uid), { canApproveStudents: val });
};


import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ================= ATTENDANCE ================= */

let attendanceData = [];
let filteredData = [];

/* LOAD RECORDS */
async function loadAttendance() {
  const snap = await getDocs(collection(db, "attendanceRecords"));
  attendanceData = [];
  snap.forEach(d => attendanceData.push(d.data()));
  filteredData = [...attendanceData];
  renderAttendance(filteredData);
}

/* RENDER TABLE */
function renderAttendance(data) {
  const table = document.getElementById("attendanceTable");
  table.innerHTML = "";

  data.forEach(r => {
    table.innerHTML += `
      <tr>
        <td>${r.date}</td>
        <td>${r.studentName}</td>
        <td>${r.roll}</td>
        <td>${r.department}</td>
        <td>${r.inchargeName}</td>
        <td>${r.hodName}</td>
        <td>${r.session}</td>
        <td>${r.status}</td>
        <td>${r.markedTime || "-"}</td>
        <td>${r.locationStatus || "-"}</td>
      </tr>
    `;
  });
}

/* SEARCH */
window.applySearch = function () {
  const q = document.getElementById("searchInput").value.toLowerCase();
  filteredData = attendanceData.filter(r =>
    r.studentName.toLowerCase().includes(q) ||
    r.roll.toLowerCase().includes(q) ||
    r.department.toLowerCase().includes(q) ||
    r.inchargeName.toLowerCase().includes(q) ||
    r.hodName.toLowerCase().includes(q)
  );
  applyFilter();
};

/* SESSION FILTER */
window.applyFilter = function () {
  const s = document.getElementById("sessionFilter").value;
  let temp = [...filteredData];
  if (s !== "All") temp = temp.filter(r => r.session === s);
  renderAttendance(temp);
};

/* SORT */
window.applySort = function () {
  const type = document.getElementById("sortSelect").value;
  let temp = [...filteredData];

  if (type === "dateDesc")
    temp.sort((a, b) => b.date.localeCompare(a.date));
  if (type === "dateAsc")
    temp.sort((a, b) => a.date.localeCompare(b.date));
  if (type === "name")
    temp.sort((a, b) => a.studentName.localeCompare(b.studentName));
  if (type === "roll")
    temp.sort((a, b) => a.roll.localeCompare(b.roll));

  renderAttendance(temp);
};

/* DOWNLOAD EXCEL */
window.downloadExcel = function () {
  let csv = "Date,Name,Roll,Dept,Incharge,HOD,Session,Status,Time,Location\n";
  filteredData.forEach(r => {
    csv += `${r.date},${r.studentName},${r.roll},${r.department},${r.inchargeName},${r.hodName},${r.session},${r.status},${r.markedTime || ""},${r.locationStatus || ""}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "attendance.csv";
  a.click();
};

/* LOAD WHEN ATTENDANCE MENU CLICKED */
const oldShow = window.showSection;
window.showSection = function (id) {
  oldShow(id);
  if (id === "attendance") loadAttendance();
};
