// ui-project-files-dom.js
import * as DOM from './dom-elements.js';
import { FILE_TYPES } from './file-manager.js'; // For FILE_TYPES access

export function createLevelSectionHeaderDOM() {
    const levelHeaderDiv = document.createElement('div');
    levelHeaderDiv.id = 'level-file-list-header';
    levelHeaderDiv.className = 'script-file-list-header';
    levelHeaderDiv.innerHTML = `
        <h4>Levels <span id="active-level-display-project-files" class="active-level-indicator"></span></h4>
        <button data-action="new-level" class="create-new-script-btn">New Level...</button>
    `;
    return levelHeaderDiv;
}

export function createFileSectionHeaderDOM(descriptionKey, typeKey) {
    const typeHeader = document.createElement('div');
    typeHeader.className = 'script-file-type-header';

    const headerContent = document.createElement('span');
    headerContent.textContent = descriptionKey;
    typeHeader.appendChild(headerContent);

    if (typeKey === 'STELA_SCRIPT' || typeKey === 'VISUAL_SCRIPT') {
        const newScriptBtn = document.createElement('button');
        newScriptBtn.textContent = "New...";
        newScriptBtn.classList.add('create-new-script-btn');
        newScriptBtn.style.marginLeft = 'auto';
        newScriptBtn.dataset.action = "new-file";
        newScriptBtn.dataset.typeKey = typeKey;
        typeHeader.appendChild(newScriptBtn);
        typeHeader.style.display = 'flex';
        typeHeader.style.alignItems = 'center';
    }
    return typeHeader;
}

export function createSeparatorDOM() {
    const hr = document.createElement('hr');
    hr.className = 'project-content-separator';
    return hr;
}

/**
 * Creates a DOM element for a single project file item.
 * @param {string} filePath - The path of the file.
 * @param {string} fileTypeKey - The key for the file type (e.g., 'LEVEL', 'STELA_SCRIPT').
 * @param {object} itemData - Object containing data for display (name, thumbnail, active status, etc.).
 * @param {string} itemData.displayName - The name to display for the file.
 * @param {string} itemData.fullPathTitle - The title attribute for the name span (usually full path).
 * @param {boolean} itemData.isLevelActive - True if the level is the currently active one.
 * @param {string} [itemData.thumbnailDataUrl] - Data URL for level thumbnail.
 * @param {boolean} itemData.canDelete - Whether the delete button should be enabled.
 * @param {boolean} itemData.isSelected - Whether this item should be highlighted as selected/open.
 * @returns {HTMLElement} The created DOM element for the file item.
 */
export function createProjectFileItemDOM(filePath, fileTypeKey, itemData) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('script-file-item');
    itemDiv.dataset.filePath = filePath;
    itemDiv.dataset.fileTypeKey = fileTypeKey;

    const fileTypeInfo = FILE_TYPES[fileTypeKey] || { emoji: '❓', description: 'Unknown File' };

    if (fileTypeKey === 'LEVEL') {
        const thumbnailImgContainer = document.createElement('div');
        thumbnailImgContainer.classList.add('level-thumbnail-container');

        if (itemData.thumbnailDataUrl) {
            const thumbnailImg = document.createElement('img');
            thumbnailImg.classList.add('level-thumbnail-small');
            thumbnailImg.src = itemData.thumbnailDataUrl;
            thumbnailImgContainer.appendChild(thumbnailImg);
        } else {
            const placeholderDiv = document.createElement('div');
            placeholderDiv.classList.add('level-thumbnail-small', 'placeholder');
            placeholderDiv.textContent = fileTypeInfo.emoji;
            thumbnailImgContainer.appendChild(placeholderDiv);
        }
        itemDiv.appendChild(thumbnailImgContainer);
    } else {
        const iconSpan = document.createElement('span');
        iconSpan.classList.add('script-type-icon');
        iconSpan.textContent = fileTypeInfo.emoji;
        iconSpan.title = fileTypeInfo.description;
        itemDiv.appendChild(iconSpan);
    }

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('file-name-span');
    nameSpan.textContent = itemData.displayName;
    nameSpan.title = itemData.fullPathTitle;
    nameSpan.dataset.action = "open-file";
    nameSpan.dataset.filePath = filePath; // Redundant but clear for event target
    nameSpan.dataset.fileTypeKey = fileTypeKey; // Redundant but clear
    itemDiv.appendChild(nameSpan);

    const controlsDiv = document.createElement('div');
    controlsDiv.classList.add('script-item-controls');

    if (fileTypeKey === 'LEVEL') {
        const captureBtn = document.createElement('button');
        captureBtn.innerHTML = "&#128247;"; // Camera emoji
        captureBtn.classList.add('control-btn-small');
        captureBtn.title = "Capture Thumbnail (makes level active if not already)";
        captureBtn.dataset.action = "capture-thumbnail";
        captureBtn.dataset.filePath = filePath;
        controlsDiv.appendChild(captureBtn);

        const switchBtn = document.createElement('button');
        switchBtn.innerHTML = "&#128279;"; // Link emoji
        switchBtn.classList.add('control-btn-small');
        switchBtn.title = "Make this the active level";
        switchBtn.disabled = itemData.isLevelActive;
        switchBtn.dataset.action = "switch-active-level";
        switchBtn.dataset.filePath = filePath;
        controlsDiv.appendChild(switchBtn);
    }

    const renameBtn = document.createElement('button');
    renameBtn.innerHTML = "&#9998;"; // Pencil emoji
    renameBtn.classList.add('control-btn-small');
    renameBtn.title = `Rename ${fileTypeInfo.description}`;
    renameBtn.dataset.action = "rename-file";
    renameBtn.dataset.filePath = filePath;
    renameBtn.dataset.fileTypeKey = fileTypeKey;
    controlsDiv.appendChild(renameBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = "&#128465;"; // Trash can emoji
    deleteBtn.classList.add('control-btn-small', 'delete-btn-small');
    deleteBtn.title = `Delete ${fileTypeInfo.description}`;
    deleteBtn.disabled = !itemData.canDelete;
    if (!itemData.canDelete && fileTypeKey === 'LEVEL') {
        deleteBtn.title = "Cannot delete the last level.";
    }
    deleteBtn.dataset.action = "delete-file";
    deleteBtn.dataset.filePath = filePath;
    deleteBtn.dataset.fileTypeKey = fileTypeKey;
    controlsDiv.appendChild(deleteBtn);

    itemDiv.appendChild(controlsDiv);

    if (itemData.isSelected) {
        itemDiv.classList.add('selected-script');
    }
    return itemDiv;
}
