import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js'; // Import TransformControls
import * as DOM from './dom-elements.js';
import { getIsCameraEjected } from './game-manager.js'; // Import for camera eject check

let scene, camera, renderer, controls;
let raycaster, mouse;
let cameraTargetObject = null; // The object the camera should follow
let transformControls; // Declare TransformControls variable
let sceneBackgroundColor = '#000000'; // Store current background color

// Callback placeholder, to be set by ObjectManager
let onTransformControlsObjectChangeCallback = () => {};

export function initThreeScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(sceneBackgroundColor);
    scene.fog = null; // Remove fog for now, can be re-added as an option later if needed
    // scene.fog = new THREE.FogExp2(0x000000, 0.015); // If fog is desired with black bg

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

    // Initialize TransformControls
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('dragging-changed', event => {
        controls.enabled = !event.value; // Disable OrbitControls while dragging
    });
    transformControls.addEventListener('objectChange', () => {
        if (onTransformControlsObjectChangeCallback) {
            onTransformControlsObjectChangeCallback();
        }
    });
    scene.add(transformControls);
    transformControls.visible = false; // Initially hidden

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    window.addEventListener('resize', onWindowResizeThree, false);
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getControls() { return controls; }
export function getRaycaster() { return raycaster; }
export function getMouse() { return mouse; }
export function getTransformControls() { return transformControls; } // Export getter

export function setOnTransformControlsObjectChange(callback) {
    onTransformControlsObjectChangeCallback = callback;
}

export function attachTransformControls(object) {
    if (transformControls && object) {
        transformControls.attach(object);
        transformControls.visible = true;
    }
}

export function detachTransformControls() {
    if (transformControls) {
        transformControls.detach();
        transformControls.visible = false;
    }
}

export function setTransformControlsMode(mode) {
    if (transformControls) {
        transformControls.setMode(mode); // mode: "translate", "rotate", "scale"
    }
}

export function setCameraTarget(object) {
    cameraTargetObject = object;
}
export function getCameraTarget() {
    return cameraTargetObject;
}

export function updateCameraFollow() {
    if (getIsCameraEjected()) return; // If camera is ejected, don't follow

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

export function setBackgroundColor(hexColorString) {
    if (scene) {
        sceneBackgroundColor = hexColorString;
        scene.background.set(hexColorString);
    }
}

export function getBackgroundColor() {
    return sceneBackgroundColor;
}

export function clearSceneContent() {
    if (!scene) return;
    // Remove all direct children of the scene that are Meshes or Groups (user objects)
    // Keep lights and main camera. TransformControls are also directly added to scene.
    const objectsToRemove = [];
    scene.children.forEach(child => {
        if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
            // Don't remove transformControls itself if it's a child
            if (child !== transformControls && !child.isLight && !child.isCamera) {
                 objectsToRemove.push(child);
            }
        }
    });

    objectsToRemove.forEach(child => {
        // If object has geometry/material, dispose them
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
        scene.remove(child);
    });
}