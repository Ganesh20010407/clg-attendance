import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import {
  collection,
  getDocs,
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ================= DOM ELEMENTS ================= */
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const phoneInput = document.getElementById("phone");
const rollInput = document.getElementById("roll");

const inchargeSelect = document.getElementById("inchargeSelect");
const hodSelect = document.getElementById("hodSelect");
const hodForIncharge = document.getElementById("hodForIncharge");

const studentFields = document.getElementById("studentFields");
const inchargeFields = document.getElementById("inchargeFields");
const phoneBox = document.getElementById("phoneBox");

const registerBtn = document.getElementById("registerBtn");
const status = document.getElementById("status");
const loading = document.getElementById("loading");
const roleLabel = document.getElementById("roleLabel");

/* ================= ROLE ================= */
const role = localStorage.getItem("loginRole");
if (!role) {
  alert("Please select role first");
  location.href = "index.html";
}
roleLabel.innerText = role.toUpperCase();

/* ================= INITIAL UI ================= */
studentFields.style.display = "none";
inchargeFields.style.display = "none";
phoneBox.style.display = "none";

/* ================= ROLE-BASED UI ================= */
if (role === "student") {
  phoneBox.style.display = "block";
  studentFields.style.display = "block";
}
else if (role === "incharge") {
  phoneBox.style.display = "block";
  inchargeFields.style.display = "block";
}
else if (role === "hod") {
  phoneBox.style.display = "block";
}
else if (role === "principal") {
  // phone NOT required
}
else if (role === "admin") {
  // phone NOT required
}

/* ================= LOAD USERS ================= */
async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  snap.forEach(d => {
    const u = d.data();

    if (u.role === "incharge" && u.approved && inchargeSelect) {
      inchargeSelect.innerHTML += `<option value="${d.id}">${u.name}</option>`;
    }

    if (u.role === "hod" && u.approved) {
      if (hodSelect)
        hodSelect.innerHTML += `<option value="${d.id}">${u.name}</option>`;
      if (hodForIncharge)
        hodForIncharge.innerHTML += `<option value="${d.id}">${u.name}</option>`;
    }
  });
}

if (role === "student" || role === "incharge") {
  loadUsers();
}

/* ================= HELPERS ================= */
function showError(msg) {
  status.innerText = msg;
  status.style.color = "red";
}

function showLoading(msg = "Creating account...") {
  loading.innerText = msg;
  loading.style.display = "block";
}

function hideLoading() {
  loading.style.display = "none";
}

/* ================= REGISTER ================= */
registerBtn.onclick = async () => {
  status.innerText = "";

  const nameVal = nameInput.value.trim();
  const emailVal = emailInput.value.trim();
  const passVal = passwordInput.value;
  const phoneVal = phoneInput ? phoneInput.value.trim() : "";

  if (!nameVal || !emailVal || !passVal) {
    showError("Name, email and password are required");
    return;
  }

  // PHONE VALIDATION (except admin & principal)
  if (
    role !== "admin" &&
    role !== "principal" &&
    (!phoneVal || phoneVal.length < 10)
  ) {
    showError("Valid phone number is required");
    return;
  }

  showLoading();
  registerBtn.disabled = true;

  try {
    const cred = await createUserWithEmailAndPassword(
      auth,
      emailVal,
      passVal
    );

    const baseUser = {
      uid: cred.user.uid,
      name: nameVal,
      email: emailVal,
      role,
      createdAt: new Date()
    };

    /* ========= ROLE LOGIC ========= */

    // STUDENT
    if (role === "student") {
      if (
        !rollInput.value ||
        !inchargeSelect.value ||
        !hodSelect.value
      ) {
        throw new Error("Student fields are missing");
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        ...baseUser,
        phone: phoneVal,
        roll: rollInput.value.trim(),
        inchargeId: inchargeSelect.value,
        hodId: hodSelect.value,
        approved: true
      });
    }

    // INCHARGE (under HOD)
    else if (role === "incharge") {
      if (!hodForIncharge.value) {
        throw new Error("Please select supervising HOD");
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        ...baseUser,
        phone: phoneVal,
        hodId: hodForIncharge.value,
        approved: false
      });
    }

    // HOD
    else if (role === "hod") {
      await setDoc(doc(db, "users", cred.user.uid), {
        ...baseUser,
        phone: phoneVal,
        approved: false
      });
    }

    // PRINCIPAL
    else if (role === "principal") {
      await setDoc(doc(db, "users", cred.user.uid), {
        ...baseUser,
        approved: false
      });
    }

    // ADMIN
    else if (role === "admin") {
      await setDoc(doc(db, "users", cred.user.uid), {
        ...baseUser,
        approved: true
      });
    }

    alert("Registration successful");
    location.href = "login.html";

  } catch (e) {
    showError(e.message || "Registration failed");
    registerBtn.disabled = false;
    hideLoading();
  }
};
