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

/* ================= ROLE FROM INDEX ================= */
const role = localStorage.getItem("loginRole");

if (!role) {
  alert("Please select role first");
  location.href = "index.html";
}

roleLabel.innerText = role.toUpperCase();

/* ================= FIELD TOGGLE ================= */
if (role === "student") {
  studentFields.style.display = "block";
  staffFields.style.display = "none";
} else {
  studentFields.style.display = "none";
  staffFields.style.display = "block";
}

/* ================= LOAD STAFF ================= */
async function loadStaff() {
  const snap = await getDocs(collection(db, "users"));
  snap.forEach(d => {
    const u = d.data();
    if (u.role === "incharge" && u.approved) {
      inchargeSelect.innerHTML += `<option value="${d.id}">${u.name}</option>`;
    }
    if (u.role === "hod" && u.approved) {
      hodSelect.innerHTML += `<option value="${d.id}">${u.name}</option>`;
    }
  });
}
if (role === "student") loadStaff();

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

  const nameVal = name.value.trim();
  const emailVal = email.value.trim();
  const passVal = password.value;

  if (!nameVal || !emailVal || !passVal) {
    showError("All fields are required");
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

    const base = {
      uid: cred.user.uid,
      name: nameVal,
      email: emailVal,
      role,
      createdAt: new Date()
    };

    if (role === "student") {
      if (!roll.value || !inchargeSelect.value || !hodSelect.value) {
        throw { message: "Fill all student fields" };
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        ...base,
        roll: roll.value.trim(),
        inchargeId: inchargeSelect.value,
        hodId: hodSelect.value,
        approved: true
      });

    } else {
      if (!phone.value.trim()) {
        throw { message: "Phone number required" };
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        ...base,
        phone: phone.value.trim(),
        approved: role === "admin" ? true : false
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
