/**
 * 二十四节气 · 开放世界 — Capacitor Native Game
 * Main Entry: integrates native bridge, performance tiering, haptics, lifecycle.
 */
import { getCurrentTermData, getDayCycle, getSunPosition } from './solarTerms.js';
import { WorldBuilder } from './world.js';
import { WeatherSystem } from './weather.js';
import { PlayerController } from './player.js';
import { EntityManager } from './entities.js';
import { FarmingSystem } from './farming.js';
import { UISystem } from './ui.js';
import { MobileControls } from './mobile.js';
import { nativeBridge } from './native-bridge.js';

class Game {
  constructor() {
    this.THREE = null; this.scene = null; this.camera = null; this.renderer = null;
    this.world = null; this.weather = null; this.player = null;
    this.entities = null; this.farming = null; this.ui = null; this.mobile = null;
    this.bridge = nativeBridge;
    this.elapsedGameTime = 0; this.lastTermIndex = -1;
    this.isPaused = false; this.isRunning = false;
    this.directionalLight = null; this.ambientLight = null;
    this.interactables = []; this.currentInteractTarget = null;
    this.isMobile = false; this._baseFov = 70;
  }

  async init() {
    await this.bridge.init();
    this.THREE = await this.loadThreeJS();
    const THREE = this.THREE;

    this.mobile = new MobileControls();
    this.isMobile = this.mobile.isMobile;
    this.ui = new UISystem(this.bridge);
    this.ui.showLoading(0.1, '启动原生引擎...');

    const tier = this.bridge.getPerformanceTier();
    this.renderer = new THREE.WebGLRenderer({
      antialias: tier !== 'low', alpha: false,
      powerPreference: this.bridge.isNative ? 'high-performance' : (this.isMobile ? 'low-power' : 'high-performance')
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 'high' ? 2 : 1.5));
    this.renderer.shadowMap.enabled = tier === 'high';
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.FogExp2(0xC8DCE8, 0.001);
    this.camera = new THREE.PerspectiveCamera(this._baseFov, window.innerWidth / window.innerHeight, 0.8, 160);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.ui.showLoading(0.2, '设置光照...');
    this.setupLighting();
    this.ui.showLoading(0.3, '生成地形...');
    this.world = new WorldBuilder(this.scene, THREE);
    this.world.buildAll();
    this.world.setAmbientLight(this.ambientLight);
    this.ui.showLoading(0.5, '设置天气...');
    this.weather = new WeatherSystem(this.scene, THREE);
    this.weather.setAmbientLight(this.ambientLight);
    this.ui.showLoading(0.6, '准备玩家...');
    this.player = new PlayerController(this.camera, this.scene, THREE, this.mobile);
    this.ui.showLoading(0.7, '生成NPC...');
    this.entities = new EntityManager(this.scene, THREE);

    this.farming = new FarmingSystem(this.scene, THREE);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      this.farming.createPlot(-20 + c * 4, 3 + r * 4, (x, z) => this.world.getHeight(x, z));
    for (let i = 0; i < 4; i++)
      this.entities.createNPC(-12 + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 10, (x, z) => this.world.getHeight(x, z));

    this.ui.showLoading(0.9, '初始化世界...');
    const itd = getCurrentTermData(0);
    this.lastTermIndex = itd.termIndex;
    this.weather.updateForTerm(itd, 0);
    this.world.updateForTerm(itd);

    const saved = await this.bridge.loadState('solar-terms-save');
    if (saved) { this.elapsedGameTime = saved.elapsedGameTime || 0; if (saved.player) this.player.deserialize(saved.player); }

    this.bridge.onBackButton(() => this.togglePause());
    this.bridge.onAppStateChange(() => { this.isPaused = false; }, () => { this.isPaused = true; this.saveGame(); });
    document.addEventListener('keydown', e => { if (e.code === 'Escape') this.togglePause(); });

    this.ui.showLoading(1.0, '准备就绪！');
    this.ui.hideLoading();
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  async saveGame() {
    await this.bridge.saveState('solar-terms-save', {
      elapsedGameTime: this.elapsedGameTime, player: this.player.serialize()
    });
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.saveGame();
      const m = this.ui.showPauseMenu();
      const r = document.getElementById('resume-btn');
      if (r) r.onclick = () => { this.isPaused = false; this.ui.hidePauseMenu(); };
      const s = document.getElementById('restart-btn');
      if (s) s.onclick = () => location.reload();
    } else { this.ui.hidePauseMenu(); }
  }

  async loadThreeJS() {
    return new Promise((resolve, reject) => {
      if (typeof window.THREE !== 'undefined') { resolve(window.THREE); return; }
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/three@0.160.0/build/three.min.js';
      s.onload = () => { if (typeof window.THREE !== 'undefined') resolve(window.THREE); else reject(new Error('THREE not found')); };
      s.onerror = () => reject(new Error('Three.js load failed'));
      document.head.appendChild(s);
    });
  }

  setupLighting() {
    const shadow = this.bridge.shadowEnabled, T = this.THREE;
    this.ambientLight = new T.AmbientLight(0xE8F0F8, 1.0); this.scene.add(this.ambientLight);
    this.directionalLight = new T.DirectionalLight(0xFFFFEE, 3.0);
    this.directionalLight.position.set(30, 40, 20); this.directionalLight.castShadow = shadow;
    if (shadow) {
      this.directionalLight.shadow.mapSize.width = 1024; this.directionalLight.shadow.mapSize.height = 1024;
      this.directionalLight.shadow.camera.near = 0.5; this.directionalLight.shadow.camera.far = 150;
      this.directionalLight.shadow.camera.left = -60; this.directionalLight.shadow.camera.right = 60;
      this.directionalLight.shadow.camera.top = 60; this.directionalLight.shadow.camera.bottom = -60;
    }
    this.scene.add(this.directionalLight);
    this.scene.add(new T.HemisphereLight(0x87CEEB, 0x4A5A2A, 0.6));
  }

  gameLoop() {
    if (!this.isRunning) return;
    requestAnimationFrame(() => this.gameLoop());
    if (this.isPaused) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now; this.elapsedGameTime += dt;
    const td = getCurrentTermData(this.elapsedGameTime);
    const dc = getDayCycle(this.elapsedGameTime);
    const sp = getSunPosition(dc, td.current);

    if (td.termIndex !== this.lastTermIndex) { this.lastTermIndex = td.termIndex; this.bridge.hapticHeavy(); this.onTermChange(td); }
    this.world.updateForTerm(td);
    if (Math.floor(this.elapsedGameTime) % 15 === 0 && !this._lw) { this._lw = Math.floor(this.elapsedGameTime); this.weather.updateForTerm(td, dt); }
    if (Math.floor(this.elapsedGameTime) % 15 !== 0) this._lw = null;
    this.weather.update(dt, this.elapsedGameTime);

    if (this.isMobile && this.mobile.output.pause && !this._ph) { this._ph = true; this.togglePause(); }
    if (this.isMobile && !this.mobile.output.pause) this._ph = false;

    if (this.isMobile && this.mobile.output.pinchZoom !== 1.0)
      this.camera.fov = Math.max(40, Math.min(100, this._baseFov / this.mobile.output.pinchZoom));
    else if (this.camera.fov !== this._baseFov) {
      this.camera.fov += (this._baseFov - this.camera.fov) * 0.2;
      if (Math.abs(this.camera.fov - this._baseFov) < 0.5) this.camera.fov = this._baseFov;
    }
    this.camera.updateProjectionMatrix();

    this.player.update(dt, (x, z) => this.world.getHeight(x, z));
    this.entities.update(dt, this.elapsedGameTime, (x, z) => this.world.getHeight(x, z));
    this.farming.update(dt, td);
    this.interactables = [...this.entities.getInteractables(), ...this.farming.getInteractables()];
    const tgt = this.player.getInteractionTarget(this.interactables);
    if (tgt?.object) {
      this.currentInteractTarget = tgt.object;
      const n = this.entities.getNPCAt(tgt.object), p = this.farming.getPlotAt(tgt.object);
      if (n) this.ui.showInteractionPrompt(this.isMobile ? '交谈' : '与村民交谈');
      else if (p) {
        if (p.harvestable) this.ui.showInteractionPrompt(this.isMobile ? '收获' : '收获作物');
        else if (!p.planted) this.ui.showInteractionPrompt(this.isMobile ? '种植' : '种植作物');
        else this.ui.showInteractionPrompt(this.isMobile ? '查看' : '查看作物');
      }
    } else { this.currentInteractTarget = null; this.ui.hideInteractionPrompt(); }

    const wi = this.isMobile ? this.mobile.output.interact : this.player.moveState.interact;
    if (wi && this.player.interactCooldown <= 0 && this.currentInteractTarget)
      { this.player.interactCooldown = 0.5; this.handleInteraction(this.currentInteractTarget); }
    if (this.isMobile && this.mobile.output.plant && !this._plh) { this._plh = true; this.handleQuickPlant(); }
    if (this.isMobile && !this.mobile.output.plant) this._plh = false;

    this.directionalLight.position.set(Math.cos(sp.azimuth) * 50, Math.sin(sp.altitude) * 40 + 5, Math.sin(sp.azimuth) * 50);
    this.directionalLight.intensity = Math.max(0.3, sp.intensity * 3);
    const st = new this.THREE.Color(td.current.skyColor.top), ns = new this.THREE.Color(0x0A0A20);
    this.scene.background = new this.THREE.Color().lerpColors(ns, st, Math.max(0, sp.intensity));
    this.ui.updateTermDisplay(td, dc, sp);
    this.ui.updateMinimap(this.player.position, null, this.player.yaw);
    this.renderer.render(this.scene, this.camera);
  }

  handleInteraction(o) {
    const n = this.entities.getNPCAt(o), p = this.farming.getPlotAt(o);
    if (n) { this.ui.showNPCDialog(n.data.dialog); this.ui.showNotification(`村民：${n.data.dialog}`); this.bridge.hapticMedium(); }
    else if (p) {
      if (p.harvestable) {
        const r = this.farming.harvest(p.id);
        if (r) { this.ui.showHarvestPopup(r.crop); this.ui.showNotification(`收获了 ${r.crop}！`); this.bridge.hapticSuccess(); }
      } else if (!p.planted) { this.openPlantMenu(p.id); this.bridge.hapticLight(); }
      else { const s = FarmingSystem.SEEDS[p.planted], c = FarmingSystem.CROPS[s?.crop]; if (s && c) this.ui.showNotification(`${s.name} → ${c.name} (${Math.floor(p.growProgress * 100)}%)`); }
    }
  }

  handleQuickPlant() {
    let np = null, nd = 5;
    for (const p of this.farming.plots)
      if (!p.planted) { const d = Math.hypot(this.player.position.x - p.position.x, this.player.position.z - p.position.z); if (d < nd) { nd = d; np = p; } }
    if (np) this.openPlantMenu(np.id);
  }

  openPlantMenu(pid) {
    const seeds = this.farming.getAvailableSeeds(getCurrentTermData(this.elapsedGameTime));
    if (seeds.length) this.ui.showPlantingMenu(seeds, st => {
      const planted = this.farming.plant(pid, st);
      if (planted) { this.ui.showNotification(`种植了 ${FarmingSystem.SEEDS[st].name}`); this.bridge.hapticLight(); }
    });
    else this.ui.showNotification('当前节气没有可种植的作物');
  }

  onTermChange(td) {
    this.ui.showNotification(`节气变换：${td.termName} · ${td.termNameEn}`, 4);
    this.bridge.hapticHeavy();
    this.entities.clearAll();
    for (let i = 0; i < 4; i++) this.entities.createNPC(-12 + (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 10, (x, z) => this.world.getHeight(x, z));
    this.entities.spawnForTerm(td.current, (x, z) => this.world.getHeight(x, z));
  }
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyT' && window.gameInstance && !window.gameInstance.isMobile)
    window.gameInstance.handleQuickPlant();
});

window.addEventListener('DOMContentLoaded', async () => {
  const game = new Game(); window.gameInstance = game;
  game.init().catch(err => { console.error('Init failed:', err); document.querySelector('.loading-text')?.textContent = '初始化失败，请刷新重试'; });
});

export default Game;
