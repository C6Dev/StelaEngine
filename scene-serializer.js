// scene-serializer.js
import * as THREE from 'three';
import * as ObjectManager from './object-manager.js';
import { addObjectToThreeScene, removeObjectFromThreeScene, getScene as getThreeSceneInstance, 
         attachTransformControls, detachTransformControls, setOnTransformControlsObjectChange } from './three-scene.js'; 
import { customConsole } from './script-engine.js';
import * as FileManager from './file-manager.js'; 
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as GameCameraService from './game-camera-service.js'; // Import new service

// --- Helper functions for Base64 <-> ArrayBuffer (copied here for self-containment if preferred) ---
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    try {
        return window.btoa(binary);
    } catch (e) {
        customConsole.error("SceneSerializer: Failed to convert ArrayBuffer to Base64:", e);
        return null;
    }
}

function base64ToArrayBuffer(base64) {
     try {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    } catch (e) {
        customConsole.error("SceneSerializer: Failed to convert Base64 to ArrayBuffer:", e);
        return null;
    }
}

export function getSceneState() {
    const state = {
        objects: [],
        activeCameraObjectName: GameCameraService.getActiveCameraObjectName(), // Use GameCameraService
    };
    const mainThreeScene = getThreeSceneInstance(); 
    const sceneObjectsMap = ObjectManager.getSceneObjects();

    for (const name in sceneObjectsMap) {
        const obj = sceneObjectsMap[name];
        const parentName = (obj.parent && obj.parent !== mainThreeScene && sceneObjectsMap[obj.parent.name]) ? obj.parent.name : null;
        
        let objType = 'cube'; // Default
        if (obj.userData?.isImportedModel) {
            objType = 'gltf_model'; // New type for imported models
        } else if (obj.geometry instanceof THREE.SphereGeometry) {
            objType = 'sphere';
        } else if (obj.geometry instanceof THREE.CylinderGeometry) {
            objType = 'cylinder';
        }
        // Cube is fallback

        const objectState = {
            name: obj.name,
            type: objType, 
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: THREE.MathUtils.radToDeg(obj.rotation.x), y: THREE.MathUtils.radToDeg(obj.rotation.y), z: THREE.MathUtils.radToDeg(obj.rotation.z) },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            scripts: obj.userData && obj.userData.scripts ? [...obj.userData.scripts] : [],
            parentName: parentName,
            isImportedModel: obj.userData?.isImportedModel || false, 
            modelSourcePath: obj.userData?.modelSourcePath || null 
        };

        if (obj.userData?.isImportedModel && obj.userData.modelSourcePath) {
            const modelContent = FileManager.loadFile(obj.userData.modelSourcePath);
            if (modelContent) {
                if (modelContent instanceof ArrayBuffer) { // GLB
                    const base64Data = arrayBufferToBase64(modelContent);
                    if (base64Data) {
                        objectState.modelEmbeddedData = base64Data;
                        objectState.modelEmbeddedDataType = 'glb';
                    } else {
                         customConsole.warn(`SceneSave: Failed to convert GLB model data to base64 for ${obj.name}. Model will not be embedded.`);
                    }
                } else if (typeof modelContent === 'string') { // GLTF
                    objectState.modelEmbeddedData = modelContent; // GLTF is JSON string, directly embeddable
                    objectState.modelEmbeddedDataType = 'gltf';
                }
            } else {
                customConsole.warn(`SceneSave: Model content for ${obj.name} at path ${obj.userData.modelSourcePath} not found in FileManager. Model will not be embedded.`);
            }
        }
        state.objects.push(objectState);
    }
    return state;
}

export async function loadSceneState(sceneData) {
    if (!sceneData) return;

    ObjectManager.resetObjectManager(); 
    const mainThreeScene = getThreeSceneInstance(); 
    const tempCreatedObjects = {}; 
    const objectCounters = ObjectManager.getObjectCounters(); 
    const loader = new GLTFLoader(); // GLTFLoader instance for parsing embedded models

    for (const objData of sceneData.objects) {
        let mesh;

        if (objData.isImportedModel && objData.modelEmbeddedData && objData.modelEmbeddedDataType) {
            let parsedData;
            if (objData.modelEmbeddedDataType === 'glb') {
                parsedData = base64ToArrayBuffer(objData.modelEmbeddedData);
            } else if (objData.modelEmbeddedDataType === 'gltf') {
                parsedData = objData.modelEmbeddedData; // Already a string
            }

            if (parsedData) {
                try {
                    const gltf = await new Promise((resolve, reject) => {
                        loader.parse(parsedData, '', resolve, reject);
                    });
                    mesh = gltf.scene;
                    // Center the loaded model as ObjectManager.addGltfModelDataToScene does
                    const box = new THREE.Box3().setFromObject(mesh);
                    const center = box.getCenter(new THREE.Vector3());
                    mesh.position.sub(center); 
                } catch (error) {
                    customConsole.error(`Error parsing embedded ${objData.modelEmbeddedDataType} model for "${objData.name}": ${error.message || error}`);
                    mesh = ObjectManager.createPrimitivePlaceholder('cube'); // Fallback placeholder
                }
            } else {
                 customConsole.error(`Failed to decode embedded model data for "${objData.name}". Creating placeholder.`);
                 mesh = ObjectManager.createPrimitivePlaceholder('cube');
            }
            mesh.userData.isImportedModel = true;
            // Restore modelSourcePath if available, or it might be set by ObjectManager later
            mesh.userData.modelSourcePath = objData.modelSourcePath || `embedded/${objData.name}.${objData.modelEmbeddedDataType}`;

        } else if (objData.isImportedModel && objData.modelSourcePath) {
            // Fallback: Try to load from FileManager if not embedded (e.g., older project or specific case)
            customConsole.warn(`Model "${objData.name}" specified source path "${objData.modelSourcePath}" but no embedded data found. Attempting to load from project files... (This path may not be fully supported yet for direct scene load).`);
            const modelFileContent = FileManager.loadFile(objData.modelSourcePath);
            if (modelFileContent) {
                 try {
                    const gltf = await new Promise((resolve, reject) => {
                        loader.parse(modelFileContent, '', resolve, reject);
                    });
                    mesh = gltf.scene;
                    const box = new THREE.Box3().setFromObject(mesh);
                    const center = box.getCenter(new THREE.Vector3());
                    mesh.position.sub(center); 
                } catch (error) {
                    customConsole.error(`Error parsing model from project file "${objData.modelSourcePath}" for "${objData.name}": ${error}`);
                    mesh = ObjectManager.createPrimitivePlaceholder('cube');
                }
            } else {
                 customConsole.error(`Model file "${objData.modelSourcePath}" for "${objData.name}" not found in project files. Creating placeholder.`);
                 mesh = ObjectManager.createPrimitivePlaceholder('cube');
            }
            mesh.userData.isImportedModel = true;
            mesh.userData.modelSourcePath = objData.modelSourcePath;

        } else { // Primitive object
            mesh = ObjectManager.createPrimitivePlaceholder(objData.type);
        }
        
        mesh.name = objData.name;
        // Apply transform after potential model centering
        mesh.position.add(new THREE.Vector3(objData.position.x, objData.position.y, objData.position.z));
        mesh.rotation.set(
            THREE.MathUtils.degToRad(objData.rotation.x),
            THREE.MathUtils.degToRad(objData.rotation.y),
            THREE.MathUtils.degToRad(objData.rotation.z)
        );
        mesh.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
        
        // Ensure userData.scripts exists
        if (!mesh.userData) mesh.userData = {};
        mesh.userData.scripts = objData.scripts ? [...objData.scripts] : [];
        if (objData.isImportedModel) { // Re-affirm these after potential mesh recreation
            mesh.userData.isImportedModel = true;
            mesh.userData.modelSourcePath = objData.modelSourcePath || mesh.userData.modelSourcePath;
        }
        
        ObjectManager.getSceneObjects()[mesh.name] = mesh; 
        tempCreatedObjects[mesh.name] = mesh; 
    }

    // Parenting pass
    for (const objData of sceneData.objects) {
        const childObject = tempCreatedObjects[objData.name];
        if (!childObject) continue;

        if (objData.parentName && tempCreatedObjects[objData.parentName]) {
            const parentObject = tempCreatedObjects[objData.parentName];
            parentObject.add(childObject); 
        } else {
            addObjectToThreeScene(childObject); 
        }
    }
    
    // Update counters
    sceneData.objects.forEach(objData => {
        const match = objData.name.match(/^(Cube|Sphere|Cylinder)(\d+)$/);
        if (match) {
            const type = match[1].toLowerCase();
            const num = parseInt(match[2]);
            if (objectCounters[type] !== undefined) {
                objectCounters[type] = Math.max(objectCounters[type], num);
            }
        }
        // Update counter for models based on modelSourcePath or name pattern
        if (objData.isImportedModel) {
             const modelNameMatch = objData.name.match(/^(.*?)(-?)(\d*)$/i); // Try to extract number suffix
             if (modelNameMatch && modelNameMatch[3]) { // If there's a number suffix
                 const num = parseInt(modelNameMatch[3]);
                 objectCounters.model = Math.max(objectCounters.model, num);
             } else if (objData.modelSourcePath) { // Fallback if no number in name but source path exists
                 // Could try to parse number from modelSourcePath if a pattern is established
                 // For now, just ensure model counter increments if any model is loaded
                 objectCounters.model = Math.max(objectCounters.model, 0); // Ensure it's at least 0
             }
        }
    });

    ObjectManager.setActiveCameraObjectName(sceneData.activeCameraObjectName || null, false); 
}