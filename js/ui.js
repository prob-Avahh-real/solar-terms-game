/**
 * UI System — Native-grade HUD with bottom tab bar, haptic integration.
 */
export class UISystem {
  constructor(bridge) {
    this.bridge = bridge;
    this.elements = {};
    this.buildUI();
    this._plantingKeyHandler = null;
  }

  buildUI() {
    const hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.innerHTML = `
      <div id="hud-top">
        <div id="term-display"><div id="term-name"></div><div id="term-subtitle"></div></div>
        <div id="time-display"><div id="clock"></div><div id="temperature"></div></div>
      </div>
      <div id="crosshair">+</div>
      <div id="interaction-prompt" class="hidden"><span class="key-hint">E</span> <span id="interaction-text"></span></div>
      <div id="notification-area"></div>
      <div id="hud-bottom">
        <div class="hint-group"><span class="key-hint">W A S D</span> 移动 <span class="key-hint">Shift</span> 奔跑 <span class="key-hint">Space</span> 跳跃</div>
        <div class="hint-group"><span class="key-hint">E</span> 交互 <span class="key-hint">鼠标</span> 环顾 <span class="key-hint">T</span> 播种</div>
      </div>
      <div id="native-tab-bar">
        <div class="tab-item" data-action="inventory"><span class="tab-icon">🎒</span><span class="tab-label">背包</span></div>
        <div class="tab-item" data-action="farming"><span class="tab-icon">🌱</span><span class="tab-label">农耕</span></div>
        <div class="tab-item active" data-action="world"><span class="tab-icon">🌏</span><span class="tab-label">世界</span></div>
        <div class="tab-item" data-action="map"><span class="tab-icon">🗺️</span><span class="tab-label">地图</span></div>
        <div class="tab-item" data-action="settings"><span class="tab-icon">⚙️</span><span class="tab-label">设置</span></div>
      </div>
      <div id="planting-menu" class="menu-panel hidden"><div class="menu-title">选择种子</div><div id="seed-list"></div><div class="menu-hint">数字键选择 · ESC关闭</div></div>
      <div id="npc-dialog" class="menu-panel hidden"><div class="menu-title">村民</div><div id="npc-dialog-text"></div><div class="menu-hint">ESC关闭</div></div>
      <div id="harvest-popup" class="popup hidden"><div id="harvest-text"></div></div>
      <div id="minimap"><canvas id="minimap-canvas" width="120" height="120"></canvas><div id="minimap-label">地图</div></div>
      <div id="season-indicator"><div id="season-icon"></div></div>`;
    document.body.appendChild(hud);

    this.elements = {
      termName: q('#term-name'), termSubtitle: q('#term-subtitle'), clock: q('#clock'), temperature: q('#temperature'),
      interactionPrompt: q('#interaction-prompt'), interactionText: q('#interaction-text'),
      notificationArea: q('#notification-area'), plantingMenu: q('#planting-menu'), seedList: q('#seed-list'),
      npcDialog: q('#npc-dialog'), npcDialogText: q('#npc-dialog-text'),
      harvestPopup: q('#harvest-popup'), harvestText: q('#harvest-text'),
      minimapCanvas: q('#minimap-canvas'), seasonIcon: q('#season-icon'), tabBar: q('#native-tab-bar')
    };

    // Tab bar clicks
    if (this.elements.tabBar) {
      this.elements.tabBar.querySelectorAll('.tab-item').forEach(item => {
        item.addEventListener('click', () => {
          this.elements.tabBar.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
          item.classList.add('active');
          this.bridge?.hapticLight();
        });
      });
    }
  }

  showInteractionPrompt(t) { this.elements.interactionPrompt.classList.remove('hidden'); this.elements.interactionText.textContent = t; }
  hideInteractionPrompt() { this.elements.interactionPrompt.classList.add('hidden'); }

  showNotification(text, d = 3) {
    const n = document.createElement('div'); n.className = 'notification'; n.textContent = text;
    this.elements.notificationArea.appendChild(n);
    n.style.opacity = '0'; n.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => { n.style.opacity = '1'; n.style.transform = 'translateY(0)'; });
    setTimeout(() => { n.style.opacity = '0'; n.style.transform = 'translateY(-10px)'; setTimeout(() => n.remove(), 300); }, d * 1000);
  }

  showPlantingMenu(seeds, cb) {
    this.elements.plantingMenu.classList.remove('hidden');
    this.elements.seedList.innerHTML = '';
    seeds.forEach((s, i) => {
      const item = document.createElement('div'); item.className = 'seed-item';
      item.innerHTML = `<span class="seed-key">${i + 1}</span><span class="seed-name">${s.name}</span><span class="seed-crop">→ ${s.crop.name}</span><span class="seed-season">${s.crop.season.join('/')}</span>`;
      item.addEventListener('click', () => { cb(s.key); this.hidePlantingMenu(); this.bridge?.hapticLight(); });
      this.elements.seedList.appendChild(item);
    });
    const h = e => { const n = parseInt(e.key); if (n >= 1 && n <= seeds.length) { cb(seeds[n - 1].key); this.hidePlantingMenu(); document.removeEventListener('keydown', h); } };
    document.addEventListener('keydown', h); this._plantingKeyHandler = h;
  }
  hidePlantingMenu() { this.elements.plantingMenu.classList.add('hidden'); if (this._plantingKeyHandler) { document.removeEventListener('keydown', this._plantingKeyHandler); this._plantingKeyHandler = null; } }

  showNPCDialog(t) { this.elements.npcDialog.classList.remove('hidden'); this.elements.npcDialogText.textContent = t; }
  hideNPCDialog() { this.elements.npcDialog.classList.add('hidden'); }

  showHarvestPopup(c) { this.elements.harvestPopup.classList.remove('hidden'); this.elements.harvestText.textContent = `🌾 收获了 ${c}！`; setTimeout(() => this.elements.harvestPopup.classList.add('hidden'), 2000); }

  updateMinimap(pp, _, yaw) {
    const c = this.elements.minimapCanvas; if (!c) return;
    const ctx = c.getContext('2d'), s = 1.2, cx = 60, cy = 60;
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, 120, 120);
    const px = cx + pp.x * s, py = cy + pp.z * s;
    ctx.fillStyle = '#F44'; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#F44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(yaw) * 8, py + Math.cos(yaw) * 8); ctx.stroke();
  }

  updateTermDisplay(td, dc, sp) {
    this.elements.termName.textContent = td.termName;
    this.elements.termSubtitle.textContent = `${td.termNameEn} · ${td.description}`;
    this.elements.seasonIcon.textContent = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' }[td.season] || '🌍';
    const h = Math.floor(dc * 24), m = Math.floor((dc * 24 * 60) % 60);
    this.elements.clock.textContent = `${sp.intensity > 0.1 ? '☀' : '🌙'} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.elements.temperature.textContent = `${Math.floor(td.current.temperature.min + (td.current.temperature.max - td.current.temperature.min) * 0.5)}°C`;
  }

  showLoading(p, t) {
    let el = q('#loading-screen');
    if (!el) { el = document.createElement('div'); el.id = 'loading-screen'; el.innerHTML = `<div class="loading-content"><div class="loading-title">二十四节气 · 开放世界</div><div class="loading-bar-container"><div class="loading-bar" style="width:0%"></div></div><div class="loading-text">${t}</div></div>`; document.body.appendChild(el); }
    el.querySelector('.loading-bar').style.width = `${p * 100}%`;
    el.querySelector('.loading-text').textContent = t;
  }
  hideLoading() { const el = q('#loading-screen'); if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; setTimeout(() => el.remove(), 400); } }

  showPauseMenu() {
    let el = q('#pause-menu');
    if (!el) { el = document.createElement('div'); el.id = 'pause-menu'; el.className = 'menu-panel'; el.innerHTML = `<div class="menu-title">游戏暂停</div><div class="menu-item" id="resume-btn">▶ 继续游戏</div><div class="menu-item" id="restart-btn">🔄 重新开始</div><div class="menu-hint">按ESC继续</div>`; document.body.appendChild(el); }
    el.classList.remove('hidden'); return el;
  }
  hidePauseMenu() { q('#pause-menu')?.classList.add('hidden'); }

  dispose() { q('#game-hud')?.remove(); q('#loading-screen')?.remove(); q('#pause-menu')?.remove(); }
}

function q(s) { return document.querySelector(s); }
export default UISystem;
