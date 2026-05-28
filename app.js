let staffType = "permanent";
let employees = [];
let hasCheckedIn = false;
let loader = document.getElementById("loader");
let cam = document.getElementById("cam");
let timer = document.getElementById("timer");
let name = document.getElementById("name");
let selectedEmployee = null;
let currentMode = "in"; // or "out"
let employeeDescriptor = null;
let descriptorMap = {};

const actionBtn = document.getElementById("actionBtn");

actionBtn.onclick = () => {
  sendAttendance(currentMode);
};

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
  preloadDescriptors();
});

  // LOAD TOPPER
fetch("https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=topper&key=Z1TECH123")
.then(res=>res.json())
.then(data=>{

 let topper = data || {};

  if(!topper || !topper.name) return;

  document.getElementById("topperCard").classList.remove("hidden");

  document.getElementById("topperWrap").innerHTML = `

  <div class="crown">👑</div>

  <img src="${topper.photo}"
  style="
  width:90px;
  height:90px;
  border-radius:50%;
  object-fit:cover;
  border:4px solid gold;
  box-shadow:0 0 25px rgba(255,215,0,.7);
  ">

  <h2 style="
  margin:12px 0 5px;
  color:#FFD700;
  ">
  Employee Of The Month
  </h2>

  <div style="
  font-size:22px;
  font-weight:700;
  ">
  ${topper.name}
  </div>

  <div style="
  margin-top:6px;
  opacity:.8;
  ">
  🗓️ Present ${topper.days} Days This Month
  </div>

  <div class="quote">
  “Consistency beats talent.”
  </div>

  `;
});


// STEP CONTROL
function show(id){

  // hide only steps
  ["step2","step3","step4"].forEach(step=>{
    document.getElementById(step).classList.add("hidden");
  });

  document.getElementById(id).classList.remove("hidden");
}

// TYPEWRITER
let txt="Welcome to Z1Tech";
let i=0;
function type(){

  if(i<txt.length){

    welcome.innerHTML += txt.charAt(i);

    i++;

    setTimeout(type,60);

  }else{

    // CHECK SAVED SESSION
    let saved =
    localStorage.getItem("attendanceUser");

    // AGAR LOGIN ACTIVE HAI
    if(saved){

      restoreAttendanceState();

    }else{

      setTimeout(()=>{

        show("step2");

      },500);
    }
  }
}
type();

// SEARCH
function filterNames(){

  let input = document.getElementById("name");
  let val = (input.value || "").toLowerCase();
  let box = document.getElementById("suggestions");

  box.innerHTML = "";

  if(!val) return;

  employees
  .filter(e => e.name && e.name.toLowerCase().includes(val))
  .forEach(e => {

    let div = document.createElement("div");

    div.className = "s-item";

    div.innerHTML = `
      <div style="
        display:flex;
        align-items:center;
        gap:12px;
      ">

        <img src="${e.photo}"
          style="
            width:42px;
            height:42px;
            border-radius:50%;
            object-fit:cover;
            border:2px solid #22c55e;
          ">

        <div>
          <div style="font-weight:600">${e.name}</div>
          <div style="font-size:12px;opacity:.7">
            ${e.dept || ""}
          </div>
        </div>

      </div>
    `;

    div.onclick = async () => {

      name.value = e.name;
      name.readOnly = true;
      name.disabled = true;

      selectedEmployee = e;

// CHECK ACTIVE ATTENDANCE
let existing =
await checkExistingAttendance(
  e.name,
  e.mobile || ""
);

if(existing.active){

  hasCheckedIn = true;

  selectedEmployee = {
    name:existing.name,
    dept:existing.dept,
    mobile:user.mobile || ""
  };

  // DIRECT LOGOUT MODE
  setMode("out");

  show("step4");

  // TIMER RESTORE
  let start =
  new Date(existing.inTime);

  if(interval) clearInterval(interval);

  interval = setInterval(()=>{

    let diff =
    Math.floor((new Date()-start)/1000);

    let h =
    Math.floor(diff/3600);

    let m =
    Math.floor((diff%3600)/60);

    let s =
    diff%60;

    timer.innerHTML =
    `⏱ ${h}h ${m}m ${s}s`;

  },1000);

  showToast(
    "Active attendance found ✅"
  );

  return;
}

      employeeDescriptor =
      descriptorMap[e.name];

      if(!employeeDescriptor){

       showToast("Face loading ⏳");

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
function capture(){

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

  ctx.translate(size,0);
  ctx.scale(-1,1);

  ctx.drawImage(
    video,
    sx,
    sy,
    cropSize,
    cropSize,
    0,
    0,
    size,
    size
  );

  return canvas.toDataURL("image/jpeg",0.55);
}

// CAMERA
async function startCamera(){

  if(cam.srcObject){
    cam.srcObject.getTracks().forEach(t=>t.stop());
  }

  try{

    let stream = await navigator.mediaDevices.getUserMedia({
      video:{
        facingMode:"user",
        width:{ideal:1280},
        height:{ideal:1280}
      }
    });

    cam.srcObject = stream;

    await cam.play();

    console.log("✅ Camera Ready");

  }catch(e){

    console.log(e);

    showToast("Camera permission denied ❌");
  }
}

// LOADER
function showLoader(){
  loader.style.display = "flex";
}

function hideLoader(){
  loader.style.display = "none";
}

// TIMER
let startTime,interval;
function startTimer(){

  if(interval) clearInterval(interval);

  startTime = new Date();

  interval = setInterval(()=>{

    let diff = Math.floor((new Date()-startTime)/1000);

    let m = Math.floor(diff/60);

    let s = diff%60;

    timer.innerText = "⏱ "+m+"m "+s+"s";

  },1000);
}
// LOGIN / LOGOUT
async function sendAttendance(type){

  showLoader();

  if(!cam.srcObject){
    hideLoader();
    showToast("Camera not started ❌");
    return;
  }

  if(!selectedEmployee){
    hideLoader();
    showToast("Please select your name first ❌");
    return;
  }

  // photo capture
  let photo = capture();

  // face match
 if(staffType === "permanent"){

  let match =
  await faceMatch(selectedEmployee.photo);

  if(!match){

    hideLoader();

    showToast("Face Not Matched ❌");

    return;
  }
}

  // check states
  if(type === "in" && hasCheckedIn){
    hideLoader();
    showToast("Already checked in ❌");
    return;
  }

  if(type === "out" && !hasCheckedIn){
    hideLoader();
    showToast("You have not checked in ❌");
    return;
  }

  navigator.geolocation.getCurrentPosition(

    async (pos) => {

      let dist = getDistance(
        pos.coords.latitude,
        pos.coords.longitude,
        OFFICE_LAT,
        OFFICE_LNG
      );

      if(dist > MAX_RADIUS){
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
        mobile:
        selectedEmployee.mobile || ""
      };

      try{

        let res = await fetch(
          "https://script.google.com/a/macros/z1tech.com/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec",
          {
            method:"POST",
            headers:{
                    "Content-Type":"text/plain;charset=utf-8"
                     },
                     body: JSON.stringify(data)
          }
        );

        let txt = await res.text();

        console.log(txt);

        if(txt === "ALREADY_IN"){

  hideLoader();

  showToast("Already Checked In ❌");

  return;
}

if(txt === "ALREADY_COMPLETED"){

  hideLoader();

  showToast("Attendance Completed ✅");

  return;
}

if(txt === "NO_IN_FOUND"){

  hideLoader();

  showToast("No Check-In Found ❌");

  return;
}

if(txt === "ALREADY_OUT"){

  hideLoader();

  showToast("Already Checked Out ❌");

  return;
}

        if(!res.ok){
          hideLoader();
          showToast("Server error ❌");
          return;
        }

      }catch(e){

        console.log(e);

        hideLoader();
        showToast("Network error ❌");
        return;
      }

      hideLoader();

      // stop camera AFTER request complete
      setTimeout(()=>{

        if(cam.srcObject){
          cam.srcObject.getTracks().forEach(t=>t.stop());
        }

      },500);

      showToast(type.toUpperCase() + " SUCCESSFULLY ✅");

  // OUT
      
  if(type === "out"){

  hasCheckedIn = false;

  // CLEAR STATE
  localStorage.removeItem("attendanceUser");

  clearInterval(interval);

  show("step2");

  name.value = "";

  name.disabled = false;

  name.readOnly = false;

document.getElementById("tempName").value = "";
document.getElementById("tempDept").value = "";
}

  // IN
  if(type === "in"){

  hasCheckedIn = true;

  // SAVE STATE
  localStorage.setItem(
    "attendanceUser",
    JSON.stringify({
      name:selectedEmployee.name,
      dept:selectedEmployee.dept,
      mobile:selectedEmployee.mobile || "",
      checkInTime:new Date().toISOString()
    })
  );

  show("step4");

  startTimer();
}
    },

    (err) => {

      console.log(err);

      hideLoader();

      showToast("Location permission required ❌");
    }

  );
}

async function faceMatch(employeePhoto){

   if(!modelsLoaded){
    showToast("Models is loading... ⏳");
    return false;
  }

  const video = document.getElementById("cam");

  const detection = await faceapi.detectSingleFace(
    video,
    new faceapi.TinyFaceDetectorOptions()
  ).withFaceLandmarks().withFaceDescriptor();

  if(!employeePhoto){
  showToast("No stored photo ❌");
  return false;
}

  if(!detection){
    showToast("No face detected ❌");
    return false;
  }

  if(!employeeDescriptor){
  showToast("Face profile not loaded ❌");
  return false;
}

const distance = faceapi.euclideanDistance(
  detection.descriptor,
  employeeDescriptor
);

  console.log("Face distance:", distance);

  return distance < 0.5;
}

async function loadModels(){

  const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
console.log("✅ Models Loaded");
}

let modelsLoaded = false;
window.onload = async () => {

  showLoader();

  await loadModels();

  modelsLoaded = true;

  hideLoader();

  // RESTORE LOGIN
  restoreAttendanceState();
};

const OFFICE_LAT = 28.499194530261953;  
const OFFICE_LNG = 77.08088784902715;   
const MAX_RADIUS = 150;       

function getDistance(lat1, lon1, lat2, lon2){

  const R = 6371e3;

  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;

  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

function confirmLogout(){

  if(confirm("Are you sure you want to logout?")){

    setMode("out");

    show("step3");

    startCamera();
  }
}

async function autoDetectAndSend(){

  let match = await faceMatch(selectedEmployee.photo);

  if(match){
    sendAttendance(currentMode);
  } else {

    showToast("Face not detected. Try manually 👇");

    actionBtn.disabled = false;
    actionBtn.style.opacity = "1";
  }
}

  function showToast(msg, color="green"){

  let t = document.getElementById("toast");
  t.innerText = msg;
  t.style.background = color;
  t.classList.add("show");

  setTimeout(()=>{
    t.classList.remove("show");
  },3000);
}

  function setMode(mode){

  currentMode = mode;

  if(mode === "in"){
    actionBtn.innerText = "📸 IN";
    actionBtn.className = "login";
  }

  if(mode === "out"){
    actionBtn.innerText = "🔴 OUT";
    actionBtn.className = "logout";
  }
}

  function setStaffType(type){

  staffType = type;

  if(type === "permanent"){

    permanentBtn.style.background =
    "linear-gradient(135deg,#22c55e,#4ade80)";

    temporaryBtn.style.background =
    "#334155";

    document
    .getElementById("permanentFields")
    .classList.remove("hidden");

    document
    .getElementById("temporaryFields")
    .classList.add("hidden");
  }

  if(type === "temporary"){

    temporaryBtn.style.background =
    "linear-gradient(135deg,#22c55e,#4ade80)";

    permanentBtn.style.background =
    "#334155";

    document
    .getElementById("temporaryFields")
    .classList.remove("hidden");

    document
    .getElementById("permanentFields")
    .classList.add("hidden");
  }
}

  function continueTemporary(){

  let tName =
  document.getElementById("tempName").value;

  let tDept =
  document.getElementById("tempDept").value;

  let tMobile =
  document.getElementById("tempMobile").value;

  if(!tName || !tDept || !tMobile){

    showToast("Fill all fields ❌");

    return;
  }

  selectedEmployee = {

    name: tName,
    dept: tDept,
    mobile:tMobile,
    photo: ""
  };

  setMode("in");

  show("step3");

  startCamera();
}

  async function preloadDescriptors(){

  for(const e of employees){

    try{

      const img =
      await faceapi.fetchImage(e.photo);

      const detection =
      await faceapi
      .detectSingleFace(
        img,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

      if(detection){

        descriptorMap[e.name] =
        detection.descriptor;
      }

    }catch(err){

      console.log(
        "Descriptor preload failed:",
        e.name
      );
    }
  }

  console.log("✅ Descriptors Ready");
}

function restoreAttendanceState(){

  let saved =
  localStorage.getItem("attendanceUser");

  if(!saved) return;

  let user = JSON.parse(saved);

  hasCheckedIn = true;

  selectedEmployee = {
    name:user.name,
    dept:user.dept,
    mobile:user.mobile || ""
  };

  // TIMER RESUME
  let start =
  new Date(user.checkInTime);

  if(interval) clearInterval(interval);

  interval = setInterval(()=>{

    let diff =
    Math.floor((new Date()-start)/1000);

    let h =
    Math.floor(diff/3600);

    let m =
    Math.floor((diff%3600)/60);

    let s =
    diff%60;

    timer.innerHTML =
    `⏱ ${h}h ${m}m ${s}s`;

  },1000);

  setMode("out");

  // DIRECT LOGOUT SCREEN
  show("step4");

  showToast(
    "Welcome Back " + user.name + " 👋"
  );
}


async function checkExistingAttendance(name){

  try{

    let res = await fetch(

      "https://script.google.com/macros/s/AKfycbyrfqxx5f20yUAQWWEf8ittksQQmEeFqt9dttcQ7fDZqxB1mvrmpEEsJZCDxsudTAcGwg/exec?type=checkAttendance&name="
      + encodeURIComponent(name)
      + "&mobile="
      + encodeURIComponent(
        selectedEmployee?.mobile || ""
       )
      + "&key=Z1TECH123"

    );

    return await res.json();

  }catch(e){

    console.log(e);

    return {
      active:false
    };
  }
}


