// One place for "something happened" feedback: a short beep plus an
// on-screen toast. Used for every notification, order alert and chat
// message, for every role.
//
// The beep is generated with the Web Audio API (no sound file to download,
// works offline). Phones only allow sound after the person has tapped the
// page once, so the audio engine is unlocked on the first tap/keypress.

let ctx: AudioContext | null = null;
let lastBeepAt = 0;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  } catch {
    return null;
  }
}

function unlock() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}
if (typeof window !== "undefined") {
  ["pointerdown", "touchstart", "keydown"].forEach((ev) =>
    window.addEventListener(ev, unlock, { passive: true } as any)
  );
}

export function isSoundOn(): boolean {
  try { return localStorage.getItem("fd_sound_off") !== "1"; } catch { return true; }
}
export function setSoundOn(on: boolean) {
  try { on ? localStorage.removeItem("fd_sound_off") : localStorage.setItem("fd_sound_off", "1"); } catch { /* ignore */ }
}

/** "normal" = two short beeps; "urgent" (new order / new job) = three louder beeps. */
export function playBeep(kind: "normal" | "urgent" = "normal") {
  if (!isSoundOn()) return;
  const now = Date.now();
  if (now - lastBeepAt < 700) return; // several alerts at once -> one beep
  lastBeepAt = now;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const count = kind === "urgent" ? 3 : 2;
  const vol = kind === "urgent" ? 0.35 : 0.22;
  for (let i = 0; i < count; i++) {
    const t = c.currentTime + i * 0.18;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(kind === "urgent" ? 1046 : 880, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }
  try { (navigator as any).vibrate?.(kind === "urgent" ? [120, 60, 120, 60, 120] : [80]); } catch { /* ignore */ }
}

export interface ToastDetail { title: string; message?: string; kind?: "info" | "success" | "urgent"; link?: string }

/** Beep + show a toast (rendered by <ToastHost/>). */
export function notifyUser(d: ToastDetail, opts: { sound?: boolean } = {}) {
  if (opts.sound !== false) playBeep(d.kind === "urgent" ? "urgent" : "normal");
  window.dispatchEvent(new CustomEvent<ToastDetail>("fd-toast", { detail: d }));
}
