import * as DOM from './dom-elements.js';
import * as FileManager from './file-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as TabManager from './ui-tab-manager.js';
import * as VisualScriptEditorManager from './ui-visual-script-editor-manager.js';
import * as ObjectManager from './object-manager.js';
import * as PropertiesPanelManager from './ui-properties-panel-manager.js';
import * as ScriptComponentsManager from './ui-script-components-manager.js';
import * as ProjectManager from './project-manager.js';

let textScriptEditorInterface = {
    loadTextScriptIntoEditor: (path, content, isSaved) => {},
    clearTextEditorToUntitled: () => {},
    updateTextScriptEditorTabName: (name) => {},
    getCurrentTextScriptFileNameInEditor: () => null, 
    setCurrentTextScriptFileNameInEditor: (path) => {} 
};

export function initUIProjectFilesManager(textEditorIntf) {
    if (textEditorIntf) {
        textScriptEditorInterface = textEditorIntf;
    }

    setupProjectFileControls();
    populateProjectFilesList();
}

export function populateProjectFilesList() {
    const allFiles = FileManager.listFiles(); 
    DOM.scriptFileListDiv.innerHTML = '';

    if (allFiles.length === 0) {
        DOM.scriptFileListDiv.textContent = "No files in this project yet.";
    } else {
        const groupedFiles = {};
        allFiles.forEach(path => {
            const typeKey = FileManager.getFileTypeKeyFromPath(path) || 'UNKNOWN';
            if (!groupedFiles[typeKey]) {
                groupedFiles[typeKey] = [];
            }
            groupedFiles[typeKey].push(path);
        });

        const displayOrder = [ 
            'LEVEL', 
            'STELA_SCRIPT',
            'VISUAL_SCRIPT',
            'MODEL_GLTF', 
            'MODEL_GLB',
            'UNKNOWN' 
        ];
        
        displayOrder.forEach(typeKey => {
            if (groupedFiles[typeKey] && groupedFiles[typeKey].length > 0) {
                if (DOM.scriptFileListDiv.children.length > 0 && 
                   (typeKey === 'LEVEL' || typeKey === 'STELA_SCRIPT' || typeKey === 'VISUAL_SCRIPT' || typeKey === 'MODEL_GLTF' || typeKey === 'MODEL_GLB')) {
                     const hr = document.createElement('hr');
                     hr.className = 'project-content-separator';
                     DOM.scriptFileListDiv.appendChild(hr);
                } else if (DOM.scriptFileListDiv.children.length > 0 && typeKey === 'UNKNOWN') {
                     // No separator before UNKNOWN if it's the first group, or after model types
                }


                const typeHeader = document.createElement('div');
                typeHeader.className = 'script-file-type-header';
                typeHeader.textContent = FileManager.FILE_TYPES[typeKey]?.description || typeKey; 
                 if (typeKey !== 'LEVEL') { 
                     DOM.scriptFileListDiv.appendChild(typeHeader);
                 }


                groupedFiles[typeKey].forEach(path => {
                    const itemDiv = createProjectFileItemDOM(path, typeKey);
                    DOM.scriptFileListDiv.appendChild(itemDiv);
                });
            }
        });
    }
    ScriptComponentsManager.populateAvailableScriptsDropdown(); 
    textScriptEditorInterface.updateTextScriptEditorTabName(FileManager.getCurrentOpenTextScriptPath()?.split('/').pop() || 'Untitled');
    VisualScriptEditorManager.updateEditorTabNameWithCurrentFile(); 
}

function createProjectFileItemDOM(filePath, fileTypeKey) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('script-file-item'); 
    itemDiv.dataset.filePath = filePath;
    itemDiv.dataset.fileTypeKey = fileTypeKey;

    const iconSpan = document.createElement('span');
    iconSpan.classList.add('script-type-icon'); 
    iconSpan.textContent = FileManager.FILE_TYPES[fileTypeKey]?.emoji || '❓';
    iconSpan.title = FileManager.FILE_TYPES[fileTypeKey]?.description || 'Unknown File';
    itemDiv.appendChild(iconSpan);
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = filePath.substring(filePath.lastIndexOf('/') + 1); 
    nameSpan.title = filePath; 
    nameSpan.addEventListener('click', () => handleOpenFile(filePath, fileTypeKey));
    itemDiv.appendChild(nameSpan);

    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('script-item-controls');

    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rename';
    renameBtn.classList.add('rename-script-btn'); 
    controlsDiv.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.classList.add('delete-script-btn'); 
    controlsDiv.appendChild(deleteBtn);
    
    itemDiv.appendChild(controlsDiv);

    const currentOpenTextPath = FileManager.getCurrentOpenTextScriptPath();
    const currentOpenVSPath = FileManager.getCurrentOpenVisualScriptPath();
    if ((fileTypeKey === 'STELA_SCRIPT' && filePath === currentOpenTextPath) ||
        (fileTypeKey === 'VISUAL_SCRIPT' && filePath === currentOpenVSPath)) {
        itemDiv.classList.add('selected-script'); 
    }
    return itemDiv;
}

function updateFileSelectionUI(selectedPath, selectedTypeKey) {
    const items = DOM.scriptFileListDiv.querySelectorAll('.script-file-item');
    items.forEach(item => {
        if (item.dataset.filePath === selectedPath && item.dataset.fileTypeKey === selectedTypeKey) {
            item.classList.add('selected-script');
        } else {
            item.classList.remove('selected-script');
        }
    });
}

export function handleNewFile(typeKey = 'STELA_SCRIPT') {
    const fileType = FileManager.FILE_TYPES[typeKey];
    if (!fileType) {
        ScriptEngine.customConsole.error(`Unknown file type key: ${typeKey}`);
        return;
    }

    let baseName = "NewFile";
    let defaultContent = "";

    if (typeKey === 'STELA_SCRIPT') {
        baseName = "NewTextScript";
        defaultContent = `// New Stela Script\nprint('Script created!');`;
        const newPath = FileManager.getUniqueFilePath(baseName, typeKey);
        textScriptEditorInterface.loadTextScriptIntoEditor(newPath, defaultContent, false);
        FileManager.setCurrentOpenTextScriptPath(newPath);
        textScriptEditorInterface.updateTextScriptEditorTabName(newPath.split('/').pop());
        TabManager.switchCenterTab('script');
        ScriptEngine.clearOutputMessages();
        ScriptEngine.customConsole.log(`New text script "${newPath}" ready. Save to keep changes.`);
        updateFileSelectionUI(newPath, typeKey);

    } else if (typeKey === 'VISUAL_SCRIPT') {
        baseName = "NewVisualScript";
        const newPath = FileManager.getUniqueFilePath(baseName, typeKey);
        VisualScriptEditorManager.clearEditorForNewScript(newPath); 
        TabManager.switchCenterTab('visual-script');
        ScriptEngine.customConsole.log(`New visual script "${newPath}" ready. Save to keep changes.`);
        updateFileSelectionUI(newPath, typeKey);

    } else if (typeKey === 'LEVEL') {
        baseName = "NewLevel";
        const newLevelName = prompt("Enter new level name (file name without .level):", baseName);
        if (newLevelName && newLevelName.trim()) {
            ProjectManager.addNewLevelFile(newLevelName.trim()); 
        } else if (newLevelName !== null) {
            ScriptEngine.customConsole.error("Level name cannot be empty.");
        }
    } else {
        ScriptEngine.customConsole.log(`"New File" for type ${typeKey} not fully implemented yet.`);
    }
}

function handleOpenFile(filePath, typeKey) {
    if (typeKey === 'STELA_SCRIPT') {
        const content = FileManager.loadFile(filePath);
        if (content !== undefined) {
            textScriptEditorInterface.loadTextScriptIntoEditor(filePath, content, true);
            FileManager.setCurrentOpenTextScriptPath(filePath);
            TabManager.switchCenterTab('script');
            updateFileSelectionUI(filePath, typeKey);
        } else {
            if (FileManager.getCurrentOpenTextScriptPath() === filePath) {
                 textScriptEditorInterface.clearTextEditorToUntitled();
                 FileManager.setCurrentOpenTextScriptPath(null);
                 updateFileSelectionUI(null, null);
            }
        }
    } else if (typeKey === 'VISUAL_SCRIPT') {
        const data = FileManager.loadFile(filePath);
        if (data !== undefined) {
            VisualScriptEditorManager.loadVisualScript(filePath, data); 
            FileManager.setCurrentOpenVisualScriptPath(filePath);
            TabManager.switchCenterTab('visual-script');
            updateFileSelectionUI(filePath, typeKey);
        } else {
            if (FileManager.getCurrentOpenVisualScriptPath() === filePath) {
                VisualScriptEditorManager.clearEditor();
                FileManager.setCurrentOpenVisualScriptPath(null);
                updateFileSelectionUI(null, null);
            }
        }
    } else if (typeKey === 'LEVEL') {
        ProjectManager.switchActiveLevelByPath(filePath);
    } else {
        ScriptEngine.customConsole.log(`"Open File" for type ${typeKey} not implemented yet.`);
    }
}

function handleDeleteFile(filePath, typeKey) {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    if (!filePath || !confirm(`Are you sure you want to delete ${FileManager.FILE_TYPES[typeKey]?.description || 'file'} "${fileName}"? This cannot be undone.`)) {
        return;
    }

    let success = false;
    if (typeKey === 'LEVEL') {
        success = ProjectManager.deleteLevelByPath(filePath);
    } else {
        success = FileManager.deleteFile(filePath); 
    }

    if (success) {
        if (typeKey === 'STELA_SCRIPT' || typeKey === 'VISUAL_SCRIPT') {
            ObjectManager.removeScriptComponentFromAllObjects(filePath); 
        }
        ScriptEngine.customConsole.log(`${FileManager.FILE_TYPES[typeKey]?.description || 'File'} "${fileName}" and its components (if applicable) removed.`);
        if (ObjectManager.getSelectedObject()) { 
            PropertiesPanelManager.populatePropertiesPanel();
        }
    } else {
        ScriptEngine.customConsole.error(`Failed to delete ${FileManager.FILE_TYPES[typeKey]?.description || 'file'} "${fileName}".`);
    }
}

function handleRenameFile(oldFilePath, typeKey) {
    if (!oldFilePath) return;
    const oldFileName = oldFilePath.substring(oldFilePath.lastIndexOf('/') + 1);
    const oldBaseName = oldFileName.replace(FileManager.FILE_TYPES[typeKey]?.extension || '', '');

    const newBaseNamePrompt = prompt(`Enter new base name for ${FileManager.FILE_TYPES[typeKey]?.description || 'file'} "${oldFileName}":`, oldBaseName);
    if (!newBaseNamePrompt || !newBaseNamePrompt.trim() || newBaseNamePrompt.trim() === oldBaseName) {
        ScriptEngine.customConsole.log("Rename cancelled or name unchanged.");
        return;
    }
    
    const oldDir = oldFilePath.substring(0, oldFilePath.lastIndexOf('/') + 1);
    const newFileName = newBaseNamePrompt.trim() + (FileManager.FILE_TYPES[typeKey]?.extension || '');
    const newFilePath = oldDir + newFileName;

    let success = false;
    if (typeKey === 'LEVEL') {
        success = ProjectManager.renameLevelByPath(oldFilePath, newFilePath);
    } else {
        success = FileManager.renameFile(oldFilePath, newFilePath);
    }

    if (success) {
        if (typeKey === 'STELA_SCRIPT' || typeKey === 'VISUAL_SCRIPT') {
            ObjectManager.updateScriptComponentNameOnAllObjects(oldFilePath, newFilePath); 
        }
        ScriptEngine.customConsole.log(`${FileManager.FILE_TYPES[typeKey]?.description || 'File'} "${oldFileName}" renamed to "${newFileName}".`);
        if (ObjectManager.getSelectedObject()) {
            PropertiesPanelManager.populatePropertiesPanel();
        }
    }
}

function setupProjectFileControls() {
    DOM.createNewScriptBtn.addEventListener('click', () => {
        const typeInput = prompt("Create new file: 'text', 'visual', or 'level'?", "text")?.toLowerCase();
        if (typeInput === 'text') handleNewFile('STELA_SCRIPT');
        else if (typeInput === 'visual') handleNewFile('VISUAL_SCRIPT');
        else if (typeInput === 'level') handleNewFile('LEVEL');
        else if (typeInput !== null) {
            alert("Invalid file type. Please enter 'text', 'visual', or 'level'.");
        }
    });

    DOM.scriptFileListDiv.addEventListener('click', (event) => {
        const targetButton = event.target.closest('button');
        if (!targetButton) return;

        const scriptItemDiv = targetButton.closest('.script-file-item');
        if (!scriptItemDiv) return;

        const filePath = scriptItemDiv.dataset.filePath;
        const fileTypeKey = scriptItemDiv.dataset.fileTypeKey;

        if (targetButton.classList.contains('delete-script-btn')) {
            handleDeleteFile(filePath, fileTypeKey);
        } else if (targetButton.classList.contains('rename-script-btn')) {
            handleRenameFile(filePath, fileTypeKey);
        }
    });
}

export function handleExternalFileDeletion(filePath, fileTypeKey) {
    if (fileTypeKey === 'STELA_SCRIPT' && FileManager.getCurrentOpenTextScriptPath() === filePath) {
        textScriptEditorInterface.clearTextEditorToUntitled();
    } else if (fileTypeKey === 'VISUAL_SCRIPT' && FileManager.getCurrentOpenVisualScriptPath() === filePath) {
        VisualScriptEditorManager.clearEditor();
    }
    populateProjectFilesList();
}

export function getPopulateProjectFilesListFunction() {
    return populateProjectFilesList;
}