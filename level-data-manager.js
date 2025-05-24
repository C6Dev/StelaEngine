// level-data-manager.js
import * as ScriptEngine from './script-engine.js';
import * as FileManager from './file-manager.js'; // To interact with level files

const DEFAULT_FIRST_LEVEL_NAME_BASE = "MainLevel"; // Base name, extension added by FileManager

let levelFilePaths = []; // Stores paths like "levels/MainLevel.level"
let activeLevelPath = null;
let _markProjectDirtyCallback = () => {};

function generateDefaultSceneDataStructure() {
    return {
        objects: [],
        activeCameraObjectName: null,
        sceneBackgroundColor: '#000000'
    };
}

// This creates the content for a new level file
export function createNewLevelFileContent(levelName) {
    return {
        levelName: levelName, // Storing name inside for potential display/consistency
        sceneData: generateDefaultSceneDataStructure(),
        thumbnailDataUrl: null
    };
}

export function initLevelDataManager(markDirtyCallback) {
    if (markDirtyCallback) {
        _markProjectDirtyCallback = markDirtyCallback;
    }
    resetLevelData();
}

export function resetLevelData() {
    levelFilePaths = [];
    activeLevelPath = null;
}

// Called by ProjectManager when a project is loaded
// It scans projectFiles for .level files and populates levelFilePaths
export function loadLevelManifest(projectFiles, activePathFromProject) {
    levelFilePaths = Object.keys(projectFiles)
        .filter(path => path.endsWith(FileManager.FILE_TYPES.LEVEL.extension))
        .sort();
    
    if (activePathFromProject && levelFilePaths.includes(activePathFromProject)) {
        activeLevelPath = activePathFromProject;
    } else if (levelFilePaths.length > 0) {
        activeLevelPath = levelFilePaths[0]; // Default to first level if specified active is invalid or missing
    } else {
        activeLevelPath = null;
    }
    // No markDirty here, as this is part of loading a project.
}

// Called when a new level file is created by ProjectManager/UI
export function addLevelPath(filePath) {
    if (!levelFilePaths.includes(filePath)) {
        levelFilePaths.push(filePath);
        levelFilePaths.sort();
        // activeLevelPath = filePath; // ProjectManager will handle switching after creation if needed
        _markProjectDirtyCallback();
        return true;
    }
    return false;
}

export function switchActiveLevelPath(newPath) {
    if (levelFilePaths.includes(newPath) && newPath !== activeLevelPath) {
        activeLevelPath = newPath;
        _markProjectDirtyCallback(); // Switching levels is a "dirtyable" action for editor state
        return true;
    }
    return false;
}

export function removeLevelPath(filePath) {
    const index = levelFilePaths.indexOf(filePath);
    if (index > -1) {
        levelFilePaths.splice(index, 1);
        if (activeLevelPath === filePath) {
            activeLevelPath = levelFilePaths.length > 0 ? levelFilePaths[0] : null;
        }
        _markProjectDirtyCallback();
        ScriptEngine.customConsole.log(`Level path "${filePath}" removed from manifest.`);
        return true;
    }
    return false;
}

export function renameLevelPath(oldPath, newPath) {
    const index = levelFilePaths.indexOf(oldPath);
    if (index > -1) {
        levelFilePaths[index] = newPath;
        levelFilePaths.sort(); // Keep sorted
        if (activeLevelPath === oldPath) {
            activeLevelPath = newPath;
        }
        _markProjectDirtyCallback();
        ScriptEngine.customConsole.log(`Level path "${oldPath}" renamed to "${newPath}" in manifest.`);
        return true;
    }
    return false;
}

// --- Accessors that might involve FileManager ---

export function getActiveLevelPath() { return activeLevelPath; }

export function getActiveLevelFileContent() {
    if (activeLevelPath) {
        return FileManager.loadFile(activeLevelPath);
    }
    return null;
}

export function getLevelFileContentByPath(filePath) {
    return FileManager.loadFile(filePath);
}

export function updateActiveLevelFileContent(newContent) {
    if (activeLevelPath && newContent) {
        FileManager.saveFile(activeLevelPath, newContent); // FileManager will markDirty
        return true;
    }
    return false;
}

export function getAllLevelPaths() { return [...levelFilePaths]; }

export function getLevelsCount() { return levelFilePaths.length; }

export function getDefaultFirstLevelNameBase() { return DEFAULT_FIRST_LEVEL_NAME_BASE; }

// Functions to update parts of the active level's file content
export function updateActiveLevelSceneData(sceneData) {
    const levelContent = getActiveLevelFileContent();
    if (levelContent) {
        levelContent.sceneData = sceneData;
        return updateActiveLevelFileContent(levelContent);
    }
    return false;
}

export function updateActiveLevelThumbnail(thumbnailDataUrl) {
    const levelContent = getActiveLevelFileContent();
    if (levelContent) {
        levelContent.thumbnailDataUrl = thumbnailDataUrl;
        return updateActiveLevelFileContent(levelContent);
    }
    return false;
}

export function updateActiveLevelBackgroundColor(hexColorString) {
    const levelContent = getActiveLevelFileContent();
    if (levelContent) {
        if (!levelContent.sceneData) {
            levelContent.sceneData = generateDefaultSceneDataStructure();
        }
        levelContent.sceneData.sceneBackgroundColor = hexColorString;
        return updateActiveLevelFileContent(levelContent);
    }
    return false;
}