import * as THREE from 'three';
import { addObjectToThreeScene, removeObjectFromThreeScene, getScene as getThreeSceneInstance, 
         attachTransformControls, detachTransformControls, setOnTransformControlsObjectChange } from './three-scene.js'; 
import { customConsole } from './script-engine.js'; 
import * as FileManager from './file-manager.js'; 
import * as ProjectManager from './project-manager.js';
import * as GameManager from './game-manager.js'; 
import * as GltfLoaderManager from './gltf-loader-manager.js'; 

const sceneObjects = {};
const objectCounters = { cube: 0, sphere: 0, cylinder: 0, model: 0 }; 
let selectedObject = null;
let activeCameraObjectName = null; 

let uiUpdateCallbacks = {
    populatePropertiesPanel: () => {},
    updateObjectListUI: () => {},
    refreshCameraTarget: (objectName) => {} ,
    onObjectTransformedByGizmo: () => {} 
};

export function initObjectManager(callbacks) {
    if (callbacks) {
        uiUpdateCallbacks = {...uiUpdateCallbacks, ...callbacks};
    }
    if (uiUpdateCallbacks.onObjectTransformedByGizmo) {
        setOnTransformControlsObjectChange(uiUpdateCallbacks.onObjectTransformedByGizmo);
    }
}

export function resetObjectManager() {
    for (const name in sceneObjects) {
        delete sceneObjects[name];
    }
    objectCounters.cube = 0;
    objectCounters.sphere = 0;
    objectCounters.cylinder = 0;
    objectCounters.model = 0; 
    selectedObject = null;
    activeCameraObjectName = null;
}

export function getSceneObjects() { return sceneObjects; }
export function getSelectedObject() { return selectedObject; }
export function getActiveCameraObjectName() { return activeCameraObjectName; }
export function getObjectCounters() { return objectCounters; }

export function setActiveCameraObjectName(objectName, updateThreeSceneTarget = true) {
    const oldCameraObjectName = activeCameraObjectName;
    activeCameraObjectName = objectName;

    if (updateThreeSceneTarget) { 
        uiUpdateCallbacks.refreshCameraTarget(objectName);
    }
    
    if (oldCameraObjectName !== activeCameraObjectName) { 
        uiUpdateCallbacks.populatePropertiesPanel(); 
    }
}

export function setSelectedObjectAndUpdateUI(object) {
    selectedObject = object;
    uiUpdateCallbacks.populatePropertiesPanel();
    uiUpdateCallbacks.updateObjectListUI();

    if (object) {
        attachTransformControls(object);
    } else {
        detachTransformControls();
    }
}

export function addSceneObject(type) {
    let geometry, material, mesh;
    let objectName;

    const defaultMaterial = new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.6
    });
    
    let baseName, counterType;
    switch (type) {
        case 'sphere': baseName = 'Sphere'; counterType = 'sphere'; material = defaultMaterial.clone(); material.color.setHex(0xff0077); break;
        case 'cylinder': baseName = 'Cylinder'; counterType = 'cylinder'; material = defaultMaterial.clone(); material.color.setHex(0x77ff00); break;
        case 'gltf': 
            GltfLoaderManager.initiateLoadGltfModel(); 
            return null; 
        case 'cube': default: baseName = 'Cube'; counterType = 'cube'; material = defaultMaterial.clone(); material.color.setHex(0x0077ff); break;
    }
    
    let count = 1;
    objectName = `${baseName}${count}`;
    while(sceneObjects[objectName]) {
        count++;
        objectName = `${baseName}${count}`;
    }
    objectCounters[counterType] = Math.max(objectCounters[counterType], count);

    const totalSceneObjects = Object.values(sceneObjects).filter(obj => obj.parent === getThreeSceneInstance()).length;
    const offsetX = (totalSceneObjects % 4) * 2.5 - 3.75; 
    const offsetZ = Math.floor(totalSceneObjects / 4) * -2.5;

    switch (type) {
        case 'sphere':
            geometry = new THREE.SphereGeometry(1, 32, 16);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
            break;
        case 'cube':
        default:
            geometry = new THREE.BoxGeometry(2, 2, 2);
            break;
    }

    mesh = new THREE.Mesh(geometry, material);
    mesh.name = objectName;
    mesh.position.set(offsetX, 1, offsetZ); 

    mesh.userData = {
        scripts: [] 
    };

    addObjectToThreeScene(mesh); 
    sceneObjects[objectName] = mesh;
    
    ProjectManager.markProjectDirty();
    customConsole.log(`Added ${objectName} to the scene.`);
    setSelectedObjectAndUpdateUI(mesh);
    return mesh;
}

export function addGltfModelDataToScene(gltfScene, originalFileName) {
    let baseName = originalFileName.replace(/\.(gltf|glb)$/i, '');
    baseName = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
    if (!baseName) baseName = "ImportedModel";

    let count = objectCounters.model + 1;
    let objectName = `${baseName}${count > 1 ? count : ''}`;
    while (sceneObjects[objectName]) {
        count++;
        objectName = `${baseName}${count}`;
    }
    objectCounters.model = count;

    gltfScene.name = objectName;

    const box = new THREE.Box3().setFromObject(gltfScene);
    const center = box.getCenter(new THREE.Vector3());
    gltfScene.position.sub(center); 

    const totalSceneObjects = Object.values(sceneObjects).filter(obj => obj.parent === getThreeSceneInstance()).length;
    const offsetX = (totalSceneObjects % 4) * 2.5 - 3.75;
    const offsetZ = Math.floor(totalSceneObjects / 4) * -2.5;
    gltfScene.position.add(new THREE.Vector3(offsetX, 0, offsetZ)); 

    gltfScene.userData = {
        scripts: [],
        isImportedModel: true,
        modelSourcePath: originalFileName 
    };

    addObjectToThreeScene(gltfScene);
    sceneObjects[objectName] = gltfScene;

    ProjectManager.markProjectDirty();
    customConsole.log(`Loaded model "${originalFileName}" as object "${objectName}".`);
    setSelectedObjectAndUpdateUI(gltfScene);
}

export function deleteSelectedObjectLogic() {
    if (!selectedObject) return;

    const objectName = selectedObject.name;
    const objectToDelete = selectedObject; 

    if (objectName === activeCameraObjectName) {
        setActiveCameraObjectName(null);
    }
    
    if (selectedObject === objectToDelete) { 
        detachTransformControls();
    }

    const childrenToReparent = [...objectToDelete.children];
    const mainThreeScene = getThreeSceneInstance();
    childrenToReparent.forEach(child => {
        if (sceneObjects[child.name]) { 
            mainThreeScene.attach(child); 
        }
    });

    removeObjectFromThreeScene(objectToDelete); 
    
    if (objectToDelete.geometry) objectToDelete.geometry.dispose();
    if (objectToDelete.material) {
        if (Array.isArray(objectToDelete.material)) {
            objectToDelete.material.forEach(m => m.dispose());
        } else {
            objectToDelete.material.dispose();
        }
    }
    
    delete sceneObjects[objectName];
    ProjectManager.markProjectDirty();
    customConsole.log(`Deleted ${objectName}`);
    setSelectedObjectAndUpdateUI(null); 
}

export function handleObjectNameChangeLogic(newNameFromInput, currentNameInInput) {
    if (!selectedObject) return;
    const oldName = selectedObject.name;
    const newName = newNameFromInput.trim();

    if (newName && newName !== oldName) {
        if (sceneObjects[newName]) {
            customConsole.error(`Object name "${newName}" already exists.`);
            uiUpdateCallbacks.populatePropertiesPanel(); 
            return false; 
        }
        
        delete sceneObjects[oldName];
        selectedObject.name = newName;
        sceneObjects[newName] = selectedObject;
        
        if (oldName === activeCameraObjectName) {
            activeCameraObjectName = newName;
        }
        ProjectManager.markProjectDirty();
        customConsole.log(`Renamed ${oldName} to ${newName}`);
        
        uiUpdateCallbacks.updateObjectListUI();
        uiUpdateCallbacks.populatePropertiesPanel(); 
        return true; 
    } else if (!newName) { 
        customConsole.error("Object name cannot be empty.");
        uiUpdateCallbacks.populatePropertiesPanel(); 
        return false;
    }
    return false; 
}

export function handleTransformChangeLogic(transforms) {
    if (!selectedObject) return;

    const { position, rotation, scale } = transforms;

    selectedObject.position.set(
        isNaN(position.x) ? selectedObject.position.x : position.x,
        isNaN(position.y) ? selectedObject.position.y : position.y,
        isNaN(position.z) ? selectedObject.position.z : position.z
    );

    selectedObject.rotation.set(
        THREE.MathUtils.degToRad(isNaN(rotation.x) ? THREE.MathUtils.radToDeg(selectedObject.rotation.x) : rotation.x),
        THREE.MathUtils.degToRad(isNaN(rotation.y) ? THREE.MathUtils.radToDeg(selectedObject.rotation.y) : rotation.y),
        THREE.MathUtils.degToRad(isNaN(rotation.z) ? THREE.MathUtils.radToDeg(selectedObject.rotation.z) : rotation.z)
    );

    selectedObject.scale.set(
        isNaN(scale.x) || scale.x <= 0 ? selectedObject.scale.x : scale.x,
        isNaN(scale.y) || scale.y <= 0 ? selectedObject.scale.y : scale.y,
        isNaN(scale.z) || scale.z <= 0 ? selectedObject.scale.z : scale.z
    );
    ProjectManager.markProjectDirty();
}

function isDescendant(child, potentialParent) {
    let ascendant = child.parent;
    while (ascendant) {
        if (ascendant === potentialParent) {
            return true;
        }
        ascendant = ascendant.parent;
    }
    return false;
}

export function setObjectParent(childObject, newParentName) {
    if (!childObject) {
        customConsole.error("Set Parent: No child object specified.");
        return false;
    }

    const currentParent = childObject.parent;
    const mainThreeScene = getThreeSceneInstance();

    if (newParentName === "None" || newParentName === null || newParentName === undefined) {
        if (currentParent !== mainThreeScene) {
            mainThreeScene.attach(childObject); 
            ProjectManager.markProjectDirty();
            customConsole.log(`Object "${childObject.name}" unparented, now child of scene.`);
            uiUpdateCallbacks.updateObjectListUI();
            uiUpdateCallbacks.populatePropertiesPanel(); 
            return true;
        }
        return false; 
    }

    const newParentObject = sceneObjects[newParentName];
    if (!newParentObject) {
        customConsole.error(`Set Parent: Parent object "${newParentName}" not found.`);
        return false;
    }

    if (childObject === newParentObject) {
        customConsole.error(`Set Parent: Cannot parent an object to itself ("${childObject.name}").`);
        return false;
    }

    if (isDescendant(newParentObject, childObject)) {
         customConsole.error(`Set Parent: Cannot parent "${childObject.name}" to "${newParentObject.name}" due to circular dependency (parent is a child of this object).`);
         return false;
    }


    if (currentParent === newParentObject) {
        return false; 
    }

    newParentObject.add(childObject); 
    ProjectManager.markProjectDirty();
    customConsole.log(`Object "${childObject.name}" parented to "${newParentObject.name}".`);
    uiUpdateCallbacks.updateObjectListUI();
    uiUpdateCallbacks.populatePropertiesPanel(); 
    return true;
}

export function addScriptComponentToObject(objectMesh, scriptName) {
    if (!objectMesh || !scriptName) return false;
    if (!objectMesh.userData) objectMesh.userData = {}; 
    if (!objectMesh.userData.scripts) objectMesh.userData.scripts = [];

    if (FileManager.loadScript(scriptName, false) === null) { 
        customConsole.error(`Script "${scriptName}" not found in current project. Cannot add to object "${objectMesh.name}".`);
        return false;
    }
    if (objectMesh.userData.scripts.includes(scriptName)) {
        customConsole.warn(`Script "${scriptName}" is already attached to object "${objectMesh.name}".`);
        return false; 
    }

    objectMesh.userData.scripts.push(scriptName);
    ProjectManager.markProjectDirty();
    customConsole.log(`Added script component "${scriptName}" to object "${objectMesh.name}".`);
    uiUpdateCallbacks.populatePropertiesPanel(); 
    return true;
}

export function removeScriptComponentFromObject(objectMesh, scriptNameToRemove) {
    if (!objectMesh || !scriptNameToRemove || !objectMesh.userData || !objectMesh.userData.scripts) return false;

    const index = objectMesh.userData.scripts.indexOf(scriptNameToRemove);
    if (index > -1) {
        objectMesh.userData.scripts.splice(index, 1);
        ProjectManager.markProjectDirty();
        customConsole.log(`Removed script component "${scriptNameToRemove}" from object "${objectMesh.name}".`);
        uiUpdateCallbacks.populatePropertiesPanel(); 
        return true;
    }
    customConsole.warn(`Script "${scriptNameToRemove}" not found on object "${objectMesh.name}".`);
    return false;
}

export function removeScriptComponentFromAllObjects(scriptName) {
    let changed = false;
    for (const objectName in sceneObjects) {
        const obj = sceneObjects[objectName];
        if (obj.userData && obj.userData.scripts) {
            const initialLength = obj.userData.scripts.length;
            obj.userData.scripts = obj.userData.scripts.filter(s => s !== scriptName);
            if (obj.userData.scripts.length < initialLength) {
                customConsole.log(`Removed script component "${scriptName}" from object "${obj.name}".`);
                changed = true;
            }
        }
    }
    if (changed && selectedObject && selectedObject.userData && selectedObject.userData.scripts.includes(scriptName) === false) {
        
    }
}

export function updateScriptComponentNameOnAllObjects(oldScriptName, newScriptName) {
    let changed = false;
    for (const objectName in sceneObjects) {
        const obj = sceneObjects[objectName];
        if (obj.userData && obj.userData.scripts) {
            const index = obj.userData.scripts.indexOf(oldScriptName);
            if (index > -1) {
                obj.userData.scripts[index] = newScriptName;
                customConsole.log(`Updated script component on "${obj.name}": "${oldScriptName}" -> "${newScriptName}".`);
                changed = true;
            }
        }
    }
}