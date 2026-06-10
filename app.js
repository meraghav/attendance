let staffType = "permanent";
let employees = [];
let hasCheckedIn = false;
let loader = document.getElementById("loader");
let cam = document.getElementById("cam");
let timer = document.getElementById("timer");
let name = document.getElementById("name");
let selectedEmployee = null;
let currentMode = "in";

const actionBtn = document.getElementById("actionBtn");
actionBtn.onclick = () => { sendAttendance(currentMode); };

// ========================================
// ✅ FACE DETECTION
// ========================================
let faceDetectionInterval = null;
let faceApiLoaded = false;
let faceApiLoadPromise = null;

async function loadFaceApi() {
  if (faceApiLoadPromise) return faceApiLoadPromise;
  faceApiLoadPromise = (async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri("./models");
      faceApiLoaded = true;
      console.log("✅ Face API loaded");
    } catch (e) {
      console.warn("⚠️ Face API failed:", e);
      faceApiLoaded = false;
    }
  })();
  return faceApiLoadPromise;
}

function startFaceDetection() {
  stopFaceDetection();
  const statusEl = document.getElementById("faceStatus");
  const camWrap = document.getElementById("camWrap");

  if (!faceApiLoaded) {
    if (statusEl) statusEl.innerHTML = `<span style="color:#94a3b8;font-size:14px;">⏳ Loading face detection...</span>`;
    actionBtn.disabled = true;
    actionBtn.style.opacity = "0.5";
    faceApiLoadPromise.then(() => {
      if (faceApiLoaded) {
        startFaceDetection();
      } else {
        if (statusEl) statusEl.innerHTML = "";
        actionBtn.disabled = false;
        actionBtn.style.opacity = "1";
      }
    });
    return;
  }

  actionBtn.disabled = true;
  actionBtn.style.opacity = "0.5";
  if (statusEl) statusEl.innerHTML = `<span style="color:#94a3b8;font-size:14px;">🔍 Scanning for face...</span>`;

  faceDetectionInterval = setInterval(async () => {
    if (!cam.srcObject || cam.paused || cam.ended) return;
    try {
      const detections = await faceapi.detectAllFaces(
        cam, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      );
      if (detections.length === 1) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#22c55e;font-size:15px;font-weight:600;">✅ Face detected — ready to capture</span>`;
        if (camWrap) camWrap.style.border = "3px solid #22c55e";
        actionBtn.disabled = false;
        actionBtn.style.opacity = "1";
      } else if (detections.length === 0) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#f87171;font-size:15px;font-weight:600;">❌ No face — position your face in camera</span>`;
        if (camWrap) camWrap.style.border = "3px solid #ef4444";
        actionBtn.disabled = true;
        actionBtn.style.opacity = "0.5";
      } else {
        if (statusEl) statusEl.innerHTML = `<span style="color:#fbbf24;font-size:15px;font-weight:600;">⚠️ Multiple faces — only one person allowed</span>`;
        if (camWrap) camWrap.style.border = "3px solid #f59e0b";
        actionBtn.disabled = true;
        actionBtn.style.opacity = "0.5";
      }
    } catch (e) { console.warn("Detection error:", e); }
  }, 500);
}

function stopFaceDetection() {
  if (faceDetectionInterval) { clearInterval(faceDetectionInterval); faceDetectionInterval = null; }
  actionBtn.disabled = false;
  actionBtn.style.opacity = "1";
  const camWrap = document.getElementById("camWrap");
  if (camWrap) camWrap.style.border = "none";
  const statusEl = document.getElementById("faceStatus");
  if (statusEl) statusEl.innerHTML = "";
}

// ========================================
// DATA FETCH
// ========================================
fetch("https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=staff&key=Z1TECH123")
  .then(res => res.json())
  .then(data => {
    employees = data.slice(1).map(row => ({
      id: row[0], name: row[1], dept: row[2], photo: row[3], mobile: row[4] || ""
    }));
  });

fetch("https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=topper&key=Z1TECH123")
  .then(res => res.json())
  .then(data => {
    let topper = data || {};
    if (!topper || !topper.name) return;
    document.getElementById("topperCard").classList.remove("hidden");
    document.getElementById("topperWrap").innerHTML = `
      <div class="crown">👑</div>
      <img src="${topper.photo}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:4px solid gold;box-shadow:0 0 25px rgba(255,215,0,.7);">
      <h2 style="margin:12px 0 5px;color:#FFD700;">Employee Of The Month</h2>
      <div style="font-size:22px;font-weight:700;">${topper.name}</div>
      <div style="margin-top:6px;opacity:.8;">🗓️ Present ${topper.days} Days This Month</div>
      <div class="quote">"Consistency beats talent."</div>
    `;
  });

// ========================================
// STEP CONTROL
// ========================================
function show(id) {
  ["step2", "step3", "step4"].forEach(step => {
    document.getElementById(step).classList.add("hidden");
  });
  document.getElementById(id).classList.remove("hidden");
}

// TYPEWRITER
let txt = "Welcome to Z1Tech";
let i = 0;
function type() {
  if (i < txt.length) {
    welcome.innerHTML += txt.charAt(i);
    i++;
    setTimeout(type, 60);
  } else {
    let saved = localStorage.getItem("attendanceUser");
    if (!saved) setTimeout(() => { show("step2"); }, 500);
  }
}
type();

// SEARCH
function filterNames() {
  let input = document.getElementById("name");
  let val = (input.value || "").toLowerCase();
  let box = document.getElementById("suggestions");
  box.innerHTML = "";
  if (!val) return;

  employees.filter(e => e.name && e.name.toLowerCase().includes(val)).forEach(e => {
    let div = document.createElement("div");
    div.className = "s-item";
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${e.photo}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid #22c55e;">
        <div>
          <div style="font-weight:600">${e.name}</div>
          <div style="font-size:12px;opacity:.7">${e.dept || ""}</div>
        </div>
      </div>
    `;
    div.onclick = async () => {
      name.value = e.name;
      name.readOnly = true;
      name.disabled = true;
      selectedEmployee = e;

      let existing = await checkExistingAttendance(e.name, e.mobile || "");

      if (existing.active) {
        hasCheckedIn = true;
        selectedEmployee = { name: existing.name, dept: existing.dept, mobile: e.mobile || "" };
        setMode("out");
        show("step4");
        let start = new Date(existing.inTime);
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
          let diff = Math.floor((new Date() - start) / 1000);
          let h = Math.floor(diff / 3600), m = Math.floor((diff % 3600) / 60), s = diff % 60;
          timer.innerHTML = `⏱ ${h}h ${m}m ${s}s`;
        }, 1000);
        // ✅ AUTO LOGOUT: restore client timer for existing session
        scheduleClientAutoLogout(start, existing.name);
        showToast("Active attendance found ✅");
        return;
      }
      box.innerHTML = "";
      setMode("in");
      show("step3");
      startCamera();
    };
    box.appendChild(div);
  });
}

// CAPTURE
function capture() {
  const video = document.getElementById("cam");
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  const vw = video.videoWidth, vh = video.videoHeight;
  const cropSize = Math.min(vw, vh);
  const sx = (vw - cropSize) / 2, sy = (vh - cropSize) / 2;
  ctx.translate(size, 0); ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.55);
}

// CAMERA
async function startCamera() {
  if (cam.srcObject) cam.srcObject.getTracks().forEach(t => t.stop());
  try {
    let stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }
    });
    cam.srcObject = stream;
    await cam.play();
    console.log("✅ Camera Ready");
    startFaceDetection();
  } catch (e) {
    console.log(e);
    showToast("Camera permission denied ❌");
  }
}

function showLoader() { loader.style.display = "flex"; }
function hideLoader() { loader.style.display = "none"; }

let startTime, interval;
function startTimer() {
  if (interval) clearInterval(interval);
  startTime = new Date();
  interval = setInterval(() => {
    let diff = Math.floor((new Date() - startTime) / 1000);
    let m = Math.floor(diff / 60), s = diff % 60;
    timer.innerText = "⏱ " + m + "m " + s + "s";
  }, 1000);
}

function resetTemporaryFields() {
  document.getElementById("tempName").value = "";
  document.getElementById("tempDept").value = "";
  document.getElementById("tempMobile").value = "";
}

// ========================================
// ✅ CLIENT-SIDE AUTO LOGOUT (12 hours)
// ========================================
let autoLogoutTimer = null;

function scheduleClientAutoLogout(checkInTime, userName) {
  if (autoLogoutTimer) clearTimeout(autoLogoutTimer);

  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  let elapsed  = new Date() - new Date(checkInTime);
  let remaining = TWELVE_HOURS - elapsed;

  // Agar 12 hours pehle hi ho gaye hain
  if (remaining <= 0) {
    handleClientAutoLogout(userName);
    return;
  }

  console.log(`⏰ Auto logout in ${Math.round(remaining / 60000)} minutes`);
  autoLogoutTimer = setTimeout(() => { handleClientAutoLogout(userName); }, remaining);
}

function handleClientAutoLogout(userName) {
  hasCheckedIn = false;
  selectedEmployee = null;
  localStorage.removeItem("attendanceUser");
  cancelCheckInReminder();
  if (interval) clearInterval(interval);
  if (autoLogoutTimer) clearTimeout(autoLogoutTimer);

  // Camera aur face detection band karo
  if (cam.srcObject) cam.srcObject.getTracks().forEach(t => t.stop());
  stopFaceDetection();

  // Fields reset
  name.value = "";
  name.disabled = false;
  name.readOnly = false;
  resetTemporaryFields();

  show("step2");
  showToast("Auto logout ho gaya ⏰ " + userName + ", dobara check-in karein");

  // Browser notification
  if (Notification.permission === "granted") {
    new Notification("⏰ Auto Logout", {
      body: `${userName} — 12 hours poore ho gaye. Dobara check-in karein.`,
      icon: "https://i.ibb.co/Pz5F8DyX/z1techh-logo.jpg",
      tag: "auto-logout"
    });
  }
}

// ========================================
// SEND ATTENDANCE
// ========================================
async function sendAttendance(type) {
  showLoader();

  if (!cam.srcObject) { hideLoader(); showToast("Camera not started ❌"); return; }
  if (!selectedEmployee) { hideLoader(); showToast("Please select your name first ❌"); return; }

  if (faceApiLoaded) {
    const detections = await faceapi.detectAllFaces(
      cam, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
    );
    if (detections.length === 0) { hideLoader(); showToast("No face detected ❌ Please face the camera"); return; }
    if (detections.length > 1)  { hideLoader(); showToast("Multiple faces ❌ Only you should be in frame"); return; }
  }

  let photo = capture();

  if (type === "in"  && hasCheckedIn)  { hideLoader(); showToast("Already checked in ❌"); return; }
  if (type === "out" && !hasCheckedIn) { hideLoader(); showToast("You have not checked in ❌"); return; }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      let dist = getDistance(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
      if (dist > MAX_RADIUS) { hideLoader(); showToast("You are outside office area ❌"); return; }

      let data = {
        key: "Z1TECH123", type: "attendance", action: type,
        name: selectedEmployee.name, dept: selectedEmployee.dept, photo: photo,
        lat: pos.coords.latitude, lng: pos.coords.longitude,
        mobile: selectedEmployee.mobile || ""
      };

      try {
        let res = await fetch(
          "https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec",
          { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) }
        );
        let txt = await res.text();
        console.log(txt);
        if (txt === "ALREADY_IN")        { hideLoader(); showToast("Already Checked In ❌"); return; }
        if (txt === "ALREADY_COMPLETED") { hideLoader(); showToast("Attendance Completed ✅"); return; }
        if (txt === "NO_IN_FOUND")       { hideLoader(); showToast("No Check-In Found ❌"); return; }
        if (txt === "ALREADY_OUT")       { hideLoader(); showToast("Already Checked Out ❌"); return; }
        if (!res.ok)                     { hideLoader(); showToast("Server error ❌"); return; }
      } catch (e) {
        console.log(e); hideLoader(); showToast("Network error ❌"); return;
      }

      hideLoader();
      stopFaceDetection();
      setTimeout(() => { if (cam.srcObject) cam.srcObject.getTracks().forEach(t => t.stop()); }, 500);
      showToast(type.toUpperCase() + " SUCCESSFULLY ✅");

      // OUT
      if (type === "out") {
        hasCheckedIn = false;
        localStorage.removeItem("attendanceUser");
        clearInterval(interval);
        show("step2");
        name.value = ""; name.disabled = false; name.readOnly = false;
        resetTemporaryFields();
        selectedEmployee = null;
        cancelCheckInReminder();
        // ✅ AUTO LOGOUT: manual OUT pe timer cancel karo
        if (autoLogoutTimer) clearTimeout(autoLogoutTimer);
      }

      // IN
      if (type === "in") {
        hasCheckedIn = true;
        let checkInTime = new Date();
        localStorage.setItem("attendanceUser", JSON.stringify({
          name: selectedEmployee.name, dept: selectedEmployee.dept,
          mobile: selectedEmployee.mobile || "", staffType: staffType,
          checkInTime: checkInTime.toISOString()
        }));
        show("step4");
        startTimer();
        scheduleCheckInReminder(selectedEmployee.name);
        // ✅ AUTO LOGOUT: 12 hour timer shuru karo
        scheduleClientAutoLogout(checkInTime, selectedEmployee.name);
      }
    },
    (err) => { console.log(err); hideLoader(); showToast("Location permission required ❌"); }
  );
}

// ✅ window.onload
window.onload = () => {
  loadFaceApi();
  restoreAttendanceState();
  requestNotificationPermission();
};

const OFFICE_LAT = 28.499194530261953;
const OFFICE_LNG = 77.08088784902715;
const MAX_RADIUS = 150;

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function confirmLogout() {
  if (confirm("Are you sure you want to logout?")) { setMode("out"); show("step3"); startCamera(); }
}

function showToast(msg, color = "green") {
  let t = document.getElementById("toast");
  t.innerText = msg; t.style.background = color; t.classList.add("show");
  setTimeout(() => { t.classList.remove("show"); }, 3000);
}

function setMode(mode) {
  currentMode = mode;
  if (mode === "in")  { actionBtn.innerText = "📸 IN";  actionBtn.className = "login"; }
  if (mode === "out") { actionBtn.innerText = "🔴 OUT"; actionBtn.className = "logout"; }
}

function setStaffType(type) {
  staffType = type;
  if (type === "permanent") {
    permanentBtn.style.background = "linear-gradient(135deg,#22c55e,#4ade80)";
    temporaryBtn.style.background = "#334155";
    document.getElementById("permanentFields").classList.remove("hidden");
    document.getElementById("temporaryFields").classList.add("hidden");
  }
  if (type === "temporary") {
    temporaryBtn.style.background = "linear-gradient(135deg,#22c55e,#4ade80)";
    permanentBtn.style.background = "#334155";
    document.getElementById("temporaryFields").classList.remove("hidden");
    document.getElementById("permanentFields").classList.add("hidden");
  }
}

function continueTemporary() {
  let tName   = document.getElementById("tempName").value.trim();
  let tDept   = document.getElementById("tempDept").value;
  let tMobile = document.getElementById("tempMobile").value.trim();
  if (!tName || !tDept || !tMobile) { showToast("Fill all fields ❌"); return; }
  if (!/^\d{10}$/.test(tMobile)) { showToast("Mobile number must be exactly 10 digits ❌"); return; }
  selectedEmployee = { name: tName, dept: tDept, mobile: tMobile, photo: "" };
  setMode("in"); show("step3"); startCamera();
}

// ========================================
// RESTORE SESSION
// ========================================
async function restoreAttendanceState() {
  let saved = localStorage.getItem("attendanceUser");
  if (!saved) return;

  let user = JSON.parse(saved);
  let existing = await checkExistingAttendance(user.name, user.mobile || "");

  // Backend pe AUTO OUT ho chuka hai
  if (!existing.active) {
    localStorage.removeItem("attendanceUser");
    cancelCheckInReminder();
    if (user.checkInTime) {
      let hoursGone = (new Date() - new Date(user.checkInTime)) / (1000 * 60 * 60);
      if (hoursGone >= 12) showToast("Auto logout ho gaya ⏰ Dobara check-in karein");
    }
    show("step2");
    return;
  }

  hasCheckedIn = true;
  staffType = user.staffType || "permanent";
  selectedEmployee = { name: user.name, dept: user.dept, mobile: user.mobile || "", photo: "" };
  setMode("out");

  let start = new Date(existing.inTime);
  if (interval) clearInterval(interval);
  interval = setInterval(() => {
    let diff = Math.floor((new Date() - start) / 1000);
    let h = Math.floor(diff/3600), m = Math.floor((diff%3600)/60), s = diff%60;
    timer.innerHTML = `⏱ ${h}h ${m}m ${s}s`;
  }, 1000);

  show("step4");
  showToast("Welcome Back " + user.name + " 👋");

  // ✅ AUTO LOGOUT: page reload pe bhi timer restore karo
  scheduleClientAutoLogout(start, user.name);
}

async function checkExistingAttendance(name, mobile = "") {
  try {
    let res = await fetch(
      "https://script.google.com/macros/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=checkAttendance&name="
      + encodeURIComponent(name) + "&mobile=" + encodeURIComponent(mobile) + "&key=Z1TECH123"
    );
    return await res.json();
  } catch (e) { console.log(e); return { active: false }; }
}

// ========================================
// PUSH NOTIFICATIONS
// ========================================
function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().then(p => { if (p === "granted") showToast("Notifications enabled 🔔"); });
  }
}

function scheduleCheckInReminder(employeeName) {
  cancelCheckInReminder();
  let reminderTime = new Date();
  reminderTime.setDate(reminderTime.getDate() + 1);
  reminderTime.setHours(9, 0, 0, 0);
  let reminderId = setTimeout(() => { sendCheckInNotification(employeeName); }, reminderTime - new Date());
  localStorage.setItem("reminderTimerId", reminderId);
  localStorage.setItem("reminderScheduledFor", reminderTime.toISOString());
}

function cancelCheckInReminder() {
  let id = localStorage.getItem("reminderTimerId");
  if (id) { clearTimeout(parseInt(id)); localStorage.removeItem("reminderTimerId"); localStorage.removeItem("reminderScheduledFor"); }
}

function sendCheckInNotification(employeeName) {
  if (Notification.permission !== "granted") return;
  new Notification("⏰ Time to Check In!", {
    body: `Good Morning ${employeeName}! Don't forget to mark your attendance today. 🟢`,
    icon: "https://i.ibb.co/Pz5F8DyX/z1techh-logo.jpg",
    tag: "checkin-reminder", requireInteraction: true
  });
}

window.addEventListener("load", () => {
  let scheduledFor = localStorage.getItem("reminderScheduledFor");
  if (!scheduledFor) return;
  let reminderTime = new Date(scheduledFor);
  if (reminderTime > new Date()) {
    let saved = localStorage.getItem("attendanceUser");
    if (saved) {
      let user = JSON.parse(saved);
      let reminderId = setTimeout(() => { sendCheckInNotification(user.name); }, reminderTime - new Date());
      localStorage.setItem("reminderTimerId", reminderId);
    }
  } else {
    localStorage.removeItem("reminderTimerId");
    localStorage.removeItem("reminderScheduledFor");
  }
});
