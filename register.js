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

  throw new Error("Role not selected");

}

document.getElementById("roleBadge").innerText =
  role.toUpperCase() + " REGISTRATION";


/* ================= ELEMENTS ================= */

const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");

const email = document.getElementById("email");
const password = document.getElementById("password");

const registerBtn = document.getElementById("registerBtn");
const continueBtn = document.getElementById("continueBtn");

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

const submitBtn = document.getElementById("submitBtn");

const msg = document.getElementById("msg");

const nameErr = document.getElementById("nameErr");
const phoneErr = document.getElementById("phoneErr");


/* ================= INITIAL ================= */

step2.classList.add("hidden");

continueBtn.classList.add("hidden");

studentFields.classList.add("hidden");
staffFields.classList.add("hidden");
adminFields.classList.add("hidden");

if (role === "student")
  studentFields.classList.remove("hidden");

if (role === "incharge" || role === "hod")
  staffFields.classList.remove("hidden");

if (role === "admin" || role === "principal")
  adminFields.classList.remove("hidden");


/* ================= STEP 1 REGISTER ================= */

registerBtn.onclick = async () => {

  if (!email.value || !password.value) {

    msg.innerText = "Enter email and password";

    return;

  }

  try {

    const cred =
      await createUserWithEmailAndPassword(
        auth,
        email.value.trim(),
        password.value
      );

    await sendEmailVerification(cred.user);

    msg.innerText =
      "Verification email sent. Verify and click Continue.";

    continueBtn.classList.remove("hidden");

  }
  catch (err) {

    msg.innerText = err.message;

  }

};


/* ================= CONTINUE ================= */

continueBtn.onclick = async () => {

  const user = auth.currentUser;

  if (!user) {

    alert("Session expired");

    return;

  }

  await user.reload();

  await user.getIdToken(true);

  if (!user.emailVerified) {

    alert("Verify email first");

    return;

  }

  step1.classList.add("hidden");

  step2.classList.remove("hidden");

};


/* ================= PHOTO PREVIEW ================= */

photo.onchange = () => {

  const file = photo.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {

    preview.src = reader.result;

    preview.style.display = "block";

  };

  reader.readAsDataURL(file);

  checkForm();

};


/* ================= VALIDATION ================= */

name.oninput = checkForm;

phone.oninput = () => {

  phone.value =
    phone.value.replace(/\D/g, "").slice(0,10);

  phoneErr.style.display =
    phone.value.length !== 10 ? "block" : "none";

  checkForm();

};

if(studentId) studentId.oninput = checkForm;

if(studentDept) studentDept.onchange = checkForm;

if(year) year.onchange = checkForm;

if(inchargeId) inchargeId.onchange = checkForm;

if(staffId) staffId.oninput = checkForm;

if(staffDept) staffDept.onchange = checkForm;

if(hodId) hodId.onchange = checkForm;

if(adminStaffId) adminStaffId.oninput = checkForm;


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

    if (!staffId.value || !staffDept.value)
      valid = false;

  }


  if (role === "admin" || role === "principal") {

    if (!adminStaffId.value)
      valid = false;

  }

  submitBtn.disabled = !valid;

}


/* ================= LOAD INCHARGES ================= */

if (studentDept) {

  studentDept.onchange = async () => {

    inchargeId.innerHTML =
      `<option value="">Select Incharge</option>`;

    const snap =
      await getDocs(collection(db,"users"));

    snap.forEach(d=>{

      const u=d.data();

      if(
        u.role==="incharge" &&
        u.department===studentDept.value &&
        u.approved===true
      ){

        inchargeId.innerHTML +=
          `<option value="${d.id}">
           ${u.name}
           </option>`;

      }

    });

    checkForm();

  };

}


/* ================= FINAL SUBMIT ================= */

submitBtn.onclick = async () => {

  const user = auth.currentUser;

  if (!user) {

    alert("Session expired");

    return;

  }

  await user.reload();

  await user.getIdToken(true);

  if (!user.emailVerified) {

    alert("Verify email first");

    return;

  }


  let data = {

    uid:user.uid,

    email:user.email,

    role:role,

    name:name.value.trim(),

    phone:phone.value,

    // ADMIN AUTO APPROVED
    approved: role === "admin" ? true : false,

    profileCompleted:true,

    createdAt:serverTimestamp()

  };


  if(role==="student"){

    data.studentId=studentId.value;

    data.department=studentDept.value;

    data.year=year.value;

    data.inchargeId=inchargeId.value;

  }


  if(role==="incharge" || role==="hod"){

    data.staffId=staffId.value;

    data.department=staffDept.value;

    data.hodId=hodId.value || null;

  }


  if(role==="admin" || role==="principal"){

    data.staffId=adminStaffId.value;

  }


  try{

    await setDoc(
      doc(db,"users",user.uid),
      data
    );


    if(role==="admin"){

      alert("Admin registration successful");

      window.location.href="admin-dashboard.html";

    }else{

      alert("Registration complete. Wait for approval.");

      window.location.href="login.html";

    }

  }
  catch(err){

    alert(err.message);

    console.error(err);

  }

};
