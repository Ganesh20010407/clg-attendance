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

/* ================= ROLE ================= */
const role = localStorage.getItem("loginRole");
if (!role) {
  alert("Select role first");
  location.href = "index.html";
}
roleLabel.innerText = role.toUpperCase();

/* ================= HIDE ALL ================= */
phoneBox.style.display = "none";
studentFields.style.display = "none";
inchargeFields.style.display = "none";

/* ================= ROLE UI ================= */
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

    if (u.role === "incharge" && u.approved) {
      inchargeSelect.innerHTML += `<option value="${d.id}">${u.name}</option>`;
    }
    if (u.role === "hod" && u.approved) {
      hodSelect.innerHTML += `<option value="${d.id}">${u.name}</option>`;
      hodForIncharge.innerHTML += `<option value="${d.id}">${u.name}</option>`;
    }
  });
}
if (role === "student" || role === "incharge") loadUsers();

/* ================= REGISTER ================= */
registerBtn.onclick = async () => {
  status.innerText = "";

  const nameVal = name.value.trim();
  const emailVal = email.value.trim();
  const passVal = password.value;
  const phoneVal = phone?.value?.trim();

  if (!nameVal || !emailVal || !passVal) {
    status.innerText = "All required fields must be filled";
    return;
  }

  // PHONE VALIDATION
  if (
    (role !== "admin" && role !== "principal") &&
    (!phoneVal || phoneVal.length < 10)
  ) {
    status.innerText = "Valid phone number required";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(
      auth, emailVal, passVal
    );

    const base = {
      uid: cred.user.uid,
      name: nameVal,
      email: emailVal,
      role,
      createdAt: new Date()
    };

    // STUDENT
    if (role === "student") {
      if (!roll.value || !inchargeSelect.value || !hodSelect.value) {
        throw new Error("Student fields missing");
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        ...base,
        phone: phoneVal,
        roll: roll.value,
        inchargeId: inchargeSelect.value,
        hodId: hodSelect.value,
        approved: true
      });
    }

    // INCHARGE
    else if (role === "incharge") {
      if (!hodForIncharge.value) {
        throw new Error("Select supervising HOD");
      }

      await setDoc(doc(db, "users", cred.user.uid), {
        ...base,
        phone: phoneVal,
        hodId: hodForIncharge.value,
        approved: false
      });
    }

    // HOD
    else if (role === "hod") {
      await setDoc(doc(db, "users", cred.user.uid), {
        ...base,
        phone: phoneVal,
        approved: false
      });
    }

    // PRINCIPAL
    else if (role === "principal") {
      await setDoc(doc(db, "users", cred.user.uid), {
        ...base,
        approved: false
      });
    }

    // ADMIN
    else if (role === "admin") {
      await setDoc(doc(db, "users", cred.user.uid), {
        ...base,
        approved: true
      });
    }

    alert("Registration successful");
    location.href = "login.html";

  } catch (e) {
    status.innerText = e.message;
  }
};
