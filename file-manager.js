// Stela File Manager (project-aware, using local files via ProjectManager)
import * as ScriptEngine from './script-engine.js';
import * as ProjectManager from './project-manager.js'; // For marking dirty

let currentProjectNameForFileManager = null;
let projectFilesData = {}; // Unified store for all project files: { "path/to/file.ext": content }

let currentOpenTextScriptPath = null;
let currentOpenVisualScriptPath = null;

// Define known file types and their properties
export const FILE_TYPES = {
    LEVEL: { extension: '.level', defaultDir: 'levels/', emoji: '🏞️', description: 'Level File' },
    STELA_SCRIPT: { extension: '.stela', defaultDir: 'scripts/', emoji: '📄', description: 'Stela Script' },
    VISUAL_SCRIPT: { extension: '.stela-vs', defaultDir: 'scripts/', emoji: '📊', description: 'Visual Script' },
    MODEL_GLTF: { extension: '.gltf', defaultDir: 'models/', emoji: '🧊', description: 'GLTF Model' },
    MODEL_GLB: { extension: '.glb', defaultDir: 'models/', emoji: '🧊', description: 'GLB Model' },
    // Future types:
    // AUDIO: { extension: '.mp3', defaultDir: 'audio/', emoji: '🎵', description: 'Audio File' },
};

let uiUpdateHooks = {
    refreshProjectFilesList: () => {}, // Renamed from refreshScriptLists
    clearEditorForDeletedFile: (filePath, fileTypeKey) => {},
};

export function initFileManager(hooks) {
    if (hooks) {
        uiUpdateHooks = {...uiUpdateHooks, ...hooks};
    }
}

export function setCurrentProjectName(name) {
    currentProjectNameForFileManager = name;
}

// --- Generic File Operations ---

export function saveFile(filePath, content) {
    if (!currentProjectNameForFileManager) {
        ScriptEngine.customConsole.error("Cannot save file: No active project context.");
        return false;
    }
    if (!filePath || !filePath.trim()) {
        ScriptEngine.customConsole.error("File path cannot be empty.");
        return false;
    }
    
    // Ensure content is serializable for JSON (needed for ProjectData)
    // For JSON file types (.level, .stela-vs), stringify before storing
    // For text files (.stela), store as is.
    // For binary files (models, audio), store as ArrayBuffer/Blob.
    let serializableContent = content;
    const fileTypeKey = getFileTypeKeyFromPath(filePath);

    if (fileTypeKey === 'VISUAL_SCRIPT' || fileTypeKey === 'LEVEL') {
         if (typeof content !== 'string') {
             try {
                 serializableContent = JSON.stringify(content, null, 2);
             } catch (e) {
                 ScriptEngine.customConsole.error(`Cannot save file "${filePath}": Content is not a string and failed to serialize to JSON. ${e.message}`);
                 return false;
             }
         } // If content is already a string, assume it's pre-stringified JSON (e.g. loaded GLTF)
    } else if (typeof content !== 'string') {
        // Handle other non-string types like ArrayBuffer for models if needed
        // For now, just check if it's a simple string for text files.
        if (!(content instanceof ArrayBuffer) && !(content instanceof Blob)) {
             ScriptEngine.customConsole.warn(`Saving non-string, non-ArrayBuffer content for file type ${fileTypeKey}: "${filePath}". Content might not be saved correctly.`);
        }
    }

    projectFilesData[filePath] = serializableContent;
    ProjectManager.markProjectDirty();
    uiUpdateHooks.refreshProjectFilesList(currentProjectNameForFileManager);
    return true;
}

export function loadFile(filePath) {
    if (!currentProjectNameForFileManager) return undefined; // Use undefined for not found
    const content = projectFilesData[filePath];
    if (content === undefined) return undefined;

    const fileTypeKey = getFileTypeKeyFromPath(filePath);

    if (fileTypeKey === 'VISUAL_SCRIPT' || fileTypeKey === 'LEVEL') {
        // Always parse JSON for these types and return a deep copy
        if (typeof content !== 'string') {
             ScriptEngine.customConsole.error(`Cannot load ${fileTypeKey} file "${filePath}": Stored content is not a string.`);
             return undefined;
        }
        try {
             const parsedContent = JSON.parse(content);
             // Return a deep copy to avoid modifying the original object in projectFilesData directly
             return JSON.parse(JSON.stringify(parsedContent));
        } catch (e) {
            ScriptEngine.customConsole.error(`Failed to parse ${fileTypeKey} file "${filePath}": ${e.message}`);
            // If parsing fails, treat as not found or invalid
            return undefined; 
        }
    }
    // Return raw content (string, ArrayBuffer, etc.) for other types
    return content;
}

export function deleteFile(filePath) {
    if (!currentProjectNameForFileManager || projectFilesData[filePath] === undefined) return false;

    const fileTypeKey = getFileTypeKeyFromPath(filePath);

    delete projectFilesData[filePath];
    ProjectManager.markProjectDirty();

    if (filePath.endsWith(FILE_TYPES.STELA_SCRIPT.extension)) {
        ScriptEngine.removeCompiledScript(filePath);
        if (currentOpenTextScriptPath === filePath) {
            currentOpenTextScriptPath = null;
            uiUpdateHooks.clearEditorForDeletedFile(filePath, 'STELA_SCRIPT');
        }
    } else if (filePath.endsWith(FILE_TYPES.VISUAL_SCRIPT.extension)) {
        // Potentially remove compiled version if VS is also compiled to text on save
        if (currentOpenVisualScriptPath === filePath) {
            currentOpenVisualScriptPath = null;
            uiUpdateHooks.clearEditorForDeletedFile(filePath, 'VISUAL_SCRIPT');
        }
    } else if (filePath.endsWith(FILE_TYPES.LEVEL.extension)) {
        // Level deletion specific logic (like updating active level if it was deleted)
        // is handled by LevelDataManager/ProjectManager which calls this function.
    }

    uiUpdateHooks.refreshProjectFilesList(currentProjectNameForFileManager);
    return true;
}

export function renameFile(oldFilePath, newFilePath) {
    if (!currentProjectNameForFileManager || !oldFilePath || !newFilePath || oldFilePath === newFilePath) return false;
    if (projectFilesData[oldFilePath] === undefined) {
        ScriptEngine.customConsole.error(`Cannot rename file: Old path "${oldFilePath}" not found.`);
        return false;
    }
    if (projectFilesData[newFilePath] !== undefined) {
        alert(`File path "${newFilePath}" already exists.`);
        return false;
    }

    const content = projectFilesData[oldFilePath];
    projectFilesData[newFilePath] = content;
    delete projectFilesData[oldFilePath];
    ProjectManager.markProjectDirty();

    // Update open file paths if the renamed file was open
    if (currentOpenTextScriptPath === oldFilePath) currentOpenTextScriptPath = newFilePath;
    if (currentOpenVisualScriptPath === oldFilePath) currentOpenVisualScriptPath = newFilePath;
    // Add similar handling for other file types if they have "open" states

    uiUpdateHooks.refreshProjectFilesList(currentProjectNameForFileManager);
    return true;
}

export function listFiles(typeKey = null) {
    if (!currentProjectNameForFileManager) return [];
    const allPaths = Object.keys(projectFilesData);
    if (!typeKey || !FILE_TYPES[typeKey]) {
        return allPaths.sort();
    }
    const specificExtension = FILE_TYPES[typeKey].extension;
    return allPaths.filter(path => path.endsWith(specificExtension)).sort();
}

export function fileExists(filePath) {
    if (!currentProjectNameForFileManager || !filePath) return false;
    return projectFilesData[filePath] !== undefined;
}

export function getUniqueFilePath(baseName, typeKey, preferredDir = null) {
    if (!currentProjectNameForFileManager || !FILE_TYPES[typeKey]) {
         ScriptEngine.customConsole.error(`FileManager: Unknown file type key "${typeKey}" for unique path generation.`);
        // Fallback: just return a path with extension, assuming no directory
        return `${baseName}${FILE_TYPES[typeKey]?.extension || ''}`;
    }
    const dir = preferredDir || FILE_TYPES[typeKey].defaultDir || '';
    const ext = FILE_TYPES[typeKey].extension;

    let count = 1;
    let path = `${dir}${baseName}${ext}`;
    while (fileExists(path)) {
        // Append number before extension, e.g., MyScript -> MyScript1.stela
        const nameWithoutExt = baseName.replace(ext, '');
        path = `${dir}${nameWithoutExt}${count++}${ext}`;
    }
    return path;
}

export function getAllProjectFiles() {
    return { ...projectFilesData };
}

export function loadAllProjectFiles(filesMap) {
    projectFilesData = filesMap ? { ...filesMap } : {};
    ScriptEngine.clearCompiledScripts();
    for (const filePath in projectFilesData) {
        if (filePath.endsWith(FILE_TYPES.STELA_SCRIPT.extension)) {
            // Compile text scripts on load
            ScriptEngine.compileScript(filePath, projectFilesData[filePath], false);
        }
         // Visual scripts are parsed on loadFile call when needed
    }
    uiUpdateHooks.refreshProjectFilesList(currentProjectNameForFileManager);
}

export function getFileTypeKeyFromPath(filePath) {
    for (const key in FILE_TYPES) {
        if (filePath.toLowerCase().endsWith(FILE_TYPES[key].extension.toLowerCase())) {
            return key;
        }
    }
    return null; // Unknown file type
}

// --- Current Open Editor File Tracking ---
export function getCurrentOpenTextScriptPath() { return currentOpenTextScriptPath; }
export function setCurrentOpenTextScriptPath(path) { currentOpenTextScriptPath = path; }

export function getCurrentOpenVisualScriptPath() { return currentOpenVisualScriptPath; }
export function setCurrentOpenVisualScriptPath(path) { currentOpenVisualScriptPath = path; }

// --- Script Specific Convenience Functions (Wrappers around generic) ---
export function saveScript(filePath, content) {
    let finalPath = filePath;
    if (!finalPath.toLowerCase().endsWith(FILE_TYPES.STELA_SCRIPT.extension.toLowerCase())) {
         ScriptEngine.customConsole.warn(`saveScript called with path "${filePath}" missing .stela extension. Adding it.`);
         finalPath += FILE_TYPES.STELA_SCRIPT.extension;
    }
    // Note: saveFile returns boolean, pass it up
    return saveFile(finalPath, content) ? finalPath : null; // Return the final path on success
}

export function loadScript(filePath, updateCurrentlyOpen = true) {
    const content = loadFile(filePath);
    if (content !== undefined && updateCurrentlyOpen) setCurrentOpenTextScriptPath(filePath);
    return content;
}

export function deleteScript(filePath) {
     // Note: deleteFile returns boolean, pass it up
    return deleteFile(filePath);
}

export function renameScript(oldFilePath, newBaseName) {
    const oldDir = oldFilePath.substring(0, oldFilePath.lastIndexOf('/') + 1);
    const newFilePath = getUniqueFilePath(newBaseName, 'STELA_SCRIPT', oldDir);
    return renameFile(oldFilePath, newFilePath) ? newFilePath : null;
}

export function listScripts() {
    return listFiles('STELA_SCRIPT');
}

export function getUniqueScriptName(baseName = "NewScript") {
    return getUniqueFilePath(baseName, 'STELA_SCRIPT');
}

export function saveVisualScript(filePath, jsonData) {
    let finalPath = filePath;
    if (!finalPath.toLowerCase().endsWith(FILE_TYPES.VISUAL_SCRIPT.extension.toLowerCase())) {
         ScriptEngine.customConsole.warn(`saveVisualScript called with path "${filePath}" missing .stela-vs extension. Adding it.`);
         finalPath += FILE_TYPES.VISUAL_SCRIPT.extension;
    }
    // Note: saveFile returns boolean, pass it up
    // Need to stringify JSON data before saving
    let jsonString;
    try {
        jsonString = JSON.stringify(jsonData, null, 2);
    } catch (e) {
        ScriptEngine.customConsole.error(`Failed to stringify visual script data for "${finalPath}": ${e.message}`);
        return null;
    }
    return saveFile(finalPath, jsonString) ? finalPath : null; // Return the final path on success
}

export function loadVisualScript(filePath, updateCurrentlyOpen = true) {
    // loadFile now handles JSON parsing for VS files
    const data = loadFile(filePath);
    if (data !== undefined && updateCurrentlyOpen) setCurrentOpenVisualScriptPath(filePath);
    return data;
}

export function deleteVisualScript(filePath) {
    return deleteFile(filePath);
}

export function renameVisualScript(oldFilePath, newBaseName) {
    const oldDir = oldFilePath.substring(0, oldFilePath.lastIndexOf('/') + 1);
    const newFilePath = getUniqueFilePath(newBaseName, 'VISUAL_SCRIPT', oldDir);
    return renameFile(oldFilePath, newFilePath) ? newFilePath : null;
}

export function listVisualScripts() {
    return listFiles('VISUAL_SCRIPT');
}

export function getUniqueVisualScriptName(baseName = "NewVS") {
    return getUniqueFilePath(baseName, 'VISUAL_SCRIPT');
}

export function visualScriptExists(scriptPath) {
    return fileExists(scriptPath);
}