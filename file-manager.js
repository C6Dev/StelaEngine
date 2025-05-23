// Stela File Manager (project-aware, using local files via ProjectManager)
import * as ScriptEngine from './script-engine.js';
import * as ProjectManager from './project-manager.js'; // For marking dirty

let currentProjectNameForFileManager = null; // Renamed to avoid conflict, set by ProjectManager
let currentOpenScriptName = null;
let currentOpenVisualScriptName = null;

// This will hold the script data for the currently loaded project.
// It's populated by ProjectManager when a project is loaded.
let projectScriptsData = {
    text: {},
    visual: {}
};

let uiUpdateHooks = {
    refreshScriptLists: () => {},
    clearEditorForDeletedScript: (name, type) => {}, 
};

export function initFileManager(hooks) {
    if (hooks) {
        uiUpdateHooks = {...uiUpdateHooks, ...hooks};
    }
}

export function setCurrentProjectName(name) {
    currentProjectNameForFileManager = name;
    // When project context changes, script data is reset/reloaded by ProjectManager.
    // Open script names are also handled by ProjectManager during load/new.
}

// --- Project Data Functions (localStorage based) - REMOVED or REPURPOSED ---
// saveProjectData, loadProjectData, listProjects, deleteProject are now handled by ProjectManager
// using file downloads/uploads.

// --- Text Scripts (In-memory for current project) ---
export function getCurrentOpenScriptName() { return currentOpenScriptName; }
export function setCurrentOpenScriptName(name) { currentOpenScriptName = name; }

export function saveScript(name, content) {
    if (!currentProjectNameForFileManager) { 
        ScriptEngine.customConsole.error("Cannot save script: No active project context in FileManager.");
        return false;
    }
    if (!name || !name.trim()) {
        ScriptEngine.customConsole.error("Script name cannot be empty.");
        return false;
    }
    if (!name.endsWith(".stela")) name += ".stela";
    
    projectScriptsData.text[name] = content;
    setCurrentOpenScriptName(name); 
    uiUpdateHooks.refreshScriptLists(currentProjectNameForFileManager); 
    ProjectManager.markProjectDirty(); 
    return true;
}

export function loadScript(name, updateCurrentlyOpen = true) {
    if (!currentProjectNameForFileManager) return null; 
    
    const content = projectScriptsData.text[name];
    if (content === undefined) { 
        return null;
    }
    if (updateCurrentlyOpen) setCurrentOpenScriptName(name);
    return content;
}

export function deleteScript(name) {
    if (!currentProjectNameForFileManager) return false; 
    
    if (projectScriptsData.text[name] === undefined) return false;
    delete projectScriptsData.text[name];
    ScriptEngine.removeCompiledScript(name);
    if (currentOpenScriptName === name) {
        setCurrentOpenScriptName(null);
        uiUpdateHooks.clearEditorForDeletedScript(name, 'text');
    }
    uiUpdateHooks.refreshScriptLists(currentProjectNameForFileManager); 
    ProjectManager.markProjectDirty();
    return true;
}

export function renameScript(oldName, newName) {
    if (!currentProjectNameForFileManager) return false; 
    if (!oldName || !newName || oldName === newName) return false;
    if (!newName.trim().endsWith(".stela")) newName = newName.trim() + ".stela";

    if (projectScriptsData.text[newName] !== undefined) {
        alert(`Script name "${newName}" already exists in the current project.`);
        return false;
    }
    const content = projectScriptsData.text[oldName];
    if (content === undefined) return false;

    projectScriptsData.text[newName] = content;
    delete projectScriptsData.text[oldName];
    ScriptEngine.renameCompiledScript(oldName, newName);
    if (currentOpenScriptName === oldName) setCurrentOpenScriptName(newName);
    uiUpdateHooks.refreshScriptLists(currentProjectNameForFileManager); 
    ProjectManager.markProjectDirty();
    return true;
}

export function listScripts() { 
    if (!currentProjectNameForFileManager) return []; 
    
    return Object.keys(projectScriptsData.text).sort();
}

export function getUniqueScriptName(baseName = "NewScript") {
    if (!currentProjectNameForFileManager) return `${baseName}.stela`; 
    let count = 1;
    let name = `${baseName}.stela`;
    const existingScripts = listScripts();
    while (existingScripts.includes(name)) {
        name = `${baseName}${count++}.stela`;
    }
    return name;
}

export function getAllTextScriptsForCurrentProject() {
    return { ...projectScriptsData.text };
}


// --- Visual Scripts (In-memory for current project) ---
export function getCurrentOpenVisualScriptName() { return currentOpenVisualScriptName; }
export function setCurrentOpenVisualScriptName(name) { currentOpenVisualScriptName = name; }

export function saveVisualScript(name, jsonData) {
    if (!currentProjectNameForFileManager) { 
         ScriptEngine.customConsole.error("Cannot save visual script: No active project context in FileManager.");
         return false;
    }
    if (!name || !name.trim()) return false;
    if (!name.endsWith(".stela-vs")) name += ".stela-vs";
    
    projectScriptsData.visual[name] = jsonData;
    setCurrentOpenVisualScriptName(name);
    uiUpdateHooks.refreshScriptLists(currentProjectNameForFileManager); 
    ProjectManager.markProjectDirty();
    return true;
}

export function loadVisualScript(name, updateCurrentlyOpen = true) {
    if (!currentProjectNameForFileManager) return null; 
    
    const data = projectScriptsData.visual[name];
    if (data === undefined) return null;
    if (updateCurrentlyOpen) setCurrentOpenVisualScriptName(name);
    return data; 
}

export function deleteVisualScript(name) {
    if (!currentProjectNameForFileManager) return false; 
    
    if (projectScriptsData.visual[name] === undefined) return false;
    delete projectScriptsData.visual[name];
    if (currentOpenVisualScriptName === name) {
        setCurrentOpenVisualScriptName(null);
        uiUpdateHooks.clearEditorForDeletedScript(name, 'visual');
    }
    uiUpdateHooks.refreshScriptLists(currentProjectNameForFileManager); 
    ProjectManager.markProjectDirty();
    return true;
}

export function renameVisualScript(oldName, newName) {
    if (!currentProjectNameForFileManager) return false; 
    if (!oldName || !newName || oldName === newName) return false;
    if (!newName.trim().endsWith(".stela-vs")) newName = newName.trim() + ".stela-vs";

    if (projectScriptsData.visual[newName] !== undefined) {
        alert(`Visual script name "${newName}" already exists in the current project.`);
        return false;
    }
    const jsonData = projectScriptsData.visual[oldName];
    if (jsonData === undefined) return false;
    
    projectScriptsData.visual[newName] = jsonData;
    delete projectScriptsData.visual[oldName];
    if (currentOpenVisualScriptName === oldName) setCurrentOpenVisualScriptName(newName);
    uiUpdateHooks.refreshScriptLists(currentProjectNameForFileManager); 
    ProjectManager.markProjectDirty();
    return true;
}

export function listVisualScripts() { 
    if (!currentProjectNameForFileManager) return []; 
    
    return Object.keys(projectScriptsData.visual).sort();
}

export function visualScriptExists(scriptName) { 
    if (!currentProjectNameForFileManager || !scriptName) return false; 
    return projectScriptsData.visual[scriptName] !== undefined;
}


export function getUniqueVisualScriptName(baseName = "NewVS") {
    if (!currentProjectNameForFileManager) return `${baseName}.stela-vs`; 
    let count = 1;
    let name = `${baseName}.stela-vs`;
    const existingScripts = listVisualScripts();
    while (existingScripts.includes(name)) {
        name = `${baseName}${count++}.stela-vs`;
    }
    return name;
}

export function getAllVisualScriptsForCurrentProject() {
    return { ...projectScriptsData.visual };
}

// Used by ProjectManager to populate FileManager's in-memory script store for a newly loaded project
export function loadAllScriptsForProject(textScriptsMap, visualScriptsMap) {
    projectScriptsData.text = textScriptsMap ? { ...textScriptsMap } : {};
    projectScriptsData.visual = visualScriptsMap ? { ...visualScriptsMap } : {};

    ScriptEngine.clearCompiledScripts(); 
    for (const scriptName in projectScriptsData.text) {
        ScriptEngine.compileScript(scriptName, projectScriptsData.text[scriptName], false); 
    }
    uiUpdateHooks.refreshScriptLists(currentProjectNameForFileManager); 
}