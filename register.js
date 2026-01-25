const role = localStorage.getItem("userRole");
const who = document.getElementById("who");

const boxes = {
  student: document.getElementById("student"),
  incharge: document.getElementById("incharge"),
  hod: document.getElementById("hod"),
  admin: document.getElementById("authority"),
  principal: document.getElementById("authority")
};

Object.values(boxes).forEach(b => b.classList.add("hidden"));

if (!role) {
  alert("Role missing. Start from index page.");
  throw new Error("ROLE_MISSING");
}

who.innerText = "Registering as: " + role.toUpperCase();
boxes[role].classList.remove("hidden");

document.getElementById("registerBtn").onclick = () => {

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const password = document.getElementById("password").value;

  if (!name || !email || !phone || !password)
    return alert("Fill all common fields");

  if (role === "student") {
    if (
      !studentId.value ||
      !studentDept.value ||
      !year.value
    ) return alert("Fill all student fields");
  }

  if (role === "incharge") {
    if (
      !staffIdIncharge.value ||
      !deptIncharge.value
    ) return alert("Fill all incharge fields");
  }

  if (role === "hod") {
    if (
      !staffIdHod.value ||
      !deptHod.value
    ) return alert("Fill all HOD fields");
  }

  if (role === "admin" || role === "principal") {
    if (
      !staffIdAuth.value ||
      invite.value !== "COLLEGE-2025"
    ) return alert("Invalid admin details");
  }

  alert("All fields OK. Ready to connect Firebase.");
};
