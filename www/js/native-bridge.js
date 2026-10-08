/**
 * Native Bridge — Capacitor plugin abstraction for native mobile capabilities.
 * Graceful web fallback when running outside Capacitor.
 *
 * Native capabilities:
 *   - Haptic feedback (light/medium/heavy/success) on interactions
 *   - Status bar immersion control
 *   - App lifecycle (back button, foreground/background)
 *   - Device-aware performance tiering
 *   - Persistent native preferences storage
 *   - Splash screen control
 */
class NativeBridge {
  constructor() {
    this._ready = false;
    this._deviceInfo = null;
    this._platform = 'web';
  }

  /** Is this running inside Capacitor native shell? */
  get isNative() {
    return typeof window !== 'undefined' &&
      window.Capacitor?.isNativePlatform?.();
  }

  get platform() { return this._platform; }
  get isIOS() { return this._platform === 'ios'; }
  get isAndroid() { return this._platform === 'android'; }
  get deviceInfo() { return this._deviceInfo; }

  async init() {
    if (this._ready) return;

    if (this.isNative) {
      try {
        const { Device } = await import('@capacitor/device');
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const { SplashScreen } = await import('@capacitor/splash-screen');

        this._deviceInfo = await Device.getInfo();
        this._platform = this._deviceInfo?.platform || 'web';

        // Immersive status bar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0A0A14' });
        if (this.isAndroid) await StatusBar.hide();

        await SplashScreen.hide();

        console.log(`[NativeBridge] Ready | platform=${this._platform}`, this._deviceInfo);
      } catch (err) {
        console.warn('[NativeBridge] Partial init:', err.message);
      }
    }

    this._ready = true;
  }

  // -- Haptic Feedback --

  async _haptic(style) {
    if (!this.isNative) return;
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle[style] });
    } catch (_) {}
  }

  hapticLight() { return this._haptic('Light'); }
  hapticMedium() { return this._haptic('Medium'); }
  hapticHeavy() { return this._haptic('Heavy'); }

  async hapticSuccess() {
    if (!this.isNative) return;
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Success });
    } catch (_) {}
  }

  // -- App Lifecycle --

  onBackButton(callback) {
    if (!this.isNative || !this.isAndroid) return;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) callback?.();
      });
    }).catch(() => {});
  }

  onAppStateChange(onResume, onPause) {
    if (!this.isNative) return;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        isActive ? onResume?.() : onPause?.();
      });
    }).catch(() => {});
  }

  // -- Storage --

  async saveState(key, value) {
    if (this.isNative) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key, value: JSON.stringify(value) });
      } catch (_) { localStorage.setItem(key, JSON.stringify(value)); }
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  async loadState(key) {
    if (this.isNative) {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const result = await Preferences.get({ key });
        return result?.value ? JSON.parse(result.value) : null;
      } catch (_) { return JSON.parse(localStorage.getItem(key) || 'null'); }
    }
    return JSON.parse(localStorage.getItem(key) || 'null');
  }

  // -- Performance Tiering --

  getPerformanceTier() {
    if (!this._deviceInfo) {
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      return mobile ? 'low' : 'high';
    }
    const { platform, model } = this._deviceInfo;
    if (platform === 'ios') {
      const num = parseInt((/(\d+)/.exec(model || '') || [, '0'])[1]);
      return num >= 15 ? 'high' : num >= 12 ? 'medium' : 'low';
    }
    return 'medium';
  }

  get shadowEnabled() { return this.getPerformanceTier() === 'high'; }
  get particleMultiplier() {
    const t = this.getPerformanceTier();
    return t === 'high' ? 1.0 : t === 'medium' ? 0.5 : 0.3;
  }
}

export const nativeBridge = new NativeBridge();
export default nativeBridge;
