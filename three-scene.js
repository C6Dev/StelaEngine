import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as DOM from './dom-elements.js';

let scene, camera, renderer, controls;
let raycaster, mouse;
let cameraTargetObject = null; // The object the camera should follow

export function initThreeScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1E1E1E); 
    scene.fog = new THREE.FogExp2(0x1E1E1E, 0.015); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(DOM.viewerContainer.clientWidth, DOM.viewerContainer.clientHeight);
    DOM.viewerContainer.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(60, DOM.viewerContainer.clientWidth / DOM.viewerContainer.clientHeight, 0.1, 1000);
    camera.position.set(8, 6, 12);
    camera.lookAt(0, 0, 0);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(0, 0.5, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const planeGeometry = new THREE.PlaneGeometry(50, 50);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);

    window.addEventListener('resize', onWindowResizeThree, false);
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getControls() { return controls; }
export function getRaycaster() { return raycaster; }
export function getMouse() { return mouse; }

export function setCameraTarget(object) {
    cameraTargetObject = object;
}
export function getCameraTarget() {
    return cameraTargetObject;
}

export function updateCameraFollow() {
    if (cameraTargetObject && camera) {
        const targetWorldPosition = new THREE.Vector3();
        cameraTargetObject.getWorldPosition(targetWorldPosition);
        
        const targetWorldQuaternion = new THREE.Quaternion();
        cameraTargetObject.getWorldQuaternion(targetWorldQuaternion);

        // For now, camera directly matches target's position and orientation.
        // TODO: Add offset capabilities if desired (e.g. camera behind player)
        camera.position.copy(targetWorldPosition);
        camera.quaternion.copy(targetWorldQuaternion);
        // If camera has an offset from its target, apply it here
        // e.g., camera.position.add(offsetVectorRelativeToTargetOrientation);
    }
    // If no target, camera is either free (script-controlled) or orbit-controlled (handled in main animate)
}

export function renderThreeScene() {
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

export function onWindowResizeThree() {
    if (DOM.viewerContainer && DOM.viewerContainer.clientWidth > 0 && DOM.viewerContainer.clientHeight > 0 && renderer && camera) {
        camera.aspect = DOM.viewerContainer.clientWidth / DOM.viewerContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(DOM.viewerContainer.clientWidth, DOM.viewerContainer.clientHeight);
    }
}

export function addObjectToThreeScene(object) {
    if (scene && object) {
        scene.add(object);
    }
}

export function removeObjectFromThreeScene(object) {
    if (scene && object) {
        scene.remove(object);
    }
}