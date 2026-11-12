import * as THREE from '../vendor/three.module.min.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14161c);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 2, 4);
camera.lookAt(0, 0, 0);

scene.add(new THREE.DirectionalLight(0xffffff, 2).translateX(2).translateY(4).translateZ(3));
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 1.5, 1.5),
  new THREE.MeshStandardMaterial({ color: 0xe0a030 })
);
scene.add(cube);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop((t) => {
  cube.rotation.x = t / 1000;
  cube.rotation.y = t / 1300;
  renderer.render(scene, camera);
});
