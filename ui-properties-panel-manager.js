import * as THREE from 'three'; // For MathUtils
import * as DOM from './dom-elements.js';
import * as ObjectManager from './object-manager.js';
import * as ScriptComponentsManager from './ui-script-components-manager.js';
import * as GameManager from './game-manager.js';
import { getScene as getThreeSceneInstance } from './three-scene.js';

function getPotentialParents(selectedObj) {
    const allObjects = ObjectManager.getSceneObjects();
    const potentialParents = [];

    // Function to check if 'obj' is a descendant of 'ancestor'
    function isDescendant(obj, ancestor) {
        let current = obj.parent;
        while (current && current !== getThreeSceneInstance()) {
            if (current === ancestor) return true;
            current = current.parent;
        }
        return false;
    }

    for (const name in allObjects) {
        if (allObjects[name] === selectedObj) continue; // Cannot parent to self
        if (isDescendant(allObjects[name], selectedObj)) continue; // Cannot parent to one of its own children/descendants
        potentialParents.push(name);
    }
    return potentialParents.sort();
}

export function populatePropertiesPanel() {
    const selectedObject = ObjectManager.getSelectedObject();
    const isPlaying = GameManager.getIsPlaying();

    if (selectedObject) {
        DOM.selectedObjectIndicator.textContent = `Selected: ${selectedObject.name}`;
        DOM.objectNameGroup.style.display = 'block';
        DOM.objectParentingGroup.style.display = 'block'; // Show parenting group
        DOM.objectTransformGroup.style.display = 'block';
        DOM.objectCameraGroup.style.display = 'block'; 
        DOM.objectScriptsGroup.style.display = 'block'; 
        DOM.deleteObjectBtn.style.display = 'block';

        DOM.propNameInput.value = selectedObject.name;

        // Populate Parent Dropdown
        DOM.propParentSelect.innerHTML = '';
        const noneOption = document.createElement('option');
        noneOption.value = "None";
        noneOption.textContent = "None (Scene Root)";
        DOM.propParentSelect.appendChild(noneOption);

        const potentialParents = getPotentialParents(selectedObject);
        potentialParents.forEach(parentName => {
            const option = document.createElement('option');
            option.value = parentName;
            option.textContent = parentName;
            DOM.propParentSelect.appendChild(option);
        });
        
        const currentParent = selectedObject.parent;
        if (currentParent && currentParent !== getThreeSceneInstance() && currentParent.name && ObjectManager.getSceneObjects()[currentParent.name]) {
            DOM.propParentSelect.value = currentParent.name;
        } else {
            DOM.propParentSelect.value = "None";
        }

        DOM.propPosXInput.value = selectedObject.position.x.toFixed(2);
        DOM.propPosYInput.value = selectedObject.position.y.toFixed(2);
        DOM.propPosZInput.value = selectedObject.position.z.toFixed(2);

        DOM.propRotXInput.value = THREE.MathUtils.radToDeg(selectedObject.rotation.x).toFixed(1);
        DOM.propRotYInput.value = THREE.MathUtils.radToDeg(selectedObject.rotation.y).toFixed(1);
        DOM.propRotZInput.value = THREE.MathUtils.radToDeg(selectedObject.rotation.z).toFixed(1);

        DOM.propScaleXInput.value = selectedObject.scale.x.toFixed(2);
        DOM.propScaleYInput.value = selectedObject.scale.y.toFixed(2);
        DOM.propScaleZInput.value = selectedObject.scale.z.toFixed(2);

        // Populate Camera Attachment UI
        const activeCameraObjName = ObjectManager.getActiveCameraObjectName();
        if (activeCameraObjName === selectedObject.name) {
            DOM.cameraAttachmentStatusDiv.textContent = "This object IS the Active Game Camera.";
            DOM.setActiveCameraBtn.style.display = 'none';
            DOM.clearActiveCameraBtn.style.display = 'block';
        } else {
            DOM.cameraAttachmentStatusDiv.textContent = activeCameraObjName 
                ? `Active Game Camera: ${activeCameraObjName}` 
                : "No object is set as Active Game Camera.";
            DOM.setActiveCameraBtn.style.display = 'block';
            DOM.clearActiveCameraBtn.style.display = 'none';
        }
        
        ScriptComponentsManager.populateAvailableScriptsDropdown(); 
        ScriptComponentsManager.populateScriptComponentListUI(selectedObject);

    } else {
        DOM.selectedObjectIndicator.textContent = "No object selected.";
        DOM.objectNameGroup.style.display = 'none';
        DOM.objectParentingGroup.style.display = 'none'; // Hide parenting group
        DOM.objectTransformGroup.style.display = 'none';
        DOM.objectCameraGroup.style.display = 'none'; 
        DOM.objectScriptsGroup.style.display = 'none'; 
        DOM.deleteObjectBtn.style.display = 'none';
    }

    // Disable inputs if playing
    const allPropInputs = [
        DOM.propNameInput, DOM.propParentSelect, // Added parent select
        DOM.propPosXInput, DOM.propPosYInput, DOM.propPosZInput,
        DOM.propRotXInput, DOM.propRotYInput, DOM.propRotZInput,
        DOM.propScaleXInput, DOM.propScaleYInput, DOM.propScaleZInput,
        DOM.availableScriptsDropdown, DOM.addScriptComponentBtn, DOM.deleteObjectBtn,
        DOM.setActiveCameraBtn, DOM.clearActiveCameraBtn
    ];
    const removeScriptBtns = DOM.scriptComponentListDiv.querySelectorAll('.remove-script-component-btn');
    
    allPropInputs.forEach(input => input.disabled = isPlaying);
    removeScriptBtns.forEach(btn => btn.disabled = isPlaying);

    [DOM.objectNameGroup, DOM.objectParentingGroup, DOM.objectTransformGroup, DOM.objectCameraGroup, DOM.objectScriptsGroup].forEach(group => {
        isPlaying ? group.classList.add('disabled') : group.classList.remove('disabled');
    });
}

function handleObjectNameChangeUI() {
    const selectedObject = ObjectManager.getSelectedObject();
    if (!selectedObject) return;
    ObjectManager.handleObjectNameChangeLogic(DOM.propNameInput.value, selectedObject.name);
}

function handleTransformChangeUI() {
    const selectedObject = ObjectManager.getSelectedObject();
    if (!selectedObject) return;

    const transforms = {
        position: {
            x: parseFloat(DOM.propPosXInput.value),
            y: parseFloat(DOM.propPosYInput.value),
            z: parseFloat(DOM.propPosZInput.value),
        },
        rotation: { //These are local rotations
            x: parseFloat(DOM.propRotXInput.value),
            y: parseFloat(DOM.propRotYInput.value),
            z: parseFloat(DOM.propRotZInput.value),
        },
        scale: { //These are local scales
            x: parseFloat(DOM.propScaleXInput.value),
            y: parseFloat(DOM.propScaleYInput.value),
            z: parseFloat(DOM.propScaleZInput.value),
        }
    };
    ObjectManager.handleTransformChangeLogic(transforms);
    // Re-populating after every minor input change causes cursor jumps.
    // The ObjectManager.handleTransformChangeLogic directly updates the object.
    // We might only need to re-populate if a script changes these values, or on deselection/selection.
}

function handleParentChangeUI() {
    if (GameManager.getIsPlaying()) return;
    const selectedObject = ObjectManager.getSelectedObject();
    const newParentName = DOM.propParentSelect.value;
    if (selectedObject) {
        ObjectManager.setObjectParent(selectedObject, newParentName === "None" ? null : newParentName);
        // setObjectParent calls updateObjectListUI and populatePropertiesPanel itself.
    }
}

function setupPropertiesPanelListeners() {
    DOM.propNameInput.addEventListener('change', handleObjectNameChangeUI);
    DOM.propNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); handleObjectNameChangeUI(); DOM.propNameInput.blur();} });

    DOM.propParentSelect.addEventListener('change', handleParentChangeUI); // New Listener

    const transformInputs = [
        DOM.propPosXInput, DOM.propPosYInput, DOM.propPosZInput,
        DOM.propRotXInput, DOM.propRotYInput, DOM.propRotZInput,
        DOM.propScaleXInput, DOM.propScaleYInput, DOM.propScaleZInput
    ];
    transformInputs.forEach(input => {
        input.addEventListener('change', handleTransformChangeUI);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') {e.preventDefault(); handleTransformChangeUI(); input.blur(); }});
    });

    DOM.deleteObjectBtn.addEventListener('click', () => {
        if (GameManager.getIsPlaying()) return;
        ObjectManager.deleteSelectedObjectLogic();
    });

    DOM.setActiveCameraBtn.addEventListener('click', () => {
        if (GameManager.getIsPlaying()) return;
        const selectedObject = ObjectManager.getSelectedObject();
        if (selectedObject) {
            ObjectManager.setActiveCameraObjectName(selectedObject.name);
        }
    });

    DOM.clearActiveCameraBtn.addEventListener('click', () => {
        if (GameManager.getIsPlaying()) return;
        ObjectManager.setActiveCameraObjectName(null);
    });
}

export function initPropertiesPanelManager() {
    setupPropertiesPanelListeners();
    populatePropertiesPanel(); // Initial population
}