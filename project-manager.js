import * as DOM from './dom-elements.js';
import * as FileManager from './file-manager.js';
// import * as ObjectManager from './object-manager.js'; // Less direct use now
import * as ScriptEngine from './script-engine.js';
// import * as ThreeScene from './three-scene.js'; // Less direct use now
import * as UIManager from './ui-manager.js';
import * as LevelDataManager from './level-data-manager.js';
import * as ProjectStateCoordinator from './project-state-coordinator.js';
// import * as SceneSerializer from './scene-serializer.js'; // Less direct use now

const DEFAULT_PROJECT_NAME = "UntitledProject";
const PROJECT_FILE_EXTENSION = ".stela-project"; 
const PROJECT_FILE_VERSION = "1.3"; // Kept consistent with previous version from current-page

let currentProjectName = DEFAULT_PROJECT_NAME;
let isProjectDirty = false;

let uiCallbacksPM = {
    populateProjectFilesList: () => {}, 
    updateSceneSettingsDisplay: () => {},
    updateProjectNameDisplay: () => {} 
};

function generateDefaultProjectData(name) {
    const defaultLevelBaseName = LevelDataManager.getDefaultFirstLevelNameBase();
    const defaultLevelPath = FileManager.getUniqueFilePath(defaultLevelBaseName, 'LEVEL');
    const defaultLevelFileContent = LevelDataManager.createNewLevelFileContent(defaultLevelBaseName);

    const files = {};
    files[defaultLevelPath] = JSON.stringify(defaultLevelFileContent);

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
        uiCallbacksPM.populateProjectFilesList = callbacks.populateProjectFilesList || (() => {});
        uiCallbacksPM.updateSceneSettingsDisplay = callbacks.updateSceneSettingsDisplay || (() => {});
        uiCallbacksPM.updateProjectNameDisplay = callbacks.updateProjectNameDisplay || (() => {});
    }
    LevelDataManager.initLevelDataManager(markProjectDirty); // LevelDataManager still uses markProjectDirty
    ProjectStateCoordinator.initProjectStateCoordinator({ 
        populateProjectFilesList: uiCallbacksPM.populateProjectFilesList,
        updateSceneSettingsDisplay: uiCallbacksPM.updateSceneSettingsDisplay,
        updateProjectNameDisplay: uiCallbacksPM.updateProjectNameDisplay 
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

async function loadInitialProjectState() {
    await createNewProject(DEFAULT_PROJECT_NAME, true);
}

function downloadJSON(jsonData, filename) {
    if (!jsonData) {
        console.error("ProjectManager: jsonData for download is null or undefined. Filename:", filename);
        ScriptEngine.customConsole.error("Failed to prepare project data for download. Data was empty.");
        return;
    }
    if (!filename || !filename.trim()) {
        console.error("ProjectManager: filename for download is invalid. Filename:", filename);
        ScriptEngine.customConsole.error("Failed to prepare project data for download. Filename was invalid.");
        return;
    }

    console.log("ProjectManager: Preparing to download project:", filename, "Data:", jsonData); // Added log

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
    ScriptEngine.customConsole.log(`Project "${filename}" download initiated.`);
}

export async function createNewProject(name = DEFAULT_PROJECT_NAME, isLoadingDefault = false) {
    if (!isLoadingDefault && isProjectDirty) {
        if (!confirm("You have unsaved changes. Are you sure you want to create a new project? Your current changes will be lost.")) {
            return;
        }
    }
    
    currentProjectName = name;
    FileManager.setCurrentProjectName(currentProjectName); 

    FileManager.loadAllProjectFiles({}); // Clear files for new project

    const projectData = generateDefaultProjectData(currentProjectName);

    // Ensure the default level file is "saved" into FileManager's in-memory store
    FileManager.saveFile(projectData.activeLevelPath, JSON.parse(projectData.files[projectData.activeLevelPath]));

    await ProjectStateCoordinator.applyProjectData(projectData, true); // true for isNewProject

    isProjectDirty = false;
    ScriptEngine.customConsole.log(`New project "${currentProjectName}" initialized with one level: "${projectData.activeLevelPath}".`);
    if (uiCallbacksPM.populateProjectFilesList) uiCallbacksPM.populateProjectFilesList();
    if (uiCallbacksPM.updateSceneSettingsDisplay) uiCallbacksPM.updateSceneSettingsDisplay();
    if (uiCallbacksPM.updateProjectNameDisplay) uiCallbacksPM.updateProjectNameDisplay(currentProjectName);
}

async function handleNewProject() {
    await createNewProject(); 
}

async function handleSaveCurrentProject() {
    if (!currentProjectName || currentProjectName === DEFAULT_PROJECT_NAME) {
        await handleSaveCurrentProjectAs(); 
        return;
    }
    const projectData = ProjectStateCoordinator.gatherCurrentProjectData(currentProjectName);
    if (!projectData) {
        ScriptEngine.customConsole.error("Failed to gather project data for saving.");
        return;
    }
    projectData.projectFileVersion = PROJECT_FILE_VERSION; 
    downloadJSON(projectData, currentProjectName + PROJECT_FILE_EXTENSION);
    // ScriptEngine.customConsole.log(`Project "${currentProjectName}" prepared for download.`); // Moved to downloadJSON
    isProjectDirty = false; // Mark as not dirty after saving
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
    if (!projectData) {
        ScriptEngine.customConsole.error("Failed to gather project data for saving as.");
        return;
    }
    projectData.projectFileVersion = PROJECT_FILE_VERSION; 
    downloadJSON(projectData, currentProjectName + PROJECT_FILE_EXTENSION);
    // ScriptEngine.customConsole.log(`Project saved as "${currentProjectName}".`); // Moved to downloadJSON
    isProjectDirty = false; // Mark as not dirty after saving
    if (uiCallbacksPM.updateProjectNameDisplay) uiCallbacksPM.updateProjectNameDisplay(currentProjectName);
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
            
            // Migration logic for old project file format (v1.1 or earlier to v1.2)
            if (!projectData.files || !projectData.activeLevelPath) {
                if (projectData.levels && projectData.scripts && !projectData.files) {
                    ScriptEngine.customConsole.warn("Old project file format (v1.1 or earlier) detected. Attempting migration...");
                    projectData.files = { ...projectData.scripts.text, ...projectData.scripts.visual }; 
                    
                    const oldLevelDataArray = projectData.levels;
                    const oldActiveIndex = projectData.activeLevelIndex || 0;
                    
                    oldLevelDataArray.forEach((oldLevel, index) => {
                        const levelBaseName = oldLevel.levelName || `Level${index + 1}`;
                        // Ensure unique path using FileManager, specifying LEVEL type
                        const levelPath = FileManager.getUniqueFilePath(levelBaseName, 'LEVEL'); 
                        projectData.files[levelPath] = JSON.stringify({
                            levelName: levelBaseName, // Store the base name in the level content
                            sceneData: oldLevel.sceneData,
                            thumbnailDataUrl: oldLevel.thumbnailDataUrl
                        });
                        if (index === oldActiveIndex) {
                            projectData.activeLevelPath = levelPath;
                        }
                    });
                    // Ensure an activeLevelPath is set if one wasn't determined from oldActiveIndex
                    if (!projectData.activeLevelPath && Object.keys(projectData.files).some(p => p.endsWith(FileManager.FILE_TYPES.LEVEL.extension))) {
                         projectData.activeLevelPath = Object.keys(projectData.files).find(p => p.endsWith(FileManager.FILE_TYPES.LEVEL.extension));
                    }
                    delete projectData.levels;
                    delete projectData.scripts;
                    delete projectData.activeLevelIndex;
                    projectData.projectFileVersion = `${projectData.projectFileVersion || '1.1'}_migrated_to_1.2`; // Mark as migrated
                    ScriptEngine.customConsole.log("Project data migrated to v1.2 file structure format.");

                } else {
                    // If not old format and still missing crucial parts, it's invalid
                    throw new Error("Invalid or unrecognized project file format. Missing 'files' or 'activeLevelPath'.");
                }
            }
            
            currentProjectName = projectData.projectName || fileNameWithoutExtension;
            FileManager.setCurrentProjectName(currentProjectName); // Set project name for FileManager context
            await ProjectStateCoordinator.applyProjectData(projectData, false); // false for isNewProject
            ScriptEngine.customConsole.log(`Project "${currentProjectName}" loaded from file: ${file.name}`);
            isProjectDirty = false; // Project is clean after load
            if (uiCallbacksPM.populateProjectFilesList) uiCallbacksPM.populateProjectFilesList();
            if (uiCallbacksPM.updateSceneSettingsDisplay) uiCallbacksPM.updateSceneSettingsDisplay();
            if (uiCallbacksPM.updateProjectNameDisplay) uiCallbacksPM.updateProjectNameDisplay(currentProjectName);

        } catch (error) {
            ScriptEngine.customConsole.error(`Error loading project file: ${error.message}`);
            console.error(error); // Log full error for debugging
            alert(`Failed to load project: ${error.message}`);
            await createNewProject(DEFAULT_PROJECT_NAME, true); // Fallback to a new project
        }
    };
    reader.onerror = () => {
        ScriptEngine.customConsole.error(`Error reading file: ${file.name}`);
        alert(`Failed to read file: ${file.name}`);
    };
    reader.readAsText(file);
    event.target.value = null; // Reset file input
}

export function getCurrentProjectName() {
    return currentProjectName;
}

export function markProjectDirty() {
    if (!isProjectDirty) {
        isProjectDirty = true;
        // Optionally, update UI to indicate dirty state, e.g., adding a '*' to project name display
        // if (uiCallbacksPM.updateProjectNameDisplay) uiCallbacksPM.updateProjectNameDisplay(currentProjectName + "*");
    }
}