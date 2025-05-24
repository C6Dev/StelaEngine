import * as DOM from './dom-elements.js';
import * as FileManager from './file-manager.js';
import * as ObjectManager from './object-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as ThreeScene from './three-scene.js';
import * as UIManager from './ui-manager.js';
import * as LevelDataManager from './level-data-manager.js';
import * as ProjectStateCoordinator from './project-state-coordinator.js';
import * as SceneSerializer from './scene-serializer.js';

const DEFAULT_PROJECT_NAME = "UntitledProject";
const PROJECT_FILE_EXTENSION = ".stela-project"; 
const PROJECT_FILE_VERSION = "1.2"; 

let currentProjectName = DEFAULT_PROJECT_NAME;
let isProjectDirty = false;

let uiCallbacksPM = {
    populateProjectFilesList: () => {}, 
    populateLevelListUI: () => {},
    updateSceneSettingsDisplay: () => {}
};

function generateDefaultProjectData(name) {
    const defaultLevelBaseName = LevelDataManager.getDefaultFirstLevelNameBase();
    const defaultLevelPath = FileManager.getUniqueFilePath(defaultLevelBaseName, 'LEVEL');
    const defaultLevelFileContent = LevelDataManager.createNewLevelFileContent(defaultLevelBaseName);

    const files = {};
    files[defaultLevelPath] = defaultLevelFileContent;

    return {
        projectName: name,
        projectFileVersion: PROJECT_FILE_VERSION,
        activeLevelPath: defaultLevelPath,
        files: files,
        editorState: {
            openTextScriptPath: null,
            openVisualScriptPath: null,
            cameraPosition: { x: 8, y: 6, z: 12 },
            cameraTarget: { x: 0, y: 0.5, z: 0 }
        }
    };
}

export function initProjectManager(callbacks) {
    if (callbacks) {
        uiCallbacksPM = {...uiCallbacksPM, ...callbacks};
    }
    LevelDataManager.initLevelDataManager(markProjectDirty);
    ProjectStateCoordinator.initProjectStateCoordinator({
        ...uiCallbacksPM,
        updateProjectNameDisplay: updateProjectNameDisplay
    });
    setupProjectMenuInteractions();
    loadInitialProjectState();
}

function setupProjectMenuInteractions() {
    DOM.newProjectBtn.addEventListener('click', handleNewProject);
    DOM.saveProjectBtn.addEventListener('click', handleSaveCurrentProject);
    DOM.saveProjectAsBtn.addEventListener('click', handleSaveCurrentProjectAs);
    DOM.loadProjectBtn.addEventListener('click', handleLoadProjectTrigger);
    
    DOM.closeLoadProjectModalBtn.addEventListener('click', () => DOM.loadProjectModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target === DOM.loadProjectModal) {
            DOM.loadProjectModal.style.display = 'none';
        }
    });

    DOM.loadProjectFileInput.addEventListener('change', handleProjectFileSelected);
}

function updateProjectNameDisplay() {
    DOM.currentProjectDisplay.textContent = `Project: ${currentProjectName || 'Untitled'}`;
    document.title = `Stela - ${currentProjectName || 'Untitled'}`;
}

async function loadInitialProjectState() {
    await createNewProject(DEFAULT_PROJECT_NAME, true);
}

function downloadJSON(jsonData, filename) {
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function createNewProject(name = DEFAULT_PROJECT_NAME, isLoadingDefault = false) {
    if (!isLoadingDefault && isProjectDirty) {
        if (!confirm("You have unsaved changes. Are you sure you want to create a new project? Your current changes will be lost.")) {
            return;
        }
    }
    
    currentProjectName = name;
    FileManager.setCurrentProjectName(currentProjectName);

    const projectData = generateDefaultProjectData(currentProjectName);

    await ProjectStateCoordinator.applyProjectData(projectData, true);

    isProjectDirty = false;
    ScriptEngine.customConsole.log(`New project "${currentProjectName}" initialized with one level: "${projectData.activeLevelPath}".`);
}

async function handleNewProject() {
    createNewProject();
}

async function handleSaveCurrentProject() {
    if (!currentProjectName || currentProjectName === DEFAULT_PROJECT_NAME) {
        handleSaveCurrentProjectAs();
        return;
    }
    const projectData = ProjectStateCoordinator.gatherCurrentProjectData(currentProjectName);
    downloadJSON(projectData, currentProjectName + PROJECT_FILE_EXTENSION);
    ScriptEngine.customConsole.log(`Project "${currentProjectName}" prepared for download.`);
    isProjectDirty = false;
}

async function handleSaveCurrentProjectAs() {
    const suggestedName = (currentProjectName && currentProjectName !== DEFAULT_PROJECT_NAME)
                          ? currentProjectName
                          : "MyStelaProject";
    const newName = prompt("Save project as (filename without extension):", suggestedName);
    
    if (!newName || !newName.trim()) {
        ScriptEngine.customConsole.log("Save As cancelled.");
        return;
    }
    
    currentProjectName = newName.trim();
    FileManager.setCurrentProjectName(currentProjectName);

    const projectData = ProjectStateCoordinator.gatherCurrentProjectData(currentProjectName);
    downloadJSON(projectData, currentProjectName + PROJECT_FILE_EXTENSION);
    ScriptEngine.customConsole.log(`Project saved as "${currentProjectName}".`);
    isProjectDirty = false;
    updateProjectNameDisplay();
}

function handleLoadProjectTrigger() {
    if (isProjectDirty) {
        if (!confirm("You have unsaved changes. Are you sure you want to load a new project? Your current changes will be lost.")) {
            return;
        }
    }
    DOM.loadProjectFileInput.click();
}

async function handleProjectFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    let fileNameWithoutExtension = file.name;
    if (fileNameWithoutExtension.toLowerCase().endsWith(PROJECT_FILE_EXTENSION)) {
        fileNameWithoutExtension = fileNameWithoutExtension.substring(0, fileNameWithoutExtension.length - PROJECT_FILE_EXTENSION.length);
    } else if (fileNameWithoutExtension.toLowerCase().endsWith(".json")) {
         fileNameWithoutExtension = fileNameWithoutExtension.substring(0, fileNameWithoutExtension.length - ".json".length);
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const projectData = JSON.parse(e.target.result);
            
            // Basic validation and version migration if needed
            if (!projectData.files || !projectData.activeLevelPath) {
                // Attempt to migrate from old format (v1.1 or earlier)
                if (projectData.levels && projectData.scripts && !projectData.files) {
                    ScriptEngine.customConsole.warn("Old project file format (v1.1) detected. Attempting migration...");
                    projectData.files = { ...projectData.scripts.text, ...projectData.scripts.visual }; // Combine scripts
                    
                    const oldLevelDataArray = projectData.levels;
                    const oldActiveIndex = projectData.activeLevelIndex || 0;
                    
                    oldLevelDataArray.forEach((oldLevel, index) => {
                        const levelBaseName = oldLevel.levelName || `Level${index + 1}`;
                        const levelPath = FileManager.getUniqueFilePath(levelBaseName, 'LEVEL'); // Ensures unique path
                        projectData.files[levelPath] = {
                            levelName: levelBaseName,
                            sceneData: oldLevel.sceneData,
                            thumbnailDataUrl: oldLevel.thumbnailDataUrl
                        };
                        if (index === oldActiveIndex) {
                            projectData.activeLevelPath = levelPath;
                        }
                    });
                    if (!projectData.activeLevelPath && Object.keys(projectData.files).some(p => p.endsWith(FileManager.FILE_TYPES.LEVEL.extension))) {
                         projectData.activeLevelPath = Object.keys(projectData.files).find(p => p.endsWith(FileManager.FILE_TYPES.LEVEL.extension));
                    }
                    delete projectData.levels;
                    delete projectData.scripts;
                    delete projectData.activeLevelIndex;
                    projectData.projectFileVersion = `${projectData.projectFileVersion || '1.1'}_migrated_to_1.2`;
                    ScriptEngine.customConsole.log("Project data migrated to v1.2 format.");
                } else {
                    throw new Error("Invalid or unrecognized project file format. Missing 'files' or 'activeLevelPath'.");
                }
            }
            
            currentProjectName = projectData.projectName || fileNameWithoutExtension;
            FileManager.setCurrentProjectName(currentProjectName);
            await ProjectStateCoordinator.applyProjectData(projectData, false);
            ScriptEngine.customConsole.log(`Project "${currentProjectName}" loaded from file: ${file.name}`);
            isProjectDirty = false;

        } catch (error) {
            ScriptEngine.customConsole.error(`Error loading project file: ${error.message}`);
            alert(`Failed to load project: ${error.message}`);
            await createNewProject(DEFAULT_PROJECT_NAME, true); // Fallback to new project
        }
    };
    reader.onerror = () => {
        ScriptEngine.customConsole.error(`Error reading file: ${file.name}`);
        alert(`Failed to read file: ${file.name}`);
    };
    reader.readAsText(file);
    event.target.value = null;
}

export function getCurrentProjectName() {
    return currentProjectName;
}

export function markProjectDirty() {
    if (!isProjectDirty) {
        isProjectDirty = true;
    }
}

// --- Level File Management ---
export function addNewLevelFile(levelBaseName) {
    ProjectStateCoordinator.saveCurrentSceneToActiveLevel();

    const levelPath = FileManager.getUniqueFilePath(levelBaseName, 'LEVEL');
    const levelFileContent = LevelDataManager.createNewLevelFileContent(levelBaseName);

    if (FileManager.saveFile(levelPath, levelFileContent)) {
        LevelDataManager.addLevelPath(levelPath); // Add to manifest
        LevelDataManager.switchActiveLevelPath(levelPath); // Make new level active

        ThreeScene.clearSceneContent();
        ObjectManager.resetObjectManager();
        ThreeScene.setBackgroundColor(levelFileContent.sceneData.sceneBackgroundColor);
        SceneSerializer.loadSceneState(levelFileContent.sceneData).then(() => { 
            UIManager.updateObjectListUI();
            UIManager.populatePropertiesPanel();
            if (uiCallbacksPM.populateLevelListUI) uiCallbacksPM.populateLevelListUI();
            if (uiCallbacksPM.updateSceneSettingsDisplay) uiCallbacksPM.updateSceneSettingsDisplay();
            ScriptEngine.customConsole.log(`New level file "${levelPath}" added and activated.`);
        });
    } else {
        ScriptEngine.customConsole.error(`Failed to save new level file "${levelPath}".`);
    }
}

export async function switchActiveLevelByPath(levelPath) {
    const currentActivePath = LevelDataManager.getActiveLevelPath();
    if (!levelPath || !FileManager.fileExists(levelPath) || levelPath === currentActivePath) {
        return;
    }
    ProjectStateCoordinator.saveCurrentSceneToActiveLevel();

    if (LevelDataManager.switchActiveLevelPath(levelPath)) {
        const newActiveLevelContent = LevelDataManager.getActiveLevelFileContent();
        if (newActiveLevelContent) {
            ScriptEngine.customConsole.log(`Switching to level: "${levelPath}"`);
            ThreeScene.clearSceneContent();
            ObjectManager.resetObjectManager();

            ThreeScene.setBackgroundColor(newActiveLevelContent.sceneData.sceneBackgroundColor || '#000000');
            await SceneSerializer.loadSceneState(newActiveLevelContent.sceneData); 
            
            UIManager.updateObjectListUI();
            UIManager.populatePropertiesPanel();
            if (uiCallbacksPM.populateLevelListUI) uiCallbacksPM.populateLevelListUI();
            if (uiCallbacksPM.updateSceneSettingsDisplay) uiCallbacksPM.updateSceneSettingsDisplay();
            ObjectManager.setSelectedObjectAndUpdateUI(null);
        }
    }
}

export function deleteLevelByPath(levelPath) {
    const levelPaths = LevelDataManager.getAllLevelPaths();
    if (levelPaths.length <= 1) {
        ScriptEngine.customConsole.error("Cannot delete the last remaining level.");
        return false;
    }
    if (FileManager.deleteFile(levelPath)) {
        LevelDataManager.removeLevelPath(levelPath); // Update manifest

        // If the deleted level was active, switch to another one
        if (LevelDataManager.getActiveLevelPath() === null && LevelDataManager.getLevelsCount() > 0) {
            const newActivePath = LevelDataManager.getAllLevelPaths()[0];
            // Need to re-apply project state partially or fully to load the new active level.
            // For simplicity, just reloading the first available level.
            ProjectStateCoordinator.applyProjectData(ProjectStateCoordinator.gatherCurrentProjectData(currentProjectName), false);
        }
        if (uiCallbacksPM.populateLevelListUI) uiCallbacksPM.populateLevelListUI();
        if (uiCallbacksPM.updateSceneSettingsDisplay) uiCallbacksPM.updateSceneSettingsDisplay();
        return true;
    }
    return false;
}

export function renameLevelByPath(oldLevelPath, newLevelPath) {
    if (FileManager.renameFile(oldLevelPath, newLevelPath)) {
        LevelDataManager.renameLevelPath(oldLevelPath, newLevelPath);
        if (uiCallbacksPM.populateLevelListUI) uiCallbacksPM.populateLevelListUI();
        if (LevelDataManager.getActiveLevelPath() === newLevelPath) {
             if (uiCallbacksPM.updateSceneSettingsDisplay) uiCallbacksPM.updateSceneSettingsDisplay();
        }
         // Update levelName inside the file content if desired
        const levelContent = FileManager.loadFile(newLevelPath);
        if (levelContent) {
            const newBaseName = newLevelPath.substring(newLevelPath.lastIndexOf('/') + 1).replace(FileManager.FILE_TYPES.LEVEL.extension, '');
            if (levelContent.levelName !== newBaseName) {
                levelContent.levelName = newBaseName;
                FileManager.saveFile(newLevelPath, levelContent);
            }
        }
        return true;
    }
    return false;
}

// Existing level functions from ProjectManager, now adapted or calling LevelDataManager
export function updateLevelThumbnail(levelPath, thumbnailDataUrl) { 
    const levelContent = FileManager.loadFile(levelPath);
    if (levelContent) {
        levelContent.thumbnailDataUrl = thumbnailDataUrl;
        if (FileManager.saveFile(levelPath, levelContent)) {
            if (uiCallbacksPM.populateLevelListUI) uiCallbacksPM.populateLevelListUI();
        }
    }
}

export function updateActiveLevelBackgroundColor(hexColorString) {
    if (LevelDataManager.updateActiveLevelBackgroundColor(hexColorString)) {
        ThreeScene.setBackgroundColor(hexColorString);
        if (uiCallbacksPM.updateSceneSettingsDisplay) uiCallbacksPM.updateSceneSettingsDisplay();
    }
}

// Accessors for LevelDataManager via ProjectManager
export function getActiveLevelPath() { return LevelDataManager.getActiveLevelPath(); }
export function getActiveLevelFileContent() { return LevelDataManager.getActiveLevelFileContent(); }
export function getLevelFileContentByPath(path) { return LevelDataManager.getLevelFileContentByPath(path); }
export function getAllLevelPaths() { return LevelDataManager.getAllLevelPaths(); }
export function getLevelsCount() { return LevelDataManager.getLevelsCount(); }