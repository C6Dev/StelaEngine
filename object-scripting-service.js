// object-scripting-service.js
import * as GameManager from './game-manager.js';
import * as ProjectManager from './project-manager.js';
import * as ScriptEngine from './script-engine.js'; // For customConsole
import * as ObjectManager from './object-manager.js'; // Import ObjectManager directly
import * as UIManager from './ui-manager.js'; // Still needed for populatePropertiesPanel

export function initObjectScriptingService() {
    // Initialization if needed
}

export function addScriptComponentToObject(object, scriptName) {
    if (GameManager.getIsPlaying()) return;
    if (!object || !scriptName) return;

    if (!object.userData) object.userData = {};
    if (!object.userData.scripts) object.userData.scripts = [];

    if (!object.userData.scripts.includes(scriptName)) {
        object.userData.scripts.push(scriptName);
        ProjectManager.markProjectDirty();
        UIManager.populatePropertiesPanel(); // Refresh properties
    } else {
        ScriptEngine.customConsole.warn(`Script "${scriptName}" already attached to object "${object.name}".`);
    }
}

export function removeScriptComponentFromObject(object, scriptName) {
    if (GameManager.getIsPlaying()) return;
    if (!object || !scriptName || !object.userData || !object.userData.scripts) return;

    const index = object.userData.scripts.indexOf(scriptName);
    if (index > -1) {
        object.userData.scripts.splice(index, 1);
        ProjectManager.markProjectDirty();
        UIManager.populatePropertiesPanel(); // Refresh properties
    }
}

export function removeScriptComponentFromAllObjects(scriptName) {
    if (GameManager.getIsPlaying()) return;
    let changed = false;
    const sceneObjectsMap = ObjectManager.getSceneObjects(); // Use ObjectManager
    if (!sceneObjectsMap) {
        console.error("ObjectScriptingService: Could not get sceneObjectsMap.");
        return;
    }


    for (const objName in sceneObjectsMap) {
        const obj = sceneObjectsMap[objName];
        if (obj.userData && obj.userData.scripts) {
            const index = obj.userData.scripts.indexOf(scriptName);
            if (index > -1) {
                obj.userData.scripts.splice(index, 1);
                changed = true;
            }
        }
    }
    if (changed) {
        ProjectManager.markProjectDirty();
        const selectedObject = ObjectManager.getSelectedObject(); // Use ObjectManager
        if (selectedObject && selectedObject.userData && selectedObject.userData.scripts && !selectedObject.userData.scripts.includes(scriptName)) {
            UIManager.populatePropertiesPanel();
        }
    }
}

export function updateScriptComponentNameOnAllObjects(oldScriptName, newScriptName) {
    if (GameManager.getIsPlaying()) return;
    let changed = false;
    const sceneObjectsMap = ObjectManager.getSceneObjects(); // Use ObjectManager
     if (!sceneObjectsMap) {
        console.error("ObjectScriptingService: Could not get sceneObjectsMap for update.");
        return;
    }

    for (const objName in sceneObjectsMap) {
        const obj = sceneObjectsMap[objName];
        if (obj.userData && obj.userData.scripts) {
            const index = obj.userData.scripts.indexOf(oldScriptName);
            if (index > -1) {
                obj.userData.scripts[index] = newScriptName;
                changed = true;
            }
        }
    }
    if (changed) {
        ProjectManager.markProjectDirty();
        const selectedObject = ObjectManager.getSelectedObject(); // Use ObjectManager
        if (selectedObject) {
             UIManager.populatePropertiesPanel(); // Refresh if selected object might have been affected
        }
    }
}