// TIDETUG tuning: every number the simulation and the renderer share lives here, so the
// balance of the game can be read (and changed) in one place. The playfield is a fixed
// 1280x720 logical stage; the renderer scales it to whatever window the game runs in.

export const FIELD = { width: 1280, height: 720 };

/** The planet Vesper sits a little above centre so the HUD has room to breathe below it. */
export const PLANET = { x: 640, y: 356, radius: 84 };

/** Fixed simulation step: 60 updates a second, whatever the display does. */
export const STEP = 1 / 60;

/** The orbit band the tug may fly in, measured as a radius from the planet's centre. */
export const BAND = { inner: 150, outer: 330 };

export const TUG = {
  radius: 15, // collision size of the drone
  startAngle: -Math.PI / 2,
  startRadius: 238,
  gravity: 150, // inward pull, px per second squared
  thrust: 360, // outward push while the tether drive is held, px per second squared
  damping: 2.4, // radial velocity decay per second
  invulnerable: 1.6, // seconds of grace after a mine hit
};

export const CHARGE = {
  start: 100,
  drainPerSecond: 2.4, // the clock of the game: a full tank lasts about 40 idle seconds
  thrustDrainPerSecond: 1.1, // climbing costs extra
  perPod: 9, // a recovered pod feeds the tank back
};

export const HULL = 3;

/** Recover this many pods and the salvage contract is complete: the win. */
export const QUOTA = 12;

export const POD = {
  radius: 13,
  points: 20,
  streakStep: 5, // each pod in an unbroken streak is worth this much more than the last
  spawnInterval: 1.55,
  spawnJitter: 0.7,
  maxActive: 7,
};

export const MINE = {
  radius: 15,
  spawnInterval: 2.5,
  spawnJitter: 0.9,
  minInterval: 1.05, // the fastest mines ever arrive, at the highest level
  intervalPerLevel: 0.16,
  maxActive: 11,
  grazeDistance: 34, // pass this close without touching and it counts as a graze
  grazePoints: 5,
};

export const LEVEL = { seconds: 20, max: 8, speedPerLevel: 0.045 };

/** Base angular speed of the tug around the planet, radians per second. */
export const ORBIT_SPEED = 0.55;

/** Colours: a deep-space teal and amber palette, one accent for danger. */
export const PALETTE = {
  space: '#070d16',
  spaceFar: '#0b1624',
  nebulaA: '#12303e',
  nebulaB: '#1d2a4a',
  planetLight: '#3f8f7a',
  planetDark: '#173f3a',
  planetRim: '#7fd4b2',
  bandGuide: '#274b5c',
  tug: '#ffd166',
  tugBody: '#f4f6f8',
  pod: '#ffb703',
  podCore: '#fff3b0',
  mine: '#ef476f',
  mineDark: '#7f1d35',
  charge: '#6ee7a0',
  chargeLow: '#ef476f',
  text: '#eef6f6',
  muted: '#8fa8b8',
  panel: 'rgba(8, 18, 28, 0.82)',
  panelEdge: '#2c5d74',
};

export const FONT = '"Avenir Next", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'tidetug.best';
