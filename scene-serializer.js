// scene-serializer.js
import * as THREE from 'three';
import * as ObjectManager from './object-manager.js';
import { addObjectToThreeScene, removeObjectFromThreeScene, getScene as getThreeSceneInstance, 
         attachTransformControls, detachTransformControls, setOnTransformControlsObjectChange } from './three-scene.js'; 
import { customConsole } from './script-engine.js';

export function getSceneState() {
    const state = {
        objects: [],
        activeCameraObjectName: ObjectManager.getActiveCameraObjectName(),
        // sceneBackgroundColor is handled by ProjectStateCoordinator saving active level's background color
    };
    const mainThreeScene = getThreeSceneInstance(); 
    const sceneObjectsMap = ObjectManager.getSceneObjects();

    for (const name in sceneObjectsMap) {
        const obj = sceneObjectsMap[name];
        const parentName = (obj.parent && obj.parent !== mainThreeScene && sceneObjectsMap[obj.parent.name]) ? obj.parent.name : null;
        
        let objType = 'cube'; 
        if (obj.geometry instanceof THREE.SphereGeometry) objType = 'sphere';
        else if (obj.geometry instanceof THREE.CylinderGeometry) objType = 'cylinder';
        else if (obj.userData?.isImportedModel) objType = 'gltf_placeholder'; 

        state.objects.push({
            name: obj.name,
            type: objType, 
            position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
            rotation: { x: THREE.MathUtils.radToDeg(obj.rotation.x), y: THREE.MathUtils.radToDeg(obj.rotation.y), z: THREE.MathUtils.radToDeg(obj.rotation.z) },
            scale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
            scripts: obj.userData && obj.userData.scripts ? [...obj.userData.scripts] : [],
            parentName: parentName,
            isImportedModel: obj.userData?.isImportedModel || false, 
            modelSourcePath: obj.userData?.modelSourcePath || null 
        });
    }
    return state;
}

export async function loadSceneState(sceneData) {
    if (!sceneData) return;

    ObjectManager.resetObjectManager(); 
    const mainThreeScene = getThreeSceneInstance(); 
    const tempCreatedObjects = {}; 
    const objectCounters = ObjectManager.getObjectCounters(); // Get counters from ObjectManager

    for (const objData of sceneData.objects) {
        let geometry, material;
        const defaultMaterial = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.6 });
        
        let mesh;

        if (objData.isImportedModel) {
            geometry = new THREE.BoxGeometry(1, 1, 1); 
            material = defaultMaterial.clone();
            material.color.setHex(0x800080); 
            mesh = new THREE.Mesh(geometry, material);
            mesh.userData.isImportedModel = true;
            mesh.userData.modelSourcePath = objData.modelSourcePath;
            customConsole.log(`Placeholder created for imported model "${objData.name}" (source: ${objData.modelSourcePath}). Re-import model if needed.`);
        } else {
            switch (objData.type) {
                case 'sphere':
                    geometry = new THREE.SphereGeometry(1, 32, 16);
                    material = defaultMaterial.clone(); 
                    material.color.setHex(0xff0077);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(0.8, 0.8, 2, 32);
                    material = defaultMaterial.clone(); 
                    material.color.setHex(0x77ff00);
                    break;
                case 'cube':
                default:
                    geometry = new THREE.BoxGeometry(2, 2, 2);
                    material = defaultMaterial.clone(); 
                    material.color.setHex(0x0077ff);
                    break;
            }
            mesh = new THREE.Mesh(geometry, material);
        }
        
        mesh.name = objData.name;
        mesh.position.set(objData.position.x, objData.position.y, objData.position.z);
        mesh.rotation.set(
            THREE.MathUtils.degToRad(objData.rotation.x),
            THREE.MathUtils.degToRad(objData.rotation.y),
            THREE.MathUtils.degToRad(objData.rotation.z)
        );
        mesh.scale.set(objData.scale.x, objData.scale.y, objData.scale.z);
        mesh.userData = { scripts: objData.scripts ? [...objData.scripts] : [] };
        if (objData.isImportedModel) { 
            mesh.userData.isImportedModel = true;
            mesh.userData.modelSourcePath = objData.modelSourcePath;
        }
        
        ObjectManager.getSceneObjects()[mesh.name] = mesh; 
        tempCreatedObjects[mesh.name] = mesh; 
    }

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
    
    sceneData.objects.forEach(objData => {
        const match = objData.name.match(/^(Cube|Sphere|Cylinder)(\d+)$/);
        if (match) {
            const type = match[1].toLowerCase();
            const num = parseInt(match[2]);
            if (objectCounters[type] !== undefined) {
                objectCounters[type] = Math.max(objectCounters[type], num);
            }
        }
        const modelMatch = objData.name.match(/^(Model|ImportedModel)(\d*)$/i); 
        if (modelMatch && objData.isImportedModel) {
            const num = modelMatch[2] ? parseInt(modelMatch[2]) : 0; 
            objectCounters.model = Math.max(objectCounters.model, num || 0); 
        }
    });

    ObjectManager.setActiveCameraObjectName(sceneData.activeCameraObjectName || null, false); 
}