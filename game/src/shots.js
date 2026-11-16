// The screenshot scenes behind ?shot=start|play|win|end. Each one drives the real simulation
// from a fresh world with a pilot at the controls, for a fixed simulated time or until the
// run ends, so the frame is a moment a real game can reach and the same seed always stages
// the same frame. Two pilots: a careful one that hunts pods and gives mines a wide berth,
// and a careless one that steers at the nearest mine, as a hurried player is caught out.

import { BAND, QUOTA, STEP } from './config.js';
import { KIND_MINE, KIND_POD, wrapAngle } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Steer toward a radius: burn the drive when below it and falling short, coast otherwise. */
function steer(state, targetRadius) {
  const gap = targetRadius - state.tug.radius;
  const wantedVelocity = Math.max(-130, Math.min(130, gap * 2.4));
  return state.tug.radialVelocity < wantedVelocity;
}

/** The nearest thing of `kind` still ahead of the tug, and how far ahead it is. */
function nearestAhead(state, kind) {
  let best = null;
  let bestGap = Infinity;
  for (const entity of state.entities) {
    if (entity.kind !== kind) continue;
    const gap = wrapAngle(entity.angle - state.tug.angle);
    if (gap > 0 && gap < bestGap) {
      bestGap = gap;
      best = entity;
    }
  }
  return best === null ? null : { entity: best, gap: bestGap };
}

function carefulPilot(state) {
  // A mine close ahead on this line: break away to the far side of the band first.
  const mine = nearestAhead(state, KIND_MINE);
  if (mine && mine.gap < 0.5 && Math.abs(mine.entity.radius - state.tug.radius) < 42) {
    const refuge = mine.entity.radius > state.tug.radius ? BAND.inner + 24 : BAND.outer - 24;
    return steer(state, refuge);
  }
  const pod = nearestAhead(state, KIND_POD);
  if (pod) return steer(state, pod.entity.radius);
  return steer(state, (BAND.inner + BAND.outer) / 2);
}

function carelessPilot(state) {
  const mine = nearestAhead(state, KIND_MINE);
  if (mine) return steer(state, mine.entity.radius);
  return steer(state, BAND.outer - 20);
}

function run(world, pilot, limitSeconds, ambient = false) {
  const steps = Math.floor(limitSeconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    world.step(STEP, { thrust: pilot(world.state) }, ambient);
    if (world.state.over) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best score to
 * show beside it. Any name but play, win or end stages the title.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    run(world, carefulPilot, 26);
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    // Late in a good run: ten pods home, the tank still healthy, two to go. The pilot flies
    // the rest of the contract for real — the win on screen is one the rules produced.
    world.state.podsCollected = QUOTA - 2;
    world.state.score = 285;
    world.state.charge = 88;
    run(world, carefulPilot, 300);
    return { screen: SCREEN_OVER, best: 0 };
  }
  if (name === 'end') {
    run(world, carelessPilot, 900);
    return { screen: SCREEN_OVER, best: 0 };
  }
  run(world, () => false, 5, true);
  return { screen: SCREEN_TITLE, best: 0 };
}
