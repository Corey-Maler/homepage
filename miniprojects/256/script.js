

const secInDay = BigInt(24 * 60 * 60);
const secInYear = BigInt(365) * secInDay;

const now = +new Date();

const shifts = {
  pageloaded: BigInt(-now),
  ad: BigInt(1970) * secInYear, // shift to 0 AD ("now" starts at 1970)
  universe: BigInt(13700000000) * secInYear,
};

// note that speeds are in "OPs per second"
const i7 = 70_000_000_000n; // ~ 70 GFlops
const gpu = 8000_000_000_000n; // ~ 8000 GFlops
const asic = 150_000_000_000_000n;
const google = 1_000_000n * i7; // based on information that Google has about 1 million servers
const speeds = {
  sec: 1n,
  i7,
  gpu,
  asic,
  google,
};

let selectedShift = 'pageloaded';
let selectedSpeed = 'i7';
let selectedBase = 256;

const selectSpeed = (speed) => (selectedSpeed = speed);
const selectShift = (shift) => (selectedShift = shift);
const reset = (r) =>
  Array.prototype.slice
    .call(document.querySelectorAll(`[data-r="${r}"]`))
    .map((e) => e.classList.remove('active'));

const prepareCanvas = (parent) => {
  const canvas = document.createElement('canvas');
  parent.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // don't matter since would be immediately recalculated
  // but to be on safe side, avoid zeros and undefined
  let width = 100;
  let height = 100;
  let dpr = 1;
  let padding = 10;

  const rows = 8;
  const dotsPerRow = 256 / 8;

  let radiusDesired = 4;
  let radius = 4;
  let lastValue = null;

  // margin to accommodate text on the left with numbers
  const leftMargin = 22;

  // due to high pixel density of modern display
  // we need to upscale a canvas and scale it back
  // using css
  const fixCanvasSize = (newWidth) => {
    dpr = window.devicePixelRatio || 1;
    width = newWidth * dpr;
    radiusDesired = newWidth > 440 ? 5 : 4;
    radius = radiusDesired * dpr;

    canvas.width = width;

    canvas.style.width = `${newWidth}px`;

    // calculate new paddings

    const totalWidthOfDots = dotsPerRow * radius * 2;
    const leftOver = width - totalWidthOfDots - leftMargin * dpr;

    // also we render as 4 blocks, so "empty" spaces
    padding = leftOver / (dotsPerRow + 1 + 2);
    height = rows * (radius * 2 + padding) + padding;
    canvas.height = height;
    canvas.style.height = `${height / dpr}px`;
  };

  fixCanvasSize(parent.clientWidth);

  // active / inactive are rendered in different passes
  // to avoid too much "fill" calls
  const renderCircle = (col, row) => {
    const col_adjusted = col + Math.floor(col / 8) / 4;
    const paddingShift = padding / 2 + radius;
    const x =
      col_adjusted * (radius * 2 + padding) +
      0.5 +
      paddingShift +
      leftMargin * dpr;
    const y = row * (radius * 2 + padding) + 0.5 + paddingShift;

    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
  };

  const renderNumbers = () => {
    ctx.fillStyle = 'rgba(255, 255, 255, .6)';
    
    ctx.font = `${dpr * 10}px Arial`;
    ctx.textAlign = 'right';
    const textLeft = 20 * dpr;
    ctx.fillText('256', textLeft, (padding + 2 * radius) * 1 - 1 * dpr);
    ctx.fillText('192', textLeft, (padding + 2 * radius) * 3 - 1 * dpr);
    ctx.fillText('128', textLeft, (padding + 2 * radius) * 5 - 1 * dpr);
    ctx.fillText('64', textLeft, (padding + 2 * radius) * 7 - 2 * dpr);
  };

  const update = (value) => {
    // remember last used value for
    lastValue = value;

    ctx.fillStyle = 'black';
    ctx.clearRect(0, 0, width, height);

    // filled path
    for (const pass of [true, false]) {
      ctx.beginPath();
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < dotsPerRow; col++) {
          const ind = row * dotsPerRow + col;
          if (value[ind] === pass) {
            renderCircle(col, row);
          }
        }
      }

      ctx.fillStyle = pass ? 'white' : 'rgba(255, 255, 255, .2)';
      ctx.fill();
    }

    renderNumbers();
  };

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      fixCanvasSize(entry.contentRect.width);
      if (lastValue) {
        update(lastValue);
      }
    }
  });

  resizeObserver.observe(parent);

  return {
    update,
  };
};

const renderer = prepareCanvas(document.getElementById('numeric'));

const fillTo = (origin, base) => {
  const a = new Array(base - origin.length);
  a.fill(false);
  return a.concat(origin);
};

function loop() {
  const now = BigInt(Date.now());
  const shift = shifts[selectedShift];
  const speed = speeds[selectedSpeed];
  // note that speeds are in "ops per second",
  // but time advances in ms
  // therefore we need to divide by 1000
  const total = ((shift + now) * speed) / 1000n;
  const asArray = total
    .toString(2)
    .split('')
    .map((e) => e === '1');
  const arr = fillTo(asArray, selectedBase);
//   setTimeout(loop, 500);
  window.requestAnimationFrame(loop);
  renderer.update(arr);
}

loop();

document.addEventListener('click', (e) => {
  const target = e.target;
  const r = target.dataset['r'];
  const val = target.dataset['val'];
  switch (target.dataset['r']) {
    case 'age':
      selectShift(val);
      reset('age');
      break;
    case 'speed':
      selectSpeed(val);
      reset('speed');
      break;
  }

  target.classList.add('active');
});
