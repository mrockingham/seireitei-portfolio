// Exercise the same Rapier capsule settings against the shipped collision GLB.
// This runs without a browser; it complements visual playtesting.
import fs from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
const manifest = JSON.parse(await fs.readFile(new URL('../src/world-manifest.json', import.meta.url)));
const bytes = await fs.readFile(new URL('../public/assets/seireitei/seireitei-collision.glb', import.meta.url));
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
for (const mesh of gltf.scene.children.filter(o => o.userData.role === 'staticTrimesh')) {
  world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.geometry.attributes.position.array, mesh.geometry.index.array));
}
for (const door of manifest.doors) {
  const [x, y, z] = door.open.map((v, i) => v + door.colliderLocalCenter[i]);
  world.createCollider(RAPIER.ColliderDesc.cuboid(...door.colliderSize.map(v => v / 2)).setTranslation(x, y, z));
}
const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1.05, 22));
const collider = world.createCollider(RAPIER.ColliderDesc.capsule(.6, .3), body);
const controller = world.createCharacterController(.025);
controller.enableAutostep(.3, .15, true);
controller.enableSnapToGround(.5);
controller.setMaxSlopeClimbAngle(35 * Math.PI / 180);
controller.setMinSlopeSlideAngle(40 * Math.PI / 180);
world.step();
let velocityY = 0, totalSteps = 0;
const route = manifest.route.slice(1).flatMap(waypoint => {
  if (Math.abs(waypoint.position[0] + 22) < .01 && Math.abs(waypoint.position[2] + 39) < .01) {
    return [waypoint, ...[[-33.5,.61,-39],[-33.5,.61,-61],[-10.5,.61,-61],[-10.5,.61,-39],[-22,.61,-39]].map((position,i) => ({ name: `PORCH_LOOP_${i}`, position }))];
  }
  return [waypoint];
});
for (const waypoint of route) {
  const [x, , z] = waypoint.position;
  let arrived = false;
  for (let step = 0; step < 3000; step++) {
    const p = body.translation(), dx = x - p.x, dz = z - p.z, distance = Math.hypot(dx, dz);
    if (distance < .15) { arrived = true; break; }
    if (controller.computedGrounded()) velocityY = -.5;
    velocityY = Math.max(-25, velocityY - 22 / 60);
    const move = Math.min(distance, 4.5 / 60);
    controller.computeColliderMovement(collider, { x: dx / distance * move, y: velocityY / 60, z: dz / distance * move }, undefined, undefined, c => c.parent()?.handle !== body.handle);
    const d = controller.computedMovement();
    body.setNextKinematicTranslation({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z });
    world.step(); totalSteps++;
    if (body.translation().y < -5) throw new Error(`Fell through floor toward ${waypoint.name}`);
  }
  if (!arrived) throw new Error(`Blocked at ${waypoint.name}: ${JSON.stringify(body.translation())}`);
  console.log(waypoint.name, JSON.stringify(body.translation()));
}
if (Math.abs(body.translation().y - 22.95) > .3) throw new Error('Did not reach hilltop height');
console.log(`PASS: gate, garden bridge, full porch loop, both interiors, and hilltop; ${totalSteps} physics steps.`);
world.free();
