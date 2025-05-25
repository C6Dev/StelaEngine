// game-camera-service.js
import * as GameManager from './game-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as ProjectManager from './project-manager.js';
import * as UIManager from './ui-manager.js';
import * as ThreeScene from './three-scene.js';
import * as ObjectManager from './object-manager.js'; // For getSceneObjects

let activeCameraObjectNameGCS = null;

export function initGameCameraService() {
    // Initialization if needed in the future
}

export function setActiveCameraObjectName(name) {
    if (GameManager.getIsPlaying() && name !== null && !GameManager.getIsCameraEjected()) {
        // Setting a new camera object name is allowed and will take effect.
    } else if (GameManager.getIsPlaying() && GameManager.getIsCameraEjected()){
        ScriptEngine.customConsole.warn("Cannot set active game camera while main camera is ejected. Change will apply if camera is re-attached or on game restart.");
    }

    activeCameraObjectNameGCS = name;

    // Update ThreeScene's camera target if in play mode and not ejected
    if (GameManager.getIsPlaying() && !GameManager.getIsCameraEjected()) {
        const sceneObjectsMap = ObjectManager.getSceneObjects();
        ThreeScene.setCameraTarget(name ? sceneObjectsMap[name] : null);
    }
    
    UIManager.populatePropertiesPanel(); // Refresh properties panel UI
    ProjectManager.markProjectDirty();
}

export function getActiveCameraObjectName() {
    return activeCameraObjectNameGCS;
}

export function refreshCameraTargetForPlayMode() {
    // This function is called when game starts or camera is un-ejected.
    // It ensures the ThreeScene camera target is correctly set based on activeCameraObjectNameGCS.
    if (GameManager.getIsPlaying() && !GameManager.getIsCameraEjected()) {
        const sceneObjectsMap = ObjectManager.getSceneObjects();
        ThreeScene.setCameraTarget(activeCameraObjectNameGCS ? sceneObjectsMap[activeCameraObjectNameGCS] : null);
    } else if (!GameManager.getIsPlaying()) {
        // If game is not playing, camera target should be null (editor orbit controls)
        ThreeScene.setCameraTarget(null);
    }
    // If playing and ejected, ThreeScene.setCameraTarget(null) is handled by ejectCamera logic.
}
