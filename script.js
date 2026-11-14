const CONFIG = {
  shopName: "GreyMatter",
  tagline: "Game till break your back.",
  aboutText: "Contact No.: (505) 148-3369",
  footerText: "GreyMatter Gaming, SwargLok, (505) 148-3369",
  games: [
    "Red Dead Redemption 2",
    "Minecraft",
    "Grand Theft Auto: 5",
    "Marvel's Spider-Man 2",
    "God of War Ragnarök",
    "Resident Evil 4",
    "FIFA 23",
  ],

  openHour: 10, // 24 hour clock
  closeHour: 20,
  daysAhead: 7,

  musicFile: "tenpenny.m4a",
  musicTitle: "Tenpenny",
  musicVolume: 25, // 0 to 100

  // order matches the layout: 1 top, 2 right, 3 left, 4 bottom
  rigs: [
    { name: "Rig 1", c1: "#00a2ff", c2: "#ff9029" },
    { name: "Rig 2", c1: "#FF1744", c2: "#4c00ff" },
    { name: "Rig 3", c1: "#FFD600", c2: "#FF6D00" },
    { name: "Rig 4", c1: "#FF80AB", c2: "#D500F9" },
  ],

  // fake bookings: { rigIndex: { dayOffset: [startHours] } }, dayOffset 0 = today
  booked: {
    0: { 0: [11, 12], 1: [10] },
    1: { 0: [14], 2: [10, 11, 12] },
    2: { 1: [15, 16] },
    3: { 0: [18] },
  },
};

/* ---------------- helpers ---------------- */
const $ = (s) => document.querySelector(s);
const dayDate = (d) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t;
};
const dateKey = (d) => dayDate(d).toLocaleDateString("en-CA");

// saved bookings: { "rig|date": [hours] }
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem("bookings")) || {};
} catch (err) {
  saved = {};
}

const getBooked = (rig, day) => {
  const fake = (CONFIG.booked[rig] && CONFIG.booked[rig][day]) || [];
  return fake.concat(saved[rig + "|" + dateKey(day)] || []);
};
const st = { rig: 0, day: 0, sel: null }; // sel = [firstHour, lastHour]

/* ---------------- static content ---------------- */
document.title = CONFIG.shopName;
$("#shopGhost").textContent = CONFIG.shopName;
$("#tagline").textContent = CONFIG.tagline;
$("#footer").textContent = CONFIG.footerText;
$("#aboutText").textContent = CONFIG.aboutText;
$("#gameList").innerHTML = CONFIG.games.map((g) => `<li>${g}</li>`).join("");

/* typewriter */
let n = 0;
(function type() {
  $("#shopName").textContent = CONFIG.shopName.slice(0, ++n);
  if (n < CONFIG.shopName.length) setTimeout(type, 90);
})();

/* ---------------- rigs ---------------- */
$("#rigs").innerHTML = CONFIG.rigs
  .map(
    (r, i) => `
  <button class="rig" type="button" data-i="${i}" style="--c1:${r.c1};--c2:${r.c2}" aria-label="Book ${r.name}">
    <span class="rig-label">${r.name}</span>
    <span class="screen"></span>
    <span class="ctrl"><span class="stick"></span><span class="btns"><b></b><b></b><b></b></span></span>
  </button>`,
  )
  .join("");

$("#rigs").addEventListener("click", (e) => {
  const b = e.target.closest(".rig");
  if (b) openBooking(+b.dataset.i);
});

/* ---------------- booking popup ---------------- */
const bookModal = new bootstrap.Modal($("#bookDlg"));

function openBooking(i) {
  st.rig = i;
  st.day = 0;
  st.sel = null;
  resetForm();
  $("#bookTitle").textContent = CONFIG.rigs[i].name;
  $("#tabs").innerHTML = Array.from({ length: CONFIG.daysAhead }, (_, d) => {
    const dt = dayDate(d);
    const top =
      d === 0 ? "Today" : dt.toLocaleDateString("en-GB", { weekday: "short" });
    const sub = dt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    return `<button class="tab" role="tab" type="button" data-d="${d}">${top}<small>${sub}</small></button>`;
  }).join("");
  render();
  bookModal.show();
}

function render() {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.setAttribute("aria-selected", +t.dataset.d === st.day));
  const booked = getBooked(st.rig, st.day);
  const now = new Date();
  let html = "";
  for (let h = CONFIG.openHour; h < CONFIG.closeHour; h++) {
    const past = st.day === 0 && h <= now.getHours();
    const off = booked.includes(h) || past;
    const on = st.sel && h >= st.sel[0] && h <= st.sel[1];
    html += `<button class="slot" type="button" data-h="${h}" ${off ? "disabled" : ""} aria-pressed="${!!on}">${h}-${h + 1}</button>`;
  }
  $("#slots").innerHTML = html;
  $("#goBtn").disabled = !st.sel;
  const dateTxt = dayDate(st.day).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  $("#summary").textContent = st.sel
    ? `${dateTxt}, ${st.sel[0]}:00 to ${st.sel[1] + 1}:00 (${st.sel[1] - st.sel[0] + 1} h)`
    : "Select one or more consecutive slots.";
}

function pick(h) {
  const s = st.sel;
  if (!s) st.sel = [h, h];
  else {
    const [a, b] = s;
    if (h === a - 1) st.sel = [h, b];
    else if (h === b + 1) st.sel = [a, h];
    else if (a === b && h === a) st.sel = null;
    else if (h === a) st.sel = [a + 1, b];
    else if (h === b) st.sel = [a, b - 1];
    else st.sel = [h, h];
  }
}

$("#tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (t) {
    st.day = +t.dataset.d;
    st.sel = null;
    render();
  }
});
$("#slots").addEventListener("click", (e) => {
  const s = e.target.closest(".slot");
  if (s && !s.disabled) {
    pick(+s.dataset.h);
    render();
  }
});

/* ---------------- music player ---------------- */
const audio = new Audio(CONFIG.musicFile);
audio.loop = true;
audio.volume = CONFIG.musicVolume / 100;
$("#track").textContent = CONFIG.musicTitle;
$("#vol").value = CONFIG.musicVolume;

const setPlaying = (on) => {
  $("#disc").classList.toggle("playing", on);
  $("#playBtn").textContent = on ? "Pause" : "Play";
};
audio.addEventListener("play", () => setPlaying(true));
audio.addEventListener("pause", () => setPlaying(false));
audio.addEventListener("error", () => {
  $("#track").textContent = "Audio file not found. Check musicFile in CONFIG.";
});

// browsers block audio until the first click
let started = false;
["click", "keydown"].forEach((ev) =>
  document.addEventListener(ev, () => {
    if (!started) {
      started = true;
      audio.play().catch(() => {});
    }
  }),
);

$("#disc").addEventListener("click", () => $("#mp").classList.toggle("open"));
$("#playBtn").addEventListener("click", () =>
  audio.paused ? audio.play() : audio.pause(),
);
$("#vol").addEventListener(
  "input",
  (e) => (audio.volume = e.target.value / 100),
);

/* ---------------- booking form ---------------- */
const rules = {
  fName: (v) => (v.length < 2 ? "Enter your name" : ""),
  fPhone: (v) => {
    const digits = v.replace(/\D/g, "");
    const okChars = /^[+\d\s()-]+$/.test(v);
    return okChars && digits.length >= 8 && digits.length <= 13
      ? ""
      : "Enter a valid phone number";
  },
  fEmail: (v) => (/^\S+@\S+\.\S+$/.test(v) ? "" : "Enter a valid email"),
};

function check(id) {
  const input = $("#" + id);
  const msg = rules[id](input.value.trim());
  input.classList.toggle("is-invalid", msg !== "");
  input.nextElementSibling.textContent = msg;
  return msg === "";
}

function resetForm() {
  $("#bookForm").reset();
  document.querySelectorAll("#bookForm input").forEach((input) => {
    input.classList.remove("is-invalid");
    input.nextElementSibling.textContent = "";
  });
}

Object.keys(rules).forEach((id) => {
  $("#" + id).addEventListener("input", () => {
    if ($("#" + id).classList.contains("is-invalid")) check(id);
  });
});

$("#bookForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const results = Object.keys(rules).map(check);
  if (results.includes(false) || !st.sel) return;

  const key = st.rig + "|" + dateKey(st.day);
  saved[key] = saved[key] || [];
  for (let h = st.sel[0]; h <= st.sel[1]; h++) saved[key].push(h);
  localStorage.setItem("bookings", JSON.stringify(saved));

  const when = $("#summary").textContent;
  st.sel = null;
  render();
  resetForm();
  bookModal.hide();
  $("#toastText").textContent = `Booked ${CONFIG.rigs[st.rig].name}: ${when}`;
  bootstrap.Toast.getOrCreateInstance($("#bookToast")).show();
});

/* ---------------- next available slot ---------------- */
function findNext() {
  const now = new Date();
  let found = null;
  search: for (let d = 0; d < CONFIG.daysAhead; d++) {
    for (let h = CONFIG.openHour; h < CONFIG.closeHour; h++) {
      if (d === 0 && h <= now.getHours()) continue;
      for (let r = 0; r < CONFIG.rigs.length; r++) {
        if (!getBooked(r, d).includes(h)) {
          found = { r, d, h };
          break search;
        }
      }
    }
  }
  return found;
}

$("#nextBtn").addEventListener("click", () => {
  const next = findNext();
  if (!next) {
    $("#nextMsg").textContent = "Nothing free this week.";
    return;
  }
  $("#nextMsg").textContent = "";
  openBooking(next.r);
  st.day = next.d;
  st.sel = [next.h, next.h];
  render();
});

/* ---------------- open / closed badge ---------------- */
const fmt = (s) =>
  `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;

function updateBadge() {
  const now = new Date();
  const secs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const open = CONFIG.openHour * 3600;
  const close = CONFIG.closeHour * 3600;
  const isOpen = secs >= open && secs < close;
  const wait = secs < open ? open - secs : 86400 - secs + open;
  $("#badge").dataset.open = isOpen;
  $("#badge").textContent = isOpen
    ? `Open now, closes in ${fmt(close - secs)}`
    : `Closed, opens in ${fmt(wait)}`;
}
updateBadge();
setInterval(updateBadge, 1000);
