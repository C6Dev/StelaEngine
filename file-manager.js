// Stela File Manager (project-aware, using local files via ProjectManager)
import * as ScriptEngine from './script-engine.js'; // Still needed for compile/remove calls
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

// Hold the customConsole reference
let _customConsole = console; // Default to standard console

// --- Helper functions for Base64 <-> ArrayBuffer ---
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
        _customConsole.error("Failed to convert ArrayBuffer to Base64:", e);
        return null; // Or handle error appropriately
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
        _customConsole.error("Failed to convert Base64 to ArrayBuffer:", e);
        return null; // Or handle error appropriately
    }
}

// Modify initFileManager to accept customConsole
export function initFileManager(hooks, customConsoleRef) {
    if (hooks) {
        uiUpdateHooks = {...uiUpdateHooks, ...hooks};
    }
    if (customConsoleRef) {
        _customConsole = customConsoleRef; // Use the provided customConsole
    }
}

export function setCurrentProjectName(name) {
    currentProjectNameForFileManager = name;
}

// --- Generic File Operations ---

export function saveFile(filePath, content) {
    if (!currentProjectNameForFileManager) {
        _customConsole.error("Cannot save file: No active project context.");
        return false;
    }
    if (!filePath || !filePath.trim()) {
        _customConsole.error("File path cannot be empty.");
        return false;
    }
    
    let serializableContent = content;
    const fileTypeKey = getFileTypeKeyFromPath(filePath);

    if (fileTypeKey === 'VISUAL_SCRIPT' || fileTypeKey === 'LEVEL') {
         if (typeof content !== 'string') { // If it's an object, stringify
             try {
                 serializableContent = JSON.stringify(content, null, 2);
             } catch (e) {
                 _customConsole.error(`Cannot save file "${filePath}": Content is not a string and failed to serialize to JSON. ${e.message}`);
                 return false;
             }
         } // If content is already a string, assume it's pre-stringified JSON
    } else if (fileTypeKey === 'MODEL_GLTF') { // GLTF is text-based JSON
        if (typeof content !== 'string') {
            _customConsole.error(`Cannot save GLTF file "${filePath}": Content is not a string.`);
            return false;
        }
        serializableContent = content; // Store as string
    } else if (fileTypeKey === 'MODEL_GLB') { // GLB is binary
        if (!(content instanceof ArrayBuffer)) {
            _customConsole.error(`Cannot save GLB file "${filePath}": Content is not an ArrayBuffer.`);
            return false;
        }
        serializableContent = content; // Store ArrayBuffer directly
    } else if (typeof content !== 'string') {
        // For STELA_SCRIPT, or other unknown types expecting string
        _customConsole.error(`Cannot save file "${filePath}" (type ${fileTypeKey}): Content is not a string.`);
        return false;
    }

    projectFilesData[filePath] = serializableContent;
    ProjectManager.markProjectDirty();
    uiUpdateHooks.refreshProjectFilesList(currentProjectNameForFileManager);
    return true;
}

export function loadFile(filePath) {
    if (!currentProjectNameForFileManager) return undefined; 
    const content = projectFilesData[filePath];
    if (content === undefined) return undefined;

    const fileTypeKey = getFileTypeKeyFromPath(filePath);

    if (fileTypeKey === 'VISUAL_SCRIPT' || fileTypeKey === 'LEVEL') {
        if (typeof content !== 'string') {
             _customConsole.error(`Cannot load ${fileTypeKey} file "${filePath}": Stored content is not a string.`);
             return undefined;
        }
        try {
             const parsedContent = JSON.parse(content);
             return JSON.parse(JSON.stringify(parsedContent)); // Deep copy
        } catch (e) {
            _customConsole.error(`Failed to parse ${fileTypeKey} file "${filePath}": ${e.message}`);
            return undefined; 
        }
    } else if (fileTypeKey === 'MODEL_GLB' && content instanceof ArrayBuffer) {
        return content; // Return ArrayBuffer directly
    } else if (fileTypeKey === 'MODEL_GLTF' && typeof content === 'string') {
        return content; // Return GLTF string directly
    } else if (fileTypeKey === 'STELA_SCRIPT' && typeof content === 'string') {
        return content; // Return Stela script string directly
    }
    
    // Fallback for potentially mis-typed content or other file types
    if (typeof content === 'string' && (fileTypeKey === 'MODEL_GLB' || fileTypeKey === 'MODEL_GLTF')){
        _customConsole.warn(`Loading model file ${filePath} as string, but expected specific type. Check storage format.`);
    }
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
        if (currentOpenVisualScriptPath === filePath) {
            currentOpenVisualScriptPath = null;
            uiUpdateHooks.clearEditorForDeletedFile(filePath, 'VISUAL_SCRIPT');
        }
    } else if (filePath.endsWith(FILE_TYPES.LEVEL.extension)) {
        // Level deletion specific logic handled by LevelDataManager/ProjectManager
    } else if (fileTypeKey === 'MODEL_GLB' || fileTypeKey === 'MODEL_GLTF') {
        // TODO: Need to notify ObjectManager to remove/replace any objects using this model path
        // This is complex because multiple objects might reference the same model path.
        // For now, just deleting from file system. User will see errors if objects try to load it.
        // Or, SceneSerializer.loadSceneState will fail to find its modelEmbeddedData / modelSourcePath.
        _customConsole.log(`Model file "${filePath}" deleted. Objects referencing it may need to be updated or removed.`);
    }

    uiUpdateHooks.refreshProjectFilesList(currentProjectNameForFileManager);
    return true;
}

export function renameFile(oldFilePath, newFilePath) {
    if (!currentProjectNameForFileManager || !oldFilePath || !newFilePath || oldFilePath === newFilePath) return false;
    if (projectFilesData[oldFilePath] === undefined) {
        _customConsole.error(`Cannot rename file: Old path "${oldFilePath}" not found.`);
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

    if (currentOpenTextScriptPath === oldFilePath) currentOpenTextScriptPath = newFilePath;
    if (currentOpenVisualScriptPath === oldFilePath) currentOpenVisualScriptPath = newFilePath;
    
    // TODO: If a model file is renamed, update modelSourcePath in all scene objects.
    // This requires iterating through all levels and all objects, similar to script renaming.

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
         _customConsole.error(`FileManager: Unknown file type key "${typeKey}" for unique path generation.`);
        return `${baseName}${FILE_TYPES[typeKey]?.extension || ''}`;
    }
    const dir = preferredDir || FILE_TYPES[typeKey].defaultDir || '';
    const ext = FILE_TYPES[typeKey].extension;

    // Sanitize baseName to remove existing extension if present, and invalid characters
    let cleanBaseName = baseName.replace(new RegExp(`\\${ext}$`, 'i'), '');
    cleanBaseName = cleanBaseName.replace(/[^a-zA-Z0-9_.\-\s]/g, '_'); // Allow common chars

    let count = 0; // Start with 0 for no suffix if unique
    let path;
    do {
        const suffix = count === 0 ? '' : `${count}`;
        path = `${dir}${cleanBaseName}${suffix}${ext}`;
        count++;
    } while (fileExists(path));
    
    return path;
}

export function getAllProjectFilesSerializable() {
    const serializableFiles = {};
    for (const path in projectFilesData) {
        const content = projectFilesData[path];
        if (content instanceof ArrayBuffer) {
            const base64 = arrayBufferToBase64(content);
            if (base64 !== null) {
                serializableFiles[path] = { _isBase64ArrayBuffer_: true, data: base64 };
            } else {
                _customConsole.error(`Failed to serialize ArrayBuffer to Base64 for path: ${path}. Skipping file.`);
            }
        } else {
            serializableFiles[path] = content; // Assumes string or already JSON-stringified
        }
    }
    return serializableFiles;
}

export function loadAllProjectFiles(filesMapFromProjectFile) {
    projectFilesData = {}; // Clear existing
    ScriptEngine.clearCompiledScripts();

    for (const filePath in filesMapFromProjectFile) {
        const contentOrWrapper = filesMapFromProjectFile[filePath];
        if (typeof contentOrWrapper === 'object' && contentOrWrapper !== null && contentOrWrapper._isBase64ArrayBuffer_ === true) {
            const arrayBuffer = base64ToArrayBuffer(contentOrWrapper.data);
            if (arrayBuffer !== null) {
                projectFilesData[filePath] = arrayBuffer;
            } else {
                 _customConsole.error(`Failed to deserialize Base64 to ArrayBuffer for path: ${filePath}. Skipping file.`);
            }
        } else {
            projectFilesData[filePath] = contentOrWrapper; // Assumes string
        }

        // Compile text scripts on load
        if (filePath.endsWith(FILE_TYPES.STELA_SCRIPT.extension) && typeof projectFilesData[filePath] === 'string') {
            ScriptEngine.compileScript(filePath, projectFilesData[filePath], false);
        }
    }
    uiUpdateHooks.refreshProjectFilesList(currentProjectNameForFileManager);
}

export function getFileTypeKeyFromPath(filePath) {
    for (const key in FILE_TYPES) {
        if (filePath.toLowerCase().endsWith(FILE_TYPES[key].extension.toLowerCase())) {
            return key;
        }
    }
    return null; 
}

// --- Current Open Editor File Tracking ---
export function getCurrentOpenTextScriptPath() { return currentOpenTextScriptPath; }
export function setCurrentOpenTextScriptPath(path) { currentOpenTextScriptPath = path; }

export function getCurrentOpenVisualScriptPath() { return currentOpenVisualScriptPath; }
export function setCurrentOpenVisualScriptPath(path) { currentOpenVisualScriptPath = path; }

// --- Script Specific Convenience Functions (Wrappers around generic) ---
export function saveScript(filePath, content) {
    let finalPath = filePath;
    // Ensure .stela extension
    if (!finalPath.toLowerCase().endsWith(FILE_TYPES.STELA_SCRIPT.extension.toLowerCase())) {
        finalPath = finalPath.replace(/(\.stela-vs|\.level|\.gltf|\.glb)?$/i, '') + FILE_TYPES.STELA_SCRIPT.extension;
    }
    return saveFile(finalPath, content) ? finalPath : null;
}

export function loadScript(filePath, updateCurrentlyOpen = true) {
    const content = loadFile(filePath);
    if (content !== undefined && updateCurrentlyOpen) setCurrentOpenTextScriptPath(filePath);
    return content;
}

export function deleteScript(filePath) {
    return deleteFile(filePath);
}

export function renameScript(oldFilePath, newBaseName) {
    const oldDir = oldFilePath.substring(0, oldFilePath.lastIndexOf('/') + 1);
    const newFilePath = getUniqueFilePath(newBaseName, 'STELA_SCRIPT', oldDir); // getUniqueFilePath now handles suffixing
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
    // Ensure .stela-vs extension
    if (!finalPath.toLowerCase().endsWith(FILE_TYPES.VISUAL_SCRIPT.extension.toLowerCase())) {
         finalPath = finalPath.replace(/(\.stela|\.level|\.gltf|\.glb)?$/i, '') + FILE_TYPES.VISUAL_SCRIPT.extension;
    }
    
    let jsonString;
    try {
        jsonString = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData, null, 2);
    } catch (e) {
        _customConsole.error(`Failed to stringify visual script data for "${finalPath}": ${e.message}`);
        return null;
    }
    return saveFile(finalPath, jsonString) ? finalPath : null; 
}

export function loadVisualScript(filePath, updateCurrentlyOpen = true) {
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