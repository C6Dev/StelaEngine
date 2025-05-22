import * as THREE from 'three';
import * as ObjectManager from './object-manager.js';
import * as ThreeScene from './three-scene.js';
import * as UIManager from './ui-manager.js';
import * as ScriptEngine from './script-engine.js';

let isPlaying = false;
const initialObjectStates = new Map(); // UUID -> { position, quaternion, scale }
let initialCameraState = null; // { position, quaternion, fov, aspect, near, far } (aspect might not be needed to restore if window doesn't change)
let firstPlayFrame = true; // Tracks if it's the first frame of the current play session

export function initGameManager() {
    // Any initialization if needed
}

export function getIsPlaying() {
    return isPlaying;
}

export function startGame() {
    if (isPlaying) return;
    isPlaying = true;
    firstPlayFrame = true; // Set on game start

    initialObjectStates.clear();
    const sceneObjectsMap = ObjectManager.getSceneObjects();
    for (const name in sceneObjectsMap) {
        const obj = sceneObjectsMap[name];
        if (obj && obj.uuid) { // Ensure it's a valid THREE.Object3D
            initialObjectStates.set(obj.uuid, {
                position: obj.position.clone(),
                quaternion: obj.quaternion.clone(),
                scale: obj.scale.clone()
            });
        }
    }

    const mainCamera = ThreeScene.getCamera();
    initialCameraState = {
        position: mainCamera.position.clone(),
        quaternion: mainCamera.quaternion.clone(),
        fov: mainCamera.fov,
        // aspect: mainCamera.aspect, // aspect is usually controlled by window/viewport size
        near: mainCamera.near,
        far: mainCamera.far
    };
    
    // If no specific camera object is set, the main camera is free (or script-controlled)
    // OrbitControls must be disabled.
    ThreeScene.getControls().enabled = false;
    ThreeScene.getControls().saveState(); // Save orbit controls state

    const activeCameraObjName = ObjectManager.getActiveCameraObjectName();
    if (activeCameraObjName && sceneObjectsMap[activeCameraObjName]) {
        ThreeScene.setCameraTarget(sceneObjectsMap[activeCameraObjName]);
    } else {
        ThreeScene.setCameraTarget(null); // Ensure no target if not explicitly set for play
    }

    UIManager.setPlayModeUI(true);
    ScriptEngine.customConsole.log("Game Started.");
}

export function stopGame() {
    if (!isPlaying) return;
    isPlaying = false;
    // firstPlayFrame will be true again when startGame is called next.
    
    const sceneObjectsMap = ObjectManager.getSceneObjects();
    for (const name in sceneObjectsMap) {
        const obj = sceneObjectsMap[name];
        if (obj && obj.uuid && initialObjectStates.has(obj.uuid)) {
            const state = initialObjectStates.get(obj.uuid);
            obj.position.copy(state.position);
            obj.quaternion.copy(state.quaternion);
            obj.scale.copy(state.scale);
        }
    }

    if (initialCameraState) {
        const mainCamera = ThreeScene.getCamera();
        mainCamera.position.copy(initialCameraState.position);
        mainCamera.quaternion.copy(initialCameraState.quaternion);
        mainCamera.fov = initialCameraState.fov;
        // mainCamera.aspect = initialCameraState.aspect; // Let resize handle aspect
        mainCamera.near = initialCameraState.near;
        mainCamera.far = initialCameraState.far;
        mainCamera.updateProjectionMatrix();
    }
    
    ThreeScene.setCameraTarget(null); // Detach camera from any object on stop
    // OrbitControls state was saved, now we restore it and enable.
    ThreeScene.getControls().reset(); 
    ThreeScene.getControls().enabled = true;

    UIManager.setPlayModeUI(false);
    UIManager.populatePropertiesPanel(); // Refresh properties
    UIManager.updateObjectListUI();    // Refresh hierarchy

    // ObjectManager.setActiveCameraObjectName(null, false); // Reset internal tracking without telling ThreeScene again
                                                       // This is implicitly handled by populatePropertiesPanel re-evaluating.

    ScriptEngine.customConsole.log("Game Stopped. Editor mode active.");
}

export function getGameContext() {
    return {
        get camera() { return ThreeScene.getCamera(); },
        get isPlaying() { return isPlaying; },
        get isFirstFrame() { return isPlaying && firstPlayFrame; } // Only true if playing AND it's the first frame of this session
    };
}

export function isFirstPlayFrameTrue() { 
    return isPlaying && firstPlayFrame;
}

export function consumeFirstPlayFrameFlag() { 
    if (firstPlayFrame) {
        firstPlayFrame = false;
    }
}