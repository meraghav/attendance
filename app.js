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

actionBtn.onclick = () => {
  sendAttendance(currentMode);
};

// ========================================
// ✅ FACE DETECTION SETUP
// ========================================
let faceDetectionInterval = null;
let faceApiLoaded = false;

async function loadFaceApi() {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    ]);
    faceApiLoaded = true;
    console.log("✅ Face API loaded");
  } catch (e) {
    console.warn("⚠️ Face API failed to load:", e);
    // If models fail, we allow capture anyway (graceful fallback)
    faceApiLoaded = false;
  }
}

// Start real-time face scan on video feed
function startFaceDetection() {
  stopFaceDetection();

  const statusEl = document.getElementById("faceStatus");
  const camWrap = document.getElementById("camWrap");

  // Disable button until face found
  actionBtn.disabled = true;
  actionBtn.style.opacity = "0.5";

  if (!faceApiLoaded) {
    // Graceful fallback: if models not loaded, just allow
    if (statusEl) statusEl.innerHTML = "";
    actionBtn.disabled = false;
    actionBtn.style.opacity = "1";
    return;
  }

  faceDetectionInterval = setInterval(async () => {
    if (!cam.srcObject || cam.paused || cam.ended) return;

    const detections = await faceapi.detectAllFaces(
      cam,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
    );

    if (detections.length === 1) {
      // ✅ Exactly one face detected
      if (statusEl) statusEl.innerHTML = `<span style="color:#22c55e;font-size:15px;font-weight:600;">✅ Face detected — ready to capture</span>`;
      if (camWrap) camWrap.style.border = "3px solid #22c55e";
      actionBtn.disabled = false;
      actionBtn.style.opacity = "1";

    } else if (detections.length === 0) {
      // ❌ No face
      if (statusEl) statusEl.innerHTML = `<span style="color:#f87171;font-size:15px;font-weight:600;">❌ No face detected — position your face</span>`;
      if (camWrap) camWrap.style.border = "3px solid #ef4444";
      actionBtn.disabled = true;
      actionBtn.style.opacity = "0.5";

    } else {
      // ❌ Multiple faces
      if (statusEl) statusEl.innerHTML = `<span style="color:#fbbf24;font-size:15px;font-weight:600;">⚠️ Multiple faces — only one allowed</span>`;
      if (camWrap) camWrap.style.border = "3px solid #f59e0b";
      actionBtn.disabled = true;
      actionBtn.style.opacity = "0.5";
    }

  }, 500); // check every 500ms
}

function stopFaceDetection() {
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
    faceDetectionInterval = null;
  }
  // Reset button state
  actionBtn.disabled = false;
  actionBtn.style.opacity = "1";

  const camWrap = document.getElementById("camWrap");
  if (camWrap) camWrap.style.border = "none";

  const statusEl = document.getElementById("faceStatus");
  if (statusEl) statusEl.innerHTML = "";
}


fetch("https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=staff&key=Z1TECH123")
  .then(res => res.json())
  .then(data => {
    employees = data.slice(1).map(row => ({
      id: row[0],
      name: row[1],
      dept: row[2],
      photo: row[3],
      mobile: row[4] || ""
    }));
  });

// LOAD TOPPER
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

// STEP CONTROL
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
    if (!saved) {
      setTimeout(() => { show("step2"); }, 500);
    }
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

  employees
    .filter(e => e.name && e.name.toLowerCase().includes(val))
    .forEach(e => {
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
          selectedEmployee = {
            name: existing.name,
            dept: existing.dept,
            mobile: e.mobile || ""
          };
          setMode("out");
          show("step4");
          let start = new Date(existing.inTime);
          if (interval) clearInterval(interval);
          interval = setInterval(() => {
            let diff = Math.floor((new Date() - start) / 1000);
            let h = Math.floor(diff / 3600);
            let m = Math.floor((diff % 3600) / 60);
            let s = diff % 60;
            timer.innerHTML = `⏱ ${h}h ${m}m ${s}s`;
          }, 1000);
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
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const cropSize = Math.min(vw, vh);
  const sx = (vw - cropSize) / 2;
  const sy = (vh - cropSize) / 2;
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.55);
}

// CAMERA
async function startCamera() {
  if (cam.srcObject) {
    cam.srcObject.getTracks().forEach(t => t.stop());
  }
  try {
    let stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }
    });
    cam.srcObject = stream;
    await cam.play();
    console.log("✅ Camera Ready");

    // ✅ Start face detection after camera is ready
    startFaceDetection();

  } catch (e) {
    console.log(e);
    showToast("Camera permission denied ❌");
  }
}

// LOADER
function showLoader() { loader.style.display = "flex"; }
function hideLoader() { loader.style.display = "none"; }

// TIMER
let startTime, interval;
function startTimer() {
  if (interval) clearInterval(interval);
  startTime = new Date();
  interval = setInterval(() => {
    let diff = Math.floor((new Date() - startTime) / 1000);
    let m = Math.floor(diff / 60);
    let s = diff % 60;
    timer.innerText = "⏱ " + m + "m " + s + "s";
  }, 1000);
}

// FULL RESET FUNCTION
function resetTemporaryFields() {
  document.getElementById("tempName").value = "";
  document.getElementById("tempDept").value = "";
  document.getElementById("tempMobile").value = "";
}

// LOGIN / LOGOUT
async function sendAttendance(type) {
  showLoader();

  if (!cam.srcObject) {
    hideLoader();
    showToast("Camera not started ❌");
    return;
  }

  if (!selectedEmployee) {
    hideLoader();
    showToast("Please select your name first ❌");
    return;
  }

  // ✅ Double-check face before capture (in case detection loop is slow)
  if (faceApiLoaded) {
    const detections = await faceapi.detectAllFaces(
      cam,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
    );
    if (detections.length === 0) {
      hideLoader();
      showToast("No face detected ❌ Please face the camera");
      return;
    }
    if (detections.length > 1) {
      hideLoader();
      showToast("Multiple faces detected ❌ Only you should be in frame");
      return;
    }
  }

  let photo = capture();

  if (type === "in" && hasCheckedIn) {
    hideLoader();
    showToast("Already checked in ❌");
    return;
  }

  if (type === "out" && !hasCheckedIn) {
    hideLoader();
    showToast("You have not checked in ❌");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      let dist = getDistance(
        pos.coords.latitude, pos.coords.longitude,
        OFFICE_LAT, OFFICE_LNG
      );

      if (dist > MAX_RADIUS) {
        hideLoader();
        showToast("You are outside office area ❌");
        return;
      }

      let data = {
        key: "Z1TECH123",
        type: "attendance",
        action: type,
        name: selectedEmployee.name,
        dept: selectedEmployee.dept,
        photo: photo,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        mobile: selectedEmployee.mobile || ""
      };

      try {
        let res = await fetch(
          "https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec",
          {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(data)
          }
        );

        let txt = await res.text();
        console.log(txt);

        if (txt === "ALREADY_IN") { hideLoader(); showToast("Already Checked In ❌"); return; }
        if (txt === "ALREADY_COMPLETED") { hideLoader(); showToast("Attendance Completed ✅"); return; }
        if (txt === "NO_IN_FOUND") { hideLoader(); showToast("No Check-In Found ❌"); return; }
        if (txt === "ALREADY_OUT") { hideLoader(); showToast("Already Checked Out ❌"); return; }

        if (!res.ok) { hideLoader(); showToast("Server error ❌"); return; }

      } catch (e) {
        console.log(e);
        hideLoader();
        showToast("Network error ❌");
        return;
      }

      hideLoader();

      // Stop face detection and camera
      stopFaceDetection();
      setTimeout(() => {
        if (cam.srcObject) {
          cam.srcObject.getTracks().forEach(t => t.stop());
        }
      }, 500);

      showToast(type.toUpperCase() + " SUCCESSFULLY ✅");

      // OUT
      if (type === "out") {
        hasCheckedIn = false;
        localStorage.removeItem("attendanceUser");
        clearInterval(interval);
        show("step2");
        name.value = "";
        name.disabled = false;
        name.readOnly = false;
        resetTemporaryFields();
        selectedEmployee = null;
        cancelCheckInReminder();
      }

      // IN
      if (type === "in") {
        hasCheckedIn = true;
        localStorage.setItem("attendanceUser", JSON.stringify({
          name: selectedEmployee.name,
          dept: selectedEmployee.dept,
          mobile: selectedEmployee.mobile || "",
          staffType: staffType,
          checkInTime: new Date().toISOString()
        }));
        show("step4");
        startTimer();
        scheduleCheckInReminder(selectedEmployee.name);
      }
    },
    (err) => {
      console.log(err);
      hideLoader();
      showToast("Location permission required ❌");
    }
  );
}

window.onload = () => {
  restoreAttendanceState();
  requestNotificationPermission();
  loadFaceApi(); // ✅ Load face detection models on startup
};

const OFFICE_LAT = 28.499194530261953;
const OFFICE_LNG = 77.08088784902715;
const MAX_RADIUS = 150000000000;

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function confirmLogout() {
  if (confirm("Are you sure you want to logout?")) {
    setMode("out");
    show("step3");
    startCamera();
  }
}

function showToast(msg, color = "green") {
  let t = document.getElementById("toast");
  t.innerText = msg;
  t.style.background = color;
  t.classList.add("show");
  setTimeout(() => { t.classList.remove("show"); }, 3000);
}

function setMode(mode) {
  currentMode = mode;
  if (mode === "in") {
    actionBtn.innerText = "📸 IN";
    actionBtn.className = "login";
  }
  if (mode === "out") {
    actionBtn.innerText = "🔴 OUT";
    actionBtn.className = "logout";
  }
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
  let tName = document.getElementById("tempName").value.trim();
  let tDept = document.getElementById("tempDept").value;
  let tMobile = document.getElementById("tempMobile").value.trim();

  if (!tName || !tDept || !tMobile) {
    showToast("Fill all fields ❌");
    return;
  }

  if (!/^\d{10}$/.test(tMobile)) {
    showToast("Mobile number must be exactly 10 digits ❌");
    return;
  }

  selectedEmployee = {
    name: tName,
    dept: tDept,
    mobile: tMobile,
    photo: ""
  };

  setMode("in");
  show("step3");
  startCamera();
}

async function restoreAttendanceState() {
  let saved = localStorage.getItem("attendanceUser");
  if (!saved) return;

  let user = JSON.parse(saved);
  let existing = await checkExistingAttendance(user.name, user.mobile || "");

  if (!existing.active) {
    localStorage.removeItem("attendanceUser");
    return;
  }

  hasCheckedIn = true;
  staffType = user.staffType || "permanent";
  selectedEmployee = {
    name: user.name,
    dept: user.dept,
    mobile: user.mobile || "",
    photo: ""
  };

  setMode("out");

  let start = new Date(existing.inTime);
  if (interval) clearInterval(interval);
  interval = setInterval(() => {
    let diff = Math.floor((new Date() - start) / 1000);
    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;
    timer.innerHTML = `⏱ ${h}h ${m}m ${s}s`;
  }, 1000);

  show("step4");
  showToast("Welcome Back " + user.name + " 👋");
}

async function checkExistingAttendance(name, mobile = "") {
  try {
    let res = await fetch(
      "https://script.google.com/macros/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=checkAttendance&name="
      + encodeURIComponent(name)
      + "&mobile="
      + encodeURIComponent(mobile)
      + "&key=Z1TECH123"
    );
    return await res.json();
  } catch (e) {
    console.log(e);
    return { active: false };
  }
}

// ========================================
// ✅ PUSH NOTIFICATION SYSTEM
// ========================================

function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") showToast("Notifications enabled 🔔");
    });
  }
}

function scheduleCheckInReminder(employeeName) {
  cancelCheckInReminder();
  let reminderTime = new Date();
  reminderTime.setDate(reminderTime.getDate() + 1);
  reminderTime.setHours(9, 0, 0, 0);
  let msUntilReminder = reminderTime - new Date();
  let reminderId = setTimeout(() => { sendCheckInNotification(employeeName); }, msUntilReminder);
  localStorage.setItem("reminderTimerId", reminderId);
  localStorage.setItem("reminderScheduledFor", reminderTime.toISOString());
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
    tag: "checkin-reminder",
    requireInteraction: true
  });
}

window.addEventListener("load", () => {
  let scheduledFor = localStorage.getItem("reminderScheduledFor");
  if (scheduledFor) {
    let reminderTime = new Date(scheduledFor);
    let now = new Date();
    if (reminderTime > now) {
      let saved = localStorage.getItem("attendanceUser");
      if (saved) {
        let user = JSON.parse(saved);
        let reminderId = setTimeout(() => { sendCheckInNotification(user.name); }, reminderTime - now);
        localStorage.setItem("reminderTimerId", reminderId);
      }
    } else {
      localStorage.removeItem("reminderTimerId");
      localStorage.removeItem("reminderScheduledFor");
    }
  }
});
