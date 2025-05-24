import * as DOM from './dom-elements.js';
import * as ThreeScene from './three-scene.js';
import * as VisualScriptEditorManager from './ui-visual-script-editor-manager.js';
import * as UIModelEditorManager from './ui-model-editor-manager.js';

let activeCenterTab = 'scene';
let activeBottomTab = 'project';

export function setupCenterTabs() {
    DOM.sceneTabBtn.addEventListener('click', () => switchCenterTab('scene'));
    DOM.scriptEditorTabBtn.addEventListener('click', () => switchCenterTab('script'));
    DOM.visualScriptEditorTabBtn.addEventListener('click', () => switchCenterTab('visual-script'));
    DOM.modelEditorTabBtn.addEventListener('click', () => switchCenterTab('model-editor'));
}

export function switchCenterTab(tabName) {
    [DOM.sceneTabBtn, DOM.scriptEditorTabBtn, DOM.visualScriptEditorTabBtn, DOM.modelEditorTabBtn].forEach(btn => btn.classList.remove('active'));
    [DOM.sceneViewContent, DOM.scriptEditorContent, DOM.visualScriptEditorContent, DOM.modelEditorContent].forEach(content => content.classList.remove('active'));

    activeCenterTab = tabName;

    if (tabName === 'scene') {
        DOM.sceneTabBtn.classList.add('active');
        DOM.sceneViewContent.classList.add('active');
        ThreeScene.onWindowResizeThree();
    } else if (tabName === 'script') {
        DOM.scriptEditorTabBtn.classList.add('active');
        DOM.scriptEditorContent.classList.add('active');
    } else if (tabName === 'visual-script') {
        DOM.visualScriptEditorTabBtn.classList.add('active');
        DOM.visualScriptEditorContent.classList.add('active');
        VisualScriptEditorManager.onTabFocus();
    } else if (tabName === 'model-editor') {
        DOM.modelEditorTabBtn.classList.add('active');
        DOM.modelEditorContent.classList.add('active');
        UIModelEditorManager.onTabFocus();
    }
}

export function getActiveCenterTab() {
    return activeCenterTab;
}

export function setupBottomTabs() {
    DOM.projectTabBtn.addEventListener('click', () => switchBottomTab('project'));
    DOM.consoleTabBtn.addEventListener('click', () => switchBottomTab('console'));
}

export function switchBottomTab(tabName) {
    [DOM.projectTabBtn, DOM.consoleTabBtn].forEach(btn => btn.classList.remove('active'));
    [DOM.projectContent, DOM.consoleContent].forEach(content => content.classList.remove('active'));

    activeBottomTab = tabName;

    if (tabName === 'project') {
        DOM.projectTabBtn.classList.add('active');
        DOM.projectContent.classList.add('active');
    } else if (tabName === 'console') {
        DOM.consoleTabBtn.classList.add('active');
        DOM.consoleContent.classList.add('active');
    }
}

export function getActiveBottomTab() {
    return activeBottomTab;
}

export function initTabManager() {
    setupCenterTabs();
    setupBottomTabs();
    switchCenterTab(activeCenterTab);
    switchBottomTab(activeBottomTab);
}