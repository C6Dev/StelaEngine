// gltf-loader-manager.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as DOM from './dom-elements.js';
import * as ScriptEngine from './script-engine.js';
import * as ObjectManager from './object-manager.js';
import * as ProjectManager from './project-manager.js';
import * as GameManager from './game-manager.js';
import * as FileManager from './file-manager.js';

export function initGltfLoaderManager() {
    DOM.modelFileInput.addEventListener('change', handleGltfFileSelected);
}

export function initiateLoadGltfModel() {
    if (GameManager.getIsPlaying()) {
        ScriptEngine.customConsole.warn("Cannot import models while game is playing.");
        return;
    }
    ScriptEngine.customConsole.log("GLTF model import initiated via file dialog.");
    DOM.modelFileInput.value = null;
    DOM.modelFileInput.click();
}

function handleGltfFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const rawModelData = e.target.result; 
        const modelFileTypeKey = file.name.toLowerCase().endsWith('.glb') ? 'MODEL_GLB' : 'MODEL_GLTF';
        
        const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
        const modelPathInProject = FileManager.getUniqueFilePath(baseName, modelFileTypeKey);

        if (!FileManager.saveFile(modelPathInProject, rawModelData)) {
            ScriptEngine.customConsole.error(`Failed to internally store model data for "${file.name}".`);
            return;
        }
        
        const loader = new GLTFLoader();
        try {
            loader.parse(rawModelData, '', 
                (gltf) => {
                    ObjectManager.addGltfModelDataToScene(gltf.scene, modelPathInProject); 
                }, 
                (error) => {
                    console.error('Error parsing GLTF model:', error);
                    ScriptEngine.customConsole.error(`Failed to parse GLTF model "${file.name}": ${error.message || error}`);
                }
            );
        } catch (parseError) {
             console.error('Critical error during GLTF parsing setup:', parseError);
             ScriptEngine.customConsole.error(`Critical error loading GLTF model "${file.name}": ${parseError.message}`);
        }
    };
    reader.onerror = (e) => {
        console.error('Error reading file:', e);
        ScriptEngine.customConsole.error(`Error reading file "${file.name}".`);
    };

    if (file.name.toLowerCase().endsWith('.glb')) {
        reader.readAsArrayBuffer(file);
    } else if (file.name.toLowerCase().endsWith('.gltf')) {
        reader.readAsText(file);
    } else {
        ScriptEngine.customConsole.error("Unsupported model file type. Please use .gltf or .glb");
    }
}