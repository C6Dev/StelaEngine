import * as DOM from './dom-elements.js';
import * as ProjectManager from './project-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as ThreeScene from './three-scene.js';
import * as UIManager from './ui-manager.js'; 
import * as FileManager from './file-manager.js'; // For level file paths and content

const DEFAULT_THUMBNAIL_PLACEHOLDER_TEXT = "No Thumbnail";
const THUMBNAIL_WIDTH = 128;
const THUMBNAIL_HEIGHT = 72;

export function initLevelManager() {
    setupLevelControls();
    populateLevelListUI();
}

function setupLevelControls() {
    DOM.createNewLevelBtn.addEventListener('click', () => {
        // ProjectManager.addNewLevel is now ProjectManager.addNewLevelFile
        const levelBaseName = prompt("Enter new level name (file name without .level):", 
                                     `Level${ProjectManager.getLevelsCount() + 1}`);
        if (levelBaseName && levelBaseName.trim()) {
            ProjectManager.addNewLevelFile(levelBaseName.trim());
            // populateLevelListUI will be called by ProjectManager flow
        } else if (levelBaseName !== null) {
            ScriptEngine.customConsole.error("Level name cannot be empty.");
        }
    });

    DOM.levelListDiv.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        const levelItemDiv = button.closest('.level-item');
        if (!levelItemDiv) return;

        const levelPath = levelItemDiv.dataset.levelPath; // Now using path
        if (!levelPath) return;

        if (button.classList.contains('switch-level-btn')) {
            ProjectManager.switchActiveLevelByPath(levelPath);
        } else if (button.classList.contains('rename-level-btn')) {
            handleRenameLevel(levelPath);
        } else if (button.classList.contains('delete-level-btn')) {
            handleDeleteLevel(levelPath);
        } else if (button.classList.contains('capture-thumbnail-btn')) {
            handleCaptureThumbnail(levelPath);
        }
    });
}

function handleRenameLevel(levelPath) {
    const levelFileContent = FileManager.loadFile(levelPath);
    if (!levelFileContent) return;

    const oldBaseName = levelPath.substring(levelPath.lastIndexOf('/') + 1)
                               .replace(FileManager.FILE_TYPES.LEVEL.extension, '');
    const newBaseName = prompt("Enter new base name for level:", oldBaseName);

    if (newBaseName && newBaseName.trim() && newBaseName.trim() !== oldBaseName) {
        const dir = levelPath.substring(0, levelPath.lastIndexOf('/') + 1);
        const newLevelPath = dir + newBaseName.trim() + FileManager.FILE_TYPES.LEVEL.extension;
        ProjectManager.renameLevelByPath(levelPath, newLevelPath);
    } else if (newBaseName !== null && newBaseName.trim() === oldBaseName) {
        ScriptEngine.customConsole.log("Level rename cancelled or name unchanged.");
    } else if (newBaseName !== null) {
        ScriptEngine.customConsole.error("New level name cannot be empty.");
    }
}

function handleDeleteLevel(levelPath) {
    const levelFileContent = FileManager.loadFile(levelPath);
    if (!levelFileContent) return;
    const levelDisplayName = levelFileContent.levelName || levelPath.substring(levelPath.lastIndexOf('/') + 1);
    if (confirm(`Are you sure you want to delete level "${levelDisplayName}"? This cannot be undone.`)) {
        ProjectManager.deleteLevelByPath(levelPath);
    }
}

async function handleCaptureThumbnail(levelPath) {
    const levelFileContent = FileManager.loadFile(levelPath);
    if (!levelFileContent) return;
    const levelDisplayName = levelFileContent.levelName || levelPath.substring(levelPath.lastIndexOf('/') + 1);

    if (ProjectManager.getActiveLevelPath() !== levelPath) {
        if (!confirm(`To capture thumbnail for "${levelDisplayName}", it needs to be the active level. Switch now?`)) {
            return;
        }
        await ProjectManager.switchActiveLevelByPath(levelPath);
        await new Promise(resolve => requestAnimationFrame(resolve)); // Wait for scene to update
    }

    const wasGizmoVisible = ThreeScene.getTransformControls().visible;
    if (wasGizmoVisible) ThreeScene.detachTransformControls();

    const thumbnailDataUrl = ThreeScene.captureSceneThumbnail(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

    if (wasGizmoVisible && ThreeScene.getTransformControls().object) {
        ThreeScene.attachTransformControls(ThreeScene.getTransformControls().object);
    }

    if (thumbnailDataUrl) {
        ProjectManager.updateLevelThumbnail(ProjectManager.getActiveLevelPath(), thumbnailDataUrl); // Pass path
        ScriptEngine.customConsole.log(`Thumbnail captured for level "${levelDisplayName}".`);
    } else {
        ScriptEngine.customConsole.error("Failed to capture thumbnail.");
    }
    // populateLevelListUI(); // Called by ProjectManager.updateLevelThumbnail
}

export function populateLevelListUI() {
    const levelPaths = ProjectManager.getAllLevelPaths();
    const activeLevelPath = ProjectManager.getActiveLevelPath();
    const activeLevelFileContent = activeLevelPath ? FileManager.loadFile(activeLevelPath) : null;

    DOM.levelListDiv.innerHTML = '';
    const activeLevelDisplayName = activeLevelFileContent?.levelName || activeLevelPath?.substring(activeLevelPath.lastIndexOf('/') + 1) || 'None';
    DOM.activeLevelDisplay.textContent = `(Active: ${activeLevelDisplayName})`;

    if (levelPaths.length === 0) {
        const p = document.createElement('p');
        p.textContent = "No levels in this project yet. Click 'New Level' to start.";
        p.style.fontSize = "0.8em";
        p.style.color = "#777";
        DOM.levelListDiv.appendChild(p);
        return;
    }

    levelPaths.forEach((path) => {
        const levelContent = FileManager.loadFile(path);
        if (!levelContent) {
            console.error(`Could not load level content for path: ${path}`);
            return;
        }

        const itemDiv = document.createElement('div');
        itemDiv.classList.add('level-item');
        itemDiv.dataset.levelPath = path; // Store full path
        if (path === activeLevelPath) {
            itemDiv.classList.add('active-level');
        }

        const thumbnailImg = document.createElement('img');
        thumbnailImg.classList.add('level-thumbnail');
        if (levelContent.thumbnailDataUrl) {
            thumbnailImg.src = levelContent.thumbnailDataUrl;
        } else {
            thumbnailImg.classList.add('placeholder');
            thumbnailImg.alt = DEFAULT_THUMBNAIL_PLACEHOLDER_TEXT;
            // To display text in placeholder, create a div instead or overlay text
        }
         // Use placeholder div logic from original if image src is not set
        if (levelContent.thumbnailDataUrl) {
            itemDiv.appendChild(thumbnailImg);
        } else {
            const placeholderDiv = document.createElement('div');
            placeholderDiv.classList.add('level-thumbnail', 'placeholder');
            placeholderDiv.textContent = DEFAULT_THUMBNAIL_PLACEHOLDER_TEXT;
            itemDiv.appendChild(placeholderDiv);
        }


        const nameSpan = document.createElement('span');
        nameSpan.classList.add('level-name');
        nameSpan.textContent = levelContent.levelName || path.substring(path.lastIndexOf('/') + 1);
        nameSpan.title = path; // Show full path on hover
        itemDiv.appendChild(nameSpan);

        const controlsDiv = document.createElement('div');
        controlsDiv.classList.add('level-item-controls');

        const switchBtn = document.createElement('button');
        switchBtn.textContent = 'Switch';
        switchBtn.classList.add('switch-level-btn');
        switchBtn.title = "Make this the active level";
        switchBtn.disabled = (path === activeLevelPath);
        controlsDiv.appendChild(switchBtn);
        
        const captureBtn = document.createElement('button');
        captureBtn.textContent = 'Thumb';
        captureBtn.classList.add('capture-thumbnail-btn');
        captureBtn.title = "Capture Thumbnail (makes level active if not already)";
        controlsDiv.appendChild(captureBtn);

        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.classList.add('rename-level-btn');
        controlsDiv.appendChild(renameBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Del';
        deleteBtn.classList.add('delete-level-btn');
        deleteBtn.disabled = levelPaths.length <= 1;
        controlsDiv.appendChild(deleteBtn);

        itemDiv.appendChild(controlsDiv);
        DOM.levelListDiv.appendChild(itemDiv);
    });
}

export function updateSceneSettingsDisplay() {
    const activeLevelContent = ProjectManager.getActiveLevelFileContent();
    if (activeLevelContent && activeLevelContent.sceneData) {
        DOM.propBgColorInput.value = activeLevelContent.sceneData.sceneBackgroundColor || '#000000';
    } else {
        DOM.propBgColorInput.value = '#000000';
    }
    UIManager.populatePropertiesPanel();
}