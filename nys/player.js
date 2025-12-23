// ---- CONFIG ----
// Time (in seconds) into the track when the beat drop happens.
const DROP_AT_SEC = 210.0;

// How early to attempt starting playback before midnight.
const START_EARLY_MS = 1200;

// ---- HELPERS ----
const $ = (id) => document.getElementById(id);

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtHMS(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${hh}:${pad2(mm)}:${pad2(ss)}`;
  return `${mm}:${pad2(ss)}`;
}

function fmtMSS(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${pad2(s)}`;
}

function nextLocalMidnight(now = new Date()) {
  const mid = new Date(now);
  mid.setHours(24, 0, 0, 0);
  return mid;
}

// ---- ELEMENTS ----
const audio = $("audio");
const playPauseBtn = $("playPauseBtn");
const playIcon = $("playIcon");
const pauseIcon = $("pauseIcon");
const seek = $("seek");
const vol = $("vol");
const curEl = $("cur");
const durEl = $("dur");
const syncToggle = $("syncToggle");
const countdownInfo = $("countdown-info");
const countdownEl = $("countdown");
const muteBtn = $("muteBtn");
const volIcon = $("volIcon");
const volMutedIcon = $("volMutedIcon");

// ---- STATE ----
let unlocked = false;
let savedVolume = 0.85;
let scheduled = false;
let syncEnabled = syncToggle.checked;

// ---- UI UPDATES ----
function updatePlayPauseIcon() {
  if (audio.paused) {
    playIcon.style.display = "";
    pauseIcon.style.display = "none";
  } else {
    playIcon.style.display = "none";
    pauseIcon.style.display = "";
  }
}

function updateCountdownUI() {
  if (!syncEnabled) {
    countdownInfo.classList.add("hidden");
    return;
  }
  countdownInfo.classList.remove("hidden");

  const now = new Date();
  const mid = nextLocalMidnight(now);
  const msLeft = mid.getTime() - now.getTime();
  countdownEl.textContent = fmtHMS(msLeft);

  // Schedule playback if sync is enabled and not yet scheduled
  if (syncEnabled && unlocked && !scheduled) {
    scheduleForThisMidnight(mid.getTime());
  }
}

function scheduleForThisMidnight(midnightMs) {
  // Start playback so the drop (at DROP_AT_SEC) hits exactly at midnight
  const startAtMs = midnightMs - DROP_AT_SEC * 1000 - START_EARLY_MS;
  const nowMs = Date.now();

  // If already past the computed start time, skip scheduling
  if (startAtMs <= nowMs) {
    scheduled = true;
    return;
  }

  scheduled = true;

  const delay = startAtMs - nowMs;
  setTimeout(async () => {
    if (!syncEnabled) return; // User might have disabled sync

    try {
      await audio.play();
      const earlySec = START_EARLY_MS / 1000;
      audio.currentTime = Math.max(0, earlySec);
      updatePlayPauseIcon();
    } catch (e) {
      console.warn("Auto play failed:", e);
    }
  }, delay);
}

// ---- AUDIO EVENTS ----
audio.addEventListener("loadedmetadata", () => {
  durEl.textContent = fmtMSS(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  curEl.textContent = fmtMSS(audio.currentTime);
  if (isFinite(audio.duration) && audio.duration > 0) {
    seek.value = String(Math.floor((audio.currentTime / audio.duration) * 1000));
  }
});

audio.addEventListener("play", updatePlayPauseIcon);
audio.addEventListener("pause", updatePlayPauseIcon);
audio.addEventListener("ended", updatePlayPauseIcon);

// ---- CONTROLS ----
seek.addEventListener("input", () => {
  if (!isFinite(audio.duration) || audio.duration <= 0) return;
  const frac = Number(seek.value) / 1000;
  audio.currentTime = frac * audio.duration;
});

vol.addEventListener("input", () => {
  audio.volume = Number(vol.value);
  savedVolume = audio.volume;
  updateMuteIcon();
});

function updateMuteIcon() {
  if (audio.muted || audio.volume === 0) {
    volIcon.style.display = "none";
    volMutedIcon.style.display = "";
  } else {
    volIcon.style.display = "";
    volMutedIcon.style.display = "none";
  }
}

muteBtn.addEventListener("click", () => {
  if (audio.muted || audio.volume === 0) {
    audio.muted = false;
    audio.volume = savedVolume > 0 ? savedVolume : 0.85;
    vol.value = audio.volume;
  } else {
    savedVolume = audio.volume;
    audio.muted = true;
  }
  updateMuteIcon();
});

playPauseBtn.addEventListener("click", async () => {
  // First click unlocks audio
  if (!unlocked) {
    audio.volume = Number(vol.value);
    unlocked = true;
  }

  if (audio.paused) {
    try {
      await audio.play();
    } catch (e) {
      console.warn("Play failed:", e);
    }
  } else {
    audio.pause();
  }
});

// ---- SYNC TOGGLE ----
syncToggle.addEventListener("change", () => {
  syncEnabled = syncToggle.checked;
  scheduled = false; // Allow re-scheduling if re-enabled
  updateCountdownUI();
});

// ---- MAIN LOOP ----
function tick() {
  updateCountdownUI();
  requestAnimationFrame(tick);
}
tick();

// Re-sync if tab becomes visible again (e.g., after laptop sleep)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    scheduled = false;
  }
});
