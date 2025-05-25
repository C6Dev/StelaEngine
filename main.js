import * as ThreeScene from './three-scene.js';
import * as ObjectManager from './object-manager.js';
import * as UIManager from './ui-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as DOM from './dom-elements.js';
import * as THREE from 'three';
import * as GameManager from './game-manager.js';
import * as VisualScriptEditorManager from './ui-visual-script-editor-manager.js';
import * as FileManager from './file-manager.js';
import * as ProjectManager from './project-manager.js';
// import * as LevelDataManager from './level-data-manager.js'; // Not directly used in main after refactor
import * as ProjectStateCoordinator from './project-state-coordinator.js';
import * as UILevelManager from './ui-level-manager.js'; 
// import * as ScriptComponentsManager from './ui-script-components-manager.js'; // UIManager calls its init
import * as UIProjectFilesManager from './ui-project-files-manager.js';
// import * as UIProjectFilesInteraction from './ui-project-files-interaction.js'; // UIProjectFilesManager handles its init
// import * as UIModelEditorManager from './ui-model-editor-manager.js'; // UIManager calls its init
import * as GltfLoaderManager from './gltf-loader-manager.js';
// import * as SceneSerializer from './scene-serializer.js'; // Not directly used in main after refactor

const keyStates = {};
let gameLoopId = null;

function init() {
    GameManager.initGameManager();
    ScriptEngine.initScriptEngine(keyStates, GameManager.getGameContext);

    ThreeScene.initThreeScene();
    GltfLoaderManager.initGltfLoaderManager();
    
    const objectManagerCallbacks = {
        populatePropertiesPanel: UIManager.populatePropertiesPanel,
        updateObjectListUI: UIManager.updateObjectListUI,
        refreshCameraTarget: (objectName) => {
            if (GameManager.getIsPlaying() && !GameManager.getIsCameraEjected()) {
                const sceneObjectsMap = ObjectManager.getSceneObjects();
                ThreeScene.setCameraTarget(objectName ? sceneObjectsMap[objectName] : null);
            }
        },
        onObjectTransformedByGizmo: () => {
            UIManager.populatePropertiesPanel();
            ProjectManager.markProjectDirty();
        }
    };
    ObjectManager.initObjectManager(objectManagerCallbacks);

    const fileManagerHooks = {
        refreshProjectFilesList: (projectName) => {
            if (UIProjectFilesManager.populateProjectFilesList) {
                 UIProjectFilesManager.populateProjectFilesList();
            }
        },
        clearEditorForDeletedFile: (filePath, fileTypeKey) => {
            if (UIProjectFilesManager.handleExternalFileDeletion) {
                UIProjectFilesManager.handleExternalFileDeletion(filePath, fileTypeKey);
            }
        }
    };
    FileManager.initFileManager(fileManagerHooks, ScriptEngine.getCustomConsole());

    UIManager.initUIManager(); 

    const projectManagerCallbacks = {
        populateProjectFilesList: UIProjectFilesManager.populateProjectFilesList,
        updateSceneSettingsDisplay: UILevelManager.updateSceneSettingsDisplay,
        updateProjectNameDisplay: (name) => {
            DOM.currentProjectDisplay.textContent = `Project: ${name || 'Untitled'}`;
            document.title = `Stela - ${name || 'Untitled'}`;
        }
    };
    ProjectManager.initProjectManager(projectManagerCallbacks);


    const activeVSGraph = VisualScriptEditorManager.getActiveVisualScriptGraph();
    if (activeVSGraph) {
        activeVSGraph.setContext(
            ObjectManager.getSelectedObject(),
            ObjectManager.getSceneObjects(),
            keyStates,
            GameManager.getGameContext(),
            ScriptEngine.customConsole
        );
    }

    setupGlobalEventListeners();
    animate();
}

function setupGlobalEventListeners() {
    window.addEventListener('keydown', (event) => {
        keyStates[event.code.toUpperCase()] = true;
        keyStates[event.key.toUpperCase()] = true;

        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');
        const isViewerFocused = DOM.viewerContainer.contains(activeElement) || activeElement === DOM.viewerContainer;
        const isLeftPanelFocused = DOM.leftPanel.contains(activeElement);
        const isRightPanelFocused = DOM.rightPanel.contains(activeElement);
        const isBottomPanelFocused = DOM.bottomPanel.contains(activeElement);
        const isVisualScriptGraphFocused = DOM.visualScriptGraphContainer && DOM.visualScriptGraphContainer.contains(activeElement);

        let allowShortcuts = false;
        if (isInputFocused) {
            if (activeElement === DOM.vsNodeContextMenuSearch) {
                allowShortcuts = false;
            } else {
                allowShortcuts = false; 
            }
        } else {
             allowShortcuts = true; 
        }

        if (!GameManager.getIsPlaying() && allowShortcuts) {
            if (event.key === 'w' || event.key === 'W' ||
                event.key === 'e' || event.key === 'E' ||
                event.key === 'r' || event.key === 'R' ||
                event.key === 'Delete' || event.key === 'Backspace') { 
                event.preventDefault(); 
            }

            if (event.key === 'w' || event.key === 'W') {
                DOM.gizmoTranslateBtn.click();
            } else if (event.key === 'e' || event.key === 'E') {
                DOM.gizmoRotateBtn.click();
            } else if (event.key === 'r' || event.key === 'R') {
                DOM.gizmoScaleBtn.click();
            } else if ((event.key === 'Delete' || event.key === 'Backspace') && ObjectManager.getSelectedObject()) {
                 if (DOM.deleteObjectBtn && !DOM.deleteObjectBtn.disabled) {
                    DOM.deleteObjectBtn.click();
                 }
            }
        }
        if (GameManager.getIsPlaying()) {
            if (event.code === 'Space' && allowShortcuts) { 
            }
        }
    });

    window.addEventListener('keyup', (event) => {
        keyStates[event.code.toUpperCase()] = false;
        keyStates[event.key.toUpperCase()] = false;
    });

    DOM.playGameBtn.addEventListener('click', GameManager.startGame);
    DOM.stopGameBtn.addEventListener('click', GameManager.stopGame);
    DOM.ejectCameraBtn.addEventListener('click', GameManager.ejectCamera);

    ThreeScene.getTransformControls().addEventListener('mouseDown', () => {
        if (!ObjectManager.getSelectedObject() && ThreeScene.getTransformControls().object) {
            ObjectManager.setSelectedObjectAndUpdateUI(ThreeScene.getTransformControls().object);
        }
    });

    DOM.viewerContainer.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return;
        if (ThreeScene.getControls().enabled && ThreeScene.getControls()._isDragging) return; 
        if (ThreeScene.getTransformControls().dragging) return;
        if (GameManager.getIsPlaying()) return;

        const mouse = ThreeScene.getMouse();
        const rect = ThreeScene.getRenderer().domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        ThreeScene.getRaycaster().setFromCamera(mouse, ThreeScene.getCamera());
        
        const sceneObjectsMap = ObjectManager.getSceneObjects();
        const intersectableObjects = Object.values(sceneObjectsMap);

        const intersects = ThreeScene.getRaycaster().intersectObjects(intersectableObjects, true); 

        if (intersects.length > 0) {
            let clickedObject = null;
            for (let i = 0; i < intersects.length; i++) {
                let intersected = intersects[i].object;
                while (intersected) {
                    if (ObjectManager.getSceneObjects()[intersected.name] === intersected) {
                        clickedObject = intersected;
                        break;
                    }
                    if (!intersected.parent || intersected.parent === ThreeScene.getScene()) break; 
                    intersected = intersected.parent;
                }
                if (clickedObject) break;
            }

            if(!clickedObject && intersects[0].object && ObjectManager.getSceneObjects()[intersects[0].object.name] === intersects[0].object) {
                clickedObject = intersects[0].object;
            }

            if (clickedObject) {
                if (ObjectManager.getSelectedObject() !== clickedObject) {
                    ObjectManager.setSelectedObjectAndUpdateUI(clickedObject);
                }
            } else {
                if (!event.shiftKey) { 
                    ObjectManager.setSelectedObjectAndUpdateUI(null);
                }
            }
        } else {
            if (!event.shiftKey) {
                ObjectManager.setSelectedObjectAndUpdateUI(null);
            }
        }
    });

    window.addEventListener('resize', ThreeScene.onWindowResizeThree, false);
}

function animate() {
    gameLoopId = requestAnimationFrame(animate);

    if (GameManager.getIsPlaying()) {
        const gameContextForVS = GameManager.getGameContext();
        
        const allObjects = ObjectManager.getSceneObjects();
        for (const objectName in allObjects) {
            const currentGameObject = allObjects[objectName];
            if (currentGameObject.userData && currentGameObject.userData.scripts) {
                currentGameObject.userData.scripts.forEach(scriptPath => {
                    if (scriptPath.endsWith(FileManager.FILE_TYPES.VISUAL_SCRIPT.extension)) {
                        const vsData = FileManager.loadVisualScript(scriptPath, false);
                        if (vsData) {
                            const tempGraph = new (VisualScriptEditorManager.getActiveVisualScriptGraph().constructor)(); 
                            tempGraph.loadState(vsData);
                            tempGraph.setContext(currentGameObject, allObjects, keyStates, gameContextForVS, ScriptEngine.customConsole);
                            if (GameManager.isFirstPlayFrameTrue()) {
                                tempGraph.executeEvent('event-start');
                            }
                            tempGraph.executeEvent('event-update');
                            tempGraph.executeEvent('event-key-input'); 
                            tempGraph.destroy(); 
                        }
                    }
                });
            }
        }

        ScriptEngine.executeComponentScripts(); 

        if (!GameManager.getIsCameraEjected()) {
            ThreeScene.updateCameraFollow();
        }

        if (GameManager.isFirstPlayFrameTrue()) {
            GameManager.consumeFirstPlayFrameFlag();
        }

    } else {
        ThreeScene.getControls().update();
    }

    ThreeScene.renderThreeScene();
}

document.addEventListener('DOMContentLoaded', init);