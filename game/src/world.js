// TIDETUG's simulation. Everything that moves lives here and nowhere else: the tug's orbit,
// the pods and mines that share it, the charge clock, the score. It knows nothing about the
// browser — the renderer only reads the state, and the input layer only feeds it a thrust
// flag — so a whole run can be replayed headlessly from its seed.

import {
  BAND, CHARGE, HULL, LEVEL, MINE, ORBIT_SPEED, POD, QUOTA, PLANET, TUG,
} from './config.js';
import { createRandom } from './random.js';

export const EVENT_POD = 1;
export const EVENT_HIT = 2;
export const EVENT_GRAZE = 4;
export const EVENT_LEVEL = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;

export const KIND_POD = 'pod';
export const KIND_MINE = 'mine';

const TAU = Math.PI * 2;

/** Wrap an angle difference into (-PI, PI], so "ahead" and "behind" are easy to ask about. */
export function wrapAngle(angle) {
  let wrapped = angle % TAU;
  if (wrapped > Math.PI) wrapped -= TAU;
  if (wrapped < -Math.PI) wrapped += TAU;
  return wrapped;
}

/** The stage position of anything that circles the planet. */
export function polarToXY(angle, radius) {
  return { x: PLANET.x + Math.cos(angle) * radius, y: PLANET.y + Math.sin(angle) * radius };
}

export function createWorld(seed) {
  const state = {
    time: 0,
    level: 1,
    levelTime: 0,
    score: 0,
    streak: 0,
    podsCollected: 0,
    hull: HULL,
    charge: CHARGE.start,
    over: null, // null while flying; then 'win', 'wrecked' or 'stranded'
    shake: 0,
    tug: { angle: 0, radius: TUG.startRadius, radialVelocity: 0, invulnerable: 0 },
    entities: [],
    floaters: [],
    particles: [],
  };

  let random = createRandom(seed);
  let podTimer = 0.4;
  let mineTimer = 1.6;
  let nextId = 1;

  function reset() {
    random = createRandom(seed);
    podTimer = 0.4;
    mineTimer = 1.6;
    nextId = 1;
    state.time = 0;
    state.level = 1;
    state.levelTime = 0;
    state.score = 0;
    state.streak = 0;
    state.podsCollected = 0;
    state.hull = HULL;
    state.charge = CHARGE.start;
    state.over = null;
    state.shake = 0;
    state.tug.angle = TUG.startAngle;
    state.tug.radius = TUG.startRadius;
    state.tug.radialVelocity = 0;
    state.tug.invulnerable = 0;
    state.entities.length = 0;
    state.floaters.length = 0;
    state.particles.length = 0;
  }

  function spawn(kind) {
    const ahead = state.tug.angle + random.range(0.8, 2.4);
    state.entities.push({
      id: nextId,
      kind,
      angle: ahead,
      radius: random.range(BAND.inner + 18, BAND.outer - 18),
      drift: random.range(0.62, 0.85),
      radialDrift: random.range(-5, 5),
      age: 0,
      minDistance: Infinity,
      grazed: false,
    });
    nextId += 1;
  }

  function burst(x, y, colour, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = random.range(0, TAU);
      const velocity = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        age: 0,
        life: random.range(0.3, 0.7),
        colour,
        size: random.range(1.5, 3.5),
      });
    }
  }

  function floater(x, y, text, colour) {
    state.floaters.push({ x, y, text, colour, age: 0, life: 1.1 });
  }

  function updateEffects(dt) {
    for (let index = state.floaters.length - 1; index >= 0; index -= 1) {
      const item = state.floaters[index];
      item.age += dt;
      item.y -= 26 * dt;
      if (item.age >= item.life) state.floaters.splice(index, 1);
    }
    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const item = state.particles[index];
      item.age += dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vx *= 0.92;
      item.vy *= 0.92;
      if (item.age >= item.life) state.particles.splice(index, 1);
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
  }

  function step(dt, control, ambient = false) {
    let events = 0;
    updateEffects(dt);
    if (state.over) return events;

    state.time += dt;
    const tug = state.tug;
    const omega = ORBIT_SPEED + (state.level - 1) * LEVEL.speedPerLevel;
    tug.angle = (tug.angle + omega * dt) % TAU;

    // Radial flight: the tether drive pushes out, gravity pulls in, damping keeps it honest.
    if (ambient) {
      tug.radialVelocity = 0;
      tug.radius += (TUG.startRadius - tug.radius) * Math.min(1, dt * 1.5);
    } else {
      const accel = (control.thrust ? TUG.thrust : 0) - TUG.gravity;
      tug.radialVelocity += accel * dt;
      tug.radialVelocity *= Math.exp(-TUG.damping * dt);
      tug.radius += tug.radialVelocity * dt;
      if (tug.radius < BAND.inner) { tug.radius = BAND.inner; tug.radialVelocity = 0; }
      if (tug.radius > BAND.outer) { tug.radius = BAND.outer; tug.radialVelocity = 0; }
    }
    if (tug.invulnerable > 0) tug.invulnerable = Math.max(0, tug.invulnerable - dt);

    // Spawning: pods a little faster than mines, mines quicker every level.
    podTimer -= dt;
    if (podTimer <= 0) {
      if (state.entities.filter((e) => e.kind === KIND_POD).length < POD.maxActive) spawn(KIND_POD);
      podTimer = POD.spawnInterval + random.range(-POD.spawnJitter, POD.spawnJitter);
    }
    mineTimer -= dt;
    if (mineTimer <= 0) {
      if (state.entities.filter((e) => e.kind === KIND_MINE).length < MINE.maxActive) spawn(KIND_MINE);
      const base = Math.max(MINE.minInterval, MINE.spawnInterval - (state.level - 1) * MINE.intervalPerLevel);
      mineTimer = base + random.range(-MINE.spawnJitter, MINE.spawnJitter);
    }

    const tugPos = polarToXY(tug.angle, tug.radius);
    for (let index = state.entities.length - 1; index >= 0; index -= 1) {
      const entity = state.entities[index];
      entity.age += dt;
      entity.angle = (entity.angle + omega * entity.drift * dt) % TAU;
      entity.radius += entity.radialDrift * dt;
      if (entity.radius < BAND.inner + 12) { entity.radius = BAND.inner + 12; entity.radialDrift = Math.abs(entity.radialDrift); }
      if (entity.radius > BAND.outer - 12) { entity.radius = BAND.outer - 12; entity.radialDrift = -Math.abs(entity.radialDrift); }

      const behind = wrapAngle(entity.angle - tug.angle);
      const pos = polarToXY(entity.angle, entity.radius);
      const distance = Math.hypot(pos.x - tugPos.x, pos.y - tugPos.y);
      if (distance < entity.minDistance) entity.minDistance = distance;

      if (!ambient) {
        const hitDistance = TUG.radius + (entity.kind === KIND_POD ? POD.radius : MINE.radius);
        if (distance < hitDistance) {
          if (entity.kind === KIND_POD) {
            state.streak += 1;
            const points = POD.points + (state.streak - 1) * POD.streakStep;
            state.score += points;
            state.podsCollected += 1;
            state.charge = Math.min(CHARGE.start, state.charge + CHARGE.perPod);
            floater(pos.x, pos.y - 16, `+${points}`, '#ffd166');
            burst(pos.x, pos.y, '#ffb703', 10, 130);
            events |= EVENT_POD;
            state.entities.splice(index, 1);
            if (state.podsCollected >= QUOTA) {
              state.score += Math.round(state.charge) * 2 + state.hull * 50;
              state.over = 'win';
              events |= EVENT_WIN | EVENT_OVER;
            }
            continue;
          }
          if (tug.invulnerable <= 0) {
            state.hull -= 1;
            state.streak = 0;
            tug.invulnerable = TUG.invulnerable;
            state.shake = 0.45;
            floater(pos.x, pos.y - 16, 'HULL -1', '#ef476f');
            burst(pos.x, pos.y, '#ef476f', 14, 170);
            events |= EVENT_HIT;
            state.entities.splice(index, 1);
            if (state.hull <= 0) {
              state.over = 'wrecked';
              events |= EVENT_OVER;
            }
            continue;
          }
        }
        // A mine that slips past close enough to feel, without touching, pays a graze bonus.
        if (entity.kind === KIND_MINE && !entity.grazed && entity.prevAhead > 0 && behind <= 0) {
          entity.grazed = true;
          if (entity.minDistance < MINE.grazeDistance + TUG.radius + 8) {
            state.score += MINE.grazePoints;
            floater(tugPos.x, tugPos.y - 26, `GRAZE +${MINE.grazePoints}`, '#8fa8b8');
            events |= EVENT_GRAZE;
          }
        }
      }
      entity.prevAhead = behind;
      if (behind < -1.5 || entity.age > 32) state.entities.splice(index, 1);
    }

    if (!ambient) {
      state.score += dt; // one point a second for staying alive
      const drain = CHARGE.drainPerSecond + (control.thrust ? CHARGE.thrustDrainPerSecond : 0);
      state.charge -= drain * dt;
      if (state.charge <= 0) {
        state.charge = 0;
        state.over = 'stranded';
        events |= EVENT_OVER;
      }
      state.levelTime += dt;
      if (state.levelTime >= LEVEL.seconds && state.level < LEVEL.max) {
        state.level += 1;
        state.levelTime = 0;
        const pos = polarToXY(tug.angle, tug.radius);
        floater(pos.x, pos.y - 40, `ORBIT SHIFT ${state.level}`, '#7fd4b2');
        events |= EVENT_LEVEL;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
