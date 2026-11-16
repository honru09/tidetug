// Keyboard and pointer, read as the game needs them: a held thrust (the tether drive), and
// one-shot actions (confirm, pause, mute) that the screen state machine consumes once each.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const THRUST_KEYS = new Set(['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Space']);

export function createInput(canvas) {
  const held = new Set();
  let pending = 0;
  let pointerHeld = false;

  function onKeyDown(event) {
    if (THRUST_KEYS.has(event.code)) {
      held.add(event.code);
      if (event.code === 'Space') pending |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'Enter') {
      pending |= ACTION_CONFIRM;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      pending |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      pending |= ACTION_MUTE;
    }
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onPointerDown(event) {
    pointerHeld = true;
    pending |= ACTION_CONFIRM;
    canvas.setPointerCapture?.(event.pointerId);
  }

  function onPointerUp() {
    pointerHeld = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { held.clear(); pointerHeld = false; });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  return {
    /** True while the player holds any thrust control: the drive pushes the tug outward. */
    thrust() {
      return pointerHeld || held.size > 0;
    },
    /** The one-shot actions since the last call; reading them clears them. */
    takeActions() {
      const actions = pending;
      pending = 0;
      return actions;
    },
  };
}
