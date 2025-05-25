// ui-project-files-interaction.js
import * as DOM from './dom-elements.js';
import * as FileManager from './file-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as TabManager from './ui-tab-manager.js';
// VisualScriptEditorManager is not directly needed if its interface is sufficient
import * as ObjectManager from './object-manager.js';
import * as PropertiesPanelManager from './ui-properties-panel-manager.js';
// import * as ProjectManager from './project-manager.js'; // For ProjectManager.getLevelsCount, now using LevelDataManager
import * as LevelDataManager from './level-data-manager.js'; // Import LevelDataManager
import * as UILevelManager from './ui-level-manager.js';

let localTextScriptEditorInterface = {};
let localVisualScriptEditorInterface = {};
let localPopulateProjectFilesListFn = () => {};

export function initProjectFilesInteraction(textIntf, visualIntf, populateFn) {
    localTextScriptEditorInterface = textIntf;
    localVisualScriptEditorInterface = visualIntf;
    localPopulateProjectFilesListFn = populateFn;
    setupProjectFileDelegatedListener();
}

async function handleCreateNewLevelClick() {
    const levelBaseName = prompt("Enter new level name (file name without .level):", `Level${LevelDataManager.getLevelsCount() + 1}`); // Changed from ProjectManager
    if (levelBaseName && levelBaseName.trim()) {
        await UILevelManager.addNewLevelFile(levelBaseName.trim()); // Changed from ProjectManager
        // populateProjectFilesList is called by ProjectManager flow
    } else if (levelBaseName !== null) {
        ScriptEngine.customConsole.error("Level name cannot be empty.");
    }
}

function handleNewFile(typeKey = 'STELA_SCRIPT') {
    const fileType = FileManager.FILE_TYPES[typeKey];
    if (!fileType) {
        ScriptEngine.customConsole.error(`Unknown file type key: ${typeKey}`);
        return;
    }

    let baseName = "NewFile";
    let defaultContent = "";

    if (typeKey === 'STELA_SCRIPT') {
        baseName = "NewTextScript";
        const newPath = FileManager.getUniqueFilePath(baseName, typeKey);
        defaultContent = `// Stela Script: ${newPath.split('/').pop()}\n\n`;
        
        if (FileManager.saveScript(newPath, defaultContent)) {
            localTextScriptEditorInterface.loadTextScriptIntoEditor(newPath, defaultContent, false); 
            FileManager.setCurrentOpenTextScriptPath(newPath); 
            localTextScriptEditorInterface.updateTextScriptEditorTabName(newPath.split('/').pop());
            TabManager.switchCenterTab('script');
            ScriptEngine.clearOutputMessages();
            ScriptEngine.customConsole.log(`New text script "${newPath}" created and opened. Save to persist changes to project.`);
            if (localPopulateProjectFilesListFn) localPopulateProjectFilesListFn(); 
        }
    } else if (typeKey === 'VISUAL_SCRIPT') {
        baseName = "NewVisualScript";
        const newPath = FileManager.getUniqueFilePath(baseName, typeKey);
        const emptyVSData = { nodes: [], connections: [], nodeIdCounter: 0, connectionIdCounter: 0 };
        if(FileManager.saveVisualScript(newPath, emptyVSData)) {
            localVisualScriptEditorInterface.clearVisualScriptEditorForNewScript(newPath);
            FileManager.setCurrentOpenVisualScriptPath(newPath);
            TabManager.switchCenterTab('visual-script');
            ScriptEngine.customConsole.log(`New visual script "${newPath}" created and opened. Save to persist changes to project.`);
            if (localPopulateProjectFilesListFn) localPopulateProjectFilesListFn(); 
        }
    } else {
        ScriptEngine.customConsole.log(`"New File" for type ${typeKey} not fully implemented yet.`);
    }
}

async function handleOpenFile(filePath, typeKey) {
    if (typeKey === 'STELA_SCRIPT') {
        const content = FileManager.loadScript(filePath, true); 
        if (content !== undefined) {
            localTextScriptEditorInterface.loadTextScriptIntoEditor(filePath, content, true);
            TabManager.switchCenterTab('script');
        } else {
            ScriptEngine.customConsole.error(`Failed to load text script file: ${filePath}`);
        }
    } else if (typeKey === 'VISUAL_SCRIPT') {
        const data = FileManager.loadVisualScript(filePath, true); 
        if (data !== undefined) {
            localVisualScriptEditorInterface.loadVisualScriptIntoEditor(filePath, data);
            TabManager.switchCenterTab('visual-script');
        } else {
            ScriptEngine.customConsole.error(`Failed to load visual script file: ${filePath}`);
        }
    } else if (typeKey === 'LEVEL') {
        await UILevelManager.switchActiveLevelByPath(filePath); // Changed from ProjectManager
        // List refresh will be handled by ProjectManager flow and the population below
    } else if (typeKey === 'MODEL_GLTF' || typeKey === 'MODEL_GLB') {
        ScriptEngine.customConsole.log(`Opening model file ${filePath} in Model Editor (placeholder).`);
        TabManager.switchCenterTab('model-editor');
    } else {
        ScriptEngine.customConsole.log(`"Open File" for type ${typeKey} not implemented yet.`);
    }
    if (localPopulateProjectFilesListFn) localPopulateProjectFilesListFn();
}

async function handleDeleteFile(filePath, typeKey) {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    const fileTypeInfo = FileManager.FILE_TYPES[typeKey] || { description: 'file' };
    if (!filePath || !confirm(`Are you sure you want to delete ${fileTypeInfo.description} "${fileName}"? This cannot be undone.`)) {
        return;
    }

    let success = false;
    if (typeKey === 'LEVEL') {
        success = await UILevelManager.deleteLevelByPathUI(filePath); // Changed from ProjectManager
    } else if (typeKey === 'STELA_SCRIPT') {
        success = FileManager.deleteScript(filePath); 
        if (success) ObjectManager.removeScriptComponentFromAllObjects(filePath);
    } else if (typeKey === 'VISUAL_SCRIPT') {
        success = FileManager.deleteVisualScript(filePath);
        if (success) ObjectManager.removeScriptComponentFromAllObjects(filePath); 
    } else {
        success = FileManager.deleteFile(filePath); 
    }

    if (success) {
        ScriptEngine.customConsole.log(`${fileTypeInfo.description} "${fileName}" deleted.`);
        if (ObjectManager.getSelectedObject()) {
            PropertiesPanelManager.populatePropertiesPanel();
        }
        if (localPopulateProjectFilesListFn) localPopulateProjectFilesListFn();
    } else {
        ScriptEngine.customConsole.error(`Failed to delete ${fileTypeInfo.description} "${fileName}".`);
    }
}

async function handleRenameFile(filePath, typeKey) {
    if (!filePath) return;
    const oldFileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    const fileTypeInfo = FileManager.FILE_TYPES[typeKey] || { extension: '', description: 'file' };
    const oldBaseName = oldFileName.replace(fileTypeInfo.extension || '', '');

    const newBaseNamePrompt = prompt(`Enter new base name for ${fileTypeInfo.description} "${oldFileName}":`, oldBaseName);
    if (!newBaseNamePrompt || !newBaseNamePrompt.trim() || newBaseNamePrompt.trim() === oldBaseName) {
        ScriptEngine.customConsole.log("Rename cancelled or name unchanged.");
        return;
    }

    const newBaseName = newBaseNamePrompt.trim();
    let success = false;
    let newFilePath = null;

    if (typeKey === 'LEVEL') {
        const oldDir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
        const tentativeNewPath = oldDir + newBaseName + FileManager.FILE_TYPES.LEVEL.extension;
        success = await UILevelManager.renameLevelByPathUI(filePath, tentativeNewPath); // Changed from ProjectManager
        if (success) newFilePath = tentativeNewPath;
    } else if (typeKey === 'STELA_SCRIPT') {
        newFilePath = FileManager.renameScript(filePath, newBaseName); 
        success = !!newFilePath;
        if (success) {
            if (FileManager.getCurrentOpenTextScriptPath() === newFilePath) { 
                localTextScriptEditorInterface.updateTextScriptEditorTabName(newFilePath.split('/').pop());
            }
        }
    } else if (typeKey === 'VISUAL_SCRIPT') {
        newFilePath = FileManager.renameVisualScript(filePath, newBaseName);
        success = !!newFilePath;
        if (success) {
            if (FileManager.getCurrentOpenVisualScriptPath() === newFilePath) {
                localVisualScriptEditorInterface.updateVisualScriptEditorTabName(newFilePath.split('/').pop());
            }
        }
    } else {
        const oldDir = filePath.substring(0, filePath.lastIndexOf('/') + 1);
        const tentativeNewPath = oldDir + newBaseName + (fileTypeInfo.extension || '');
        if (FileManager.fileExists(tentativeNewPath)) {
            alert(`File path "${tentativeNewPath}" already exists.`);
            return;
        }
        success = FileManager.renameFile(filePath, tentativeNewPath);
        if (success) newFilePath = tentativeNewPath;
    }

    if (success && newFilePath) {
        if (typeKey === 'STELA_SCRIPT' || typeKey === 'VISUAL_SCRIPT') {
            ObjectManager.updateScriptComponentNameOnAllObjects(filePath, newFilePath);
        }
        ScriptEngine.customConsole.log(`${fileTypeInfo.description} "${oldFileName}" renamed to "${newFilePath.split('/').pop()}".`);
        
        if (ObjectManager.getSelectedObject()) {
            PropertiesPanelManager.populatePropertiesPanel();
        }
        if (localPopulateProjectFilesListFn) localPopulateProjectFilesListFn();

    } else if (!success) {
        ScriptEngine.customConsole.error(`Failed to rename ${fileTypeInfo.description} "${oldFileName}".`);
    }
}

function setupProjectFileDelegatedListener() {
    DOM.projectFileListDiv.addEventListener('click', async (event) => {
        const targetElement = event.target;
        const actionTarget = targetElement.closest('[data-action]');

        if (!actionTarget) return;

        event.stopPropagation(); 

        const action = actionTarget.dataset.action;
        const itemElement = actionTarget.closest('.script-file-item');
        const filePath = actionTarget.dataset.filePath || itemElement?.dataset.filePath;
        const fileTypeKey = actionTarget.dataset.fileTypeKey || itemElement?.dataset.fileTypeKey;


        switch (action) {
            case 'new-level':
                await handleCreateNewLevelClick();
                break;
            case 'new-file':
                const typeKeyForNewFile = actionTarget.dataset.typeKey;
                if (typeKeyForNewFile) handleNewFile(typeKeyForNewFile);
                break;
            case 'open-file':
                if (filePath && fileTypeKey) await handleOpenFile(filePath, fileTypeKey);
                break;
            case 'rename-file':
                if (filePath && fileTypeKey) await handleRenameFile(filePath, fileTypeKey);
                break;
            case 'delete-file':
                if (filePath && fileTypeKey) await handleDeleteFile(filePath, fileTypeKey);
                break;
            case 'capture-thumbnail':
                if (filePath) await UILevelManager.handleCaptureThumbnail(filePath); 
                break;
            case 'switch-active-level':
                if (filePath) await UILevelManager.switchActiveLevelByPath(filePath); // Changed from ProjectManager
                break;
            default:
                break;
        }
    });
}