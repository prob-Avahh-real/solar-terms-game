/**
 * Mobile Touch Controls — Native-grade virtual joystick, drag-look, gestures.
 */
import { nativeBridge } from './native-bridge.js';

export class MobileControls {
  constructor() {
    this.isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent)
      || ('ontouchstart' in window && window.innerWidth < 1024);
    this.active = this.isMobile;
    this.bridge = nativeBridge;
    this.moveJoystick = { active: false, originX: 0, originY: 0, dx: 0, dy: 0, touchId: null };
    this.lookState = { active: false, lastX: 0, lastY: 0, dx: 0, dy: 0, touchId: null };
    this.pinchState = { active: false, dist: 0, touchIds: [] };
    this.output = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, jump: false, interact: false, sprint: false, plant: false, pause: false, pinchZoom: 1.0, longPress: false };
    this.joystickMaxRadius = 55; this.lookSensitivity = 0.003;
    this._longPressTimer = null; this._longPressFired = false;
    this._touchStart = this.onTouchStart.bind(this); this._touchMove = this.onTouchMove.bind(this);
    this._touchEnd = this.onTouchEnd.bind(this); this._resize = this.onResize.bind(this);
    if (this.isMobile) this.buildDOM();
  }
  buildDOM() {
    const c = document.createElement('div'); c.id = 'mobile-controls';
    c.innerHTML = `<div id="joystick-zone"><div id="joystick-base"><div id="joystick-thumb"></div></div></div><div id="look-zone"><div id="look-hint">滑动查看 · 双指缩放</div></div><div id="action-buttons"><button id="btn-jump" class="action-btn">跳</button><button id="btn-interact" class="action-btn primary">交互</button><button id="btn-plant" class="action-btn">种</button><button id="btn-sprint" class="action-btn sprint">跑</button></div><button id="btn-pause" class="top-btn">⏸</button>`;
    document.body.appendChild(c);
    this.el = { jb: gid('joystick-base'), jt: gid('joystick-thumb'), lh: gid('look-hint'), bj: gid('btn-jump'), bi: gid('btn-interact'), bp: gid('btn-plant'), bs: gid('btn-sprint'), bz: gid('btn-pause') };
    this._btn('btn-jump', 'jump'); this._btn('btn-interact', 'interact'); this._btn('btn-plant', 'plant');
    this.el.bs.addEventListener('touchstart', e => { e.preventDefault(); this.output.sprint = !this.output.sprint; this.el.bs.classList.toggle('active', this.output.sprint); this.bridge.hapticLight(); });
    this.el.bz.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this.output.pause = true; this.bridge.hapticMedium(); });
    this.el.bz.addEventListener('touchend', () => { this.output.pause = false; });
    document.addEventListener('touchstart', this._touchStart, { passive: false });
    document.addEventListener('touchmove', this._touchMove, { passive: false });
    document.addEventListener('touchend', this._touchEnd);
    document.addEventListener('touchcancel', this._touchEnd);
    window.addEventListener('resize', this._resize);
    const b = gid('hud-bottom'); if (b) b.style.display = 'none';
    const x = gid('crosshair'); if (x) x.style.display = 'none';
  }
  _btn(id, a) {
    const b = gid(id); if (!b) return;
    b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); this.output[a] = true; b.classList.add('pressed'); this.bridge.hapticLight(); });
    b.addEventListener('touchend', () => { this.output[a] = false; b.classList.remove('pressed'); });
    b.addEventListener('touchcancel', () => { this.output[a] = false; b.classList.remove('pressed'); });
  }
  onTouchStart(e) {
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY, w = window.innerWidth;
      if (x < w * 0.4 && !this.moveJoystick.active) {
        this.moveJoystick.active = true; this.moveJoystick.touchId = t.identifier;
        this.moveJoystick.originX = x; this.moveJoystick.originY = y;
        this.el.jb.style.left = `${x}px`; this.el.jb.style.top = `${y}px`; this.el.jb.style.opacity = '1';
        this.el.jt.style.transform = 'translate(-50%,-50%)';
      }
      if (x > w * 0.4 && !this.lookState.active) {
        this.lookState.active = true; this.lookState.touchId = t.identifier;
        this.lookState.lastX = x; this.lookState.lastY = y; this.lookState.dx = 0; this.lookState.dy = 0;
        if (this.el.lh) this.el.lh.style.opacity = '0';
        this._longPressFired = false;
        this._longPressTimer = setTimeout(() => { this._longPressFired = true; this.output.longPress = true; setTimeout(() => this.output.longPress = false, 100); }, 600);
      }
      if (x > w * 0.4 && this.lookState.active && t.identifier !== this.lookState.touchId && !this.pinchState.active) {
        this.pinchState.active = true; this.pinchState.touchIds = [this.lookState.touchId, t.identifier];
        const t1 = this._findTouch(this.lookState.touchId);
        if (t1) this.pinchState.dist = Math.hypot(t.clientX - t1.clientX, t.clientY - t1.clientY);
      }
    }
  }
  _findTouch(id) { for (const t of (this._lastTouches || [])) if (t.identifier === id) return t; return null; }
  onTouchMove(e) {
    e.preventDefault(); this._lastTouches = Array.from(e.touches);
    for (const t of e.changedTouches) {
      if (this.moveJoystick.active && t.identifier === this.moveJoystick.touchId) {
        const dx = t.clientX - this.moveJoystick.originX, dy = t.clientY - this.moveJoystick.originY;
        const dist = Math.hypot(dx, dy), cl = Math.min(dist, this.joystickMaxRadius), a = Math.atan2(dx, dy);
        this.moveJoystick.dx = Math.sin(a) * (cl / this.joystickMaxRadius);
        this.moveJoystick.dy = -Math.cos(a) * (cl / this.joystickMaxRadius);
        this.el.jt.style.transform = `translate(calc(-50% + ${Math.sin(a)*cl}px), calc(-50% + ${-Math.cos(a)*cl}px))`;
      }
      if (this.lookState.active && t.identifier === this.lookState.touchId) {
        if (this._longPressTimer && !this._longPressFired) { clearTimeout(this._longPressTimer); this._longPressTimer = null; }
        this.lookState.dx = t.clientX - this.lookState.lastX; this.lookState.dy = t.clientY - this.lookState.lastY;
        this.lookState.lastX = t.clientX; this.lookState.lastY = t.clientY;
      }
      if (this.pinchState.active && this.pinchState.touchIds.includes(t.identifier)) {
        const t0 = this._findTouch(this.pinchState.touchIds[0]), t1 = this._findTouch(this.pinchState.touchIds[1]);
        if (t0 && t1) { const nd = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY); if (this.pinchState.dist > 0) { this.output.pinchZoom = nd / this.pinchState.dist; this.pinchState.dist = nd; } }
      }
    }
  }
  onTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (this.moveJoystick.active && t.identifier === this.moveJoystick.touchId) { this.moveJoystick.active = false; this.moveJoystick.touchId = null; this.moveJoystick.dx = 0; this.moveJoystick.dy = 0; this.el.jb.style.opacity = '0'; this.el.jt.style.transform = 'translate(-50%,-50%)'; }
      if (this.lookState.active && t.identifier === this.lookState.touchId) { this.lookState.active = false; this.lookState.touchId = null; this.lookState.dx = 0; this.lookState.dy = 0; }
      if (this.pinchState.active && this.pinchState.touchIds.includes(t.identifier)) { this.pinchState.active = false; this.pinchState.touchIds = []; this.output.pinchZoom = 1.0; }
    }
    clearTimeout(this._longPressTimer); this._longPressTimer = null;
  }
  onResize() { this.moveJoystick.active = false; this.lookState.active = false; this.pinchState.active = false; }
  poll() {
    if (!this.isMobile) return;
    this.output.moveX = this.moveJoystick.dx; this.output.moveY = this.moveJoystick.dy;
    this.output.lookX = this.lookState.dx * this.lookSensitivity; this.output.lookY = this.lookState.dy * this.lookSensitivity;
    this.lookState.dx = 0; this.lookState.dy = 0;
  }
  dispose() {
    document.removeEventListener('touchstart', this._touchStart); document.removeEventListener('touchmove', this._touchMove);
    document.removeEventListener('touchend', this._touchEnd); document.removeEventListener('touchcancel', this._touchEnd);
    window.removeEventListener('resize', this._resize); gid('mobile-controls')?.remove();
  }
}
function gid(s) { return document.getElementById(s); }
export default MobileControls;
