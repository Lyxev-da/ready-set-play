/** Tiny chiptune synth: square blips, triangle bass and noise thuds. No assets. */
const PENTA = [0, 2, 4, 7, 9];
const note = (i) => 261.63 * 2 ** ((PENTA[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5)) / 12);
class Sfx {
    muted = false;
    ctx = null;
    out = null;
    noiseBuf = null;
    ac() {
        if (this.muted || typeof window === 'undefined')
            return null;
        if (!this.ctx) {
            const AC = window.AudioContext ??
                window.webkitAudioContext;
            if (!AC)
                return null;
            try {
                this.ctx = new AC();
            }
            catch {
                return null;
            }
            this.out = this.ctx.createGain();
            this.out.gain.value = 0.45;
            this.out.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended')
            void this.ctx.resume();
        return this.ctx;
    }
    tone(freq, dur, type = 'square', vol = 0.08, delay = 0, slide = 0) {
        const c = this.ac();
        if (!c || !this.out)
            return;
        const t = c.currentTime + delay;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (slide)
            o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.setValueAtTime(vol, t + dur * 0.6);
        g.gain.linearRampToValueAtTime(0, t + dur);
        o.connect(g);
        g.connect(this.out);
        o.start(t);
        o.stop(t + dur + 0.02);
    }
    noise(dur, vol = 0.1, delay = 0) {
        const c = this.ac();
        if (!c || !this.out)
            return;
        if (!this.noiseBuf) {
            this.noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.4), c.sampleRate);
            const data = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < data.length; i++)
                data[i] = Math.random() * 2 - 1;
        }
        const t = c.currentTime + delay;
        const src = c.createBufferSource();
        src.buffer = this.noiseBuf;
        const g = c.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.linearRampToValueAtTime(0, t + dur);
        src.connect(g);
        g.connect(this.out);
        src.start(t);
        src.stop(t + dur + 0.02);
    }
    ui() {
        this.tone(660, 0.04, 'square', 0.04);
    }
    roll(charged) {
        this.tone(charged ? 240 : 170, 0.12, 'square', 0.06, 0, 2.4);
        if (charged)
            this.tone(480, 0.16, 'square', 0.05, 0.08, 2);
    }
    /** A digit locks. `run` is the length of the streak it extended (0 if none). */
    lock(run) {
        this.noise(0.05, 0.11);
        this.tone(run ? note(2 + run * 2) : 196, 0.06, 'square', run ? 0.09 : 0.06);
    }
    tense(level) {
        this.tone(98 + level * 26, 0.24, 'triangle', 0.1, 0, 1.35);
    }
    /** One digit is claimed by pattern `h`. */
    blip(h, j) {
        this.tone(note(3 + h + j), 0.05, 'square', 0.055);
    }
    hit(h, grade) {
        this.tone(note(6 + h * 2), 0.08, 'square', 0.085);
        this.tone(note(8 + h * 2), 0.14, 'square', 0.085, 0.07);
        if (grade >= 3)
            this.tone(note(11 + h * 2), 0.2, 'square', 0.07, 0.14);
    }
    rumble(sec) {
        this.tone(46, sec, 'sawtooth', 0.09, 0, 2.6);
        this.tone(92, sec, 'triangle', 0.07, 0, 2.6);
    }
    tier(t) {
        if (t === 0) {
            this.tone(130, 0.09, 'triangle', 0.09);
            return;
        }
        const lines = [[], [5, 7], [5, 7, 9], [5, 7, 9, 12], [5, 7, 9, 12, 9, 12, 14], [5, 9, 12, 14, 12, 14, 17]];
        const seq = lines[Math.min(t, 5)];
        const step = t >= 4 ? 0.085 : 0.07;
        seq.forEach((n, i) => {
            const last = i === seq.length - 1;
            this.tone(note(n), last ? 0.34 : step * 1.1, 'square', 0.085, i * step);
        });
        if (t >= 3) {
            this.noise(0.25, 0.12);
            this.tone(note(seq[0] - 10), 0.5, 'triangle', 0.12, 0);
        }
        if (t >= 4)
            this.tone(note(seq[seq.length - 1] - 5), 0.55, 'triangle', 0.1, seq.length * step);
        if (t >= 6) {
            for (let i = 0; i < 8; i++)
                this.tone(note(15 + i), 0.06, 'square', 0.045, seq.length * step + 0.1 + i * 0.05);
        }
    }
    coin() {
        this.tone(988, 0.06, 'square', 0.06);
        this.tone(1319, 0.2, 'square', 0.06, 0.06);
    }
    buy() {
        [7, 9, 12].forEach((n, i) => this.tone(note(n), 0.07, 'square', 0.07, i * 0.055));
    }
    deny() {
        this.tone(110, 0.13, 'sawtooth', 0.06);
    }
    claim() {
        this.coin();
        [10, 12, 14].forEach((n, i) => this.tone(note(n), 0.08, 'square', 0.06, 0.22 + i * 0.06));
    }
}
export const sfx = new Sfx();
