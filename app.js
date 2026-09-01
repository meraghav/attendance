// ============================================
// Attendance — app.js
// Features: Face detection, Half day, History,
//           PWA, Offline sync, Auto logout,
//           Camera pre-warm, Screenshot block
// ============================================

let staffType       = "permanent";
let employees       = [];
let hasCheckedIn    = false;
let selectedEmployee = null;
let currentMode     = "in";
let isHalfDay       = false;

let loader = document.getElementById("loader");
let cam    = document.getElementById("cam");
let timer  = document.getElementById("timer");
let name   = document.getElementById("name");

const actionBtn = document.getElementById("actionBtn");
actionBtn.onclick = () => { sendAttendance(currentMode); };

// ============================================
// SPLASH SCREEN
// ============================================
function hideSplash() {
  let splash = document.getElementById("splashScreen");
  let app    = document.getElementById("appRoot");
  splash.classList.add("hide");
  app.style.opacity = "1";
  setTimeout(() => { splash.style.display = "none"; }, 500);
}

// ============================================
// FACE DETECTION
// ============================================
let faceDetectionInterval = null;
let faceApiLoaded         = false;
let faceApiLoadPromise    = null;

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
  const camWrap  = document.getElementById("camWrap");

  if (!faceApiLoaded) {
    if (statusEl) statusEl.innerHTML = `<span style="color:#94a3b8;font-size:14px;">⏳ Loading face detection...</span>`;
    actionBtn.disabled    = true;
    actionBtn.style.opacity = "0.5";
    faceApiLoadPromise.then(() => {
      if (faceApiLoaded) { startFaceDetection(); }
      else {
        if (statusEl) statusEl.innerHTML = "";
        actionBtn.disabled    = false;
        actionBtn.style.opacity = "1";
      }
    });
    return;
  }

  actionBtn.disabled      = true;
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
        if (camWrap) camWrap.style.boxShadow = "0 0 0 5px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.6)";
        actionBtn.disabled      = false;
        actionBtn.style.opacity = "1";
      } else if (detections.length === 0) {
        if (statusEl) statusEl.innerHTML = `<span style="color:#f87171;font-size:15px;font-weight:600;">❌ No face — position your face in camera</span>`;
        if (camWrap) camWrap.style.boxShadow = "0 0 0 5px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.4)";
        actionBtn.disabled      = true;
        actionBtn.style.opacity = "0.5";
      } else {
        if (statusEl) statusEl.innerHTML = `<span style="color:#fbbf24;font-size:15px;font-weight:600;">⚠️ Multiple faces — only one person allowed</span>`;
        if (camWrap) camWrap.style.boxShadow = "0 0 0 5px rgba(245,158,11,0.5), 0 0 40px rgba(245,158,11,0.4)";
        actionBtn.disabled      = true;
        actionBtn.style.opacity = "0.5";
      }
    } catch (e) { console.warn("Detection error:", e); }
  }, 500);
}

function stopFaceDetection() {
  if (faceDetectionInterval) { clearInterval(faceDetectionInterval); faceDetectionInterval = null; }
  actionBtn.disabled      = false;
  actionBtn.style.opacity = "1";
  const camWrap  = document.getElementById("camWrap");
  const statusEl = document.getElementById("faceStatus");
  if (camWrap)  camWrap.style.boxShadow = "0 0 0 5px rgba(34,197,94,0.3), 0 0 40px rgba(34,197,94,0.4)";
  if (statusEl) statusEl.innerHTML = "";
}

// ============================================
// CAMERA PRE-WARM
// ============================================
let prewarmedStream = null;

async function prewarmCamera() {
  try {
    prewarmedStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }
    });
    // Stop immediately — just to get permission granted early
    prewarmedStream.getTracks().forEach(t => t.stop());
    prewarmedStream = null;
    console.log("✅ Camera pre-warmed");
  } catch (e) {
    console.log("Pre-warm skipped:", e.message);
  }
}

// CAMERA START
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
    startScreenshotBlock();
  } catch (e) {
    console.log(e);
    showToast("Camera permission denied ❌");
  }
}

// ============================================
// SCREENSHOT / SCREEN RECORD BLOCK
// ============================================
function startScreenshotBlock() {
  // Blur camera when visibility changes (screen record / switcher)
  document.addEventListener("visibilitychange", handleVisibility);
}

function handleVisibility() {
  const camWrap = document.getElementById("camWrap");
  if (!camWrap) return;
  if (document.hidden) {
    camWrap.classList.add("blurred");
  } else {
    camWrap.classList.remove("blurred");
  }
}

function stopScreenshotBlock() {
  document.removeEventListener("visibilitychange", handleVisibility);
  const camWrap = document.getElementById("camWrap");
  if (camWrap) camWrap.classList.remove("blurred");
}

// ============================================
// DATA FETCH
// ============================================
fetch("https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=staff&key=Z1TECH123")
  .then(res => res.json())
  .then(data => {
    employees = data.slice(1).map(row => ({
      id: row[0], name: row[1], dept: row[2], photo: row[3], mobile: row[4] || ""
    }));
  })
  .catch(() => console.log("Staff fetch failed — offline?"));

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
  })
  .catch(() => {});

// ============================================
// STEP CONTROL
// ============================================
function show(id) {
  ["step2", "step3", "step4"].forEach(step => {
    document.getElementById(step).classList.add("hidden");
  });
  document.getElementById(id).classList.remove("hidden");
}

// TYPEWRITER
let txt = "Welcome to Z1Tech";
let i   = 0;
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
  let val   = (input.value || "").toLowerCase();
  let box   = document.getElementById("suggestions");
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
      name.value       = e.name;
      name.readOnly    = true;
      name.disabled    = true;
      selectedEmployee = e;

      let existing = await checkExistingAttendance(e.name, e.mobile || "");

      if (existing.active) {
        hasCheckedIn     = true;
        selectedEmployee = { name: existing.name, dept: existing.dept, mobile: e.mobile || "" };
        setMode("out");
        show("step4");
        updateAttendanceBadge(existing.isHalfDay);
        let start = new Date(existing.inTime);
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
          let diff = Math.floor((new Date() - start) / 1000);
          let h = Math.floor(diff/3600), m = Math.floor((diff%3600)/60), s = diff%60;
          timer.innerHTML = `⏱ ${h}h ${m}m ${s}s`;
        }, 1000);
        scheduleClientAutoLogout(start, existing.name, existing.isHalfDay);
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

function updateAttendanceBadge(isHalf) {
  let badge = document.getElementById("attendanceBadge");
  if (!badge) return;
  if (isHalf) {
    badge.textContent = "🌗 Half Day";
    badge.className   = "half-day";
  } else {
    badge.textContent = "☀️ Full Day";
    badge.className   = "full-day";
  }
}

// CAPTURE
function capture() {
  const video    = document.getElementById("cam");
  const size     = 320;
  const canvas   = document.createElement("canvas");
  canvas.width   = size; canvas.height = size;
  const ctx      = canvas.getContext("2d");
  const vw = video.videoWidth, vh = video.videoHeight;
  const cropSize = Math.min(vw, vh);
  const sx = (vw - cropSize) / 2, sy = (vh - cropSize) / 2;
  ctx.translate(size, 0); ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.55);
}

// ============================================
// OFFLINE MODE
// ============================================
let isOnline = navigator.onLine;

window.addEventListener("online",  () => { isOnline = true;  updateOfflineBanner(); syncOfflinePending(); });
window.addEventListener("offline", () => { isOnline = false; updateOfflineBanner(); });

function updateOfflineBanner() {
  let banner = document.getElementById("offlineBanner");
  if (!banner) return;
  if (!isOnline) { banner.classList.remove("hidden"); }
  else           { banner.classList.add("hidden"); }
}

async function saveOfflinePending(data) {
  return new Promise((resolve, reject) => {
    let req = indexedDB.open("z1tech-offline", 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = e => {
      let db = e.target.result;
      let tx = db.transaction("pending", "readwrite");
      tx.objectStore("pending").add({ data, savedAt: new Date().toISOString() });
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

async function syncOfflinePending() {
  return new Promise((resolve) => {
    let req = indexedDB.open("z1tech-offline", 1);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = async e => {
      let db = e.target.result;
      let tx = db.transaction("pending", "readonly");
      let all = tx.objectStore("pending").getAll();
      all.onsuccess = async () => {
        let records = all.result;
        if (!records.length) { resolve(); return; }
        showToast(`🔄 Syncing ${records.length} offline record(s)...`);
        let synced = 0;
        for (let record of records) {
          try {
            let res = await fetch(
              "https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec",
              { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(record.data) }
            );
            if (res.ok) {
              let delTx = db.transaction("pending", "readwrite");
              delTx.objectStore("pending").delete(record.id);
              synced++;
            }
          } catch (err) { console.log("Sync failed:", err); }
        }
        if (synced > 0) showToast(`✅ ${synced} record(s) synced!`);
        resolve();
      };
    };
    req.onerror = () => resolve();
  });
}

// ============================================
// LOADER
// ============================================
function showLoader() { loader.style.display = "flex"; }
function hideLoader() { loader.style.display = "none"; }

// ============================================
// TIMER
// ============================================
let startTime, interval;
let clockInterval = null;

function startTimer() {
  if (interval) clearInterval(interval);
  startTime = new Date();
  interval = setInterval(() => {
    let diff = Math.floor((new Date() - startTime) / 1000);
    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;
    let hStr = h > 0 ? h + "h " : "";
    timer.innerText = "⏱ " + hStr + m + "m " + s + "s";
  }, 1000);
}

function startLiveClock() {
  if (clockInterval) clearInterval(clockInterval);
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function updateClock() {
  let el = document.getElementById("liveClock");
  if (!el) return;
  let now = new Date();
  let dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  let timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  });
  el.innerHTML = `<div class="live-date">${dateStr}</div><div class="live-time">${timeStr}</div>`;
}

function stopLiveClock() {
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
}

function resetTemporaryFields() {
  document.getElementById("tempName").value  = "";
  document.getElementById("tempDept").value  = "";
  document.getElementById("tempMobile").value = "";
}

// ============================================
// AUTO LOGOUT (12 hours, 6 for half day)
// ============================================
let autoLogoutTimer = null;

function scheduleClientAutoLogout(checkInTime, userName, halfDay) {
  if (autoLogoutTimer) clearTimeout(autoLogoutTimer);
  const maxHours  = halfDay ? 6 : 15;
  const maxMs     = maxHours * 60 * 60 * 1000;
  let elapsed     = new Date() - new Date(checkInTime);
  let remaining   = maxMs - elapsed;

  if (remaining <= 0) { handleClientAutoLogout(userName); return; }
  console.log(`⏰ Auto logout in ${Math.round(remaining / 60000)} min`);
  autoLogoutTimer = setTimeout(() => { handleClientAutoLogout(userName); }, remaining);
}

function handleClientAutoLogout(userName) {
  hasCheckedIn     = false;
  selectedEmployee = null;
  localStorage.removeItem("attendanceUser");
  cancelCheckInReminder();
  if (interval) clearInterval(interval);
  if (autoLogoutTimer) clearTimeout(autoLogoutTimer);
  stopLiveClock();
  if (cam.srcObject) cam.srcObject.getTracks().forEach(t => t.stop());
  stopFaceDetection();
  stopScreenshotBlock();
  name.value = ""; name.disabled = false; name.readOnly = false;
  resetTemporaryFields();
  show("step2");
  showToast("Auto logout ⏰ " + userName + ", dobara check-in karein");
  if (Notification.permission === "granted") {
    new Notification("⏰ Auto Logout", {
      body: `${userName} — shift khatam. Dobara check-in karein.`,
      icon: "https://i.ibb.co/Pz5F8DyX/z1techh-logo.jpg",
      tag: "auto-logout"
    });
  }
}

// ============================================
// SEND ATTENDANCE
// ============================================
async function sendAttendance(type) {
  showLoader();

  if (!cam.srcObject) { hideLoader(); showToast("Camera not started ❌"); return; }
  if (!selectedEmployee) { hideLoader(); showToast("Please select your name first ❌"); return; }

  if (faceApiLoaded) {
    const detections = await faceapi.detectAllFaces(
      cam, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
    );
    if (detections.length === 0) { hideLoader(); showToast("No face detected ❌ Please face the camera"); return; }
    if (detections.length > 1)   { hideLoader(); showToast("Multiple faces ❌ Only you should be in frame"); return; }
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
        name: selectedEmployee.name, dept: selectedEmployee.dept, photo,
        lat: pos.coords.latitude, lng: pos.coords.longitude,
        mobile: selectedEmployee.mobile || "",
        isHalfDay: isHalfDay
      };

      // OFFLINE MODE
      if (!isOnline) {
        hideLoader();
        await saveOfflinePending(data);
        showToast("📡 Offline — attendance saved locally, will sync when connected");

        if (type === "in") {
          hasCheckedIn = true;
          isHalfDay = false;
          let checkInTime = new Date();
          localStorage.setItem("attendanceUser", JSON.stringify({
            name: selectedEmployee.name, dept: selectedEmployee.dept,
            mobile: selectedEmployee.mobile || "", staffType,
            checkInTime: checkInTime.toISOString(), isHalfDay: false
          }));
          updateAttendanceBadge(false);
          show("step4");
          startTimer();
          startLiveClock();
          scheduleCheckInReminder(selectedEmployee.name);
          scheduleClientAutoLogout(checkInTime, selectedEmployee.name, false);
        }

        if (type === "out") {
          // ✅ AUTO HALF DAY offline
          let savedUser = localStorage.getItem("attendanceUser");
          if (savedUser) {
            let u = JSON.parse(savedUser);
            if (u.checkInTime) {
              let hoursWorked = (new Date() - new Date(u.checkInTime)) / (1000 * 60 * 60);
              isHalfDay = hoursWorked < 6;
              data.isHalfDay = isHalfDay;
            }
          }
          hasCheckedIn = false;
          localStorage.removeItem("attendanceUser");
          clearInterval(interval);
          if (autoLogoutTimer) clearTimeout(autoLogoutTimer);
          stopLiveClock();
          show("step2");
          name.value = ""; name.disabled = false; name.readOnly = false;
          resetTemporaryFields();
          selectedEmployee = null;
          cancelCheckInReminder();
        }

        stopFaceDetection();
        stopScreenshotBlock();
        setTimeout(() => { if (cam.srcObject) cam.srcObject.getTracks().forEach(t => t.stop()); }, 500);
        return;
      }

      // ONLINE MODE
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
      stopScreenshotBlock();
      setTimeout(() => { if (cam.srcObject) cam.srcObject.getTracks().forEach(t => t.stop()); }, 500);
      showToast(type.toUpperCase() + " SUCCESSFULLY ✅");

      if (type === "out") {
        // ✅ AUTO HALF DAY: 6 hours se kam = half day
        let savedUser = localStorage.getItem("attendanceUser");
        if (savedUser) {
          let u = JSON.parse(savedUser);
          if (u.checkInTime) {
            let hoursWorked = (new Date() - new Date(u.checkInTime)) / (1000 * 60 * 60);
            isHalfDay = hoursWorked < 6;
            data.isHalfDay = isHalfDay;
          }
        }
        hasCheckedIn = false;
        localStorage.removeItem("attendanceUser");
        clearInterval(interval);
        if (autoLogoutTimer) clearTimeout(autoLogoutTimer);
        stopLiveClock();
        show("step2");
        name.value = ""; name.disabled = false; name.readOnly = false;
        resetTemporaryFields();
        selectedEmployee = null;
        cancelCheckInReminder();
      }

      if (type === "in") {
        hasCheckedIn = true;
        isHalfDay = false; // reset on fresh check-in
        let checkInTime = new Date();
        localStorage.setItem("attendanceUser", JSON.stringify({
          name: selectedEmployee.name, dept: selectedEmployee.dept,
          mobile: selectedEmployee.mobile || "", staffType,
          checkInTime: checkInTime.toISOString(), isHalfDay: false
        }));
        updateAttendanceBadge(false);
        show("step4");
        startTimer();
        startLiveClock();
        scheduleCheckInReminder(selectedEmployee.name);
        scheduleClientAutoLogout(checkInTime, selectedEmployee.name, false);
      }
    },
    (err) => { console.log(err); hideLoader(); showToast("Location permission required ❌"); }
  );
}

// ============================================
// WINDOW ONLOAD
// ============================================
window.onload = async () => {
  updateOfflineBanner();

  // Load face API and pre-warm camera together
  await Promise.all([loadFaceApi(), prewarmCamera()]);

  await restoreAttendanceState();
  requestNotificationPermission();
  registerServiceWorker();
  setupPWAInstall();

  // Hide splash after everything loaded
  hideSplash();
};

// ============================================
// LOCATION & DISTANCE
// ============================================
const OFFICE_LAT = 28.499194530261953;
const OFFICE_LNG = 77.08088784902715;
const MAX_RADIUS = 150000000000;

function getDistance(lat1, lon1, lat2, lon2) {
  const R  = 6371e3;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function confirmLogout() {
  if (confirm("Are you sure you want to logout?")) { setMode("out"); show("step3"); startCamera(); }
}

function showToast(msg, color = "green") {
  let t = document.getElementById("toast");
  t.innerText = msg;
  t.style.background = color === "green" ? "#16a34a" : color === "red" ? "#dc2626" : "#854f0b";
  t.classList.add("show");
  setTimeout(() => { t.classList.remove("show"); }, 3500);
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
  } else {
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
  if (!tName || !tDept || !tMobile) { showToast("Fill all fields ❌", "red"); return; }
  if (!/^\d{10}$/.test(tMobile))    { showToast("Mobile number must be exactly 10 digits ❌", "red"); return; }
  selectedEmployee = { name: tName, dept: tDept, mobile: tMobile, photo: "" };
  setMode("in"); show("step3"); startCamera();
}

// ============================================
// RESTORE SESSION
// ============================================
async function restoreAttendanceState() {
  let saved = localStorage.getItem("attendanceUser");
  if (!saved) return;

  let user     = JSON.parse(saved);
  let existing = await checkExistingAttendance(user.name, user.mobile || "");

  if (!existing.active) {
    localStorage.removeItem("attendanceUser");
    cancelCheckInReminder();
    if (user.checkInTime) {
      let h = (new Date() - new Date(user.checkInTime)) / (1000 * 60 * 60);
      if (h >= 6) showToast("Auto logout ho gaya ⏰ Dobara check-in karein");
    }
    show("step2");
    return;
  }

  hasCheckedIn     = true;
  isHalfDay        = user.isHalfDay || false;
  staffType        = user.staffType || "permanent";
  selectedEmployee = { name: user.name, dept: user.dept, mobile: user.mobile || "", photo: "" };
  setMode("out");
  updateAttendanceBadge(isHalfDay);

  let start = new Date(existing.inTime);
  if (interval) clearInterval(interval);
  interval = setInterval(() => {
    let diff = Math.floor((new Date() - start) / 1000);
    let h = Math.floor(diff/3600), m = Math.floor((diff%3600)/60), s = diff%60;
    timer.innerHTML = `⏱ ${h}h ${m}m ${s}s`;
  }, 1000);

  show("step4");
  showToast("Welcome Back " + user.name + " 👋");
  startLiveClock();
  scheduleClientAutoLogout(start, user.name, isHalfDay);
}

async function checkExistingAttendance(name, mobile = "") {
  try {
    let res = await fetch(
      "https://script.google.com/macros/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=checkAttendance&name="
      + encodeURIComponent(name) + "&mobile=" + encodeURIComponent(mobile) + "&key=Z1TECH123"
    );
    return await res.json();
  } catch (e) { return { active: false }; }
}

// ============================================
// ATTENDANCE HISTORY
// ============================================
async function showHistory() {
  let modal = document.getElementById("historyModal");
  modal.classList.remove("hidden");
  document.getElementById("historyContent").innerHTML =
    `<div style="text-align:center;padding:20px;color:#94a3b8;">Loading...</div>`;

  if (!selectedEmployee) {
    document.getElementById("historyContent").innerHTML =
      `<div style="text-align:center;padding:20px;color:#f87171;">No employee selected.</div>`;
    return;
  }

  try {
    let res = await fetch(
      "https://script.google.com/macros/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=history&name="
      + encodeURIComponent(selectedEmployee.name)
      + "&mobile=" + encodeURIComponent(selectedEmployee.mobile || "")
      + "&key=Z1TECH123"
    );
    let data = await res.json();
    renderHistory(data);
  } catch (e) {
    document.getElementById("historyContent").innerHTML =
      `<div style="text-align:center;padding:20px;color:#f87171;">Could not load history. Check connection.</div>`;
  }
}

function renderHistory(records) {
  let box = document.getElementById("historyContent");

  if (!records || !records.length) {
    box.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;">No records found.</div>`;
    return;
  }

  let html = records.map(r => {
    let inT  = r.inTime  ? new Date(r.inTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--";
    let outT = r.outTime ? new Date(r.outTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--";
    let hrs  = r.hours   ? parseFloat(r.hours).toFixed(1) + "h" : "--";
    let dateStr = r.date ? new Date(r.date).toLocaleDateString("en-IN", { weekday:"short", day:"numeric", month:"short" }) : "--";
    let tag  = r.isHalfDay ? `<span class="half-tag">Half Day</span>` : "";
    let autoTag = r.remark === "AUTO OUT" ? `<span class="absent-tag">Auto OUT</span>` : "";

    return `
      <div class="history-row">
        <div>
          <div class="date">${dateStr}</div>
          <div class="times">${inT} → ${outT}</div>
          ${tag}${autoTag}
        </div>
        <div class="hours">${hrs}</div>
      </div>
    `;
  }).join("");

  box.innerHTML = html;
}

function closeHistory() {
  document.getElementById("historyModal").classList.add("hidden");
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================
function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().then(p => {
      if (p === "granted") showToast("Notifications enabled 🔔");
    });
  }
}

function scheduleCheckInReminder(employeeName) {
  cancelCheckInReminder();
  let t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(9, 0, 0, 0);
  let id = setTimeout(() => { sendCheckInNotification(employeeName); }, t - new Date());
  localStorage.setItem("reminderTimerId",     id);
  localStorage.setItem("reminderScheduledFor", t.toISOString());
}

function cancelCheckInReminder() {
  let id = localStorage.getItem("reminderTimerId");
  if (id) {
    clearTimeout(parseInt(id));
    localStorage.removeItem("reminderTimerId");
    localStorage.removeItem("reminderScheduledFor");
  }
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
  let t = new Date(scheduledFor);
  if (t > new Date()) {
    let saved = localStorage.getItem("attendanceUser");
    if (saved) {
      let user = JSON.parse(saved);
      let id   = setTimeout(() => { sendCheckInNotification(user.name); }, t - new Date());
      localStorage.setItem("reminderTimerId", id);
    }
  } else {
    localStorage.removeItem("reminderTimerId");
    localStorage.removeItem("reminderScheduledFor");
  }
});

// ============================================
// SERVICE WORKER (PWA + OFFLINE)
// ============================================
function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => { console.log("✅ SW registered:", reg.scope); })
      .catch(err => { console.log("SW error:", err); });
  }
}

// ============================================
// PWA INSTALL PROMPT
// ============================================
let deferredPrompt = null;

function setupPWAInstall() {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install prompt after 10 seconds if not dismissed
    let dismissed = localStorage.getItem("pwaDismissed");
    if (!dismissed) {
      setTimeout(() => {
        let prompt = document.getElementById("pwaPrompt");
        if (prompt) prompt.classList.remove("hidden");
      }, 10000);
    }
  });
}

async function installPWA() {
  let prompt = document.getElementById("pwaPrompt");
  if (prompt) prompt.classList.add("hidden");
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  let result = await deferredPrompt.userChoice;
  console.log("PWA install:", result.outcome);
  deferredPrompt = null;
}

function dismissPWA() {
  let prompt = document.getElementById("pwaPrompt");
  if (prompt) prompt.classList.add("hidden");
  localStorage.setItem("pwaDismissed", "1");
}
