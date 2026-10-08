/**
 * Farming System - Plant, grow, harvest crops based on solar terms
 */
import { lerp } from './solarTerms.js';

export class FarmingSystem {
  constructor(scene, THREE) {
    this.scene = scene;
    this.THREE = THREE;
    this.plots = [];
    this.seedInventory = {};
    this.harvestInventory = {};
  }

  /** Crop definitions */
  static CROPS = {
    wheat_winter: { name: '冬小麦', growTime: 60, color: 0xD4A840, stages: 4, season: ['spring'] },
    wheat: { name: '小麦', growTime: 50, color: 0xD4A840, stages: 4, season: ['spring', 'summer'] },
    wheat_harvest: { name: '成熟小麦', growTime: 30, color: 0xE8C440, stages: 3, season: ['summer'] },
    rice: { name: '水稻', growTime: 55, color: 0x5B8A2B, stages: 5, season: ['spring', 'summer'] },
    rice_early: { name: '早稻', growTime: 45, color: 0x6B9A3B, stages: 4, season: ['spring'] },
    rice_late: { name: '晚稻', growTime: 50, color: 0x5B8A2B, stages: 4, season: ['autumn'] },
    rice_harvest: { name: '成熟水稻', growTime: 25, color: 0xE8C840, stages: 3, season: ['summer', 'autumn'] },
    corn: { name: '玉米', growTime: 50, color: 0x88A830, stages: 4, season: ['summer'] },
    corn_harvest: { name: '成熟玉米', growTime: 25, color: 0xE8B840, stages: 3, season: ['summer'] },
    soybean: { name: '大豆', growTime: 40, color: 0x6A8A30, stages: 3, season: ['summer'] },
    sorghum: { name: '高粱', growTime: 48, color: 0x8A4A20, stages: 4, season: ['summer'] },
    sorghum_harvest: { name: '成熟高粱', growTime: 24, color: 0xA44A20, stages: 3, season: ['summer', 'autumn'] },
    millet: { name: '小米', growTime: 35, color: 0xC8A030, stages: 3, season: ['spring'] },
    cotton: { name: '棉花', growTime: 45, color: 0xFFFFF0, stages: 4, season: ['spring'] },
    tea: { name: '茶', growTime: 60, color: 0x4A7A2A, stages: 3, season: ['spring'] },
    vegetable_early: { name: '早春蔬菜', growTime: 25, color: 0x5AAA3A, stages: 3, season: ['spring'] },
    vegetable_spring: { name: '春菜', growTime: 30, color: 0x5AAA3A, stages: 3, season: ['spring'] },
    vegetable_summer: { name: '夏菜', growTime: 30, color: 0x4A9A3A, stages: 3, season: ['summer'] },
    herb: { name: '草药', growTime: 40, color: 0x5A8A5A, stages: 3, season: ['spring', 'summer'] },
    herb_summer: { name: '夏草药', growTime: 35, color: 0x4A7A4A, stages: 3, season: ['summer'] },
    melon: { name: '瓜类', growTime: 45, color: 0x88B840, stages: 4, season: ['summer'] },
    watermelon: { name: '西瓜', growTime: 50, color: 0x3A8A2A, stages: 4, season: ['summer'] },
    lotus: { name: '荷花/莲藕', growTime: 55, color: 0xFF88AA, stages: 4, season: ['summer'] },
    persimmon: { name: '柿子', growTime: 60, color: 0xFF6A20, stages: 3, season: ['autumn'] },
    apple: { name: '苹果', growTime: 55, color: 0xFF3040, stages: 3, season: ['autumn'] },
    chestnut: { name: '栗子', growTime: 50, color: 0x8A5A2A, stages: 3, season: ['autumn'] },
    peanut: { name: '花生', growTime: 40, color: 0xA08040, stages: 3, season: ['autumn'] },
    sweet_potato: { name: '红薯', growTime: 50, color: 0x8A4020, stages: 3, season: ['autumn'] },
    chrysanthemum: { name: '菊花', growTime: 40, color: 0xFFFF40, stages: 3, season: ['autumn'] },
    pomegranate: { name: '石榴', growTime: 55, color: 0xFF2040, stages: 3, season: ['autumn'] },
    mushroom: { name: '蘑菇', growTime: 25, color: 0xC8B898, stages: 2, season: ['autumn'] },
    ginger: { name: '姜', growTime: 45, color: 0xA08040, stages: 3, season: ['autumn'] },
    cabbage_winter: { name: '冬白菜', growTime: 40, color: 0x8A9A8A, stages: 3, season: ['winter'] },
    radish: { name: '萝卜', growTime: 30, color: 0xFF6040, stages: 3, season: ['winter'] }
  };

  /** Seed data for available planting */
  static SEEDS = {
    wheat_seed: { name: '小麦种子', crop: 'wheat', color: 0xA08030 },
    rice_seed: { name: '水稻种子', crop: 'rice', color: 0x406820 },
    corn_seed: { name: '玉米种子', crop: 'corn', color: 0x606820 },
    soybean_seed: { name: '大豆种子', crop: 'soybean', color: 0x506020 },
    sorghum_seed: { name: '高粱种子', crop: 'sorghum', color: 0x6A3020 },
    millet_seed: { name: '小米种子', crop: 'millet', color: 0xA08020 },
    cotton_seed: { name: '棉花种子', crop: 'cotton', color: 0xFFFFF0 },
    tea_seed: { name: '茶籽', crop: 'tea', color: 0x3A6020 },
    vegetable_seed: { name: '蔬菜种子', crop: 'vegetable_spring', color: 0x408030 },
    melon_seed: { name: '瓜种', crop: 'melon', color: 0x608020 },
    watermelon_seed: { name: '西瓜种子', crop: 'watermelon', color: 0x206820 },
    lotus_seed: { name: '莲子', crop: 'lotus', color: 0x804020 },
    herb_seed: { name: '草药种子', crop: 'herb', color: 0x406040 },
    chrysanthemum_seed: { name: '菊花种子', crop: 'chrysanthemum', color: 0x806020 },
    cabbage_seed: { name: '白菜种子', crop: 'cabbage_winter', color: 0x607060 },
    radish_seed: { name: '萝卜种子', crop: 'radish', color: 0xFF4020 }
  };

  /** Create farm plot visual */
  createPlot(x, z, worldHeightFn) {
    const THREE = this.THREE;
    const y = worldHeightFn(x, z);
    const group = new THREE.Group();

    // Tilled soil
    const soilGeom = new THREE.PlaneGeometry(2, 2);
    soilGeom.rotateX(-Math.PI / 2);
    const soil = new THREE.Mesh(soilGeom, new THREE.MeshStandardMaterial({
      color: 0x5A4A2A,
      roughness: 0.9
    }));
    soil.position.y = 0.02;
    soil.receiveShadow = true;
    group.add(soil);

    // Crop visual (hidden initially)
    const cropGroup = new THREE.Group();
    cropGroup.visible = false;
    group.add(cropGroup);

    group.position.set(x, y, z);
    group.name = 'farm_plot';
    this.scene.add(group);

    const plot = {
      id: this.plots.length,
      mesh: group,
      soilMesh: soil,
      cropGroup,
      position: { x, z },
      planted: null,  // seed type or null
      growProgress: 0, // 0 to 1
      stageIndex: 0,
      harvestable: false,
      watered: false
    };

    this.plots.push(plot);
    return plot;
  }

  /** Plant a seed in a plot */
  plant(plotId, seedType) {
    const plot = this.plots[plotId];
    if (!plot || plot.planted) return false;

    const seed = FarmingSystem.SEEDS[seedType];
    if (!seed) return false;

    const crop = FarmingSystem.CROPS[seed.crop];
    if (!crop) return false;

    plot.planted = seedType;
    plot.growProgress = 0;
    plot.stageIndex = 0;
    plot.harvestable = false;
    plot.watered = false;

    this.updatePlotVisual(plot);
    return true;
  }

  /** Water a plot */
  water(plotId) {
    const plot = this.plots[plotId];
    if (!plot || !plot.planted) return false;
    plot.watered = true;
    return true;
  }

  /** Harvest a plot */
  harvest(plotId) {
    const plot = this.plots[plotId];
    if (!plot || !plot.harvestable) return null;

    const seed = FarmingSystem.SEEDS[plot.planted];
    const crop = FarmingSystem.CROPS[seed.crop];

    // Add to inventory
    const cropKey = seed.crop;
    this.harvestInventory[cropKey] = (this.harvestInventory[cropKey] || 0) + 1;

    // Reset plot
    plot.planted = null;
    plot.growProgress = 0;
    plot.stageIndex = 0;
    plot.harvestable = false;
    plot.watered = false;
    plot.cropGroup.visible = false;

    // Clear crop visual
    while (plot.cropGroup.children.length > 0) {
      plot.cropGroup.remove(plot.cropGroup.children[0]);
    }

    return {
      crop: crop.name,
      key: cropKey,
      plotId
    };
  }

  /** Update crop visual based on growth stage */
  updatePlotVisual(plot) {
    const THREE = this.THREE;
    const seed = FarmingSystem.SEEDS[plot.planted];
    if (!seed) return;

    const crop = FarmingSystem.CROPS[seed.crop];
    plot.cropGroup.visible = true;

    // Clear old visual
    while (plot.cropGroup.children.length > 0) {
      plot.cropGroup.remove(plot.cropGroup.children[0]);
    }

    if (plot.harvestable) {
      // Fully grown - show harvestable visual
      const grownGeom = new THREE.ConeGeometry(0.4, 1.5, 8);
      const grownMesh = new THREE.Mesh(grownGeom, new THREE.MeshStandardMaterial({
        color: crop.color,
        roughness: 0.6
      }));
      grownMesh.position.y = 0.75;
      grownMesh.castShadow = true;
      plot.cropGroup.add(grownMesh);

      // Golden glow for harvestable
      const glowGeom = new THREE.SphereGeometry(0.2, 8, 8);
      const glow = new THREE.Mesh(glowGeom, new THREE.MeshBasicMaterial({
        color: 0xFFFF88,
        transparent: true,
        opacity: 0.3
      }));
      glow.position.y = 1.5;
      plot.cropGroup.add(glow);
    } else {
      // Growing stage
      const progress = plot.growProgress;
      const stages = crop.stages || 4;
      const stageHeight = (progress * stages) / stages * 1.5;

      for (let i = 0; i < Math.ceil(progress * stages); i++) {
        const leafGeom = new THREE.ConeGeometry(0.15, 0.4, 6);
        const leaf = new THREE.Mesh(leafGeom, new THREE.MeshStandardMaterial({
          color: crop.color,
          roughness: 0.7
        }));
        leaf.position.y = 0.2 + i * 0.35;
        leaf.position.x = (Math.random() - 0.5) * 0.3;
        leaf.position.z = (Math.random() - 0.5) * 0.3;
        leaf.castShadow = true;
        plot.cropGroup.add(leaf);
      }

      // Stem
      if (progress > 0.3) {
        const stemGeom = new THREE.CylinderGeometry(0.03, 0.03, stageHeight, 6);
        const stem = new THREE.Mesh(stemGeom, new THREE.MeshStandardMaterial({
          color: 0x4A7A2A,
          roughness: 0.8
        }));
        stem.position.y = stageHeight / 2;
        plot.cropGroup.add(stem);
      }
    }
  }

  /** Update all plots (growth over time) */
  update(deltaTime, termData) {
    const dt = Math.min(deltaTime, 0.1);

    for (const plot of this.plots) {
      if (!plot.planted || plot.harvestable) continue;

      const seed = FarmingSystem.SEEDS[plot.planted];
      if (!seed) continue;

      const crop = FarmingSystem.CROPS[seed.crop];

      // Check if this crop can grow in current season
      const seasonOk = crop.season.includes(termData.season);
      const growthRate = seasonOk ? 1 : 0.3;

      // Watered bonus
      const waterBonus = plot.watered ? 1.5 : 1;

      plot.growProgress += (dt / crop.growTime) * growthRate * waterBonus;

      if (plot.growProgress >= 1) {
        plot.growProgress = 1;
        plot.harvestable = true;
      }

      this.updatePlotVisual(plot);
    }
  }

  /** Get available seeds for current term */
  getAvailableSeeds(termData) {
    const available = [];
    for (const [key, seed] of Object.entries(FarmingSystem.SEEDS)) {
      const crop = FarmingSystem.CROPS[seed.crop];
      if (crop && crop.season.includes(termData.season)) {
        available.push({ key, ...seed, crop });
      }
    }
    return available;
  }

  getInteractables() {
    return this.plots.map(p => p.mesh);
  }

  getPlotAt(object) {
    for (const plot of this.plots) {
      if (plot.mesh === object || plot.mesh.children.includes(object)) {
        return plot;
      }
    }
    return null;
  }

  dispose() {
    for (const plot of this.plots) {
      this.scene.remove(plot.mesh);
    }
    this.plots = [];
  }
}

export default FarmingSystem;
