import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ========== ROLE CHECK ========== */
onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  const snap = await getDocs(collection(db, "users"));
  let currentUser = null;

  snap.forEach(d => {
    if (d.id === user.uid) currentUser = d.data();
  });

  if (!currentUser || currentUser.role !== "admin") {
    alert("Access denied");
    location.href = "login.html";
  }

  loadOverview();
  loadStaffApprovals();
  loadStudentApprovals();
  loadApprovalPermissions();
});

/* ========== NAVIGATION ========== */
window.showSection = function (id) {
  document.querySelectorAll(".section")
    .forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
};

/* ========== OVERVIEW ========== */
async function loadOverview() {
  const snap = await getDocs(collection(db, "users"));

  let students = 0, staff = 0, pendingStudents = 0, pendingStaff = 0;

  snap.forEach(d => {
    const u = d.data();
    if (u.role === "student") {
      students++;
      if (!u.approved) pendingStudents++;
    } else if (u.role !== "admin") {
      staff++;
      if (!u.approved) pendingStaff++;
    }
  });

  totalStudents.innerText = students;
  totalStaff.innerText = staff;
  pendingStudents.innerText = pendingStudents;
  pendingStaff.innerText = pendingStaff;
}

/* ========== STAFF APPROVALS ========== */
async function loadStaffApprovals() {
  const table = document.getElementById("staffTable");
  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {
    const u = d.data();
    if (!u.approved && u.role !== "student" && u.role !== "admin") {
      const row = table.insertRow();
      row.innerHTML = `
        <td>${u.name}</td>
        <td>${u.role}</td>
        <td>${u.email}</td>
        <td><button onclick="approveUser('${d.id}')">Approve</button></td>
      `;
    }
  });
}

window.approveUser = async function (uid) {
  await updateDoc(doc(db, "users", uid), { approved: true });
  alert("Approved");
  location.reload();
};

/* ========== STUDENT APPROVALS ========== */
async function loadStudentApprovals() {
  const table = document.getElementById("studentTable");
  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {
    const u = d.data();
    if (u.role === "student" && !u.approved) {
      const row = table.insertRow();
      row.innerHTML = `
        <td>${u.name}</td>
        <td>${u.roll || "-"}</td>
        <td><button onclick="approveUser('${d.id}')">Approve</button></td>
      `;
    }
  });
}

/* ========== APPROVAL PERMISSIONS ========== */
async function loadApprovalPermissions() {
  const table = document.getElementById("permissionTable");
  const snap = await getDocs(collection(db, "users"));

  snap.forEach(d => {
    const u = d.data();
    if (u.role === "incharge" || u.role === "hod") {
      const row = table.insertRow();
      row.innerHTML = `
        <td>${u.name}</td>
        <td>${u.role}</td>
        <td>
          <input type="checkbox"
            ${u.canApproveStudents ? "checked" : ""}
            onchange="togglePermission('${d.id}', this.checked)">
        </td>
      `;
    }
  });
}

window.togglePermission = async function (uid, value) {
  await updateDoc(doc(db, "users", uid), {
    canApproveStudents: value
  });
};

/* ========== LOGOUT ========== */
logoutBtn.onclick = () => {
  signOut(auth);
  location.href = "login.html";
};
