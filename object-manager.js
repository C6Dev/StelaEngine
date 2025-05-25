import * as THREE from 'three';
import { addObjectToThreeScene, removeObjectFromThreeScene, getScene as getThreeSceneInstance,
         attachTransformControls, detachTransformControls, setOnTransformControlsObjectChange } from './three-scene.js';
import { customConsole } from './script-engine.js';
import * as FileManager from './file-manager.js';
import * as ProjectManager from './project-manager.js';
import * as GameManager from './game-manager.js';
// import * as GltfLoaderManager from './gltf-loader-manager.js'; // No longer directly used
import * as ObjectScriptingService from './object-scripting-service.js';
import * as GameCameraService from './game-camera-service.js';


const sceneObjects = {};
const objectCounters = { cube: 0, sphere: 0, cylinder: 0, model: 0 };
let selectedObject = null;
// let activeCameraObjectName = null; // Moved to GameCameraService

let uiUpdateCallbacks = {
    populatePropertiesPanel: () => {},
    updateObjectListUI: () => {},
    // refreshCameraTarget: (objectName) => {} , // Handled by GameCameraService now
    onObjectTransformedByGizmo: () => {}
};

// Helper to create default primitive placeholders for fallback scenarios
export function createPrimitivePlaceholder(type = 'cube') {
    let geometry, materialColor;
    const defaultMaterial = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.6 });

    switch (type) {
        case 'sphere':
            geometry = new THREE.SphereGeometry(1, 16, 8); // Simpler geometry for placeholder
            materialColor = 0xff0077;
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 16); // Simpler
            materialColor = 0x77ff00;
            break;
        case 'cube':
        default:
            geometry = new THREE.BoxGeometry(2, 2, 2);
            materialColor = 0x0077ff; 
            break;
    }
    const material = defaultMaterial.clone();
    material.color.setHex(materialColor);
    return new THREE.Mesh(geometry, material);
}

export function initObjectManager(callbacks) {
    if (callbacks) {
        uiUpdateCallbacks = { ...uiUpdateCallbacks, ...callbacks };
    }
    setOnTransformControlsObjectChange(handleObjectTransformedByGizmo);
    ObjectScriptingService.initObjectScriptingService(); // Assuming they might need init
    GameCameraService.initGameCameraService();
}

export function getObjectCounters() {
    return objectCounters;
}

function handleObjectTransformedByGizmo() {
    if (uiUpdateCallbacks.onObjectTransformedByGizmo) {
        uiUpdateCallbacks.onObjectTransformedByGizmo();
    }
    // ProjectManager.markProjectDirty(); // Now called by the UI callback
}

export function addSceneObject(type = 'cube', name = null, existingMesh = null, modelSourcePath = null) {
    if (GameManager.getIsPlaying()) {
        customConsole.warn("Cannot add objects while game is playing.");
        return;
    }
    let mesh;
    let objectName = name;

    if (existingMesh) { // For GLTF or specific meshes
        mesh = existingMesh;
        if (!objectName) {
            // Ensure a unique name for the model based on its base name or a default
            let baseNameForModel = "Model";
            if (mesh.name && mesh.name !== "" && mesh.name !== "Scene") { // Use existing name if meaningful
                baseNameForModel = mesh.name;
            } else if (modelSourcePath) {
                 const fileName = modelSourcePath.split('/').pop();
                 baseNameForModel = fileName.substring(0, fileName.lastIndexOf('.'));
            }
            
            let counter = objectCounters.model; // Start with current counter
            let unique = false;
            do {
                counter++;
                objectName = `${baseNameForModel}${counter}`;
                if (!sceneObjects[objectName]) {
                    unique = true;
                    objectCounters.model = counter; // Update counter only when a unique name is found
                }
            } while (!unique);
        }
        mesh.name = objectName;
        mesh.userData = mesh.userData || {};
        mesh.userData.isImportedModel = true;
        mesh.userData.modelSourcePath = modelSourcePath;
        if (!mesh.userData.scripts) mesh.userData.scripts = [];
    } else {
        switch (type) {
            case 'sphere':
                objectCounters.sphere++;
                objectName = name || `Sphere${objectCounters.sphere}`;
                break;
            case 'cylinder':
                objectCounters.cylinder++;
                objectName = name || `Cylinder${objectCounters.cylinder}`;
                break;
            case 'cube':
            default:
                objectCounters.cube++;
                objectName = name || `Cube${objectCounters.cube}`;
                break;
        }
        mesh = createPrimitivePlaceholder(type);
        mesh.name = objectName;
        mesh.userData = { isImportedModel: false, modelSourcePath: null, scripts: [] };
    }
    
    if (name && sceneObjects[name] && mesh.name !== name) { // If a name was suggested but taken, and we generated a new one
         customConsole.warn(`Object name "${name}" was taken. Used "${mesh.name}" instead.`);
    } else if (sceneObjects[mesh.name]) { // If the generated name is somehow taken (e.g. manual load)
        let counter = 1;
        let baseName = mesh.name.replace(/\d+$/, '');
        let newGenName;
        do {
            newGenName = `${baseName}${counter}`;
            counter++;
        } while (sceneObjects[newGenName]);
        mesh.name = newGenName;
    }


    sceneObjects[mesh.name] = mesh;
    addObjectToThreeScene(mesh);
    setSelectedObjectAndUpdateUI(mesh);
    ProjectManager.markProjectDirty();
    return mesh;
}

export function addGltfModelDataToScene(modelScene, modelPathInProject) {
    // This function is now a more specific wrapper around addSceneObject
    return addSceneObject('gltf_model', null, modelScene, modelPathInProject);
}


export function setSelectedObjectAndUpdateUI(object) {
    if (GameManager.getIsPlaying()) {
        customConsole.warn("Cannot change selection while game is playing.");
        if (selectedObject) { 
             detachTransformControls();
        }
        return;
    }

    selectedObject = object;
    if (object) {
        attachTransformControls(object);
    } else {
        detachTransformControls();
    }
    if (uiUpdateCallbacks.populatePropertiesPanel) uiUpdateCallbacks.populatePropertiesPanel();
    if (uiUpdateCallbacks.updateObjectListUI) uiUpdateCallbacks.updateObjectListUI();
}

export function getSelectedObject() {
    return selectedObject;
}

export function getSceneObjects() {
    return sceneObjects;
}

export function deleteSelectedObjectLogic() {
    if (GameManager.getIsPlaying()) {
        customConsole.warn("Cannot delete objects while game is playing.");
        return;
    }
    if (selectedObject) {
        const childrenToReparent = [...selectedObject.children]; 
        childrenToReparent.forEach(child => {
            if (sceneObjects[child.name]) { 
                const worldPosition = new THREE.Vector3();
                const worldQuaternion = new THREE.Quaternion();
                child.getWorldPosition(worldPosition);
                child.getWorldQuaternion(worldQuaternion);
                getThreeSceneInstance().attach(child); 
                child.position.copy(worldPosition);
                child.quaternion.copy(worldQuaternion);
            }
        });

        removeObjectFromThreeScene(selectedObject);
        delete sceneObjects[selectedObject.name];

        if (GameCameraService.getActiveCameraObjectName() === selectedObject.name) {
            GameCameraService.setActiveCameraObjectName(null); 
        }

        setSelectedObjectAndUpdateUI(null); 
        ProjectManager.markProjectDirty();
    }
}

export function handleObjectNameChangeLogic(newName, oldName) {
    if (GameManager.getIsPlaying()) return;
    if (!newName.trim() || newName === oldName) {
        if (uiUpdateCallbacks.populatePropertiesPanel) uiUpdateCallbacks.populatePropertiesPanel();
        return;
    }
    if (sceneObjects[newName]) {
        alert(`Object with name "${newName}" already exists.`);
        if (uiUpdateCallbacks.populatePropertiesPanel) uiUpdateCallbacks.populatePropertiesPanel();
        return;
    }

    const objectToRename = sceneObjects[oldName];
    if (objectToRename) {
        objectToRename.name = newName;
        sceneObjects[newName] = objectToRename;
        delete sceneObjects[oldName];

        if (GameCameraService.getActiveCameraObjectName() === oldName) {
            GameCameraService.setActiveCameraObjectName(newName);
        }
        
        if (uiUpdateCallbacks.populatePropertiesPanel) uiUpdateCallbacks.populatePropertiesPanel();
        if (uiUpdateCallbacks.updateObjectListUI) uiUpdateCallbacks.updateObjectListUI();
        ProjectManager.markProjectDirty();
    }
}

export function handleTransformChangeLogic(transforms) {
    if (GameManager.getIsPlaying() || !selectedObject) return;

    selectedObject.position.set(transforms.position.x, transforms.position.y, transforms.position.z);
    selectedObject.rotation.set(
        THREE.MathUtils.degToRad(transforms.rotation.x),
        THREE.MathUtils.degToRad(transforms.rotation.y),
        THREE.MathUtils.degToRad(transforms.rotation.z)
    );
    selectedObject.scale.set(transforms.scale.x, transforms.scale.y, transforms.scale.z);
    ProjectManager.markProjectDirty();
}

export function setObjectParent(object, newParentName) {
    if (GameManager.getIsPlaying() || !object) return;

    const mainThreeScene = getThreeSceneInstance();
    const oldParent = object.parent;
    let newParent = null;

    if (newParentName && sceneObjects[newParentName]) {
        newParent = sceneObjects[newParentName];
    } else {
        newParent = mainThreeScene; 
    }

    if (oldParent === newParent) return; 

    if (newParent !== mainThreeScene) {
        let tempParent = newParent;
        while (tempParent && tempParent !== mainThreeScene) {
            if (tempParent === object) {
                alert("Cannot parent an object to one of its own descendants.");
                if (uiUpdateCallbacks.populatePropertiesPanel) uiUpdateCallbacks.populatePropertiesPanel();
                return;
            }
            tempParent = tempParent.parent;
        }
    }
    
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    // const worldScale = new THREE.Vector3(); // Scale handling with attach is complex

    object.getWorldPosition(worldPosition);
    object.getWorldQuaternion(worldQuaternion);
    // object.getWorldScale(worldScale); 

    if (newParent) {
        newParent.attach(object); 
    }
    
    ProjectManager.markProjectDirty();
    if (uiUpdateCallbacks.updateObjectListUI) uiUpdateCallbacks.updateObjectListUI();
    if (uiUpdateCallbacks.populatePropertiesPanel) uiUpdateCallbacks.populatePropertiesPanel(); 
}


export function resetObjectManager() {
    for (const name in sceneObjects) {
        removeObjectFromThreeScene(sceneObjects[name]);
        if (sceneObjects[name].geometry && typeof sceneObjects[name].geometry.dispose === 'function') {
            sceneObjects[name].geometry.dispose();
        }
        if (sceneObjects[name].material) {
            if (Array.isArray(sceneObjects[name].material)) {
                sceneObjects[name].material.forEach(m => {
                    if (typeof m.dispose === 'function') m.dispose();
                });
            } else if (typeof sceneObjects[name].material.dispose === 'function') {
                sceneObjects[name].material.dispose();
            }
        }
    }
    for (const key in sceneObjects) {
        delete sceneObjects[key];
    }

    objectCounters.cube = 0;
    objectCounters.sphere = 0;
    objectCounters.cylinder = 0;
    objectCounters.model = 0;
    selectedObject = null;
    GameCameraService.setActiveCameraObjectName(null); // Reset camera via service
    detachTransformControls();
    if (uiUpdateCallbacks.updateObjectListUI) uiUpdateCallbacks.updateObjectListUI();
    if (uiUpdateCallbacks.populatePropertiesPanel) uiUpdateCallbacks.populatePropertiesPanel();
}

// --- Proxy methods for ObjectScriptingService ---
export function addScriptComponentToObject(object, scriptName) {
    ObjectScriptingService.addScriptComponentToObject(object, scriptName);
}
export function removeScriptComponentFromObject(object, scriptName) {
    ObjectScriptingService.removeScriptComponentFromObject(object, scriptName);
}
export function removeScriptComponentFromAllObjects(scriptName) {
    ObjectScriptingService.removeScriptComponentFromAllObjects(scriptName);
}
export function updateScriptComponentNameOnAllObjects(oldScriptName, newScriptName) {
    ObjectScriptingService.updateScriptComponentNameOnAllObjects(oldScriptName, newScriptName);
}

// --- Proxy methods for GameCameraService ---
export function setActiveCameraObjectName(name) {
    GameCameraService.setActiveCameraObjectName(name);
}
export function getActiveCameraObjectName() {
    return GameCameraService.getActiveCameraObjectName();
}