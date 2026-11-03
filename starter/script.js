// =====================================================
//  VIS-01 MUSIC VISUALIZER  -  STARTER
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
    trackLabel.textContent = "PinkPantheress — Last Valentines";
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
//  MILESTONE 0 (TODO): make the player work
// =====================================================
// The buttons exist but do nothing yet. Wire them to the <audio> element.
//
// 1. playBtn "click":
//      if audio.paused -> audio.play(), otherwise -> audio.pause()
//
// 2. audio "timeupdate" (fires many times a second while playing):
//      seek.value = audio.currentTime
//      timeLabel.textContent = formatTime(audio.currentTime) + " / " + formatTime(audio.duration)
//
// 3. seek "input" (user drags the slider):
//      audio.currentTime = Number(seek.value)

playBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

audio.addEventListener("timeupdate", () => {
  seek.value = audio.currentTime;
  timeLabel.textContent =
    formatTime(audio.currentTime) + " / " + formatTime(audio.duration);
});

seek.addEventListener("input", () => {
  audio.currentTime = Number(seek.value);
}); 



// =====================================================
//  MILESTONES 1 & 2: the draw function (runs every frame)
// =====================================================
function draw() {
  const time = performance.now() / 1000;
  const barCount = settings.barCount;
  const usableBins = Math.floor(analyser.frequencyBinCount * 0.65);
  const step = Math.floor(usableBins / barCount);
  const barWidth = canvas.width / barCount;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Album-inspired colors, blended into a slowly moving ombre
  const colors = [
    [18, 35, 79],    // Midnight blue
    [83, 157, 184],  // Icy cyan
    [78, 47, 80],    // Muted plum
    [113, 29, 42],   // Burgundy
    [18, 35, 79]     // Return to blue
  ];

  function ombre(position) {
    const offset = ((position + time * 0.035) % 1 + 1) % 1;
    const scaled = offset * (colors.length - 1);
    const index = Math.floor(scaled);
    const blend = scaled - index;

    const rgb = colors[index].map((channel, j) =>
      Math.round(
        channel + (colors[index + 1][j] - channel) * blend
      )
    );

    return `rgb(${rgb.join(",")})`;
  }

  for (let i = 0; i < barCount; i++) {
    const value = Math.min(
      dataArray[i * step] * settings.sensitivity,
      255
    );

    // Leave space above the buildings for lightning
    const barHeight = (value / 255) * canvas.height * 0.8;
    if (barHeight < 1) continue;

    const x = i * barWidth + 2;
    const y = canvas.height - barHeight;
    const width = Math.max(1, barWidth - 4);
    const position = i / barCount;

    // Ombre fills the whole building
    const gradient = ctx.createLinearGradient(
      x, y, x + width, canvas.height
    );

    gradient.addColorStop(0, ombre(position));
    gradient.addColorStop(0.5, ombre(position + 0.2));
    gradient.addColorStop(1, "#05070d");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, barHeight);

    // Softly illuminated rooftop and edges
    ctx.strokeStyle = ombre(position + 0.1);
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, barHeight);

    // Warm windows, like the house in the cover
    const columns = Math.floor(width / 7);
    const rows = Math.floor(barHeight / 12);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        if ((i * 7 + row * 3 + col * 11) % 5 < 2) continue;

        ctx.fillStyle =
          (i + row + col) % 3 === 0
            ? "rgba(190, 65, 48, 0.8)"
            : "rgba(225, 182, 127, 0.65)";

        ctx.fillRect(
          x + 2 + col * 7,
          canvas.height - 8 - row * 12,
          2,
          4
        );
      }
    }

    // Pale blue lightning on stronger frequencies
    if (value > 145) {
      const center = x + width / 2;
      const height = 14 + (value / 255) * 28;
      const bend = Math.min(width * 0.3, 6);
      const sway = Math.sin(time * 7 + i) * bend;

      ctx.save();
      ctx.strokeStyle = "#d7eafa";
      ctx.shadowColor = "#73b9e0";
      ctx.shadowBlur = 12;
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(center, y);
      ctx.lineTo(center - bend, y - height * 0.35);
      ctx.lineTo(center + bend, y - height * 0.6);
      ctx.lineTo(center + sway, y - height);
      ctx.stroke();

      ctx.restore();
    }
  }
}

// =====================================================
//  MILESTONE 3 (TODO): connect the sliders
// =====================================================
// When a slider moves, update `settings` and its on-screen label.
// Event to listen for: "input".  Remember: slider.value is a STRING -> Number(...)
//
//   sensitivitySlider -> settings.sensitivity, sensitivityLabel.textContent
//   barCountSlider    -> settings.barCount,    barCountLabel.textContent
//   smoothingSlider   -> settings.smoothing,   smoothingLabel.textContent
//                        AND analyser.smoothingTimeConstant (if analyser exists)
//
// Then in draw(): multiply the value by settings.sensitivity (cap it with Math.min).

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

  if (analyser) {
    analyser.smoothingTimeConstant = settings.smoothing;
  }
}); 

// =====================================================
//  MILESTONE 4 (TODO): color palettes
// =====================================================
// 1. paletteSelect "change": set settings.palette = paletteSelect.value
// 2. In draw(): replace the fixed color with a color from the palette:
//      ctx.fillStyle = `hsl(${getHue(i, barCount)}, 90%, 60%)`
//    (getHue is provided. It returns a hue from 0 to 360.)

paletteSelect.addEventListener("change", () => {
  settings.palette = paletteSelect.value;
}); 

// ---------- PROVIDED: start the loop (keep this last) ----------
if (audio.readyState >= 1) {
  seek.max = audio.duration;
  seek.disabled = false;
  playBtn.disabled = false;
  document.body.classList.add("loaded");
  trackLabel.textContent = "PinkPantheress — Last Valentines";
}
animate();
