import * as DOM from './dom-elements.js';
import * as FileManager from './file-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as TabManager from './ui-tab-manager.js';
import * as ScriptComponentsManager from './ui-script-components-manager.js';
import * as LevelDataManager from './level-data-manager.js';
import * as UILevelManager from './ui-level-manager.js'; 
import * as ProjectFilesDOM from './ui-project-files-dom.js';
import * as ProjectFilesInteraction from './ui-project-files-interaction.js';

let textScriptEditorInterface = {
    loadTextScriptIntoEditor: (path, content, isSaved) => {console.warn("PFM: Text editor interface not fully initialized for loadTextScriptIntoEditor")},
    clearTextEditorToUntitled: () => {console.warn("PFM: Text editor interface not fully initialized for clearTextEditorToUntitled")},
    updateTextScriptEditorTabName: (name) => {console.warn("PFM: Text editor interface not fully initialized for updateTextScriptEditorTabName")},
    getCurrentTextScriptFileNameInEditor: () => {console.warn("PFM: Text editor interface not fully initialized for getCurrentTextScriptFileNameInEditor"); return null;},
    setCurrentTextScriptFileNameInEditor: (path) => {console.warn("PFM: Text editor interface not fully initialized for setCurrentTextScriptFileNameInEditor")}
};

let visualScriptEditorInterface = {
    loadVisualScriptIntoEditor: (path, data) => {console.warn("PFM: Visual editor interface not fully initialized for loadVisualScriptIntoEditor")},
    clearVisualScriptEditorForNewScript: (path) => {console.warn("PFM: Visual editor interface not fully initialized for clearVisualScriptEditorForNewScript")},
    clearVisualScriptEditor: () => {console.warn("PFM: Visual editor interface not fully initialized for clearVisualScriptEditor")},
    updateVisualScriptEditorTabName: (name) => {console.warn("PFM: Visual editor interface not fully initialized for updateVisualScriptEditorTabName")},
    getCurrentVisualScriptFileNameInEditor: () => {console.warn("PFM: Visual editor interface not fully initialized for getCurrentVisualScriptFileNameInEditor"); return null;},
    setCurrentVisualScriptFileNameInEditor: (path) => {console.warn("PFM: Visual editor interface not fully initialized for setCurrentVisualScriptFileNameInEditor")}
};

export function initUIProjectFilesManager(textEditorIntf, visualEditorIntf) {
    if (textEditorIntf && Object.keys(textEditorIntf).length > 0) {
        textScriptEditorInterface = textEditorIntf;
    } else {
        console.warn("UIProjectFilesManager: Received empty or no textEditorInterface during init.");
    }
    if (visualEditorIntf && Object.keys(visualEditorIntf).length > 0) {
        visualScriptEditorInterface = visualEditorIntf;
    } else {
        console.warn("UIProjectFilesManager: Received empty or no visualEditorInterface during init.");
    }

    ProjectFilesInteraction.initProjectFilesInteraction(
        textScriptEditorInterface,
        visualScriptEditorInterface,
        populateProjectFilesList
    );
    populateProjectFilesList();
}

export function populateProjectFilesList() {
    const allFilePaths = FileManager.listFiles();
    DOM.projectFileListDiv.innerHTML = ''; 

    const levelHeaderDiv = ProjectFilesDOM.createLevelSectionHeaderDOM();
    DOM.projectFileListDiv.appendChild(levelHeaderDiv);
    
    const activeLevelPath = LevelDataManager.getActiveLevelPath();
    const activeLevelFileContent = activeLevelPath ? FileManager.loadFile(activeLevelPath) : null;
    const activeLevelDisplayName = activeLevelFileContent?.levelName || activeLevelPath?.substring(activeLevelPath.lastIndexOf('/') + 1) || 'None';
    const activeLevelDisplaySpan = levelHeaderDiv.querySelector('#active-level-display-project-files');
    if (activeLevelDisplaySpan) {
        activeLevelDisplaySpan.textContent = `(Active: ${activeLevelDisplayName})`;
    }

    const fileGroups = {};
    // Define the order of sections. Use descriptions from FILE_TYPES.
    const typeOrder = [ 
        FileManager.FILE_TYPES.LEVEL.description, // "Level File"
        FileManager.FILE_TYPES.STELA_SCRIPT.description, // "Stela Script"
        FileManager.FILE_TYPES.VISUAL_SCRIPT.description, // "Visual Script"
        FileManager.FILE_TYPES.MODEL_GLTF.description, // "GLTF Model" (covers GLB too)
    ];
    const typeKeyMap = {}; // Maps description back to a primary typeKey for header buttons etc.
    Object.keys(FileManager.FILE_TYPES).forEach(key => {
        const description = FileManager.FILE_TYPES[key].description;
        if (!typeKeyMap[description]) { // Prefer first encountered (e.g. GLTF over GLB for group key)
           typeKeyMap[description] = key;
        }
        // Special handling for GLB to group with GLTF for display
        if (key === 'MODEL_GLB') {
            typeKeyMap[FileManager.FILE_TYPES[key].description] = 'MODEL_GLTF'; // Use GLTF's key for grouping
        }
    });

    allFilePaths.forEach(path => {
        const typeKey = FileManager.getFileTypeKeyFromPath(path) || 'UNKNOWN';
        let displayGroupKey = 'Other Files';
        if (typeKey !== 'UNKNOWN' && FileManager.FILE_TYPES[typeKey]) {
            displayGroupKey = FileManager.FILE_TYPES[typeKey].description;
            // Ensure GLB files are grouped under "GLTF Model" description
            if (typeKey === 'MODEL_GLB') {
                displayGroupKey = FileManager.FILE_TYPES.MODEL_GLTF.description;
            }
        }
        
        if (!fileGroups[displayGroupKey]) {
            fileGroups[displayGroupKey] = [];
        }
        fileGroups[displayGroupKey].push(path);
    });

    // Render Levels first - special handling (already done by createLevelSectionHeaderDOM implicitly)
    // The level list items will be added directly after the Level Header
    const levelDescriptionKey = FileManager.FILE_TYPES.LEVEL.description;
    const levelPaths = fileGroups[levelDescriptionKey] || [];

    levelPaths.sort().forEach(path => { 
        const levelContent = FileManager.loadFile(path);
        const itemData = {
            displayName: levelContent?.levelName || path.substring(path.lastIndexOf('/') + 1),
            fullPathTitle: path,
            isLevelActive: path === activeLevelPath,
            thumbnailDataUrl: levelContent?.thumbnailDataUrl,
            canDelete: LevelDataManager.getLevelsCount() > 1,
            isSelected: path === activeLevelPath 
        };
        const itemEl = ProjectFilesDOM.createProjectFileItemDOM(path, 'LEVEL', itemData);
        DOM.projectFileListDiv.appendChild(itemEl);
    });

    // Render other file types based on defined order
    typeOrder.forEach(descriptionKey => {
        // Skip levels as they are handled above
        if (descriptionKey === FileManager.FILE_TYPES.LEVEL.description) return; 

        const pathsInGroup = fileGroups[descriptionKey];
        if (pathsInGroup && pathsInGroup.length > 0) {
            DOM.projectFileListDiv.appendChild(ProjectFilesDOM.createSeparatorDOM());
            const typeKeyForHeader = typeKeyMap[descriptionKey] || 'UNKNOWN'; 
            DOM.projectFileListDiv.appendChild(ProjectFilesDOM.createFileSectionHeaderDOM(descriptionKey, typeKeyForHeader));

            pathsInGroup.sort().forEach(path => { 
                const typeKey = FileManager.getFileTypeKeyFromPath(path);
                const itemData = {
                    displayName: path.substring(path.lastIndexOf('/') + 1),
                    fullPathTitle: path,
                    isLevelActive: false, 
                    canDelete: true, 
                    isSelected: (typeKey === 'STELA_SCRIPT' && path === FileManager.getCurrentOpenTextScriptPath()) ||
                                (typeKey === 'VISUAL_SCRIPT' && path === FileManager.getCurrentOpenVisualScriptPath())
                };
                const itemEl = ProjectFilesDOM.createProjectFileItemDOM(path, typeKey, itemData);
                DOM.projectFileListDiv.appendChild(itemEl);
            });
        }
    });
    
    // Render "Other Files" if any
    const otherFilePaths = fileGroups['Other Files'];
    if (otherFilePaths && otherFilePaths.length > 0) {
         DOM.projectFileListDiv.appendChild(ProjectFilesDOM.createSeparatorDOM());
         DOM.projectFileListDiv.appendChild(ProjectFilesDOM.createFileSectionHeaderDOM('Other Files', 'UNKNOWN')); 
         otherFilePaths.sort().forEach(path => { 
            const itemData = {
                displayName: path.substring(path.lastIndexOf('/') + 1),
                fullPathTitle: path,
                isLevelActive: false,
                canDelete: true,
                isSelected: false 
            };
            const itemEl = ProjectFilesDOM.createProjectFileItemDOM(path, 'UNKNOWN', itemData);
            DOM.projectFileListDiv.appendChild(itemEl);
         });
    }

    ScriptComponentsManager.populateAvailableScriptsDropdown();
    
    if (typeof textScriptEditorInterface.updateTextScriptEditorTabName === 'function') {
        const openTextPath = FileManager.getCurrentOpenTextScriptPath();
        textScriptEditorInterface.updateTextScriptEditorTabName(openTextPath ? openTextPath.split('/').pop() : 'Untitled');
    } else {
        console.warn("PFM: textScriptEditorInterface.updateTextScriptEditorTabName is not a function at populateProjectFilesList end.");
    }
    
    if (typeof visualScriptEditorInterface.updateVisualScriptEditorTabName === 'function') {
        const openVSPath = FileManager.getCurrentOpenVisualScriptPath();
        visualScriptEditorInterface.updateVisualScriptEditorTabName(openVSPath ? openVSPath.split('/').pop() : 'Untitled');
    } else {
        console.warn("PFM: visualScriptEditorInterface.updateVisualScriptEditorTabName is not a function at populateProjectFilesList end.");
    }
}

export function handleExternalFileDeletion(filePath, fileTypeKey) {
    if (fileTypeKey === 'STELA_SCRIPT' && FileManager.getCurrentOpenTextScriptPath() === filePath) {
        textScriptEditorInterface.clearTextEditorToUntitled();
    } else if (fileTypeKey === 'VISUAL_SCRIPT' && FileManager.getCurrentOpenVisualScriptPath() === filePath) {
        visualScriptEditorInterface.clearVisualScriptEditor(); 
    }
    // The list will be refreshed by FileManager's hook calling populateProjectFilesList
    populateProjectFilesList(); // Ensure list refreshes if not covered by other hooks.
}

export function getPopulateProjectFilesListFunction() {
    return populateProjectFilesList;
}

export const handleCaptureThumbnail = UILevelManager.handleCaptureThumbnail;
export const updateSceneSettingsDisplay = UILevelManager.updateSceneSettingsDisplay;