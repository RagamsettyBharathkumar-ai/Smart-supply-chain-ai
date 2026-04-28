/* =========================
   MAP INITIALIZATION
========================= */

var map = L.map('map').setView([17.3850, 78.4867], 10);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);


/* =========================
   TRUCKS + ROUTES
========================= */

const trucks = [
  {
    id: "T1",
    route: [[17.3850,78.4867],[17.45,78.50],[17.50,78.55]],
    color: "blue"
  },
  {
    id: "T2",
    route: [[17.3850,78.4867],[17.30,78.40],[17.25,78.35]],
    color: "green"
  }
];

let markers = [];

trucks.forEach(truck => {
  L.polyline(truck.route, { color: truck.color }).addTo(map);

  let marker = L.marker(truck.route[0]).addTo(map)
    .bindPopup("🚚 Truck " + truck.id);

  marker.route = truck.route;
  marker.routeIndex = 0;

  markers.push(marker);
});


/* =========================
   MOVE TRUCKS
========================= */

setInterval(() => {
  markers.forEach(marker => {
    marker.routeIndex++;

    if (marker.routeIndex >= marker.route.length) {
      marker.routeIndex = 0;
    }

    marker.setLatLng(marker.route[marker.routeIndex]);
  });
}, 4000);


/* =========================
   BACKEND CONFIG
========================= */

const API_URL = "https://smart-supply-chain-ai.onrender.com";


/* =========================
   LOAD ALERTS (LIMITED VIEW)
========================= */

async function loadAlerts() {
  try {
    const res = await fetch(`${API_URL}/alerts`);
    let data = await res.json();

    const panel = document.querySelector(".right-panel");
    panel.innerHTML = "";

    // 🔥 SHOW ONLY LATEST 2 ALERTS
    data = data.slice(-2).reverse();

    data.forEach(alert => {
      let id = alert[0];
      let type = alert[1];
      let message = alert[2];
      let time = alert[3];

      let div = document.createElement("div");
      div.classList.add("alert-box");

      if (type === "delay") {
        div.classList.add("red-bg");
      } else {
        div.classList.add("yellow-bg");
      }

      div.innerHTML = `
        ${message}
        <br>
        <small>${time}</small>
        <br>
      `;

      let button = document.createElement("button");
      button.type = "button"; // 🔥 IMPORTANT: prevents reload
      button.innerText = (type === "delay") ? "Reroute" : "Optimize";

      button.addEventListener("click", (e) => {
      e.preventDefault();   // 🔥 extra safety
       resolveAlert(id, type);
      });
      div.appendChild(button);
      panel.appendChild(div);
    });

  } catch (error) {
    console.error("Error loading alerts:", error);
  }
}

// Refresh alerts every 10 sec
setInterval(loadAlerts, 10000);
loadAlerts();


/* =========================
   SEND ALERT
========================= */

async function sendAlert(type, message) {
  try {
    await fetch(`${API_URL}/add_alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ type, message })
    });

  } catch (error) {
    console.error("Error sending alert:", error);
  }
}


/* =========================
   RESOLVE ALERT
========================= */

async function resolveAlert(id, type) {
  try {
    await fetch(`${API_URL}/resolve_alert/${id}`, {
      method: "POST"
    });

    // 🔥 remove alert instantly from UI
    loadAlerts();

    if (type === "delay") {
      updateDelayedCount(-1);
    } else {
      updateRiskCount(-1);
    }

  } catch (error) {
    console.error("Error resolving alert:", error);
  }
}


/* =========================
   AI SIMULATION (CONTROLLED)
========================= */

function simulateAI() {
  let types = ["delay", "weather"];
  let type = types[Math.floor(Math.random() * types.length)];

  if (type === "delay") {
    sendAlert("delay", "🚨 Delay predicted (Truck T1)");
    updateDelayedCount(1);
  } else {
    sendAlert("weather", "⚠️ Weather risk detected (Truck T2)");
    updateRiskCount(1);
  }
}

// Slower = cleaner UI
setInterval(simulateAI, 20000);


/* =========================
   COUNTERS
========================= */

function updateDelayedCount(change) {
  let el = document.getElementById("delayed");
  el.innerText = Math.max(0, parseInt(el.innerText) + change);
}

function updateRiskCount(change) {
  let el = document.getElementById("risk");
  el.innerText = Math.max(0, parseInt(el.innerText) + change);
}


/* =========================
   SYSTEM STATUS
========================= */

setInterval(() => {
  let d = parseInt(document.getElementById("delayed").innerText);
  let r = parseInt(document.getElementById("risk").innerText);
  let s = document.getElementById("status");

  if (d > 15 || r > 20) {
    s.innerText = "🔴 High Risk Detected";
  } 
  else if (d > 5 || r > 10) {
    s.innerText = "🟡 Moderate Risk";
  } 
  else {
    s.innerText = "🟢 System Normal";
  }

}, 3000);


/* =========================
   PAGE SWITCH (NAVBAR)
========================= */

function showPage(page) {
  document.getElementById("home-page").style.display =
    (page === "home") ? "block" : "none";

  document.getElementById("resolved-page").style.display =
    (page === "resolved") ? "block" : "none";

  if (page === "resolved") {
    loadResolved();
  }
}


/* =========================
   LOAD RESOLVED ALERTS
========================= */

async function loadResolved() {
  try {
    const res = await fetch(`${API_URL}/resolved`);
    const data = await res.json();

    const table = document.getElementById("resolvedTable");
    table.innerHTML = "";

    data.forEach(row => {
      let tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${row[1]}</td>
        <td>${row[2]}</td>
        <td>${row[3]}</td>
        <td>${row[4]}</td>
      `;

      table.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
  }
}

async function clearResolved() {
  if (!confirm("Are you sure you want to delete all resolved alerts?")) {
    return;
  }

  try {
    const res = await fetch(`${API_URL}/clear_resolved`, {
      method: "POST"
    });

    const data = await res.json();
    console.log("Clear response:", data);

    // 🔥 FORCE UI RESET
    document.getElementById("resolvedTable").innerHTML = "";

    // optional reload from backend
    loadResolved();

  } catch (err) {
    console.error("Error clearing resolved alerts:", err);
  }
}
/* =========================
   LOGIN SYSTEM
========================= */

function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  const error = document.getElementById("login-error");

  if (pass === "shipment123" && user.trim() !== "") {
    // save session
    localStorage.setItem("loggedIn", "true");

    // show app
    document.getElementById("login-page").style.display = "none";
    document.getElementById("home-page").style.display = "block";

  } else {
    error.innerText = "❌ Invalid credentials";
  }
}
window.onload = function () {
  if (localStorage.getItem("loggedIn") === "true") {
    document.getElementById("login-page").style.display = "none";
    document.getElementById("home-page").style.display = "block";
  }
};
function logout() {
  localStorage.removeItem("loggedIn");

  document.getElementById("home-page").style.display = "none";
  document.getElementById("resolved-page").style.display = "none";
  document.getElementById("login-page").style.display = "flex";
}
