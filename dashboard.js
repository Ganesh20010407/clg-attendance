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
