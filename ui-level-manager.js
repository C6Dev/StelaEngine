import * as DOM from './dom-elements.js';
import * as ProjectManager from './project-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as ThreeScene from './three-scene.js';
import * as UIManager from './ui-manager.js'; 
import * as FileManager from './file-manager.js';
import * as LevelDataManager from './level-data-manager.js';
import * as ObjectManager from './object-manager.js';
import * as SceneSerializer from './scene-serializer.js';
import * as ProjectStateCoordinator from './project-state-coordinator.js';
import * as UIProjectFilesManager from './ui-project-files-manager.js';

const THUMBNAIL_WIDTH = 128;
const THUMBNAIL_HEIGHT = 72;

export async function addNewLevelFile(levelBaseName) {
    ProjectStateCoordinator.saveCurrentSceneToActiveLevel();

    const levelPath = FileManager.getUniqueFilePath(levelBaseName, 'LEVEL');
    const levelFileContentObject = LevelDataManager.createNewLevelFileContent(levelBaseName); 

    if (FileManager.saveFile(levelPath, levelFileContentObject)) {
        LevelDataManager.addLevelPath(levelPath); 
        await switchActiveLevelByPath(levelPath); // Use the new local switch function

        // Scene setup is now part of switchActiveLevelByPath
        // ThreeScene.clearSceneContent();
        // ObjectManager.resetObjectManager();
        // ThreeScene.setBackgroundColor(levelFileContentObject.sceneData.sceneBackgroundColor);
        // await SceneSerializer.loadSceneState(levelFileContentObject.sceneData); 
        
        // UIManager.updateObjectListUI(); // Handled by switchActiveLevelByPath
        // UIManager.populatePropertiesPanel(); // Handled by switchActiveLevelByPath
        
        // UIProjectFilesManager.populateProjectFilesList() is called by FileManager hooks
        // updateSceneSettingsDisplay(); // Handled by switchActiveLevelByPath
        ScriptEngine.customConsole.log(`New level file "${levelPath}" added and activated.`);
        
    } else {
        ScriptEngine.customConsole.error(`Failed to save new level file "${levelPath}".`);
    }
}

export async function switchActiveLevelByPath(levelPath) {
    const currentActivePath = LevelDataManager.getActiveLevelPath();
    if (!levelPath || !FileManager.fileExists(levelPath) || levelPath === currentActivePath) {
        if (levelPath === currentActivePath) {
            ScriptEngine.customConsole.log(`Level "${levelPath}" is already active.`);
        } else if (!FileManager.fileExists(levelPath)) {
            ScriptEngine.customConsole.error(`Cannot switch: Level file "${levelPath}" does not exist.`);
        }
        return;
    }
    ProjectStateCoordinator.saveCurrentSceneToActiveLevel(); // Save current before switching

    if (LevelDataManager.switchActiveLevelPath(levelPath)) {
        const newActiveLevelContent = LevelDataManager.getActiveLevelFileContent(); 
        if (newActiveLevelContent && newActiveLevelContent.sceneData) { 
            ScriptEngine.customConsole.log(`Switching to level: "${levelPath}". Level Name in content: ${newActiveLevelContent.levelName || 'N/A'}`);
            ThreeScene.clearSceneContent();
            ObjectManager.resetObjectManager();

            ThreeScene.setBackgroundColor(newActiveLevelContent.sceneData.sceneBackgroundColor || '#000000');
            await SceneSerializer.loadSceneState(newActiveLevelContent.sceneData); 
            
            UIManager.updateObjectListUI();
            UIManager.populatePropertiesPanel();
            if (UIProjectFilesManager.getPopulateProjectFilesListFunction) {
                UIProjectFilesManager.getPopulateProjectFilesListFunction()();
            }
            updateSceneSettingsDisplay();
            ObjectManager.setSelectedObjectAndUpdateUI(null); // Deselect object on level switch
        } else {
            ScriptEngine.customConsole.error(`Failed to load content or sceneData for level: "${levelPath}" during switch.`);
            // Fallback to a default empty scene state
            ThreeScene.clearSceneContent();
            ObjectManager.resetObjectManager();
            ThreeScene.setBackgroundColor('#000000');
            await SceneSerializer.loadSceneState(LevelDataManager.createNewLevelFileContent("ErrorLevel").sceneData);
            UIManager.updateObjectListUI();
            UIManager.populatePropertiesPanel();
        }
    }
}

export async function deleteLevelByPathUI(levelPath) { // Renamed to avoid clash with old ProjectManager.deleteLevelByPath
    const levelFileContent = FileManager.loadFile(levelPath);
    if (!levelFileContent) return;
    const levelDisplayName = levelFileContent.levelName || levelPath.substring(levelPath.lastIndexOf('/') + 1);
    if (confirm(`Are you sure you want to delete level "${levelDisplayName}"? This cannot be undone.`)) {
        await deleteLevelByPathImpl(levelPath); 
    }
}

async function deleteLevelByPathImpl(levelPath) {
    const levelPaths = LevelDataManager.getAllLevelPaths();
    if (levelPaths.length <= 1) {
        ScriptEngine.customConsole.error("Cannot delete the last remaining level.");
        return false;
    }
    if (FileManager.deleteFile(levelPath)) {
        LevelDataManager.removeLevelPath(levelPath); 

        if (LevelDataManager.getActiveLevelPath() === null && LevelDataManager.getLevelsCount() > 0) {
            const firstAvailableLevel = LevelDataManager.getAllLevelPaths()[0];
            await switchActiveLevelByPath(firstAvailableLevel); 
        } else if (LevelDataManager.getLevelsCount() === 0) {
            // This case should ideally not be reached if the (levelPaths.length <= 1) check is correct
            // But as a fallback, create a new default project state.
            await ProjectManager.createNewProject(ProjectManager.getCurrentProjectName(), true); 
        }
        if (UIProjectFilesManager.getPopulateProjectFilesListFunction) {
            UIProjectFilesManager.getPopulateProjectFilesListFunction()();
        }
        updateSceneSettingsDisplay();
        return true;
    }
    return false;
}

export async function renameLevelByPathUI(levelPath) { // Renamed
    const levelFileContent = FileManager.loadFile(levelPath);
    if (!levelFileContent) return;

    const oldBaseName = levelPath.substring(levelPath.lastIndexOf('/') + 1)
                               .replace(FileManager.FILE_TYPES.LEVEL.extension, '');
    const newBaseName = prompt("Enter new base name for level:", oldBaseName);

    if (newBaseName && newBaseName.trim() && newBaseName.trim() !== oldBaseName) {
        const dir = levelPath.substring(0, levelPath.lastIndexOf('/') + 1);
        const newLevelPath = dir + newBaseName.trim() + FileManager.FILE_TYPES.LEVEL.extension;
        await renameLevelByPathImpl(levelPath, newLevelPath); // Use local impl
    } else if (newBaseName !== null && newBaseName.trim() === oldBaseName) {
        ScriptEngine.customConsole.log("Level rename cancelled or name unchanged.");
    } else if (newBaseName !== null) { // Empty or whitespace only
        ScriptEngine.customConsole.error("New level name cannot be empty.");
    }
}

async function renameLevelByPathImpl(oldLevelPath, newLevelPath) {
    // Ensure the new path has the correct extension, though getUniqueFilePath typically handles this
    if (!newLevelPath.toLowerCase().endsWith(FileManager.FILE_TYPES.LEVEL.extension)) {
        newLevelPath = newLevelPath.replace(/(\.level)?$/i, '') + FileManager.FILE_TYPES.LEVEL.extension;
    }
    
    // Check if the new path already exists (FileManager.renameFile also checks, but good for early exit)
    if (FileManager.fileExists(newLevelPath) && newLevelPath !== oldLevelPath) {
        ScriptEngine.customConsole.error(`Cannot rename: File "${newLevelPath}" already exists.`);
        alert(`Cannot rename: File "${newLevelPath}" already exists.`);
        return false;
    }

    if (FileManager.renameFile(oldLevelPath, newLevelPath)) {
        LevelDataManager.renameLevelPath(oldLevelPath, newLevelPath);
        
        const levelContent = FileManager.loadFile(newLevelPath); 
        if (levelContent) {
            const newBaseNameFromFilePath = newLevelPath.substring(newLevelPath.lastIndexOf('/') + 1).replace(FileManager.FILE_TYPES.LEVEL.extension, '');
            if (levelContent.levelName !== newBaseNameFromFilePath) {
                levelContent.levelName = newBaseNameFromFilePath;
                FileManager.saveFile(newLevelPath, levelContent); 
            }
        }
        
        if (UIProjectFilesManager.getPopulateProjectFilesListFunction) {
            UIProjectFilesManager.getPopulateProjectFilesListFunction()();
        }
        if (LevelDataManager.getActiveLevelPath() === newLevelPath) {
             updateSceneSettingsDisplay();
        }
        return true;
    }
    return false;
}

export async function handleCaptureThumbnail(levelPath) {
    const levelFileContent = FileManager.loadFile(levelPath);
    if (!levelFileContent) {
        ScriptEngine.customConsole.error(`Cannot capture thumbnail: Level file "${levelPath}" not found.`);
        return;
    }
    const levelDisplayName = levelFileContent.levelName || levelPath.substring(levelPath.lastIndexOf('/') + 1);

    if (LevelDataManager.getActiveLevelPath() !== levelPath) {
        if (!confirm(`To capture thumbnail for "${levelDisplayName}", it needs to be the active level. Switch now?`)) {
            return;
        }
        await switchActiveLevelByPath(levelPath); // Use local function
        await new Promise(resolve => setTimeout(resolve, 100)); 
    }

    const wasGizmoVisible = ThreeScene.getTransformControls().visible;
    const gizmoObject = ThreeScene.getTransformControls().object; 
    if (wasGizmoVisible) ThreeScene.detachTransformControls();

    const thumbnailDataUrl = ThreeScene.captureSceneThumbnail(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    if (wasGizmoVisible && gizmoObject) { 
        ThreeScene.attachTransformControls(gizmoObject);
    }

    if (thumbnailDataUrl) {
        await updateLevelThumbnailImpl(levelPath, thumbnailDataUrl); // Use local impl
        ScriptEngine.customConsole.log(`Thumbnail captured for level "${levelDisplayName}".`);
    } else {
        ScriptEngine.customConsole.error("Failed to capture thumbnail.");
    }
}

async function updateLevelThumbnailImpl(levelPath, thumbnailDataUrl) { 
    const levelContent = FileManager.loadFile(levelPath); 
    if (levelContent) {
        levelContent.thumbnailDataUrl = thumbnailDataUrl;
        if (FileManager.saveFile(levelPath, levelContent)) { 
            if (UIProjectFilesManager.getPopulateProjectFilesListFunction) {
                UIProjectFilesManager.getPopulateProjectFilesListFunction()();
            }
        }
    }
}

export function updateActiveLevelBackgroundColor(hexColorString) {
    if (LevelDataManager.updateActiveLevelBackgroundColor(hexColorString)) { // This saves via FileManager and marks dirty
        ThreeScene.setBackgroundColor(hexColorString);
        updateSceneSettingsDisplay(); // Refresh UI display
    }
}

export function updateSceneSettingsDisplay() {
    const activeLevelContent = LevelDataManager.getActiveLevelFileContent(); // Use LevelDataManager
    if (activeLevelContent && activeLevelContent.sceneData) {
        DOM.propBgColorInput.value = activeLevelContent.sceneData.sceneBackgroundColor || '#000000';
        if (DOM.activeLevelDisplayProperties) {
             const activeLevelName = activeLevelContent.levelName || LevelDataManager.getActiveLevelPath()?.split('/').pop() || 'None';
             DOM.activeLevelDisplayProperties.textContent = `Editing: ${activeLevelName}`;
        }

    } else {
        DOM.propBgColorInput.value = '#000000';
        if (DOM.activeLevelDisplayProperties) {
            DOM.activeLevelDisplayProperties.textContent = `Editing: None`;
        }
    }
}

export const handleRenameLevel = renameLevelByPathUI;
export const handleDeleteLevel = deleteLevelByPathUI;