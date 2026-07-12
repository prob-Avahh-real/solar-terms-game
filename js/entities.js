/**
 * Entity System - NPCs, creatures, and animated entities
 * Mobile entities that appear based on solar terms
 */
import { lerp } from './solarTerms.js';

export class EntityManager {
  constructor(scene, THREE) {
    this.scene = scene;
    this.THREE = THREE;
    this.entities = [];
    this.entityIdCounter = 0;
  }

  /** Create a simple NPC villager */
  createNPC(x, z, worldHeightFn) {
    const THREE = this.THREE;
    const y = worldHeightFn(x, z);
    const group = new THREE.Group();

    // Body
    const bodyGeom = new THREE.CylinderGeometry(0.3, 0.35, 1.2, 8);
    const bodyColor = new THREE.Color().setHSL(Math.random() * 0.1 + 0.05, 0.3, 0.5);
    const body = new THREE.Mesh(bodyGeom, new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 }));
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const head = new THREE.Mesh(headGeom, new THREE.MeshStandardMaterial({ color: 0xFFDDBB, roughness: 0.5 }));
    head.position.y = 1.45;
    head.castShadow = true;
    group.add(head);

    // Hat (traditional Chinese hat)
    const hatGeom = new THREE.CylinderGeometry(0.2, 0.3, 0.3, 8);
    const hat = new THREE.Mesh(hatGeom, new THREE.MeshStandardMaterial({ color: 0x3A2A1A, roughness: 0.6 }));
    hat.position.y = 1.7;
    group.add(hat);

    group.position.set(x, y, z);
    group.name = 'NPC';
    this.scene.add(group);

    const entity = {
      id: ++this.entityIdCounter,
      mesh: group,
      type: 'npc',
      data: {
        targetX: x,
        targetZ: z,
        wanderTimer: 0,
        speed: 1 + Math.random() * 1.5,
        dialog: this.randomDialog()
      }
    };

    this.entities.push(entity);
    return entity;
  }

  /** Create a simple animal */
  createAnimal(type, x, z, worldHeightFn) {
    const THREE = this.THREE;
    const y = worldHeightFn(x, z);
    const group = new THREE.Group();

    switch (type) {
      case 'rabbit': {
        const bodyGeom = new THREE.SphereGeometry(0.25, 8, 8);
        bodyGeom.scale(1, 0.7, 1.3);
        const body = new THREE.Mesh(bodyGeom, new THREE.MeshStandardMaterial({ color: 0xC8B090, roughness: 0.6 }));
        body.position.y = 0.2;
        group.add(body);
        // Ears
        const earGeom = new THREE.ConeGeometry(0.08, 0.3, 8);
        const ear1 = new THREE.Mesh(earGeom, new THREE.MeshStandardMaterial({ color: 0xD8C0A0, roughness: 0.6 }));
        ear1.position.set(0.1, 0.4, 0.1);
        group.add(ear1);
        const ear2 = new THREE.Mesh(earGeom, new THREE.MeshStandardMaterial({ color: 0xD8C0A0, roughness: 0.6 }));
        ear2.position.set(-0.1, 0.4, 0.1);
        group.add(ear2);
        break;
      }
      case 'bird': {
        const bodyGeom = new THREE.SphereGeometry(0.15, 8, 8);
        const body = new THREE.Mesh(bodyGeom, new THREE.MeshStandardMaterial({ color: 0x4A6A8A, roughness: 0.5 }));
        body.position.y = 0.15;
        group.add(body);
        // Beak
        const beakGeom = new THREE.ConeGeometry(0.05, 0.15, 6);
        const beak = new THREE.Mesh(beakGeom, new THREE.MeshStandardMaterial({ color: 0xFFA000, roughness: 0.4 }));
        beak.position.set(0, 0.15, 0.15);
        beak.rotation.x = -Math.PI / 2;
        group.add(beak);
        break;
      }
      case 'butterfly': {
        const wingGeom = new THREE.PlaneGeometry(0.15, 0.2);
        const wingColor = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);
        const wingMat = new THREE.MeshStandardMaterial({ color: wingColor, side: THREE.DoubleSide, roughness: 0.3 });
        const wingLeft = new THREE.Mesh(wingGeom, wingMat);
        wingLeft.position.set(-0.08, 0, 0);
        group.add(wingLeft);
        const wingRight = new THREE.Mesh(wingGeom, wingMat);
        wingRight.position.set(0.08, 0, 0);
        group.add(wingRight);
        group.userData.wingLeft = wingLeft;
        group.userData.wingRight = wingRight;
        break;
      }
      case 'firefly': {
        const glowGeom = new THREE.SphereGeometry(0.06, 6, 6);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFFF88 });
        const glow = new THREE.Mesh(glowGeom, glowMat);
        group.add(glow);
        break;
      }
      default: {
        const geoms = new THREE.SphereGeometry(0.2, 8, 8);
        const m = new THREE.Mesh(geoms, new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6 }));
        group.add(m);
      }
    }

    group.position.set(x, y + 0.1, z);
    group.name = `animal_${type}`;
    this.scene.add(group);

    const entity = {
      id: ++this.entityIdCounter,
      mesh: group,
      type,
      data: {
        targetX: x,
        targetZ: z,
        wanderTimer: Math.random() * 5,
        speed: type === 'bird' || type === 'butterfly' ? 3 + Math.random() * 3 : 1 + Math.random() * 2,
        flyHeight: type === 'bird' ? 3 + Math.random() * 5 : (type === 'butterfly' || type === 'firefly' ? 1 + Math.random() * 2 : 0)
      }
    };

    this.entities.push(entity);
    return entity;
  }

  /** Spawn creatures based on current solar term */
  spawnForTerm(term, worldHeightFn) {
    const creatures = term.creatures || [];

    for (const creatureType of creatures) {
      const count = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 60;
        const z = (Math.random() - 0.5) * 60;
        this.createAnimal(creatureType, x, z, worldHeightFn);
      }
    }
  }

  /** Clear all entities */
  clearAll() {
    for (const entity of this.entities) {
      this.scene.remove(entity.mesh);
    }
    this.entities = [];
  }

  randomDialog() {
    const dialogs = [
      '今天的天气真不错！',
      '你看到那边的山了吗？',
      '今年的收成应该会很好。',
      '节气变化真奇妙啊。',
      '往前走就是村庄了。',
      '欢迎来到我们的村子！',
      '小心别掉进河里。',
      '山上的梅花开了吗？'
    ];
    return dialogs[Math.floor(Math.random() * dialogs.length)];
  }

  /** Update all entities */
  update(deltaTime, elapsedTime, worldHeightFn) {
    const dt = Math.min(deltaTime, 0.1);

    for (const entity of this.entities) {
      const data = entity.data;
      data.wanderTimer -= dt;

      // Wander behavior
      if (data.wanderTimer <= 0) {
        data.targetX = entity.mesh.position.x + (Math.random() - 0.5) * 10;
        data.targetZ = entity.mesh.position.z + (Math.random() - 0.5) * 10;
        data.targetX = Math.max(-45, Math.min(45, data.targetX));
        data.targetZ = Math.max(-45, Math.min(45, data.targetZ));
        data.wanderTimer = 3 + Math.random() * 5;
      }

      // Move toward target
      const dx = data.targetX - entity.mesh.position.x;
      const dz = data.targetZ - entity.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.5) {
        const moveX = (dx / dist) * data.speed * dt;
        const moveZ = (dz / dist) * data.speed * dt;
        entity.mesh.position.x += moveX;
        entity.mesh.position.z += moveZ;

        // Face movement direction
        entity.mesh.rotation.y = Math.atan2(dx, dz);

        // Ground creatures stay on ground
        if (data.flyHeight === 0) {
          entity.mesh.position.y = worldHeightFn(entity.mesh.position.x, entity.mesh.position.z) + 0.1;
        } else {
          // Flying creatures
          const groundY = worldHeightFn(entity.mesh.position.x, entity.mesh.position.z);
          entity.mesh.position.y = groundY + data.flyHeight + Math.sin(elapsedTime * 2 + entity.id) * 0.5;
        }
      }

      // Butterfly wing animation
      if (entity.type === 'butterfly' && entity.mesh.userData.wingLeft) {
        const flap = Math.sin(elapsedTime * 15 + entity.id) * 0.6;
        entity.mesh.userData.wingLeft.rotation.y = flap;
        entity.mesh.userData.wingRight.rotation.y = -flap;
      }

      // Firefly glow pulse
      if (entity.type === 'firefly') {
        entity.mesh.children[0].material.opacity = 0.5 + Math.sin(elapsedTime * 5 + entity.id) * 0.5;
      }
    }
  }

  getInteractables() {
    return this.entities
      .filter(e => e.type === 'npc')
      .map(e => e.mesh);
  }

  getNPCAt(object) {
    for (const entity of this.entities) {
      if (entity.type === 'npc' && entity.mesh === object) {
        return entity;
      }
      // Check children
      if (entity.mesh.children.includes(object)) {
        return entity;
      }
    }
    return null;
  }

  dispose() {
    this.clearAll();
  }
}

export default EntityManager;
