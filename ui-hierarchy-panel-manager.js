import * as DOM from './dom-elements.js';
import * as ObjectManager from './object-manager.js';
import { getScene as getThreeSceneInstance } from './three-scene.js'; // Import to check parent

function renderObjectItem(object, depth, selectedObjName) {
    const item = document.createElement('div');
    item.textContent = object.name;
    item.classList.add('object-list-item');
    item.dataset.objectName = object.name;
    item.style.paddingLeft = `${depth * 15}px`; // Indentation for hierarchy

    if (selectedObjName && selectedObjName === object.name) {
        item.classList.add('selected');
    }
    return item;
}

function renderObjectTree(parentElement, objects, parentNode, depth, selectedObjName) {
    // Find children of the current parentNode
    const children = [];
    for (const name in objects) {
        if (objects[name].parent === parentNode) {
            children.push(objects[name]);
        }
    }
    // Sort children alphabetically by name for consistent order
    children.sort((a, b) => a.name.localeCompare(b.name));

    children.forEach(childObject => {
        const itemElement = renderObjectItem(childObject, depth, selectedObjName);
        parentElement.appendChild(itemElement);
        // Recursively render children of this childObject
        renderObjectTree(parentElement, objects, childObject, depth + 1, selectedObjName);
    });
}

export function updateObjectListUI() {
    const sceneObjectsMap = ObjectManager.getSceneObjects();
    const selectedObj = ObjectManager.getSelectedObject();
    const selectedObjName = selectedObj ? selectedObj.name : null;
    const mainThreeScene = getThreeSceneInstance();

    DOM.objectListDiv.innerHTML = '';

    const objectNames = Object.keys(sceneObjectsMap);

    if (objectNames.length === 0) {
        DOM.objectListDiv.textContent = "No objects in scene.";
    } else {
        // Start rendering from top-level objects (children of the main scene)
        renderObjectTree(DOM.objectListDiv, sceneObjectsMap, mainThreeScene, 0, selectedObjName);
    }
}

function setupObjectListInteraction() {
    DOM.objectListDiv.addEventListener('click', (event) => {
        const item = event.target.closest('.object-list-item');
        if (item && item.dataset.objectName) {
            const objectName = item.dataset.objectName;
            const sceneObjectsMap = ObjectManager.getSceneObjects();
            if (sceneObjectsMap[objectName]) {
                ObjectManager.setSelectedObjectAndUpdateUI(sceneObjectsMap[objectName]);
            }
        }
    });
}

export function initHierarchyPanelManager() {
    setupObjectListInteraction();
    updateObjectListUI(); // Initial population
}