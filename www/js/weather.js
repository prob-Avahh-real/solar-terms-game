/**
 * Weather System - Rain, snow, fog, thunder, petal particles
 * Dynamic weather that changes with solar terms
 */
import { lerp } from './solarTerms.js';

export class WeatherSystem {
  constructor(scene, THREE) {
    this.scene = scene;
    this.THREE = THREE;
    this.particleSystems = {};
    this.currentWeather = 'clear';
    this.particlePool = [];
    this.lightningTimer = 0;
    this.lightningActive = false;
    this.rainSoundTimer = 0;
  }

  createRainSystem(density = 0.5) {
    const THREE = this.THREE;
    const count = Math.floor(3000 * density);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 30 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      velocities[i] = 15 + Math.random() * 25;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.userData = { velocities, count };

    const material = new THREE.PointsMaterial({
      color: 0x88aacc,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.name = 'rain';
    points.renderOrder = 999;
    points.material.depthTest = true;
    points.material.depthWrite = false;
    this.scene.add(points);
    this.particleSystems.rain = points;
    return points;
  }

  createSnowSystem(density = 0.5) {
    const THREE = this.THREE;
    const count = Math.floor(2000 * density);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);
    const wobbles = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 30 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      velocities[i] = 1 + Math.random() * 3;
      wobbles[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.userData = { velocities, count, wobbles };

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.4,
      transparent: true,
      opacity: 0.8,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.name = 'snow';
    points.renderOrder = 999;
    points.material.depthTest = true;
    points.material.depthWrite = false;
    this.scene.add(points);
    this.particleSystems.snow = points;
    return points;
  }

  createFogParticles(density = 0.3) {
    const THREE = this.THREE;
    const count = Math.floor(500 * density);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 90;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 2 + Math.random() * 3,
      transparent: true,
      opacity: 0.15,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.name = 'fog';
    points.renderOrder = 998;
    points.material.depthTest = true;
    points.material.depthWrite = false;
    this.scene.add(points);
    this.particleSystems.fog = points;
    return points;
  }

  createPetalSystem(density = 0.5) {
    const THREE = this.THREE;
    const count = Math.floor(200 * density);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 20 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = -1 - Math.random() * 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.userData = { velocities, count };

    const material = new THREE.PointsMaterial({
      color: 0xffaacc,
      size: 0.3,
      transparent: true,
      opacity: 0.7,
      blending: THREE.NormalBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.name = 'petals';
    points.renderOrder = 999;
    points.material.depthTest = true;
    points.material.depthWrite = false;
    this.scene.add(points);
    this.particleSystems.petals = points;
    return points;
  }

  createFireflySystem(density = 0.5) {
    const THREE = this.THREE;
    const count = Math.floor(100 * density);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = 0.5 + Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.userData = { phases, count };

    const material = new THREE.PointsMaterial({
      color: 0xffff88,
      size: 0.25,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.name = 'fireflies';
    points.renderOrder = 999;
    points.material.depthTest = true;
    points.material.depthWrite = false;
    this.scene.add(points);
    this.particleSystems.fireflies = points;
    return points;
  }

  /** Remove all particle systems */
  clearAll() {
    for (const key of Object.keys(this.particleSystems)) {
      const sys = this.particleSystems[key];
      if (sys) {
        this.scene.remove(sys);
        if (sys.geometry) sys.geometry.dispose();
        if (sys.material) sys.material.dispose();
      }
    }
    this.particleSystems = {};
    this.currentWeather = 'clear';
  }

  /** Update weather based on current solar term */
  updateForTerm(termData, deltaTime) {
    const term = termData.current;
    const next = termData.next;
    const blend = termData.blend;

    this.clearAll();

    const rainProb = lerp(term.weather.rain, next.weather.rain, blend);
    const snowProb = lerp(term.weather.snow, next.weather.snow, blend);
    const fogProb = lerp(term.weather.fog, next.weather.fog, blend);
    const clearProb = lerp(term.weather.clear, next.weather.clear, blend);
    const stormProb = lerp(term.weather.storm, next.weather.storm, blend);

    const particleType = term.particles.type;

    // Determine active weather
    const roll = Math.random();
    let cumulative = 0;

    cumulative += snowProb;
    if (roll < cumulative && snowProb > 0.05) {
      this.currentWeather = 'snow';
      this.createSnowSystem(lerp(term.particles.density, next.particles.density, blend));
      return;
    }

    cumulative += rainProb;
    if (roll < cumulative && rainProb > 0.05) {
      this.currentWeather = 'rain';
      this.createRainSystem(lerp(term.particles.density, next.particles.density, blend) * (stormProb > 0.15 ? 1.5 : 1));
      if (stormProb > 0.15) {
        this.currentWeather = 'storm';
      }
      return;
    }

    cumulative += fogProb;
    if (roll < cumulative && fogProb > 0.1) {
      this.currentWeather = 'fog';
      this.createFogParticles(lerp(term.particles.density, next.particles.density, blend));
      return;
    }

    // Special particle types
    if (particleType === 'petals' || particleType === 'pollen') {
      this.createPetalSystem(lerp(term.particles.density, next.particles.density, blend));
    } else if (particleType === 'firefly') {
      this.createFireflySystem(lerp(term.particles.density, next.particles.density, blend));
    }

    this.currentWeather = 'clear';
  }

  update(deltaTime, elapsedTime) {
    const THREE = this.THREE;

    // Update rain
    const rain = this.particleSystems.rain;
    if (rain) {
      const positions = rain.geometry.attributes.position.array;
      const velocities = rain.geometry.userData.velocities;
      const count = rain.geometry.userData.count;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] -= velocities[i] * deltaTime;
        if (positions[i * 3 + 1] < -0.5) {
          positions[i * 3 + 1] = 30;
          positions[i * 3] = (Math.random() - 0.5) * 80;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }

    // Update snow
    const snow = this.particleSystems.snow;
    if (snow) {
      const positions = snow.geometry.attributes.position.array;
      const velocities = snow.geometry.userData.velocities;
      const wobbles = snow.geometry.userData.wobbles;
      const count = snow.geometry.userData.count;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] -= velocities[i] * deltaTime;
        positions[i * 3] += Math.sin(elapsedTime * 2 + wobbles[i]) * deltaTime * 0.5;
        positions[i * 3 + 2] += Math.cos(elapsedTime * 2 + wobbles[i]) * deltaTime * 0.5;
        if (positions[i * 3 + 1] < -0.5) {
          positions[i * 3 + 1] = 30;
          positions[i * 3] = (Math.random() - 0.5) * 80;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
      }
      snow.geometry.attributes.position.needsUpdate = true;
    }

    // Update fog particles
    const fogSys = this.particleSystems.fog;
    if (fogSys) {
      const positions = fogSys.geometry.attributes.position.array;
      const count = positions.length / 3;
      for (let i = 0; i < count; i++) {
        positions[i * 3] += (Math.random() - 0.5) * deltaTime * 0.3;
        positions[i * 3 + 1] += (Math.random() - 0.5) * deltaTime * 0.1;
        positions[i * 3 + 2] += (Math.random() - 0.5) * deltaTime * 0.3;
      }
      fogSys.geometry.attributes.position.needsUpdate = true;
    }

    // Update petals
    const petals = this.particleSystems.petals;
    if (petals) {
      const positions = petals.geometry.attributes.position.array;
      const velocities = petals.geometry.userData.velocities;
      const count = petals.geometry.userData.count;
      for (let i = 0; i < count; i++) {
        positions[i * 3] += velocities[i * 3] * deltaTime;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;
        positions[i * 3] += Math.sin(elapsedTime * 1.5 + i) * deltaTime * 0.5;
        if (positions[i * 3 + 1] < -0.5) {
          positions[i * 3 + 1] = 20 + Math.random() * 5;
          positions[i * 3] = (Math.random() - 0.5) * 60;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
      }
      petals.geometry.attributes.position.needsUpdate = true;
    }

    // Update fireflies
    const fireflies = this.particleSystems.fireflies;
    if (fireflies) {
      const positions = fireflies.geometry.attributes.position.array;
      const phases = fireflies.geometry.userData.phases;
      const count = fireflies.geometry.userData.count;
      for (let i = 0; i < count; i++) {
        positions[i * 3] += Math.sin(elapsedTime * 2 + phases[i]) * deltaTime * 0.5;
        positions[i * 3 + 1] += Math.sin(elapsedTime * 3 + phases[i]) * deltaTime * 0.3;
        positions[i * 3 + 2] += Math.cos(elapsedTime * 2 + phases[i]) * deltaTime * 0.5;
      }
      fireflies.geometry.attributes.position.needsUpdate = true;
      // Pulsing opacity for fireflies
      fireflies.material.opacity = 0.5 + Math.sin(elapsedTime * 4) * 0.4;
    }

    // Lightning for storms
    if (this.currentWeather === 'storm') {
      this.lightningTimer -= deltaTime;
      if (this.lightningTimer <= 0) {
        this.lightningActive = !this.lightningActive;
        this.lightningTimer = this.lightningActive ? 0.1 : 1 + Math.random() * 3;
        if (this.ambientLight) {
          this.ambientLight.intensity = this.lightningActive ? 2.5 : 1.0;
        }
      }
    } else {
      this.lightningTimer = 0;
      this.lightningActive = false;
    }
  }

  setAmbientLight(light) {
    this.ambientLight = light;
  }

  dispose() {
    this.clearAll();
  }
}

export default WeatherSystem;
