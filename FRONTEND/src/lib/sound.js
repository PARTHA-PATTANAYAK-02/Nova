// 4 Completely distinct, high-quality Web Audio sound effects
let audioCtx = null;

const getCtx = () => {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

// Unlock AudioContext on any user touch/click for mobile reliability
if (typeof window !== "undefined") {
  const unlock = () => {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  };
  ["click", "touchstart", "touchend", "pointerdown"].forEach((evt) =>
    window.addEventListener(evt, unlock, { passive: true }),
  );
}

export const isSoundEnabled = () => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("nova_sound_enabled") !== "false";
};

export const setSoundEnabled = (enabled) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("nova_sound_enabled", enabled ? "true" : "false");
  window.dispatchEvent(
    new CustomEvent("nova:sound-changed", { detail: { enabled: !!enabled } }),
  );
};

const ensureCtx = async () => {
  if (!isSoundEnabled()) return null;
  const ctx = getCtx();
  if (!ctx) return null;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  return ctx;
};

/**
 * 1. MESSAGE SENT SOUND:
 * Authentic WhatsApp / Messenger style hollow "Pop-Pip".
 * Single snappy acoustic click-pop. Short (70ms) and tactile.
 */
export const playMessageSound = async () => {
  try {
    if (!isSoundEnabled()) return;
    const ctx = await ensureCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.42, t);
    master.connect(ctx.destination);

    // Initial click transient
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "sine";
    click.frequency.setValueAtTime(980, t);
    click.frequency.exponentialRampToValueAtTime(450, t + 0.02);
    clickGain.gain.setValueAtTime(0.5, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
    click.connect(clickGain);
    clickGain.connect(master);
    click.start(t);
    click.stop(t + 0.025);

    // Resonant hollow body
    const pop = ctx.createOscillator();
    const popGain = ctx.createGain();
    pop.type = "sine";
    pop.frequency.setValueAtTime(680, t);
    pop.frequency.exponentialRampToValueAtTime(360, t + 0.065);

    popGain.gain.setValueAtTime(0.001, t);
    popGain.gain.linearRampToValueAtTime(1.0, t + 0.005);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

    pop.connect(popGain);
    popGain.connect(master);
    pop.start(t);
    pop.stop(t + 0.08);
  } catch {
    /* silent fallback */
  }
};

/**
 * 2. LIKE SOUND:
 * Tactile & Satisfying Pop-Thump (Instagram-style Like).
 * Clear, audible, velvety rounded pop with full body (520Hz -> 340Hz) and soft punch.
 * Strong enough to hear clearly on phone and laptop speakers without being harsh.
 */
export const playLikeSound = async (isLike = true) => {
  try {
    if (!isSoundEnabled()) return;
    const ctx = await ensureCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.65, t);
    master.connect(ctx.destination);

    if (isLike) {
      // Main rounded body punch (520Hz -> 340Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(520, t);
      osc1.frequency.exponentialRampToValueAtTime(340, t + 0.08);

      gain1.gain.setValueAtTime(0.001, t);
      gain1.gain.linearRampToValueAtTime(1.0, t + 0.008);
      gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc1.connect(gain1);
      gain1.connect(master);
      osc1.start(t);
      osc1.stop(t + 0.12);

      // Sweet harmonic warmth layer (740Hz -> 420Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(740, t);
      osc2.frequency.exponentialRampToValueAtTime(420, t + 0.05);

      gain2.gain.setValueAtTime(0.001, t);
      gain2.gain.linearRampToValueAtTime(0.5, t + 0.006);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc2.connect(gain2);
      gain2.connect(master);
      osc2.start(t);
      osc2.stop(t + 0.08);
    } else {
      // Gentle downward un-like step (380Hz -> 240Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(240, t + 0.07);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.7, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  } catch {
    /* silent fallback */
  }
};

/**
 * 3. REACTION ARRIVAL SOUND:
 * Playful Emoji Reaction "Bloop-Ding! ✨" (Tapback Arrival).
 * First a cheerful rising water droplet / bubble bounce (500Hz -> 820Hz),
 * followed by a sweet sparkling harmonic bell chime (1046Hz + 1318Hz).
 * Gives the exact unmistakable feeling that a lively emoji reaction has landed!
 */
export const playReactionSound = async () => {
  try {
    if (!isSoundEnabled()) return;
    const ctx = await ensureCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.55, t);
    master.connect(ctx.destination);

    // 1. Cheerful emoji bounce "Bloop" (500Hz -> 820Hz)
    const bloop = ctx.createOscillator();
    const bloopGain = ctx.createGain();
    bloop.type = "sine";
    bloop.frequency.setValueAtTime(500, t);
    bloop.frequency.exponentialRampToValueAtTime(820, t + 0.045);

    bloopGain.gain.setValueAtTime(0.001, t);
    bloopGain.gain.linearRampToValueAtTime(0.85, t + 0.008);
    bloopGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    bloop.connect(bloopGain);
    bloopGain.connect(master);
    bloop.start(t);
    bloop.stop(t + 0.075);

    // 2. Sweet sparkling arrival chime chord (C6 1046Hz + E6 1318Hz) at t + 0.04s
    const tChime = t + 0.04;

    const chime1 = ctx.createOscillator();
    const chimeGain1 = ctx.createGain();
    chime1.type = "sine";
    chime1.frequency.setValueAtTime(1046, tChime);

    chimeGain1.gain.setValueAtTime(0.001, tChime);
    chimeGain1.gain.linearRampToValueAtTime(0.75, tChime + 0.008);
    chimeGain1.gain.exponentialRampToValueAtTime(0.001, tChime + 0.16);

    chime1.connect(chimeGain1);
    chimeGain1.connect(master);
    chime1.start(tChime);
    chime1.stop(tChime + 0.17);

    const chime2 = ctx.createOscillator();
    const chimeGain2 = ctx.createGain();
    chime2.type = "sine";
    chime2.frequency.setValueAtTime(1318, tChime);

    chimeGain2.gain.setValueAtTime(0.001, tChime);
    chimeGain2.gain.linearRampToValueAtTime(0.6, tChime + 0.008);
    chimeGain2.gain.exponentialRampToValueAtTime(0.001, tChime + 0.18);

    chime2.connect(chimeGain2);
    chimeGain2.connect(master);
    chime2.start(tChime);
    chime2.stop(tChime + 0.19);
  } catch {
    /* silent fallback */
  }
};

/**
 * 4. COMMENT SOUND:
 * Distinct Airy Confirmation Swoosh & Soft Ping.
 * Smooth upward slide (440Hz -> 740Hz).
 */
export const playCommentSound = async () => {
  try {
    if (!isSoundEnabled()) return;
    const ctx = await ensureCtx();
    if (!ctx) return;

    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.38, t);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(740, t + 0.075);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.9, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.12);
  } catch {
    /* silent fallback */
  }
};
