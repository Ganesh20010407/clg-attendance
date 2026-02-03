import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

/* ================= ROLE ================= */
const role = localStorage.getItem("userRole");
if (!role) {
  window.location.href = "index.html";
  throw new Error("No role selected");
}

const roleBadge = document.getElementById("roleBadge");
roleBadge.innerText = role.toUpperCase() + " REGISTRATION";

/* ================= ELEMENTS ================= */
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");

const email = document.getElementById("email");
const password = document.getElementById("password");
const registerBtn = document.getElementById("registerBtn");
const continueBtn = document.getElementById("continueBtn");
const msg = document.getElementById("msg");

const photo = document.getElementById("photo");
const preview = document.getElementById("preview");
const name = document.getElementById("name");
const phone = document.getElementById("phone");

const studentFields = document.getElementById("studentFields");
const staffFields = document.getElementById("staffFields");
const adminFields = document.getElementById("adminFields");

const studentId = document.getElementById("studentId");
const studentDept = document.getElementById("studentDept");
const year = document.getElementById("year");
const inchargeId = document.getElementById("inchargeId");

const staffId = document.getElementById("staffId");
const staffDept = document.getElementById("staffDept");
const hodId = document.getElementById("hodId");

const adminStaffId = document.getElementById("adminStaffId");
const inviteCode = document.getElementById("inviteCode");

const submitBtn = document.getElementById("submitBtn");

const nameErr = document.getElementById("nameErr");
const phoneErr = document.getElementById("phoneErr");

/* ================= INITIAL STATE ================= */
studentFields.classList.add("hidden");
staffFields.classList.add("hidden");
adminFields.classList.add("hidden");
step2.classList.add("hidden");
continueBtn.classList.add("hidden");

nameErr.style.display = "none";
phoneErr.style.display = "none";

/* ================= SHOW ROLE FIELDS ================= */
if (role === "student") {
  studentFields.classList.remove("hidden");
}
else if (role === "incharge" || role === "hod") {
  staffFields.classList.remove("hidden");
}
else if (role === "admin" || role === "principal") {
  adminFields.classList.remove("hidden");
}

/* ================= STEP 1 : REGISTER ================= */
registerBtn.onclick = async () => {
  try {
    if (!email.value || !password.value) {
      msg.innerText = "Email and password required";
      return;
    }

    const cred = await createUserWithEmailAndPassword(
      auth,
      email.value,
      password.value
    );

    await sendEmailVerification(cred.user);

    msg.innerText =
      "Verification mail sent. Verify your email and click Continue.";

    continueBtn.classList.remove("hidden");

  } catch (err) {
    msg.innerText = err.message;
  }
};

/* ================= CONTINUE AFTER VERIFICATION ================= */
continueBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("Session expired. Refresh page.");
    return;
  }

  await user.reload();

  if (!user.emailVerified) {
    alert("Email not verified yet");
    return;
  }

  step1.classList.add("hidden");
  step2.classList.remove("hidden");
};

/* ================= IMAGE PREVIEW ================= */
photo.onchange = () => {
  const file = photo.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);
};

/* ================= VALIDATION ================= */
phone.oninput = () => {
  phone.value = phone.value.replace(/\D/g, "").slice(0, 10);

  if (phone.value.length !== 10) {
    phoneErr.style.display = "block";
  } else {
    phoneErr.style.display = "none";
  }

  checkForm();
};

name.oninput = () => {
  if (!name.value.trim()) {
    nameErr.style.display = "block";
  } else {
    nameErr.style.display = "none";
  }

  checkForm();
};

function checkForm() {
  let valid = true;

  if (!name.value.trim()) valid = false;
  if (phone.value.length !== 10) valid = false;
  if (!photo.files.length) valid = false;

  if (role === "student") {
    if (
      !studentId.value ||
      !studentDept.value ||
      !year.value ||
      !inchargeId.value
    ) valid = false;
  }

  if (role === "incharge" || role === "hod") {
    if (!staffId.value || !staffDept.value) valid = false;
  }

  if (role === "admin" || role === "principal") {
    if (!adminStaffId.value || !inviteCode.value) valid = false;
  }

  submitBtn.disabled = !valid;
}

/* ================= LOAD INCHARGES ================= */
if (studentDept) {
  studentDept.onchange = async () => {
    inchargeId.innerHTML =
      `<option value="" disabled selected>Incharge</option>`;

    const snap = await getDocs(collection(db, "users"));
    snap.forEach(d => {
      const u = d.data();
      if (
        u.role === "incharge" &&
        u.department === studentDept.value &&
        u.approved === true
      ) {
        inchargeId.innerHTML +=
          `<option value="${d.id}">${u.name}</option>`;
      }
    });

    checkForm();
  };
}

/* ================= FINAL SUBMIT ================= */
submitBtn.onclick = async () => {
  if (submitBtn.disabled) return;

  const user = auth.currentUser;
  if (!user) return;

  let data = {
    uid: user.uid,
    email: user.email,
    role,
    name: name.value.trim(),
    phone: phone.value,
    approved: false,
    profileCompleted: true,
    createdAt: serverTimestamp()
  };

  if (role === "student") {
    Object.assign(data, {
      studentId: studentId.value,
      department: studentDept.value,
      year: year.value,
      inchargeId: inchargeId.value
    });
  }

  if (role === "incharge" || role === "hod") {
    Object.assign(data, {
      staffId: staffId.value,
      department: staffDept.value,
      hodId: hodId.value || null
    });
  }

  if (role === "admin" || role === "principal") {
    if (inviteCode.value !== "COLLEGE-2025") {
      alert("Invalid invite code");
      return;
    }
    Object.assign(data, { staffId: adminStaffId.value });
  }

  try {
    await setDoc(doc(db, "users", user.uid), data);
    alert("Registration completed. Wait for approval.");
    window.location.href = "login.html";
  } catch (err) {
    alert(err.message);
    console.error(err);
  }
};
