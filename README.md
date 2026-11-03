# Music Visualizer

Build a real-time music visualizer from scratch with plain HTML, CSS, and JavaScript. No installs, no libraries, no build tools.

You upload a song, and a canvas draws animated frequency bars that react to it. You'll write about 40 lines of the core logic yourself.

## Quick start

1. Download or clone this repo.
2. Open the `starter/` folder in VS Code.
3. Open `index.html` in a browser. Either double-click it, or right-click it and choose **Open with Live Server**.
4. Click **LOAD FILE**, pick an mp3 or wav, and follow the `TODO` comments in `starter/script.js`.

Chrome, Edge, and Firefox work well. Safari should work too but is less tested.

## What's in the repo

| Folder | What it is |
| --- | --- |
| `starter/` | **Start here.** The UI and audio setup are done. The core logic is left as `TODO`s. |
| `checkpoints/m0` to `m4` | The working code after each milestone. Use these if you get stuck or fall behind. |
| `solution/` | The finished visualizer. |

Only `script.js` differs between folders. The HTML and CSS are the same in every one.

## The milestones

| # | You build | Concepts |
| --- | --- | --- |
| M0 | Play/pause, time display, seek bar | Events, `addEventListener` |
| M1 | Read the audio data every frame | Typed arrays, the Web Audio API |
| M2 | Draw bars from that data | Loops, math, Canvas |
| M3 | Wire up the sliders | Settings object, live updates |
| M4 | Color palettes | Dropdown events |

After M4, the code is yours. Change it, break it, make it look and move better.

## How it works

```
 audio file  ->  <audio>  ->  AnalyserNode  ->  array of numbers  ->  canvas bars
                                  |
                              speakers
```

1. The browser plays the file through an `<audio>` element.
2. An **AnalyserNode** listens to the sound and splits it into frequency ranges.
3. About 60 times a second, we ask it for the current numbers.
4. We turn each number into the height of a bar and draw it.

That loop is the whole project. Everything else is polish.

---

# Reference: the technologies and APIs

Read this if you're curious about what the code is doing. You don't need it to finish the workshop.

## HTML, CSS, and JavaScript

- **HTML** is the structure: the buttons, sliders, and the `<canvas>` element.
- **CSS** is the look: colors, fonts, layout. The accent color is a CSS variable (`--accent`) that JavaScript updates as the music plays.
- **JavaScript** is the behavior: it reacts to clicks, reads audio data, and draws.

The browser is the runtime. There's nothing to install because every browser already runs all three.

## Events and `addEventListener`

Things happen in a page (a click, a slider move, a song loading). You attach a function to run when they do:

```js
playBtn.addEventListener("click", () => {
  audio.play();
});
```

Events used here: `click`, `input` (fires continuously as a slider moves), `change` (fires when a dropdown value changes), `timeupdate` (fires as the audio plays).

## The `<audio>` element

A built-in player. Useful pieces:

| Piece | What it does |
| --- | --- |
| `audio.play()` / `audio.pause()` | Start or stop |
| `audio.paused` | `true` if not playing |
| `audio.currentTime` | Position in seconds (you can set it to seek) |
| `audio.duration` | Length in seconds |
| `timeupdate` event | Fires repeatedly while playing |

Local files are loaded with `URL.createObjectURL(file)`, which makes a temporary link to the file in memory. Nothing is uploaded anywhere.

## The Web Audio API

A browser API for working with sound as a graph of connected nodes:

```
source  ->  analyser  ->  destination (speakers)
```

| Piece | Role |
| --- | --- |
| `AudioContext` | The container for the whole audio graph |
| `createMediaElementSource(audio)` | Feeds the `<audio>` element into the graph |
| `AnalyserNode` | Measures the sound without changing it |
| `audioCtx.destination` | The speakers |

Browsers block audio until the user interacts with the page. That's why the code calls `audioCtx.resume()` when you press play.

### The AnalyserNode

This is the key piece. It runs a Fourier transform, which takes a sound and tells you how much of each frequency is in it.

| Setting / method | Meaning |
| --- | --- |
| `fftSize = 2048` | How much audio it analyzes at a time |
| `frequencyBinCount` | Always `fftSize / 2`, so `1024` values (called **bins**) |
| `getByteFrequencyData(array)` | Fills your array with the current frequency levels |
| `smoothingTimeConstant` | From `0` to `1`. Higher means each frame blends more with the last, so motion is smoother and slower |

### What the data looks like

`getByteFrequencyData` fills a `Uint8Array` with whole numbers from `0` to `255`:

```
index:   0     1     2    ...   1023
         bass  ...         ...   treble
value:   0-255 for each
```

- Low indexes are **low frequencies** (bass, kick drums).
- High indexes are **high frequencies** (hi-hats, cymbals).
- A bigger number means that frequency is louder right now.
- Each bin is about 21 Hz wide (at a 44.1 kHz sample rate).

A `Uint8Array` is a typed array. It holds only 8-bit whole numbers (0 to 255), which is exactly what the analyser produces.

This is a **frequency spectrum**, not a waveform. A waveform shows the raw sound wave over time (`getByteTimeDomainData`). A spectrum shows how loud each pitch is right now.

## Canvas

`<canvas>` is a blank rectangle you draw on with JavaScript. You get a drawing tool called the context:

```js
const ctx = canvas.getContext("2d");
```

| Call | What it does |
| --- | --- |
| `ctx.clearRect(x, y, w, h)` | Erase an area (we clear everything each frame) |
| `ctx.fillStyle = "..."` | Set the color for the next shape |
| `ctx.fillRect(x, y, w, h)` | Draw a filled rectangle |

Coordinates start at the **top-left**: `x` grows to the right, and `y` grows **downward**. So a bar that grows upward from the bottom is drawn at:

```js
ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
```

Canvas has no memory of shapes. It's just pixels. To animate, you clear and redraw everything every frame.

## The animation loop

```js
function animate() {
  draw();
  requestAnimationFrame(animate);
}
```

`requestAnimationFrame` asks the browser to call your function right before the next screen refresh, usually 60 times a second. It pauses automatically when the tab is hidden. This is how every browser animation and game loop works.

## Mapping a number to a bar height

The central idea of the project is turning one kind of number into another:

```js
const value = dataArray[i * step];                      // 0 to 255
const level = Math.min((value / 255) * sensitivity, 1); // 0 to 1
const barHeight = level * canvas.height;                // pixels
```

1. Divide by `255` to get a fraction between `0` and `1`.
2. Multiply by `sensitivity` to boost or reduce it.
3. `Math.min(..., 1)` caps it so bars can't leave the canvas.
4. Multiply by the canvas height to get pixels.

## Colors with HSL

```js
ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
```

HSL means hue, saturation, lightness. **Hue** is an angle from `0` to `360` around the color wheel (0 red, 120 green, 240 blue). Changing only the hue across the bars gives a smooth gradient. The palettes in the code are just hue ranges.

## The settings object

All the sliders write to one object, and `draw()` reads from it every frame:

```js
const settings = { sensitivity: 1, barCount: 64, smoothing: 0.8, palette: "signal" };
```

Because `draw()` runs constantly, changes show up immediately. There's no "apply" step. This pattern of one shared state object that the UI changes and the renderer reads is used in many real apps.

---

## Ideas to try after M4

- Raise `Math.pow(level, 2)` to make loud parts pop and quiet parts disappear.
- Average a few bins per bar instead of reading one.
- Make the treble bars more sensitive than the bass bars.
- Change the smoothing so it reacts faster.
- Flash the background when the bass is loud.
- Add a new mode: mirrored bars, a circle, or particles.
- Change the fonts, layout, and colors.

## Learn more

- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN: AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode)
- [MDN: Canvas tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN: Events](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Events)
