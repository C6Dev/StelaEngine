// Stela Script File Manager (using localStorage)
import * as ScriptEngine from './script-engine.js'; // Import ScriptEngine

const SCRIPT_PREFIX = 'stela_script_';
const VS_SCRIPT_PREFIX = 'stela_vs_script_'; // New prefix for visual scripts

let currentOpenScriptName = null; // Tracks the script currently active in the editor tab
let currentOpenVisualScriptName = null; // Tracks visual script in VS editor

let uiUpdateHooks = {
    refreshScriptLists: () => {},
    clearEditorForDeletedScript: (name) => {},
    clearVSEditorForDeletedScript: (name) => {} 
};

export function initFileManager(hooks) {
    if (hooks) {
        uiUpdateHooks = {...uiUpdateHooks, ...hooks};
    }
}

// --- Text Scripts ---
export function getCurrentOpenScriptName() {
    return currentOpenScriptName;
}

export function setCurrentOpenScriptName(name) {
    currentOpenScriptName = name;
}

export function saveScript(name, content) {
    if (!name || !name.trim()) {
        ScriptEngine.customConsole.error("Script name cannot be empty.");
        return false;
    }
    if (!name.endsWith(".stela")) name += ".stela"; // Ensure extension
    const key = SCRIPT_PREFIX + name;
    try {
        localStorage.setItem(key, content);
        setCurrentOpenScriptName(name); // Use setter
        uiUpdateHooks.refreshScriptLists(); 
        return true;
    } catch (e) {
        ScriptEngine.customConsole.error(`Error saving script "${name}": ${e.message}`);
        alert("Could not save script. LocalStorage might be full or disabled.");
        return false;
    }
}

export function loadScript(name, updateCurrentlyOpen = true) { 
    const key = SCRIPT_PREFIX + name;
    const content = localStorage.getItem(key);
    if (content === null) {
        ScriptEngine.customConsole.warn(`Script "${name}" not found.`);
        return null;
    }
    if (updateCurrentlyOpen) {
        setCurrentOpenScriptName(name); // Use setter
    }
    return content;
}

export function deleteScript(name) {
    const key = SCRIPT_PREFIX + name;
    if (localStorage.getItem(key) === null) {
        ScriptEngine.customConsole.warn(`Script "${name}" not found for deletion.`);
        return false;
    }
    localStorage.removeItem(key);
    ScriptEngine.customConsole.log(`Script "${name}" deleted from storage.`);
    
    ScriptEngine.removeCompiledScript(name); 

    if (currentOpenScriptName === name) {
        setCurrentOpenScriptName(null); // Use setter
        uiUpdateHooks.clearEditorForDeletedScript(name); 
    }
    uiUpdateHooks.refreshScriptLists(); 
    return true;
}

export function renameScript(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        ScriptEngine.customConsole.error("Invalid names for renaming.", oldName, newName);
        return false;
    }
    if (!newName.trim().endsWith(".stela")) {
        newName = newName.trim() + ".stela";
    }
    if (listScripts().includes(newName)) {
        alert(`Script name "${newName}" already exists.`);
        ScriptEngine.customConsole.error(`Script name "${newName}" already exists.`);
        return false;
    }

    const content = loadScript(oldName, false); 
    if (content === null) {
        ScriptEngine.customConsole.error(`Script "${oldName}" not found, cannot rename.`);
        return false; 
    }

    // Save under new name first
    const newKey = SCRIPT_PREFIX + newName;
    try {
        localStorage.setItem(newKey, content);
    } catch (e) {
        ScriptEngine.customConsole.error(`Error saving script "${newName}" during rename: ${e.message}`);
        alert("Could not save renamed script. LocalStorage might be full or disabled.");
        return false;
    }
    
    // Then delete old one
    const oldKey = SCRIPT_PREFIX + oldName;
    localStorage.removeItem(oldKey);
    
    ScriptEngine.renameCompiledScript(oldName, newName);

    if (currentOpenScriptName === oldName) {
        setCurrentOpenScriptName(newName); // Use setter
    }
    uiUpdateHooks.refreshScriptLists();
    return true;
}

export function listScripts() {
    const scripts = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(SCRIPT_PREFIX)) {
            scripts.push(key.substring(SCRIPT_PREFIX.length));
        }
    }
    return scripts.sort();
}

export function getUniqueScriptName(baseName = "NewScript") {
    let count = 1;
    let name = `${baseName}.stela`;
    const existingScripts = listScripts();
    while (existingScripts.includes(name)) {
        name = `${baseName}${count++}.stela`;
    }
    return name;
}


// --- Visual Scripts ---
export function getCurrentOpenVisualScriptName() {
    return currentOpenVisualScriptName;
}

export function setCurrentOpenVisualScriptName(name) {
    currentOpenVisualScriptName = name;
}

export function saveVisualScript(name, jsonData) {
    if (!name || !name.trim()) {
        ScriptEngine.customConsole.error("Visual Script name cannot be empty.");
        return false;
    }
    if (!name.endsWith(".stela-vs")) name += ".stela-vs";
    const key = VS_SCRIPT_PREFIX + name;
    try {
        localStorage.setItem(key, JSON.stringify(jsonData));
        setCurrentOpenVisualScriptName(name); // Use setter
        // ScriptEngine.compileVisualScript(name, jsonData); // Recompile/cache on save // Assuming VS execution will handle this
        uiUpdateHooks.refreshScriptLists();
        ScriptEngine.customConsole.log(`Visual script "${name}" saved.`);
        return true;
    } catch (e) {
        ScriptEngine.customConsole.error(`Error saving visual script "${name}": ${e.message}`);
        alert("Could not save visual script. LocalStorage might be full or disabled.");
        return false;
    }
}

export function loadVisualScript(name, updateCurrentlyOpen = true) {
    const key = VS_SCRIPT_PREFIX + name;
    const content = localStorage.getItem(key);
    if (content === null) {
        ScriptEngine.customConsole.warn(`Visual Script "${name}" not found.`);
        return null;
    }
    try {
        const jsonData = JSON.parse(content);
        if (updateCurrentlyOpen) {
            setCurrentOpenVisualScriptName(name); // Use setter
        }
        return jsonData;
    } catch (e) {
        ScriptEngine.customConsole.error(`Error parsing visual script "${name}": ${e.message}`);
        return null;
    }
}

export function deleteVisualScript(name) {
    const key = VS_SCRIPT_PREFIX + name;
    if (localStorage.getItem(key) === null) {
        ScriptEngine.customConsole.warn(`Visual Script "${name}" not found for deletion.`);
        return false;
    }
    localStorage.removeItem(key);
    ScriptEngine.customConsole.log(`Visual Script "${name}" deleted from storage.`);
    
    // ScriptEngine.removeCompiledVisualScript(name); // Assuming VS execution engine will handle missing scripts

    if (currentOpenVisualScriptName === name) {
        setCurrentOpenVisualScriptName(null); // Use setter
        uiUpdateHooks.clearVSEditorForDeletedScript(name); 
    }
    uiUpdateHooks.refreshScriptLists();
    return true;
}

export function renameVisualScript(oldName, newName) {
    if (!oldName || !newName || oldName === newName) {
        ScriptEngine.customConsole.error("Invalid names for renaming visual script.", oldName, newName);
        return false;
    }
     if (!newName.trim().endsWith(".stela-vs")) {
        newName = newName.trim() + ".stela-vs";
    }
    if (listVisualScripts().includes(newName)) {
        alert(`Visual Script name "${newName}" already exists.`);
        ScriptEngine.customConsole.error(`Visual Script name "${newName}" already exists.`);
        return false;
    }

    const jsonData = loadVisualScript(oldName, false);
    if (jsonData === null) {
        ScriptEngine.customConsole.error(`Visual Script "${oldName}" not found, cannot rename.`);
        return false;
    }

    // Save new
    const newKey = VS_SCRIPT_PREFIX + newName;
     try {
        localStorage.setItem(newKey, JSON.stringify(jsonData));
    } catch (e) {
        ScriptEngine.customConsole.error(`Error saving visual script "${newName}" during rename: ${e.message}`);
        alert("Could not save renamed visual script. LocalStorage might be full or disabled.");
        return false;
    }

    // Delete old
    const oldKey = VS_SCRIPT_PREFIX + oldName;
    localStorage.removeItem(oldKey);
    
    // ScriptEngine.renameCompiledVisualScript(oldName, newName); // Assuming VS execution engine handles this

    if (currentOpenVisualScriptName === oldName) {
        setCurrentOpenVisualScriptName(newName); // Use setter
    }
    uiUpdateHooks.refreshScriptLists();
    return true;
}

export function listVisualScripts() {
    const scripts = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(VS_SCRIPT_PREFIX)) {
            scripts.push(key.substring(VS_SCRIPT_PREFIX.length));
        }
    }
    return scripts.sort();
}

export function getUniqueVisualScriptName(baseName = "NewVS") { // Changed base name slightly
    let count = 1;
    let name = `${baseName}.stela-vs`;
    const existingScripts = listVisualScripts();
    while (existingScripts.includes(name)) {
        name = `${baseName}${count++}.stela-vs`;
    }
    return name;
}