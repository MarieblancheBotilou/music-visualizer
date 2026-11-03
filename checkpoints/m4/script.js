// =====================================================
//  VIS-01 MUSIC VISUALIZER  -  CHECKPOINT M4 (palettes + color)
//  PROVIDED = already written for you.
//  TODO     = we write it together.
// =====================================================


// ---------- PROVIDED: grab elements from the page ----------
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d"); // ctx = our "paintbrush"
const audio = document.getElementById("audio");
const fileInput = document.getElementById("fileInput");
const trackLabel = document.getElementById("trackName");
const playBtn = document.getElementById("playBtn");
const seek = document.getElementById("seek");
const timeLabel = document.getElementById("time");

const sensitivitySlider = document.getElementById("sensitivity");
const barCountSlider = document.getElementById("barCount");
const smoothingSlider = document.getElementById("smoothing");
const paletteSelect = document.getElementById("palette");
const modeSelect = document.getElementById("mode");

const sensitivityLabel = document.getElementById("sensitivityValue");
const barCountLabel = document.getElementById("barCountValue");
const smoothingLabel = document.getElementById("smoothingValue");


// ---------- PROVIDED: app state ----------
// One object holds every setting. The controls change it, draw() reads it.
const settings = {
  sensitivity: 1,
  barCount: 64,
  smoothing: 0.8,
  palette: "signal",
  mode: "bars",
};


// ---------- PROVIDED: audio plumbing ----------
// Pipeline:  <audio> -> source -> analyser -> speakers
// The analyser "listens" to the audio and lets us read the frequencies.
let audioCtx;
let analyser;

function setupAudio() {
  if (audioCtx) return; // only build the pipeline once

  audioCtx = new AudioContext();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048; // gives us 1024 frequency values
  analyser.smoothingTimeConstant = settings.smoothing;

  const source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
}

// Browsers block audio until the user interacts, so we start it on "play".
audio.addEventListener("play", () => {
  setupAudio();
  audioCtx.resume();
});

// When the user picks a file, point the <audio> tag at it and play.
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  audio.src = URL.createObjectURL(file);
  trackLabel.textContent = file.name;
  audio.play();
});


// ---------- PROVIDED: transport helpers ----------
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function syncTransport() {
  playBtn.textContent = audio.paused ? "PLAY" : "PAUSE";
  document.body.classList.toggle("playing", !audio.paused);
}

audio.addEventListener("loadedmetadata", () => {
  seek.max = audio.duration;
  seek.disabled = false;
  playBtn.disabled = false;
  document.body.classList.add("loaded");
});
audio.addEventListener("play", syncTransport);
audio.addEventListener("pause", syncTransport);
audio.addEventListener("ended", syncTransport);


// ---------- PROVIDED: canvas sizing ----------
function resizeCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


// ---------- PROVIDED: palettes and UI accent color ----------
// Each palette is a hue range [start, end] on the color wheel (0-360).
const palettes = {
  signal: [0, 40],
  acid: [60, 130],
  ice: [170, 220],
  spectrum: [0, 300],
};

// Bar i of N gets a hue somewhere between the palette's start and end.
function getHue(i, count) {
  const [start, end] = palettes[settings.palette];
  return start + (end - start) * (i / count);
}

// The page accent follows the palette. "spectrum" cycles through every hue.
function updateAccent(time) {
  let hue;
  if (settings.palette === "spectrum") {
    hue = (time / 40) % 360;
  } else {
    const [start, end] = palettes[settings.palette];
    hue = (start + end) / 2;
  }
  document.documentElement.style.setProperty("--accent", `hsl(${hue}, 100%, 50%)`);
}


// ---------- PROVIDED: animation loop ----------
// Runs about 60 times per second. Each run redraws the whole canvas.
function animate(time) {
  requestAnimationFrame(animate);
  updateAccent(time);
  if (analyser) draw();
}


// =====================================================
//  MILESTONE 0 (DONE): make the player work
// =====================================================
playBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

audio.addEventListener("timeupdate", () => {
  seek.value = audio.currentTime;
  timeLabel.textContent = formatTime(audio.currentTime) + " / " + formatTime(audio.duration);
});

seek.addEventListener("input", () => {
  audio.currentTime = Number(seek.value);
});


// =====================================================
//  MILESTONES 1 & 2: the draw function (runs every frame)
// =====================================================
function draw() {
  // PROVIDED: layout math. Each bar samples one frequency bin.
  // We skip the top 35% of bins because music has almost nothing up there.
  const barCount = settings.barCount;
  const usableBins = Math.floor(analyser.frequencyBinCount * 0.65);
  const step = Math.floor(usableBins / barCount);
  const barWidth = canvas.width / barCount;

  // ---- MILESTONE 1 (DONE): read the audio data ----
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  // ---- MILESTONE 2 (DONE): draw the bars ----
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step];
    // Sensitivity scales the value; Math.min caps it so bars never leave the canvas
    const level = Math.min((value / 255) * settings.sensitivity, 1);
    const barHeight = level * canvas.height;
    ctx.fillStyle = `hsl(${getHue(i, barCount)}, 90%, 60%)`;
    ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
  }
}


// =====================================================
//  MILESTONE 3 (DONE): connect the sliders
// =====================================================
sensitivitySlider.addEventListener("input", () => {
  settings.sensitivity = Number(sensitivitySlider.value);
  sensitivityLabel.textContent = settings.sensitivity.toFixed(1);
});

barCountSlider.addEventListener("input", () => {
  settings.barCount = Number(barCountSlider.value);
  barCountLabel.textContent = settings.barCount;
});

smoothingSlider.addEventListener("input", () => {
  settings.smoothing = Number(smoothingSlider.value);
  smoothingLabel.textContent = settings.smoothing;
  if (analyser) analyser.smoothingTimeConstant = settings.smoothing;
});


// =====================================================
//  MILESTONE 4 (DONE): color palettes
// =====================================================
paletteSelect.addEventListener("change", () => {
  settings.palette = paletteSelect.value;
});


// ---------- PROVIDED: start the loop (keep this last) ----------
animate();
