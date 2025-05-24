// project-state-coordinator.js
import * as ScriptEngine from './script-engine.js';
import * as LevelDataManager from './level-data-manager.js';
import * as ThreeScene from './three-scene.js';
import * as ObjectManager from './object-manager.js';
import * as FileManager from './file-manager.js';
import * as UIScriptEditorManager from './ui-script-editor-manager.js';
import * as UIVisualScriptEditorManager from './ui-visual-script-editor-manager.js';
import * as UIManager from './ui-manager.js';
import * as ScriptComponentsManager from './ui-script-components-manager.js';
import * as SceneSerializer from './scene-serializer.js';

let _uiCallbacksPSC = {
    populateProjectFilesList: () => {},
    populateLevelListUI: () => {},
    updateSceneSettingsDisplay: () => {},
    updateProjectNameDisplay: () => {}
};

export function initProjectStateCoordinator(uiCallbacks) {
    if (uiCallbacks) {
        _uiCallbacksPSC = { ..._uiCallbacksPSC, ...uiCallbacks };
    }
}

export function saveCurrentSceneToActiveLevel() {
    const activeLevelContent = LevelDataManager.getActiveLevelFileContent();
    if (activeLevelContent) {
        const currentSceneData = SceneSerializer.getSceneState();
        currentSceneData.sceneBackgroundColor = ThreeScene.getBackgroundColor();
        activeLevelContent.sceneData = currentSceneData;
        LevelDataManager.updateActiveLevelFileContent(activeLevelContent);
    }
}

export function gatherCurrentProjectData(currentProjectName) {
    saveCurrentSceneToActiveLevel();

    const allFiles = FileManager.getAllProjectFiles();
    const editorCamera = ThreeScene.getCamera();
    const editorControlsTarget = ThreeScene.getControls().target;

    return {
        projectName: currentProjectName,
        projectFileVersion: "1.2",
        activeLevelPath: LevelDataManager.getActiveLevelPath(),
        files: allFiles,
        editorState: {
            openTextScriptPath: FileManager.getCurrentOpenTextScriptPath(),
            openVisualScriptPath: FileManager.getCurrentOpenVisualScriptPath(),
            cameraPosition: { x: editorCamera.position.x, y: editorCamera.position.y, z: editorCamera.position.z },
            cameraTarget: { x: editorControlsTarget.x, y: editorControlsTarget.y, z: editorControlsTarget.z }
        }
    };
}

export async function applyProjectData(projectData, isNewProject) {
    ScriptEngine.clearOutputMessages();
    ThreeScene.clearSceneContent();

    FileManager.loadAllProjectFiles(projectData.files);
    LevelDataManager.loadLevelManifest(projectData.files, projectData.activeLevelPath);

    const activeLevelToLoadContent = LevelDataManager.getActiveLevelFileContent();

    if (activeLevelToLoadContent && activeLevelToLoadContent.sceneData) {
        ThreeScene.setBackgroundColor(activeLevelToLoadContent.sceneData.sceneBackgroundColor || '#000000');
        await SceneSerializer.loadSceneState(activeLevelToLoadContent.sceneData);
    } else {
        ThreeScene.setBackgroundColor('#000000');
        const defaultScene = { objects: [], activeCameraObjectName: null, sceneBackgroundColor: '#000000' };
        await SceneSerializer.loadSceneState(defaultScene);
        if (LevelDataManager.getLevelsCount() === 0 && !isNewProject) {
            ScriptEngine.customConsole.warn("Loaded project has no levels. Consider creating a new project or checking the file.");
        }
    }

    if (projectData.editorState && projectData.editorState.cameraPosition && projectData.editorState.cameraTarget) {
        ThreeScene.getCamera().position.set(projectData.editorState.cameraPosition.x, projectData.editorState.cameraPosition.y, projectData.editorState.cameraPosition.z);
        ThreeScene.getControls().target.set(projectData.editorState.cameraTarget.x, projectData.editorState.cameraTarget.y, projectData.editorState.cameraTarget.z);
        ThreeScene.getControls().update();
    } else {
        ThreeScene.getCamera().position.set(8, 6, 12);
        ThreeScene.getControls().target.set(0, 0.5, 0);
        ThreeScene.getControls().update();
    }

    const openTextScriptPath = projectData.editorState?.openTextScriptPath;
    if (openTextScriptPath && projectData.files && projectData.files[openTextScriptPath]) {
        UIScriptEditorManager.loadTextScriptIntoEditor(openTextScriptPath, projectData.files[openTextScriptPath]);
        FileManager.setCurrentOpenTextScriptPath(openTextScriptPath);
    } else {
        UIScriptEditorManager.clearTextEditorToUntitled();
        FileManager.setCurrentOpenTextScriptPath(null);
    }

    const openVScriptPath = projectData.editorState?.openVisualScriptPath;
    if (openVScriptPath && projectData.files && projectData.files[openVScriptPath]) {
        UIVisualScriptEditorManager.loadVisualScript(openVScriptPath, projectData.files[openVScriptPath]);
        FileManager.setCurrentOpenVisualScriptPath(openVScriptPath);
    } else {
        UIVisualScriptEditorManager.clearEditor();
        FileManager.setCurrentOpenVisualScriptPath(null);
    }
    
    if (_uiCallbacksPSC.updateProjectNameDisplay) _uiCallbacksPSC.updateProjectNameDisplay();
    if (UIManager.updateObjectListUI) UIManager.updateObjectListUI();
    if (UIManager.populatePropertiesPanel) UIManager.populatePropertiesPanel();
    if (_uiCallbacksPSC.populateProjectFilesList) _uiCallbacksPSC.populateProjectFilesList();
    if (_uiCallbacksPSC.populateLevelListUI) _uiCallbacksPSC.populateLevelListUI();
    if (_uiCallbacksPSC.updateSceneSettingsDisplay) _uiCallbacksPSC.updateSceneSettingsDisplay();
    if (ScriptComponentsManager.populateAvailableScriptsDropdown) ScriptComponentsManager.populateAvailableScriptsDropdown();

    ObjectManager.setSelectedObjectAndUpdateUI(null);
}