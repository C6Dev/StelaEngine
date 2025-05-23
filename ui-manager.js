import * as THREE from 'three';
import * as DOM from './dom-elements.js';
import * as ObjectManager from './object-manager.js';
import * as GameManager from './game-manager.js';
import * as ThreeScene from './three-scene.js';
import * as ProjectManager from './project-manager.js';

import * as TabManager from './ui-tab-manager.js';
import * as HierarchyPanelManager from './ui-hierarchy-panel-manager.js';
import * as PropertiesPanelManager from './ui-properties-panel-manager.js';
import * as ScriptEditorManager from './ui-script-editor-manager.js';
import * as ScriptComponentsManager from './ui-script-components-manager.js';
import * as VisualScriptEditorManager from './ui-visual-script-editor-manager.js';
import * as UIProjectFilesManager from './ui-project-files-manager.js';

export function initUIManager() {
    setupDropdowns();
    setupAddObjectButtons();
    setupGizmoControls();

    TabManager.initTabManager();
    HierarchyPanelManager.initHierarchyPanelManager();
    ScriptComponentsManager.initScriptComponentsManager();
    PropertiesPanelManager.initPropertiesPanelManager();
    ScriptEditorManager.initScriptEditorManager();
    VisualScriptEditorManager.initVisualScriptEditorManager();
}

function setupDropdowns() {
    const allDropdownBtns = document.querySelectorAll('.dropdown-btn');
    const allDropdownContents = document.querySelectorAll('.dropdown-content');

    allDropdownBtns.forEach(btn => {
        btn.addEventListener('click', (event) => {
            if (GameManager.getIsPlaying() && btn !== DOM.fileMenuBtn) return;
            event.stopPropagation();
            const content = btn.nextElementSibling;
            const isVisible = content.style.display === 'block';
            
            allDropdownContents.forEach(dc => dc.style.display = 'none');
            if (content) content.style.display = isVisible ? 'none' : 'block';
        });
    });

    window.addEventListener('click', (event) => {
        let clickedInsideDropdown = false;
        allDropdownBtns.forEach(btn => {
            if (btn.contains(event.target)) clickedInsideDropdown = true;
        });
        allDropdownContents.forEach(content => {
            if (content.contains(event.target)) clickedInsideDropdown = true;
        });

        if (!clickedInsideDropdown) {
            allDropdownContents.forEach(dc => dc.style.display = 'none');
        }
    });
}

function setupAddObjectButtons() {
    DOM.addCubeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (GameManager.getIsPlaying()) return;
        ObjectManager.addSceneObject('cube');
        ProjectManager.markProjectDirty();
        if (DOM.addObjectDropdownContent) DOM.addObjectDropdownContent.style.display = 'none';
    });
    DOM.addSphereBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (GameManager.getIsPlaying()) return;
        ObjectManager.addSceneObject('sphere');
        ProjectManager.markProjectDirty();
        if (DOM.addObjectDropdownContent) DOM.addObjectDropdownContent.style.display = 'none';
    });
    DOM.addCylinderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (GameManager.getIsPlaying()) return;
        ObjectManager.addSceneObject('cylinder');
        ProjectManager.markProjectDirty();
        if (DOM.addObjectDropdownContent) DOM.addObjectDropdownContent.style.display = 'none';
    });
}

function setupGizmoControls() {
    const gizmoButtons = [
        DOM.gizmoTranslateBtn,
        DOM.gizmoRotateBtn,
        DOM.gizmoScaleBtn
    ];

    const setGizmoMode = (mode) => {
        ThreeScene.setTransformControlsMode(mode);
        gizmoButtons.forEach(btn => btn.classList.remove('active-gizmo-btn'));
        if (mode === 'translate') DOM.gizmoTranslateBtn.classList.add('active-gizmo-btn');
        else if (mode === 'rotate') DOM.gizmoRotateBtn.classList.add('active-gizmo-btn');
        else if (mode === 'scale') DOM.gizmoScaleBtn.classList.add('active-gizmo-btn');
    };

    DOM.gizmoTranslateBtn.addEventListener('click', () => setGizmoMode('translate'));
    DOM.gizmoRotateBtn.addEventListener('click', () => setGizmoMode('rotate'));
    DOM.gizmoScaleBtn.addEventListener('click', () => setGizmoMode('scale'));

    setGizmoMode('translate');
}

export function setPlayModeUI(isPlaying) {
    const elementsToDisableInPlay = [
        DOM.addObjectMenuBtn, DOM.deleteObjectBtn,
        DOM.gizmoTranslateBtn, DOM.gizmoRotateBtn, DOM.gizmoScaleBtn,
    ];
    const panelsToFade = [DOM.leftPanel, DOM.rightPanel, DOM.bottomPanel];

    if (isPlaying) {
        DOM.playGameBtn.style.display = 'none';
        DOM.stopGameBtn.style.display = 'inline-block';
        DOM.ejectCameraBtn.style.display = 'inline-block';
        DOM.ejectCameraBtn.disabled = GameManager.getIsCameraEjected();

        elementsToDisableInPlay.forEach(el => el.disabled = true);
        panelsToFade.forEach(panel => {
            panel.style.pointerEvents = 'none';
            panel.style.opacity = '0.7';
        });
        const propInputs = DOM.propertiesPanel.querySelectorAll('input, select, button');
        propInputs.forEach(input => input.disabled = true);

        if (ThreeScene.getTransformControls().object) {
            ThreeScene.detachTransformControls();
        }
    } else {
        DOM.playGameBtn.style.display = 'inline-block';
        DOM.stopGameBtn.style.display = 'none';
        DOM.ejectCameraBtn.style.display = 'none';

        elementsToDisableInPlay.forEach(el => el.disabled = false);
        panelsToFade.forEach(panel => {
            panel.style.pointerEvents = 'auto';
            panel.style.opacity = '1';
        });
        const propInputs = DOM.propertiesPanel.querySelectorAll('input, select, button');
        propInputs.forEach(input => input.disabled = false);

        const selectedObj = ObjectManager.getSelectedObject();
        if (selectedObj) {
            ThreeScene.attachTransformControls(selectedObj);
        }
        PropertiesPanelManager.populatePropertiesPanel();
    }

    DOM.fileMenuBtn.disabled = false;
}

export const populatePropertiesPanel = PropertiesPanelManager.populatePropertiesPanel;
export const updateObjectListUI = HierarchyPanelManager.updateObjectListUI;

export const populateScriptFileList = () => {
    if (UIProjectFilesManager.getPopulateScriptFileListFunction) {
        UIProjectFilesManager.getPopulateScriptFileListFunction()();
    } else {
        console.warn("UIProjectFilesManager.getPopulateScriptFileListFunction not available.");
    }
};

export const handleScriptDeletedInEditor = (scriptName, scriptType) => {
    if (scriptType === 'text') {
        ScriptEditorManager.handleScriptDeleted(scriptName, 'text');
    } else if (scriptType === 'visual') {
        VisualScriptEditorManager.handleExternalVisualScriptDeletion(scriptName);
    }
    populateScriptFileList();
};