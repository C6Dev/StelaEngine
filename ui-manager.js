import * as THREE from 'three'; 
import * as DOM from './dom-elements.js';
import * as ObjectManager from './object-manager.js';
import * as GameManager from './game-manager.js'; 

import * as TabManager from './ui-tab-manager.js';
import * as HierarchyPanelManager from './ui-hierarchy-panel-manager.js';
import * as PropertiesPanelManager from './ui-properties-panel-manager.js';
import * as ScriptEditorManager from './ui-script-editor-manager.js'; 
import * as ScriptComponentsManager from './ui-script-components-manager.js';
import * as VisualScriptEditorManager from './ui-visual-script-editor-manager.js'; 

export function initUIManager() {
    setupDropdowns();
    setupAddObjectButtons();
    
    TabManager.initTabManager();
    HierarchyPanelManager.initHierarchyPanelManager();
    ScriptComponentsManager.initScriptComponentsManager(); 
    PropertiesPanelManager.initPropertiesPanelManager();
    ScriptEditorManager.initScriptEditorManager();
    VisualScriptEditorManager.initVisualScriptEditorManager(); 

}

function setupDropdowns() {
    if (DOM.addObjectMenuBtn && DOM.addObjectDropdownContent) {
        DOM.addObjectMenuBtn.addEventListener('click', (event) => {
            if (GameManager.getIsPlaying()) return; 
            event.stopPropagation();
            const isVisible = DOM.addObjectDropdownContent.style.display === 'block';
            document.querySelectorAll('.dropdown-content').forEach(dc => dc.style.display = 'none');
            DOM.addObjectDropdownContent.style.display = isVisible ? 'none' : 'block';
        });

        window.addEventListener('click', (event) => {
            if (DOM.addObjectMenuBtn && !DOM.addObjectMenuBtn.contains(event.target) &&
                DOM.addObjectDropdownContent && !DOM.addObjectDropdownContent.contains(event.target)) {
                DOM.addObjectDropdownContent.style.display = 'none';
            }
        });
    }
}

function setupAddObjectButtons() {
    DOM.addCubeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (GameManager.getIsPlaying()) return;
        ObjectManager.addSceneObject('cube');
        if (DOM.addObjectDropdownContent) DOM.addObjectDropdownContent.style.display = 'none';
    });
    DOM.addSphereBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (GameManager.getIsPlaying()) return;
        ObjectManager.addSceneObject('sphere');
        if (DOM.addObjectDropdownContent) DOM.addObjectDropdownContent.style.display = 'none';
    });
    DOM.addCylinderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (GameManager.getIsPlaying()) return;
        ObjectManager.addSceneObject('cylinder');
        if (DOM.addObjectDropdownContent) DOM.addObjectDropdownContent.style.display = 'none';
    });
}

export function setPlayModeUI(isPlaying) {
    if (isPlaying) {
        DOM.playGameBtn.style.display = 'none';
        DOM.stopGameBtn.style.display = 'inline-block';
        DOM.addObjectMenuBtn.disabled = true;
        const propInputs = DOM.propertiesPanel.querySelectorAll('input, select, button:not(#stop-game-btn)');
        propInputs.forEach(input => input.disabled = true);
        DOM.objectTransformGroup.classList.add('disabled');
        DOM.objectNameGroup.classList.add('disabled');
        DOM.objectScriptsGroup.classList.add('disabled');
        DOM.objectCameraGroup.classList.add('disabled');
        DOM.deleteObjectBtn.disabled = true;

        DOM.leftPanel.style.pointerEvents = 'none';
        DOM.leftPanel.style.opacity = '0.7';
        DOM.bottomPanel.style.pointerEvents = 'none'; 
        DOM.bottomPanel.style.opacity = '0.7';
    } else {
        DOM.playGameBtn.style.display = 'inline-block';
        DOM.stopGameBtn.style.display = 'none';
        DOM.addObjectMenuBtn.disabled = false;
        const propInputs = DOM.propertiesPanel.querySelectorAll('input, select, button');
        propInputs.forEach(input => input.disabled = false);
        DOM.objectTransformGroup.classList.remove('disabled');
        DOM.objectNameGroup.classList.remove('disabled');
        DOM.objectScriptsGroup.classList.remove('disabled');
        DOM.objectCameraGroup.classList.remove('disabled');
        DOM.deleteObjectBtn.disabled = false;
        
        DOM.leftPanel.style.pointerEvents = 'auto';
        DOM.leftPanel.style.opacity = '1';
        DOM.bottomPanel.style.pointerEvents = 'auto';
        DOM.bottomPanel.style.opacity = '1';

        PropertiesPanelManager.populatePropertiesPanel();
    }
}

export const populatePropertiesPanel = PropertiesPanelManager.populatePropertiesPanel;
export const updateObjectListUI = HierarchyPanelManager.updateObjectListUI;
export const handleScriptDeleted = ScriptEditorManager.handleScriptDeleted; 