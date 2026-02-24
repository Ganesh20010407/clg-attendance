import { auth, db } from "./firebase.js";

import {
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
collection,
getDocs,
getDoc,
doc,
updateDoc,
deleteDoc,
setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
// Additional functions used in notifications
import { query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";



/* ================= ELEMENTS ================= */

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

const logoutBtn = document.getElementById("logoutBtn");

const notifyBtn = document.getElementById("notifyBtn");
const notifyList = document.getElementById("notifyList");
const currentTime = document.getElementById("currentTime");
const currentDate = document.getElementById("currentDate");
const currentName = document.getElementById("currentName");
const currentRole = document.getElementById("currentRole");
let pendingApprovals = [];
let pendingPerms = [];
let notifyUsersUnsub = null;
let notifyPermsUnsub = null;

function renderNotifyList(){
	if(!notifyList) return;
	const rows = [];
	
	// Add Clear All button at the top
	if(pendingApprovals.length > 0 || pendingPerms.length > 0){
		rows.push(`<button id="clearAllInList" class="notify-clear-btn" type="button">Clear All</button>`);
	}
	
	pendingApprovals.forEach(u=> rows.push(`<div class="notify-item" data-type="approval" data-id="${u.id}">Approval: ${escapeHtml(u.name)}</div>`));
	pendingPerms.forEach(p=> rows.push(`<div class="notify-item" data-type="permission" data-id="${p.id}">Permission: ${escapeHtml(p.label)}</div>`));
	if(rows.length===0 || (pendingApprovals.length === 0 && pendingPerms.length === 0)) notifyList.innerHTML = '<div class="notify-item">No notifications</div>';
	else notifyList.innerHTML = rows.join('');
	notifyList.setAttribute('aria-hidden','false');
	
	// Attach Clear All button handler if it exists
	const clearBtn = document.getElementById('clearAllInList');
	if(clearBtn){
		clearBtn.onclick = clearAllNotifications;
	}
	
	// update bell count
	const total = pendingApprovals.length + pendingPerms.length;
	if(notifyCount){
		notifyCount.innerText = total;
		if(total===0) notifyCount.classList.add('hidden'); else notifyCount.classList.remove('hidden');
	}
}

function startNotifyListeners(){
	// avoid double subscribing
	if(notifyUsersUnsub || notifyPermsUnsub) return;

	// users snapshot for pending approvals
	try{
		notifyUsersUnsub = onSnapshot(collection(db,'users'), snap=>{
			const items = [];
			snap.forEach(d=>{
				const u = d.data();
				if(!u.approved) items.push({ id: d.id, name: u.name || u.email || '-' });
			});
			pendingApprovals = items;
			renderNotifyList();
		}, err=>{
			console.error('users onSnapshot error', err);
		});
	}catch(e){
		console.error('startNotifyListeners users error',e);
	}

	// permissionRequests snapshot for pending permissions
	try{
		const permQ = query(collection(db,'permissionRequests'), where('status','==','pending'));
		notifyPermsUnsub = onSnapshot(permQ, snap=>{
			const items = [];
			snap.forEach(d=>{
				const p = d.data();
				items.push({ id: d.id, label: p.staffName || p.role || 'Permission request' });
			});
			pendingPerms = items;
			renderNotifyList();
		}, err=>{
			console.error('perm onSnapshot error', err);
		});
	}catch(e){
		console.error('startNotifyListeners perms error',e);
	}
}

function stopNotifyListeners(){
	if(typeof notifyUsersUnsub === 'function'){ notifyUsersUnsub(); notifyUsersUnsub = null; }
	if(typeof notifyPermsUnsub === 'function'){ notifyPermsUnsub(); notifyPermsUnsub = null; }
}

const settingsToggle = document.getElementById("settingsToggle");
const settingsSubmenu = document.getElementById("settingsSubmenu");

// Explicit element references used across the file
const userDisplay = document.getElementById("userDisplay");
const welcome = document.getElementById("welcome");
const holidayStatus = document.getElementById("holidayStatus");

const totalStudents = document.getElementById("totalStudents");
const totalIncharge = document.getElementById("totalIncharge");
const totalHod = document.getElementById("totalHod");
const pendingCount = document.getElementById("pendingCount");
const presentCount = document.getElementById("presentCount");
const absentCount = document.getElementById("absentCount");
const notifyCount = document.getElementById("notifyCount");
const fnPresentEl = document.getElementById("fnPresent");
const fnAbsentEl = document.getElementById("fnAbsent");
const anPresentEl = document.getElementById("anPresent");
const anAbsentEl = document.getElementById("anAbsent");
const currentSession = document.getElementById("currentSession");
const timeLeft = document.getElementById("timeLeft");
const fnTiming = document.getElementById("fnTiming");
const anTiming = document.getElementById("anTiming");
const timingStatusBadge = document.getElementById("timingStatusBadge");
const gpsStatusBadge = document.getElementById("gpsStatusBadge");

const approvalTable = document.getElementById("approvalTable");
const selectAll = document.getElementById("selectAll");
const approveSelected = document.getElementById("approveSelected");
const rejectSelected = document.getElementById("rejectSelected");
const approvalSearch = document.getElementById("approvalSearch");

const staffSearch = document.getElementById("staffSearch");
const staffTable = document.getElementById("staffTable");

const detailsSection = document.getElementById("detailsSection");
const detailsTitle = document.getElementById("detailsTitle");
const detailsInfo = document.getElementById("detailsInfo");
const detailsSearch = document.getElementById("detailsSearch");
const detailsHead = document.getElementById("detailsHead");
const detailsBody = document.getElementById("detailsBody");
const approvals = document.getElementById("approvals");
const staff = document.getElementById("staff");

const attendanceSearch = document.getElementById("attendanceSearch");
const yearFilter = document.getElementById("yearFilter");
const downloadCSV = document.getElementById("downloadCSV");
const attTable = document.getElementById("attTable");

const fnStart = document.getElementById("fnStart");
const fnEnd = document.getElementById("fnEnd");
const anStart = document.getElementById("anStart");
const anEnd = document.getElementById("anEnd");
const saveTiming = document.getElementById("saveTiming");

const lat = document.getElementById("lat");
const lng = document.getElementById("lng");
const radius = document.getElementById("radius");
const saveGPS = document.getElementById("saveGPS");

const holidayDate = document.getElementById("holidayDate");
const holidayReason = document.getElementById("holidayReason");
const addHoliday = document.getElementById("addHoliday");
const holidayMode = document.getElementById("holidayMode");
const holidayStart = document.getElementById("holidayStart");
const holidayEnd = document.getElementById("holidayEnd");
const singleHoliday = document.getElementById("singleHoliday");
const rangeHoliday = document.getElementById("rangeHoliday");

function isoDate(d){
	return d.toISOString().slice(0,10);
}

// Toggle holiday inputs based on mode
if(holidayMode){
	holidayMode.onchange = ()=>{
		const m = holidayMode.value;
		if(m === 'single'){
			singleHoliday.classList.remove('hidden');
			rangeHoliday.classList.add('hidden');
		}else{
			singleHoliday.classList.add('hidden');
			rangeHoliday.classList.remove('hidden');
		}
	};
}

// Helper: escape HTML to avoid XSS when inserting user-provided strings
function escapeHtml(str){
	if(str === undefined || str === null) return "-";
	return String(str)
		.replaceAll('&','&amp;')
		.replaceAll('<','&lt;')
		.replaceAll('>','&gt;')
		.replaceAll('"','&quot;')
		.replaceAll("'","&#39;");
}

// Update time and date display
function updateTimeAndDate(){
	const now = new Date();
	const hours = String(now.getHours()).padStart(2,'0');
	const minutes = String(now.getMinutes()).padStart(2,'0');
	const seconds = String(now.getSeconds()).padStart(2,'0');
	if(currentTime) currentTime.innerText = `${hours}:${minutes}:${seconds}`;
	
	const day = String(now.getDate()).padStart(2,'0');
	const month = String(now.getMonth()+1).padStart(2,'0');
	const year = now.getFullYear();
	if(currentDate) currentDate.innerText = `${day}/${month}/${year}`;
}

// Update user info in header
function updateUserInfo(user){
	if(currentName) currentName.innerText = user.name || user.email || 'User';
	if(currentRole) currentRole.innerText = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin';
}



/* ================= MENU ================= */

menuBtn.onclick = () => {
sidebar.classList.toggle("hidden");
};



/* ================= SETTINGS DROPDOWN ================= */

settingsToggle.onclick = () => {
settingsSubmenu.classList.toggle("hidden");
};



/* ================= SECTION NAVIGATION ================= */

document.querySelectorAll("[data-sec]").forEach(btn=>{

btn.onclick = ()=>{

const id = btn.dataset.sec;

document.querySelectorAll(".section")
.forEach(sec=>sec.classList.remove("active"));

document.getElementById(id)
.classList.add("active");

};

});



/* ================= LOGOUT ================= */

logoutBtn.onclick = async ()=>{

const confirmLogout =
confirm("Are you sure you want to logout?");

if(!confirmLogout) return;

await signOut(auth);

location = "login.html";

};



/* ================= CLEAR ALL NOTIFICATIONS ================= */

async function clearAllNotifications(){
	try{
		// Approve all pending users
		const allApprovals = [...pendingApprovals];
		const ops = allApprovals.map(u=> updateDoc(doc(db,"users",u.id),{approved:true}));
		await Promise.all(ops);
		
		// Mark all pending permissions as read (delete them or mark as handled)
		const allPerms = [...pendingPerms];
		const permOps = allPerms.map(p=> deleteDoc(doc(db,"permissionRequests",p.id)));
		await Promise.all(permOps);
		
		await loadApprovals();
		await loadStats();
		renderNotifyList();
	}catch(err){
		console.error('clearAll error',err);
		alert('Failed to clear notifications');
	}
}



/* ================= BELL ================= */

// notifyList is kept up-to-date by realtime listeners (startNotifyListeners)

// Toggle the notify list; list is kept up-to-date by realtime listeners
notifyBtn.onclick = async ()=>{
	if(!notifyList) return;
	const isHidden = notifyList.classList.contains('hidden');
	if(isHidden){
		notifyList.classList.remove('hidden');
	}else{
		notifyList.classList.add('hidden');
	}
};

// Clicking an item should open approvals and highlight that user
if(notifyList){
	notifyList.addEventListener('click', async e=>{
		const it = e.target.closest('.notify-item');
		if(!it) return;
		const uid = it.dataset.id;
		const type = it.dataset.type || 'approval';
		// hide list
		notifyList.classList.add('hidden');
		notifyList.setAttribute('aria-hidden','true');
		if(type === 'approval'){
			// verify user still pending approval
			try{
				const uSnap = await getDoc(doc(db,'users',uid));
				const uData = uSnap.data();
				if(!uData || uData.approved){
					// refresh list and inform user
					renderNotifyList();
					alert('This approval has already been handled');
					return;
				}
			}catch(err){
				console.error('verify approval error',err);
			}
			// open approvals
			document.querySelectorAll('.section').forEach(sec=>sec.classList.remove('active'));
			approvals.classList.add('active');
			// ensure approvals loaded, then find and focus the checkbox
			(async ()=>{
				await loadApprovals();
				setTimeout(()=>{
					const cb = approvalTable.querySelector(`input.userCheck[value="${uid}"]`);
					if(cb){
						const row = cb.closest('tr');
						if(row) row.scrollIntoView({behavior:'smooth', block:'center'});
						cb.focus();
					}
				},200);
			})();
		}else if(type === 'permission'){
			// verify permission request still pending
			try{
				const permSnapCheck = await getDoc(doc(db,'permissionRequests',uid));
				const permDataCheck = permSnapCheck.data();
				if(!permDataCheck || permDataCheck.status !== 'pending'){
					renderNotifyList();
					alert('This permission request has already been handled');
					return;
				}
			}catch(err){
				console.error('verify permission error',err);
			}
			// open staff and show user's details related to the permission request
			try{
				const permSnap = await getDoc(doc(db,'permissionRequests',uid));
				const p = permSnap.data();
				if(p && p.staffUid){
					document.querySelectorAll('.section').forEach(sec=>sec.classList.remove('active'));
					staff.classList.add('active');
					await loadStaff('all');
					setTimeout(()=>{
						openUserDetails(p.staffUid);
					},200);
				}else{
					alert('Permission request details not found');
				}
			}catch(err){
				console.error('notify click permission error',err);
				alert('Failed to open permission request');
			}
		}
	});
}



/* ================= AUTH ================= */

onAuthStateChanged(auth, async user=>{

if(!user){
location="login.html";
return;
}

const snap = await getDoc(doc(db,"users",user.uid));

const me = snap.data();

userDisplay.innerText =
me.name + " (" + me.role.toUpperCase() + ")";

// Update header with user name and role
updateUserInfo(me);

// Start updating time and date
updateTimeAndDate();
setInterval(updateTimeAndDate, 1000);

const hour = new Date().getHours();

let wish = "Good Evening 🌙";
let emoji = "🌙";

if(hour<12){
	wish="Good Morning";
	emoji = "☀️";
}else if(hour<18){
	wish="Good Afternoon";
	emoji = "😊";
}

welcome.innerHTML =
`<span>${wish} ${emoji}</span> <span style="font-size: 18px; font-weight: 600;">${escapeHtml(me.name)}</span> <span style="font-size: 14px; color: #666;">(${me.role.toUpperCase()})</span>`;

// Check and display holiday status
await checkHolidayStatus();


loadStats();
loadApprovals();
loadStaff("all");
loadAttendance();
updateSessionInfo();
updateSettingsStatus();
startNotifyListeners();

// Update session time every second
setInterval(updateSessionInfo, 1000);

});



/* ================= DASHBOARD STATS ================= */

async function loadStats(){

	try{
		let students=0,incharges=0,hods=0,pending=0;
		let present=0,absent=0;

		const today = new Date().toISOString().slice(0,10);

		const users = await getDocs(collection(db,"users"));
		users.forEach(d=>{
			const u=d.data();
			if(u.role==="student") students++;
			if(u.role==="incharge") incharges++;
			if(u.role==="hod") hods++;
			if(!u.approved) pending++;
		});

		const att = await getDocs(collection(db,"attendanceRecords"));
		let fnPresent = 0, anPresent = 0, fnAbsent = 0, anAbsent = 0;
		att.forEach(d=>{
			const a=d.data();
			if(a.date===today){
				const s = (a.session||"").toString().toUpperCase();
				if(a.status==="present"){
					present++;
					if(s==="FN") fnPresent++;
					else if(s==="AN") anPresent++;
				}else{
					// explicit absent record
					absent++;
					if(s==="FN") fnAbsent++;
					else if(s==="AN") anAbsent++;
				}
			}
		});

		// Treat missing session records as absent for that session
		const fnRecorded = fnPresent + fnAbsent;
		const anRecorded = anPresent + anAbsent;
		const fnMissing = Math.max(0, students - fnRecorded);
		const anMissing = Math.max(0, students - anRecorded);
		const fnAbsentTotal = fnAbsent + fnMissing;
		const anAbsentTotal = anAbsent + anMissing;

		totalStudents.innerText=students;
		totalIncharge.innerText=incharges;
		totalHod.innerText=hods;
		pendingCount.innerText=pending;
		presentCount.innerText=present;
		fnPresentEl.innerText = fnPresent;
		fnAbsentEl.innerText = fnAbsentTotal;
		anPresentEl.innerText = anPresent;
		anAbsentEl.innerText = anAbsentTotal;
		absentCount.innerText=absent;

		// notifyCount is updated by realtime listeners (onSnapshot) whenever approvals/permissions change

	}catch(err){
		console.error('loadStats error',err);
	}

}

/* ================= CHECK HOLIDAY STATUS ================= */

async function checkHolidayStatus(){
	try{
		const today = new Date().toISOString().slice(0,10);
		const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
		
		let isHoliday = false;
		let holidayReason = '';
		
		// Check if Sunday
		if(dayOfWeek === 0){
			isHoliday = true;
			holidayReason = '📅 Sunday - Weekly Holiday';
		}else{
			// Check holidays collection
			const holidayDoc = await getDoc(doc(db,"holidays",today));
			if(holidayDoc.exists()){
				isHoliday = true;
				const reason = holidayDoc.data().reason || 'Holiday';
				holidayReason = `🎉 ${reason}`;
			}
		}
		
		if(holidayStatus){
			if(isHoliday){
				holidayStatus.innerHTML = `<span style="color:#28a745; font-weight:600;">${holidayReason}</span>`;
			}else{
				holidayStatus.innerHTML = `<span style="color:#666;">Working Day</span>`;
			}
		}
		
		return isHoliday;
	}catch(err){
		console.error('checkHolidayStatus error',err);
		return false;
	}
}

/* ================= SESSION TIME ================= */

async function updateSessionInfo(){
	try{
		const settings = await getDoc(doc(db,"settings","attendance"));
		if(!settings.exists()) return;
		
		const timingData = settings.data();
		const fnStart = timingData.fnStart || "00:00";
		const fnEnd = timingData.fnEnd || "23:59";
		const anStart = timingData.anStart || "00:00";
		const anEnd = timingData.anEnd || "23:59";
		
		// Display FN and AN timings
		if(fnTiming) fnTiming.innerText = `${fnStart} to ${fnEnd}`;
		if(anTiming) anTiming.innerText = `${anStart} to ${anEnd}`;
		
		// Convert HH:MM to seconds for precise comparison
		function toSeconds(t){
			if(!t) return 0;
			const parts = t.split(':').map(Number);
			return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
		}
		
		const now = new Date();
		const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
		
		const fnStartSec = toSeconds(fnStart);
		const fnEndSec = toSeconds(fnEnd);
		const anStartSec = toSeconds(anStart);
		const anEndSec = toSeconds(anEnd);
		
		let sessionName = "🔒 Marking session is closed";
		let nextEndTime = null;
		let nextEndTimeStr = null;
		
		// Determine active session using SECONDS for precision
		if(nowSeconds >= fnStartSec && nowSeconds <= fnEndSec){
			sessionName = "🌅 FN Active - Marking Available";
			nextEndTime = fnEnd;
			nextEndTimeStr = fnEnd;
		}else if(nowSeconds >= anStartSec && nowSeconds <= anEndSec){
			sessionName = "🌤️ AN Active - Marking Available";
			nextEndTime = anEnd;
			nextEndTimeStr = anEnd;
		}
		// If FN has ended, check if we're waiting for AN (handle wrap-around midnight)
		else if(nowSeconds > fnEndSec){
			// If AN time is earlier today than FN start, or we haven't reached AN yet today
			if(anStartSec < fnStartSec || nowSeconds < anStartSec){
				sessionName = "🔒 Marking session is closed · AN starts at " + anStart;
				nextEndTime = anStart;
				nextEndTimeStr = anStart;
			}else{
				sessionName = "🔒 Marking session is closed";
				nextEndTime = fnStart;
				nextEndTimeStr = fnStart;
			}
		}
		// Before FN starts
		else if(nowSeconds < fnStartSec){
			sessionName = "⏳ Marking will start at " + fnStart + " - Please wait";
			nextEndTime = fnStart;
			nextEndTimeStr = fnStart;
		}
		
		if(currentSession) currentSession.innerText = sessionName;
		
		// Always calculate time remaining to next event
		if(nextEndTimeStr){
			const parts = nextEndTimeStr.split(':').map(Number);
			const endHour = parts[0] || 0;
			const endMin = parts[1] || 0;
			const endSec = parts[2] || 0;
			const nextEventSeconds = endHour * 3600 + endMin * 60 + endSec;
			
			// Determine if the target time is today or tomorrow
			let targetDate;
			if(sessionName.includes("Waiting for AN") || sessionName.includes("Waiting for FN")){
				// For waiting states, check if target time has already passed today
				if(nextEventSeconds <= nowSeconds){
					// Target is tomorrow
					targetDate = new Date(now);
					targetDate.setDate(targetDate.getDate() + 1);
					targetDate.setHours(endHour, endMin, endSec, 0);
				}else{
					// Target is today
					targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin, endSec);
				}
			}else{
				// For active sessions, target is today
				targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMin, endSec);
			}
			
			let remaining = targetDate - now;
			remaining = Math.max(0, remaining);
			
			const remainHours = Math.floor(remaining / (1000 * 60 * 60));
			const remainMins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
			const remainSecs = Math.floor((remaining % (1000 * 60)) / 1000);
			
			const timeStr = `${String(remainHours).padStart(2,'0')}:${String(remainMins).padStart(2,'0')}:${String(remainSecs).padStart(2,'0')} left`;
			if(timeLeft) timeLeft.innerText = timeStr;
		}else{
			if(timeLeft) timeLeft.innerText = "00:00:00 left";
		}
	}catch(err){
		console.error('updateSessionInfo error',err);
	}
}

async function updateSettingsStatus(){
	try{
		const attDoc = await getDoc(doc(db,"settings","attendance"));
		
		if(!attDoc.exists()){
			if(gpsStatusBadge) gpsStatusBadge.innerHTML = '<span style="color:#dc3545; font-weight:600;">✗ Disabled</span>';
			if(timingStatusBadge) timingStatusBadge.innerHTML = '<span style="color:#dc3545; font-weight:600;">✗ Disabled</span>';
			return;
		}
		
		const data = attDoc.data();
		
		// Check GPS settings
		if(data.lat && data.lng && data.radius){
			if(gpsStatusBadge) gpsStatusBadge.innerHTML = '<span style="color:#28a745; font-weight:600;">✓ Enabled</span>';
		}else{
			if(gpsStatusBadge) gpsStatusBadge.innerHTML = '<span style="color:#dc3545; font-weight:600;">✗ Disabled</span>';
		}
		
		// Check Timing settings
		if(data.fnStart && data.fnEnd && data.anStart && data.anEnd){
			if(timingStatusBadge) timingStatusBadge.innerHTML = '<span style="color:#28a745; font-weight:600;">✓ Enabled</span>';
		}else{
			if(timingStatusBadge) timingStatusBadge.innerHTML = '<span style="color:#dc3545; font-weight:600;">✗ Disabled</span>';
		}
	}catch(err){
		console.error('updateSettingsStatus error',err);
	}
}



/* ================= APPROVALS ================= */

async function loadApprovals(){

	try{
		approvalTable.innerHTML="";
		let i=1;
		const snap = await getDocs(collection(db,"users"));
		snap.forEach(d=>{
			const u=d.data();
			if(!u.approved){
				const name = escapeHtml(u.name||"-");
				const email = escapeHtml(u.email||"-");
				const role = escapeHtml(u.role||"-");
				approvalTable.innerHTML+=`\n<tr>\n<td>\n<input type="checkbox" class="userCheck" value="${d.id}">\n</td>\n<td>${i++}</td>\n<td>${name}</td>\n<td>${email}</td>\n<td>${role}</td>\n<td>\n<button type=\"button\" onclick=\"approveUser('${d.id}')\">Approve</button>\n<button type=\"button\" onclick=\"rejectUser('${d.id}')\">Reject</button>\n</td>\n</tr>\n`;
			}
		});
	}catch(err){
		console.error('loadApprovals error',err);
		approvalTable.innerHTML = '<tr><td colspan="6">Failed to load approvals</td></tr>';
	}

}


/* SELECT ALL */

selectAll.onclick = ()=>{

document.querySelectorAll(".userCheck")
.forEach(cb=>{
cb.checked = selectAll.checked;
});

};



/* BULK APPROVE */

approveSelected.onclick = async ()=>{
	try{
		const selected = Array.from(document.querySelectorAll(".userCheck:checked"));
		const ops = selected.map(cb=> updateDoc(doc(db,"users",cb.value),{approved:true}));
		await Promise.all(ops);
		await loadApprovals();
		await loadStats();
		renderNotifyList();
	}catch(err){
		console.error('approveSelected error',err);
		alert('Failed to approve selected users');
	}
};



/* BULK REJECT */

rejectSelected.onclick = async ()=>{
	try{
		const selected = Array.from(document.querySelectorAll(".userCheck:checked"));
		const ops = selected.map(cb=> deleteDoc(doc(db,"users",cb.value)));
		await Promise.all(ops);
		await loadApprovals();
		await loadStats();
		renderNotifyList();
	}catch(err){
		console.error('rejectSelected error',err);
		alert('Failed to reject selected users');
	}
};



/* SINGLE APPROVE */

window.approveUser = async uid=>{
	try{
		await updateDoc(doc(db,"users",uid),{approved:true});
		await loadApprovals();
		await loadStats();
		renderNotifyList();
	}catch(err){
		console.error('approveUser error',err);
		alert('Failed to approve user');
	}
};



/* SINGLE REJECT */

window.rejectUser = async uid=>{
	try{
		await deleteDoc(doc(db,"users",uid));
		await loadApprovals();
		await loadStats();
		renderNotifyList();
	}catch(err){
		console.error('rejectUser error',err);
		alert('Failed to reject user');
	}
};



/* ================= STAFF ================= */

let staffData=[];

window.loadStaff = async role=>{

	try{
		staffTable.innerHTML="";
		staffData=[];
		let i=1;
		const snap = await getDocs(collection(db,"users"));
		snap.forEach(d=>{
			const u=d.data();
			// show non-students but exclude admins from staff listing
			if(u.role!=="student" && u.role!=="admin"){
				if(role==="all" || u.role===role){
					staffData.push({id:d.id,...u});
					const name = escapeHtml(u.name||"-");
					const email = escapeHtml(u.email||"-");
					const dept = escapeHtml(u.department||"-");
					staffTable.innerHTML+=`\n<tr onclick="openUserDetails('${d.id}')">\n<td>${i++}</td>\n<td>${name}</td>\n<td>${email}</td>\n<td>${dept}</td>\n</tr>\n`;
				}
			}
		});
	}catch(err){
		console.error('loadStaff error',err);
		staffTable.innerHTML = '<tr><td colspan="4">Failed to load staff</td></tr>';
	}

};



/* STAFF SEARCH */

staffSearch.onkeyup = ()=>{

	const q = staffSearch.value.toLowerCase();
	staffTable.querySelectorAll("tr").forEach(tr=>{
		tr.style.display = tr.innerText.toLowerCase().includes(q) ? "" : "none";
	});
};


/* APPROVALS SEARCH */

approvalSearch.onkeyup = ()=>{
	const q = approvalSearch.value.toLowerCase();
	approvalTable.querySelectorAll("tr").forEach(tr=>{
		tr.style.display = tr.innerText.toLowerCase().includes(q) ? "" : "none";
	});
};



/* ================= HIERARCHY ================= */

let detailsData=[];

window.openUserDetails = async uid=>{

	try{
		const snap = await getDoc(doc(db,"users",uid));
		const user=snap.data();
		document.querySelectorAll(".section").forEach(sec=>sec.classList.remove("active"));
		detailsSection.classList.add("active");

		detailsInfo.innerHTML=`<p>Name: ${escapeHtml(user.name)}</p><p>Email: ${escapeHtml(user.email)}</p><p>Role: ${escapeHtml(user.role)}</p><p>Department: ${escapeHtml(user.department||"-")}</p>`;

		detailsBody.innerHTML="";
		detailsData=[];
		let i=1;
		const all = await getDocs(collection(db,"users"));
		all.forEach(d=>{
			const u=d.data();
			if((user.role==="hod" && u.hodId===uid) || (user.role==="incharge" && u.inchargeId===uid)){
				detailsData.push({id:d.id,...u});
				detailsBody.innerHTML+=`\n<tr onclick="openUserDetails('${d.id}')">\n<td>${i++}</td>\n<td>${escapeHtml(u.name)}</td>\n<td>${escapeHtml(u.email)}</td>\n<td>${escapeHtml(u.department||u.roll||"-")}</td>\n</tr>\n`;
			}
		});

	}catch(err){
		console.error('openUserDetails error',err);
		detailsInfo.innerHTML = '<p>Failed to load user details</p>';
	}

};



window.goBack = ()=>{
staff.classList.add("active");
detailsSection.classList.remove("active");
};



/* ================= ATTENDANCE ================= */

let attendanceRecords=[];

async function loadAttendance(){

	try{
		attendanceRecords=[];
		const snap = await getDocs(collection(db,"attendanceRecords"));
		snap.forEach(d=> attendanceRecords.push(d.data()) );
		renderAttendance();
	}catch(err){
		console.error('loadAttendance error',err);
		attTable.innerHTML = '<tr><td colspan="9">Failed to load attendance</td></tr>';
	}

}


yearFilter.onchange = renderAttendance;

attendanceSearch.onkeyup = renderAttendance;



function renderAttendance(){

	const year = yearFilter.value;
	const q = attendanceSearch.value.toLowerCase();
	attTable.innerHTML="";
	let i=1;

	attendanceRecords.forEach(r=>{
		if((year==="all"||r.academicYear===year) && ((r.studentName||"").toLowerCase().includes(q) || (r.roll||"").toLowerCase().includes(q)) ){
			attTable.innerHTML+=`\n<tr>\n<td>${i++}</td>\n<td>${escapeHtml(r.studentName)}</td>\n<td>${escapeHtml(r.date)}</td>\n<td>${escapeHtml(r.roll)}</td>\n<td>${escapeHtml(r.academicYear)}</td>\n<td>${escapeHtml(r.session)}</td>\n<td>${escapeHtml(r.gpsStatus||"-")}</td>\n<td>${escapeHtml(r.faceStatus||"-")}</td>\n<td>${escapeHtml(r.status||"-")}</td>\n</tr>\n`;
		}
	});

}


/* ================= SETTINGS ================= */

saveTiming.onclick=()=>{

	try{
		setDoc(doc(db,"settings","attendance"),{
			fnStart:fnStart.value,
			fnEnd:fnEnd.value,
			anStart:anStart.value,
			anEnd:anEnd.value
		}, { merge: true });
		updateSessionInfo();
		updateSettingsStatus();
		alert("Timing Saved");
	}catch(err){
		console.error('saveTiming error',err);
		alert('Failed to save timing');
	}

};



saveGPS.onclick=()=>{

	try{
		setDoc(doc(db,"settings","attendance"),{
			lat:lat.value,
			lng:lng.value,
			radius:radius.value
		}, { merge: true });
		updateSettingsStatus();
		alert("GPS Saved");
	}catch(err){
		console.error('saveGPS error',err);
		alert('Failed to save GPS settings');
	}

};



addHoliday.onclick=()=>{

	(async ()=>{
		try{
			const mode = (holidayMode && holidayMode.value) || 'single';
			const reason = holidayReason.value || '';

			if(mode === 'single'){
				if(!holidayDate.value){ alert('Please pick a date'); return; }
				await setDoc(doc(db,"holidays",holidayDate.value),{ date:holidayDate.value, reason });
				alert('Holiday Added');
				return;
			}

			// multiple
			if(!holidayStart.value || !holidayEnd.value){ alert('Please pick start and end dates'); return; }
			const start = new Date(holidayStart.value);
			const end = new Date(holidayEnd.value);
			if(start > end){ alert('Start date must be before or equal to end date'); return; }

			const ops = [];
			for(let d = new Date(start); d <= end; d.setDate(d.getDate()+1)){
				const id = isoDate(new Date(d));
				ops.push(setDoc(doc(db,'holidays',id),{ date: id, reason }));
			}

			await Promise.all(ops);
			alert('Holiday range added');
		}catch(err){
			console.error('addHoliday error',err);
			alert('Failed to add holiday(s)');
		}
	})();

};
