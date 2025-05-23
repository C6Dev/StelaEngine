import * as DOM from './dom-elements.js';
import * as FileManager from './file-manager.js';
import * as ObjectManager from './object-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as ThreeScene from './three-scene.js';
import * as UIManager from './ui-manager.js';
import * as UIScriptEditorManager from './ui-script-editor-manager.js';
import * as UIVisualScriptEditorManager from './ui-visual-script-editor-manager.js';
import * as ScriptComponentsManager from './ui-script-components-manager.js';

const DEFAULT_PROJECT_NAME = "UntitledProject";
const PROJECT_FILE_EXTENSION = ".stela-project";

let currentProjectName = DEFAULT_PROJECT_NAME;
let isProjectDirty = false;
let uiCallbacks = { 
    populateScriptFileList: () => {}
};

function generateDefaultProjectData(name) {
    return {
        projectName: name,
        projectFileVersion: "1.0", 
        scene: {
            objects: [],
            activeCameraObjectName: null,
            sceneBackgroundColor: '#000000'
        },
        scripts: { 
            text: {},
            visual: {}
        },
        editorState: {
            openTextScript: null,
            openVisualScript: null,
            cameraPosition: { x: 8, y: 6, z: 12 },
            cameraTarget: { x: 0, y: 0.5, z: 0 }
        }
    };
}

export function initProjectManager(callbacks) { 
    if (callbacks) {
        uiCallbacks = {...uiCallbacks, ...callbacks};
    }
    setupProjectMenuInteractions();
    loadInitialProjectState(); 
}

function setupProjectMenuInteractions() {
    DOM.newProjectBtn.addEventListener('click', handleNewProject);
    DOM.saveProjectBtn.addEventListener('click', handleSaveCurrentProject);
    DOM.saveProjectAsBtn.addEventListener('click', handleSaveCurrentProjectAs);
    DOM.loadProjectBtn.addEventListener('click', handleLoadProjectTrigger);
    
    DOM.closeLoadProjectModalBtn.addEventListener('click', () => DOM.loadProjectModal.style.display = 'none');
    DOM.loadProjectListDiv.addEventListener('click', (event) => { /* Old logic, might remove modal entirely */ });
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

    await applyProjectData(projectData, true); 

    isProjectDirty = false; 
    ScriptEngine.customConsole.log(`New project "${currentProjectName}" initialized.`);
    updateProjectNameDisplay();
}

async function handleNewProject() {
    createNewProject();
}

async function handleSaveCurrentProject() {
    if (!currentProjectName || currentProjectName === DEFAULT_PROJECT_NAME) {
        handleSaveCurrentProjectAs();
        return;
    }
    const projectData = gatherCurrentProjectData();
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
    
    const oldName = currentProjectName;
    currentProjectName = newName.trim();
    FileManager.setCurrentProjectName(currentProjectName); 

    const projectData = gatherCurrentProjectData();
    projectData.projectName = currentProjectName; 

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
            if (!projectData.scene || !projectData.scripts) {
                throw new Error("Invalid project file format.");
            }

            currentProjectName = projectData.projectName || fileNameWithoutExtension;
            FileManager.setCurrentProjectName(currentProjectName);
            await applyProjectData(projectData, false); 
            ScriptEngine.customConsole.log(`Project "${currentProjectName}" loaded from file: ${file.name}`);
            isProjectDirty = false;
            updateProjectNameDisplay();

        } catch (error) {
            ScriptEngine.customConsole.error(`Error loading project file: ${error.message}`);
            alert(`Failed to load project: ${error.message}`);
            await createNewProject(DEFAULT_PROJECT_NAME, true);
        }
    };
    reader.onerror = () => {
        ScriptEngine.customConsole.error(`Error reading file: ${file.name}`);
        alert(`Failed to read file: ${file.name}`);
    };
    reader.readAsText(file);
    event.target.value = null; 
}


function gatherCurrentProjectData() {
    const sceneState = ObjectManager.getSceneState();
    const textScripts = FileManager.getAllTextScriptsForCurrentProject();
    const visualScripts = FileManager.getAllVisualScriptsForCurrentProject();

    const editorCamera = ThreeScene.getCamera();
    const editorControlsTarget = ThreeScene.getControls().target;

    return {
        projectName: currentProjectName,
        projectFileVersion: "1.0",
        scene: {
            objects: sceneState.objects,
            activeCameraObjectName: sceneState.activeCameraObjectName,
            sceneBackgroundColor: ThreeScene.getBackgroundColor() 
        },
        scripts: {
            text: textScripts,
            visual: visualScripts
        },
        editorState: {
            openTextScript: FileManager.getCurrentOpenScriptName(),
            openVisualScript: FileManager.getCurrentOpenVisualScriptName(),
            cameraPosition: { x: editorCamera.position.x, y: editorCamera.position.y, z: editorCamera.position.z },
            cameraTarget: { x: editorControlsTarget.x, y: editorControlsTarget.y, z: editorControlsTarget.z }
        }
    };
}

async function applyProjectData(projectData, isNewProject) {
    ScriptEngine.clearOutputMessages();
    ThreeScene.clearSceneContent();
    ObjectManager.resetObjectManager();

    ThreeScene.setBackgroundColor(projectData.scene.sceneBackgroundColor || '#000000');
    DOM.propBgColorInput.value = projectData.scene.sceneBackgroundColor || '#000000';
    
    FileManager.loadAllScriptsForProject(projectData.scripts.text, projectData.scripts.visual);

    await ObjectManager.loadSceneState(projectData.scene);


    if (projectData.editorState && projectData.editorState.cameraPosition && projectData.editorState.cameraTarget) {
        ThreeScene.getCamera().position.set(projectData.editorState.cameraPosition.x, projectData.editorState.cameraPosition.y, projectData.editorState.cameraPosition.z);
        ThreeScene.getControls().target.set(projectData.editorState.cameraTarget.x, projectData.editorState.cameraTarget.y, projectData.editorState.cameraTarget.z);
        ThreeScene.getControls().update();
    } else { 
        ThreeScene.getCamera().position.set(8, 6, 12);
        ThreeScene.getControls().target.set(0, 0.5, 0);
        ThreeScene.getControls().update();
    }

    const openTextScript = projectData.editorState?.openTextScript;
    if (openTextScript && projectData.scripts.text && projectData.scripts.text[openTextScript]) {
        UIScriptEditorManager.loadTextScriptIntoEditor(openTextScript, projectData.scripts.text[openTextScript]);
        FileManager.setCurrentOpenScriptName(openTextScript); 
    } else {
        UIScriptEditorManager.clearTextEditorToUntitled();
        FileManager.setCurrentOpenScriptName(null);
    }

    const openVScript = projectData.editorState?.openVisualScript;
    if (openVScript && projectData.scripts.visual && projectData.scripts.visual[openVScript]) {
        UIVisualScriptEditorManager.loadVisualScript(openVScript, projectData.scripts.visual[openVScript]);
        FileManager.setCurrentOpenVisualScriptName(openVScript); 
    } else {
        UIVisualScriptEditorManager.clearEditor(); 
        FileManager.setCurrentOpenVisualScriptName(null);
    }
    
    updateProjectNameDisplay(); 
    UIManager.updateObjectListUI();
    UIManager.populatePropertiesPanel();
    if (uiCallbacks.populateScriptFileList) uiCallbacks.populateScriptFileList();
    ScriptComponentsManager.populateAvailableScriptsDropdown();

    ObjectManager.setSelectedObjectAndUpdateUI(null); 
}

export function getCurrentProjectName() {
    return currentProjectName;
}

export function markProjectDirty() {
    if (!isProjectDirty) {
        isProjectDirty = true;
        console.log("Project marked as dirty.");
    }
}