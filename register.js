import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ================= DOM READY ================= */
document.addEventListener("DOMContentLoaded", () => {

  /* ================= ROLE ================= */
  const role = localStorage.getItem("userRole");
  if (!role) {
    alert("Role missing. Start from index page.");
    window.location.href = "index.html";
    return;
  }

  /* ================= HEADER ================= */
  const who = document.getElementById("who");
  who.innerText = "Registering as: " + role.toUpperCase();

  /* ================= SECTIONS ================= */
  const sections = {
    student: document.getElementById("student"),
    incharge: document.getElementById("incharge"),
    hod: document.getElementById("hod"),
    admin: document.getElementById("authority"),
    principal: document.getElementById("authority")
  };

  Object.values(sections).forEach(sec => sec.classList.add("hidden"));
  if (sections[role]) sections[role].classList.remove("hidden");

  /* ================= COMMON FIELDS ================= */
  const name = document.getElementById("name");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const password = document.getElementById("password");
  const registerBtn = document.getElementById("registerBtn");

  /* ================= ROLE FIELDS ================= */
  const studentId = document.getElementById("studentId");
  const studentDept = document.getElementById("studentDept");
  const year = document.getElementById("year");
  const inchargeId = document.getElementById("inchargeId");

  const staffIdIncharge = document.getElementById("staffIdIncharge");
  const deptIncharge = document.getElementById("deptIncharge");
  const hodId = document.getElementById("hodId");

  const staffIdHod = document.getElementById("staffIdHod");
  const deptHod = document.getElementById("deptHod");

  const staffIdAuth = document.getElementById("staffIdAuth");
  const invite = document.getElementById("invite");

  /* ================= REGISTER ================= */
  registerBtn.addEventListener("click", async () => {
    try {
      /* -------- COMMON VALIDATION -------- */
      if (!name.value || !email.value || !phone.value || !password.value) {
        alert("Fill all common fields");
        return;
      }

      let userData = {
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        role,
        approved: false,
        canMarkAttendance: false,
        createdAt: serverTimestamp()
      };

      /* -------- STUDENT -------- */
      if (role === "student") {
        if (!studentId.value || !studentDept.value || !year.value) {
          alert("Fill all student fields");
          return;
        }

        userData.studentId = studentId.value.trim();
        userData.department = studentDept.value;
        userData.year = year.value;
        userData.inchargeId = inchargeId.value || null;
      }

      /* -------- INCHARGE -------- */
      if (role === "incharge") {
        if (!staffIdIncharge.value || !deptIncharge.value) {
          alert("Fill all incharge fields");
          return;
        }

        userData.staffId = staffIdIncharge.value.trim();
        userData.department = deptIncharge.value;
        userData.hodId = hodId.value || null;
      }

      /* -------- HOD -------- */
      if (role === "hod") {
        if (!staffIdHod.value || !deptHod.value) {
          alert("Fill all HOD fields");
          return;
        }

        userData.staffId = staffIdHod.value.trim();
        userData.department = deptHod.value;
      }

      /* -------- ADMIN / PRINCIPAL -------- */
      if (role === "admin" || role === "principal") {
        if (!staffIdAuth.value || invite.value !== "COLLEGE-2025") {
          alert("Invalid admin / principal details");
          return;
        }

        userData.staffId = staffIdAuth.value.trim();
      }

      /* -------- FIREBASE AUTH -------- */
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      );

      /* -------- FIRESTORE SAVE -------- */
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        ...userData
      });

      alert("Registered successfully. Waiting for admin approval.");
      localStorage.removeItem("userRole");
      window.location.href = "login.html";

    } catch (err) {
      alert(err.message);
    }
  });

});



function showToast(msg, type = "info") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerText = msg;
  document.body.appendChild(t);

  setTimeout(() => t.classList.add("show"), 50);
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 3000);
}
