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
    updateSceneSettingsDisplay: () => {},
    updateProjectNameDisplay: () => {}
};

export function initProjectStateCoordinator(uiCallbacks) {
    if (uiCallbacks) {
        _uiCallbacksPSC = { ..._uiCallbacksPSC, ...uiCallbacks };
    }
}

export function saveCurrentSceneToActiveLevel() {
    const activeLevelPath = LevelDataManager.getActiveLevelPath();
    if (activeLevelPath) {
        let activeLevelContent = LevelDataManager.getActiveLevelFileContent(); 
        if (!activeLevelContent) { 
            ScriptEngine.customConsole.warn(`saveCurrentSceneToActiveLevel: Could not load content for active level path ${activeLevelPath}. Creating new default content.`);
            activeLevelContent = LevelDataManager.createNewLevelFileContent(activeLevelPath.split('/').pop().replace(FileManager.FILE_TYPES.LEVEL.extension, ''));
        }
        
        const currentSceneData = SceneSerializer.getSceneState(); 
        currentSceneData.sceneBackgroundColor = ThreeScene.getBackgroundColor();
        activeLevelContent.sceneData = currentSceneData;
        FileManager.saveFile(activeLevelPath, activeLevelContent); 
    } else {
        ScriptEngine.customConsole.warn("saveCurrentSceneToActiveLevel: No active level path set.");
    }
}

export function gatherCurrentProjectData(currentProjectName) {
    saveCurrentSceneToActiveLevel(); 

    const allFilesSerializable = FileManager.getAllProjectFilesSerializable(); 
    const editorCamera = ThreeScene.getCamera();
    const editorControlsTarget = ThreeScene.getControls().target;

    return {
        projectName: currentProjectName,
        projectFileVersion: "1.3", 
        activeLevelPath: LevelDataManager.getActiveLevelPath(),
        files: allFilesSerializable, 
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
    ObjectManager.resetObjectManager(); 

    FileManager.loadAllProjectFiles(projectData.files); 
    LevelDataManager.loadLevelManifest(projectData.files, projectData.activeLevelPath);

    const activeLevelToLoadPath = LevelDataManager.getActiveLevelPath();
    let activeLevelToLoadContent = null;
    if (activeLevelToLoadPath) {
        activeLevelToLoadContent = LevelDataManager.getActiveLevelFileContent(); 
    }
    
    if (activeLevelToLoadContent && activeLevelToLoadContent.sceneData) {
        ThreeScene.setBackgroundColor(activeLevelToLoadContent.sceneData.sceneBackgroundColor || '#000000');
        await SceneSerializer.loadSceneState(activeLevelToLoadContent.sceneData);
    } else {
        ThreeScene.setBackgroundColor('#000000');
        const defaultScene = LevelDataManager.createNewLevelFileContent("Default").sceneData;
        await SceneSerializer.loadSceneState(defaultScene);
        if (LevelDataManager.getLevelsCount() === 0 && !isNewProject) {
            ScriptEngine.customConsole.warn("Loaded project has no levels. Consider creating a new project or checking the file.");
        } else if (!activeLevelToLoadContent && activeLevelToLoadPath) {
            ScriptEngine.customConsole.error(`Could not load content for active level: ${activeLevelToLoadPath}. Loaded default scene.`);
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
    const textScriptContent = openTextScriptPath ? FileManager.loadFile(openTextScriptPath) : null;
    if (openTextScriptPath && textScriptContent !== undefined) {
        UIScriptEditorManager.loadTextScriptIntoEditor(openTextScriptPath, textScriptContent);
        FileManager.setCurrentOpenTextScriptPath(openTextScriptPath);
    } else {
        UIScriptEditorManager.clearTextEditorToUntitled();
        FileManager.setCurrentOpenTextScriptPath(null);
    }

    const openVScriptPath = projectData.editorState?.openVisualScriptPath;
    const vsScriptData = openVScriptPath ? FileManager.loadFile(openVScriptPath) : null; 
    if (openVScriptPath && vsScriptData !== undefined) {
        UIVisualScriptEditorManager.loadVisualScript(openVScriptPath, vsScriptData);
        FileManager.setCurrentOpenVisualScriptPath(openVScriptPath);
    } else {
        UIVisualScriptEditorManager.clearEditor();
        FileManager.setCurrentOpenVisualScriptPath(null);
    }
    
    if (_uiCallbacksPSC.updateProjectNameDisplay) _uiCallbacksPSC.updateProjectNameDisplay(projectData.projectName || ProjectManager.getCurrentProjectName());
    if (UIManager.updateObjectListUI) UIManager.updateObjectListUI();
    if (UIManager.populatePropertiesPanel) UIManager.populatePropertiesPanel();
    if (_uiCallbacksPSC.populateProjectFilesList) _uiCallbacksPSC.populateProjectFilesList();
    if (_uiCallbacksPSC.updateSceneSettingsDisplay) _uiCallbacksPSC.updateSceneSettingsDisplay();
    if (ScriptComponentsManager.populateAvailableScriptsDropdown) ScriptComponentsManager.populateAvailableScriptsDropdown();

    ObjectManager.setSelectedObjectAndUpdateUI(null);
}