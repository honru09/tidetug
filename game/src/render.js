// Everything TIDETUG looks like is drawn here, on a 2D canvas, from the world's state and
// nothing else: no images, no fonts to load, no hidden state of its own beyond the starfield.
// Given the same state it paints the same frame, which is what the screenshot scenes rely on.

import { BAND, CHARGE, FIELD, FONT, HULL, PALETTE, PLANET, QUOTA } from './config.js';
import { KIND_MINE, polarToXY } from './world.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  // A fixed starfield: three depths of stars, drawn rotated a touch by the tug's angle so
  // the whole sky seems to wheel slowly as you orbit.
  const stars = [];
  const starRandom = createRandom(20261116);
  for (let index = 0; index < 190; index += 1) {
    stars.push({
      x: starRandom.range(0, FIELD.width),
      y: starRandom.range(0, FIELD.height),
      size: starRandom.range(0.6, 2.1),
      depth: starRandom.pick([0.15, 0.35, 0.7]),
      twinkle: starRandom.range(0, Math.PI * 2),
    });
  }

  function fitCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.floor(window.innerWidth * dpr);
    const height = Math.floor(window.innerHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const scale = Math.min(width / FIELD.width, height / FIELD.height);
    return {
      scale,
      offsetX: (width - FIELD.width * scale) / 2,
      offsetY: (height - FIELD.height * scale) / 2,
    };
  }

  function text(value, x, y, size, colour, align = 'left', weight = 600) {
    ctx.fillStyle = colour;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);
  }

  function drawSky(state) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.spaceFar);
    gradient.addColorStop(1, PALETTE.space);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    for (const [x, y, radius, colour] of [
      [240, 130, 300, PALETTE.nebulaA],
      [1080, 560, 340, PALETTE.nebulaB],
      [1020, 110, 200, PALETTE.nebulaA],
    ]) {
      const blob = ctx.createRadialGradient(x, y, 0, x, y, radius);
      blob.addColorStop(0, colour);
      blob.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = blob;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    const wheel = state.tug.angle * 0.05;
    for (const star of stars) {
      const angle = Math.atan2(star.y - PLANET.y, star.x - PLANET.x) + wheel * star.depth;
      const dist = Math.hypot(star.x - PLANET.x, star.y - PLANET.y);
      const x = PLANET.x + Math.cos(angle) * dist;
      const y = PLANET.y + Math.sin(angle) * dist;
      const glow = 0.55 + 0.45 * Math.sin(state.time * 1.7 + star.twinkle);
      ctx.globalAlpha = 0.35 + 0.55 * glow * star.depth;
      ctx.fillStyle = '#dfeef5';
      ctx.fillRect(x, y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlanet(state) {
    const { x, y, radius } = PLANET;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius + 16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(127, 212, 178, 0.10)';
    ctx.fill();
    const body = ctx.createRadialGradient(x - radius * 0.4, y - radius * 0.4, radius * 0.2, x, y, radius);
    body.addColorStop(0, PALETTE.planetLight);
    body.addColorStop(1, PALETTE.planetDark);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.clip();
    // Weather bands and a night side, turning very slowly with the run's clock.
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 7;
    for (let index = 0; index < 4; index += 1) {
      const bandY = y - radius + 26 + index * 38 + Math.sin(state.time * 0.11 + index) * 3;
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(state.time * 0.07 + index * 2) * 9, bandY, radius * 0.92, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    const night = ctx.createLinearGradient(x - radius, y, x + radius, y);
    night.addColorStop(0.55, 'rgba(0,0,0,0)');
    night.addColorStop(1, 'rgba(2,10,14,0.55)');
    ctx.fillStyle = night;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, radius, -2.4, -0.5);
    ctx.strokeStyle = PALETTE.planetRim;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawBandGuides() {
    ctx.save();
    ctx.strokeStyle = PALETTE.bandGuide;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 10]);
    for (const radius of [BAND.inner, BAND.outer]) {
      ctx.beginPath();
      ctx.arc(PLANET.x, PLANET.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPod(pos, state) {
    const pulse = 1 + Math.sin(state.time * 4 + pos.x) * 0.12;
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(state.time * 1.4 + pos.x * 0.01);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = PALETTE.pod;
    ctx.shadowBlur = 16;
    ctx.fillStyle = PALETTE.pod;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 13);
    ctx.lineTo(-9, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.podCore;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-4.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMine(pos, state) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(-state.time * 0.9 + pos.y * 0.01);
    ctx.strokeStyle = PALETTE.mineDark;
    ctx.lineWidth = 3;
    for (let spike = 0; spike < 8; spike += 1) {
      const angle = (spike / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 9, Math.sin(angle) * 9);
      ctx.lineTo(Math.cos(angle) * 17, Math.sin(angle) * 17);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.mineDark;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    const blink = Math.sin(state.time * 5 + pos.x * 0.05) > 0 ? 1 : 0.25;
    ctx.globalAlpha = blink;
    ctx.fillStyle = PALETTE.mine;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawTug(state, thrust) {
    const pos = polarToXY(state.tug.angle, state.tug.radius);
    const tangent = state.tug.angle + Math.PI / 2;
    // The tether: a faint line home to the planet, brighter while the drive burns.
    ctx.save();
    ctx.strokeStyle = thrust ? 'rgba(255, 209, 102, 0.5)' : 'rgba(160, 200, 215, 0.20)';
    ctx.lineWidth = thrust ? 2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(PLANET.x, PLANET.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(tangent);
    if (state.tug.invulnerable > 0 && Math.sin(state.time * 18) > 0) ctx.globalAlpha = 0.35;
    if (thrust) {
      const flame = 12 + Math.sin(state.time * 31) * 4;
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.moveTo(-4, -16);
      ctx.lineTo(0, -16 - flame);
      ctx.lineTo(4, -16);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.tugBody;
    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(10, -8);
    ctx.lineTo(4, -14);
    ctx.lineTo(-4, -14);
    ctx.lineTo(-10, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.tug;
    ctx.fillRect(-10, -4, 20, 5);
    ctx.fillStyle = '#12303e';
    ctx.beginPath();
    ctx.arc(0, 3, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawEffects(state) {
    for (const particle of state.particles) {
      ctx.globalAlpha = 1 - particle.age / particle.life;
      ctx.fillStyle = particle.colour;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    for (const floater of state.floaters) {
      ctx.globalAlpha = 1 - floater.age / floater.life;
      text(floater.text, floater.x, floater.y, 17, floater.colour, 'center', 700);
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    text(`SCORE ${Math.floor(state.score)}`, 28, 34, 24, PALETTE.text, 'left', 800);
    text(`BEST ${Math.max(best, Math.floor(state.score))}`, 28, 62, 14, PALETTE.muted, 'left', 600);

    // The contract, as a row of pod marks: filled is recovered, hollow is still out there.
    const rowWidth = QUOTA * 22;
    const startX = FIELD.width / 2 - rowWidth / 2;
    text('SALVAGE', FIELD.width / 2, 26, 13, PALETTE.muted, 'center', 700);
    for (let index = 0; index < QUOTA; index += 1) {
      const x = startX + index * 22 + 11;
      ctx.save();
      ctx.translate(x, 52);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = index < state.podsCollected ? PALETTE.pod : 'rgba(255,183,3,0.16)';
      ctx.fillRect(-5.5, -5.5, 11, 11);
      ctx.restore();
    }

    text(`ORBIT ${state.level}`, FIELD.width - 28, 34, 18, PALETTE.text, 'right', 800);
    for (let index = 0; index < HULL; index += 1) {
      const x = FIELD.width - 40 - index * 26;
      ctx.save();
      ctx.translate(x, 60);
      ctx.fillStyle = index < state.hull ? PALETTE.planetRim : 'rgba(239,71,111,0.22)';
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, 4);
      ctx.lineTo(0, 9);
      ctx.lineTo(-8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (state.streak >= 2) {
      text(`STREAK ×${state.streak}`, FIELD.width - 28, 88, 15, PALETTE.pod, 'right', 700);
    }

    // Charge: the clock of the run, a wide bar along the bottom.
    const barWidth = 460;
    const barX = FIELD.width / 2 - barWidth / 2;
    const barY = FIELD.height - 34;
    text('CHARGE', barX - 14, barY + 1, 13, PALETTE.muted, 'right', 700);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(barX, barY - 7, barWidth, 14);
    const fraction = Math.max(0, state.charge / CHARGE.start);
    ctx.fillStyle = fraction < 0.3 ? PALETTE.chargeLow : PALETTE.charge;
    ctx.fillRect(barX, barY - 7, barWidth * fraction, 14);
    text(formatTime(state.time), barX + barWidth + 14, barY + 1, 14, PALETTE.muted, 'left', 600);
  }

  function panel(width, height) {
    const x = FIELD.width / 2 - width / 2;
    const y = FIELD.height / 2 - height / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 18);
    ctx.fill();
    ctx.stroke();
    return { x, y };
  }

  function drawTitle(state, best) {
    panel(620, 400);
    const cx = FIELD.width / 2;
    text('TIDETUG', cx, 218, 64, PALETTE.text, 'center', 800);
    text('Salvage the orbit of Vesper, one pod at a time.', cx, 262, 19, PALETTE.planetRim, 'center', 600);
    const lines = [
      'HOLD  Space, ↑, or the pointer — the tether drive climbs outward',
      'RELEASE — gravity pulls you back in',
      `Recover ${QUOTA} pods to complete the contract`,
      'Mines cost hull and break your streak · a near miss pays +5',
      'Your charge drains always, and faster while you climb',
    ];
    lines.forEach((line, index) => text(line, cx, 308 + index * 27, 16.5, PALETTE.text, 'center', 500));
    text('Press ENTER or click to fly', cx, 470, 20, PALETTE.pod, 'center', 800);
    if (best > 0) text(`Best score ${best}`, cx, 506, 15, PALETTE.muted, 'center', 600);
    text('P pause · M sound on/off', cx, 534, 13, PALETTE.muted, 'center', 500);
  }

  function drawOver(state, best) {
    const won = state.over === 'win';
    panel(560, 330);
    const cx = FIELD.width / 2;
    const title = won ? 'CONTRACT COMPLETE' : state.over === 'wrecked' ? 'TUG WRECKED' : 'STRANDED';
    const reason = won
      ? 'Every pod is home. The harbour master pays in full.'
      : state.over === 'wrecked'
        ? 'The mines got the last of your hull.'
        : 'The charge ran dry, far from home.';
    text(title, cx, 252, 38, won ? PALETTE.planetRim : PALETTE.mine, 'center', 800);
    text(reason, cx, 292, 17, PALETTE.text, 'center', 500);
    text(`Score ${Math.floor(state.score)}`, cx, 344, 26, PALETTE.text, 'center', 800);
    text(
      `Pods ${state.podsCollected} of ${QUOTA} · Time ${formatTime(state.time)} · Orbit ${state.level} · Best ${Math.max(best, Math.floor(state.score))}`,
      cx, 380, 16, PALETTE.muted, 'center', 600,
    );
    if (won) text('Bonus already counted: spare charge and hull, paid double.', cx, 408, 14, PALETTE.muted, 'center', 500);
    text('Press ENTER or click to fly again', cx, 452, 19, PALETTE.pod, 'center', 800);
  }

  function draw(state, screen, best, options = {}) {
    const { scale, offsetX, offsetY } = fitCanvas();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.space;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    if (state.shake > 0) {
      const kick = state.shake * 13;
      ctx.translate(Math.sin(state.time * 91) * kick, Math.cos(state.time * 83) * kick);
    }

    drawSky(state);
    drawBandGuides();
    drawPlanet(state);
    for (const entity of state.entities) {
      const pos = polarToXY(entity.angle, entity.radius);
      if (entity.kind === KIND_MINE) drawMine(pos, state);
      else drawPod(pos, state);
    }
    drawTug(state, options.thrust === true);
    drawEffects(state);
    if (screen !== SCREEN_TITLE) drawHud(state, best);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(4, 8, 14, 0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      text('PAUSED', FIELD.width / 2, FIELD.height / 2 - 14, 40, PALETTE.text, 'center', 800);
      text('P or ENTER to resume', FIELD.width / 2, FIELD.height / 2 + 30, 17, PALETTE.muted, 'center', 600);
    }
    if (screen === SCREEN_OVER) drawOver(state, best);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw };
}
