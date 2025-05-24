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
import * as LevelDataManager from './level-data-manager.js';
import * as ProjectStateCoordinator from './project-state-coordinator.js';
import * as UILevelManager from './ui-level-manager.js';
import * as ScriptComponentsManager from './ui-script-components-manager.js';
import * as UIProjectFilesManager from './ui-project-files-manager.js';
import * as UIModelEditorManager from './ui-model-editor-manager.js';
import * as GltfLoaderManager from './gltf-loader-manager.js'; 
import * as SceneSerializer from './scene-serializer.js'; 

const keyStates = {};
let gameLoopId = null;

function init() {
    // Initialize modules with early dependencies first
    GameManager.initGameManager();
    // ScriptEngine needs keyStates and GameManager context getter
    ScriptEngine.initScriptEngine(keyStates, GameManager.getGameContext);

    // Initialize Three.js scene and related managers
    ThreeScene.initThreeScene();
    GltfLoaderManager.initGltfLoaderManager();

    // Initialize managers that build the UI and handle object/project state
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
            if (projectName === ProjectManager.getCurrentProjectName()) {
                UIManager.populateScriptFileList();
            }
        },
        clearEditorForDeletedFile: (filePath, fileTypeKey) => {
            UIManager.handleScriptDeletedInEditor(filePath, fileTypeKey);
        }
    };
    FileManager.initFileManager(fileManagerHooks);

    const projectManagerCallbacks = {
        populateProjectFilesList: UIManager.populateScriptFileList,
        populateLevelListUI: UIManager.populateLevelListUI,
        updateSceneSettingsDisplay: UIManager.updateSceneSettingsDisplay,
        updateProjectNameDisplay: (name) => {
            DOM.currentProjectDisplay.textContent = `Project: ${name || 'Untitled'}`;
            document.title = `Stela - ${name || 'Untitled'}`;
        }
    };
    ProjectManager.initProjectManager(projectManagerCallbacks);

    UIManager.initUIManager(); // UIManager depends on many things initialized above

    // Set VS Graph context now that ScriptEngine and ObjectManager are ready
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

        // Check if focus is on the viewer area for editor controls
        const isFocusOnViewer = DOM.viewerContainer.contains(document.activeElement);

        if (!GameManager.getIsPlaying() && isFocusOnViewer) {
            // Prevent default behavior for editor hotkeys only when viewer is focused
            if (event.key === 'w' || event.key === 'W' ||
                event.key === 'e' || event.key === 'E' ||
                event.key === 'r' || event.key === 'R') {
                event.preventDefault();
            }

            if (event.key === 'w' || event.key === 'W') {
                DOM.gizmoTranslateBtn.click();
            } else if (event.key === 'e' || event.key === 'E') {
                DOM.gizmoRotateBtn.click();
            } else if (event.key === 'r' || event.key === 'R') {
                DOM.gizmoScaleBtn.click();
            }
        }
        // Allow key inputs to propagate for scripts during play mode regardless of focus,
        // but prevent default browser actions (like F5). Specific game actions might prevent default too.
        if (GameManager.getIsPlaying()) {
            // Example: prevent Space from scrolling the page if it's a game action
            if (event.code === 'Space') {
                // event.preventDefault(); // Decide if game key presses should prevent default
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
        // When the gizmo is clicked, if no object is currently selected, select the object the gizmo is attached to.
        if (!ObjectManager.getSelectedObject() && ThreeScene.getTransformControls().object) {
            ObjectManager.setSelectedObjectAndUpdateUI(ThreeScene.getTransformControls().object);
        }
    });

    // Handle clicks in the viewport to select/deselect objects
    DOM.viewerContainer.addEventListener('mousedown', (event) => {
        // Only process left clicks (button 0)
        if (event.button !== 0) return;
        // Don't interfere with OrbitControls drag (button 1) or TransformControls drag (button 0, handled by TransformControls)
        // Check if OrbitControls is enabled and currently dragging
        if (ThreeScene.getControls().enabled && ThreeScene.getControls()._isDragging) return;
        // Check if TransformControls is currently dragging (its internal state or listeners prevent propagation)
        if (ThreeScene.getTransformControls().dragging) return;
        // Don't interfere if game is playing, unless specific game logic allows clicking
        if (GameManager.getIsPlaying()) return;

        const mouse = ThreeScene.getMouse();
        const rect = ThreeScene.getRenderer().domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        ThreeScene.getRaycaster().setFromCamera(mouse, ThreeScene.getCamera());
        const intersectableObjects = []; // Array of objects in the scene that can be intersected

        // Collect all meshes/groups added by ObjectManager into intersectableObjects
        const sceneObjectsMap = ObjectManager.getSceneObjects();
        for (const name in sceneObjectsMap) {
            const obj = sceneObjectsMap[name];
            // Recursively add objects that can be picked
            obj.traverse(child => {
                if (child.isMesh) { // Or check for other pickable types
                    intersectableObjects.push(child);
                }
            });
        }

        const intersects = ThreeScene.getRaycaster().intersectObjects(intersectableObjects, true); // Set recursive to true

        if (intersects.length > 0) {
            // Find the actual object from our sceneObjects map that was hit (could be a child mesh)
            let clickedObject = null;
            for (let i = 0; i < intersects.length; i++) {
                let intersected = intersects[i].object;
                // Traverse up the parent hierarchy until we find an object in our sceneObjects map
                while (intersected) {
                    if (ObjectManager.getSceneObjects()[intersected.name] === intersected) {
                        clickedObject = intersected;
                        break;
                    }
                    if (intersected.parent && ObjectManager.getSceneObjects()[intersected.parent.name] === intersected.parent) {
                        clickedObject = intersected.parent;
                        break;
                    }
                    intersected = intersected.parent;
                }
                if (clickedObject) break;
            }

            if (clickedObject) {
                if (ObjectManager.getSelectedObject() !== clickedObject) {
                    ObjectManager.setSelectedObjectAndUpdateUI(clickedObject);
                } else {
                    // Clicked the same object, maybe allow drag or other interaction
                }
            } else {
                // Clicked something in the scene but not a managed object (e.g. ground, lights)
                // Deselect if not shift-clicking
                if (!event.shiftKey) {
                    ObjectManager.setSelectedObjectAndUpdateUI(null);
                }
            }
        } else {
            // No objects intersected, click was on background
            // Deselect if not shift-clicking
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
        const vsGraph = VisualScriptEditorManager.getActiveVisualScriptGraph();

        // Set context for VS execution managers every frame during play
        if (vsGraph) {
            // During play, VS executes for the *currently active level's* Visual Script,
            // associated with *that level's* specified camera/target object (if any).
            // The object selected in the editor UI might not be relevant for VS execution
            // during play.
            // We need to determine the "game object" context based on the active level's VS.
            // For now, we'll keep it simple: VS context is the selected object in the editor,
            // BUT VS execution manager runs ALL attached scripts on ALL objects. This needs refinement.
            // A visual script should likely be attached to an object, like text scripts.

            // TODO: Refactor VS Execution. It should likely be part of ObjectManager/GameManager loop,
            // executing specific VS files attached to specific objects, similar to text scripts.
            // The current VS editor's active graph is just for *editing* one file.
            // For now, let's pass the selected object, knowing this is temporary for editor testing.
            const selectedObj = ObjectManager.getSelectedObject(); // Using editor selection for VS context (temp)
            vsGraph.setContext(selectedObj, ObjectManager.getSceneObjects(), keyStates, gameContextForVS, ScriptEngine.customConsole);

            if (GameManager.isFirstPlayFrameTrue()) {
                vsGraph.executeEvent('event-start'); // Trigger Start events once
            }
            vsGraph.executeEvent('event-update'); // Trigger Update events every frame
            vsGraph.executeEvent('event-key-input'); // Trigger Key events every frame
        }

        ScriptEngine.executeComponentScripts(); // Execute text scripts attached to objects

        if (!GameManager.getIsCameraEjected()) {
            ThreeScene.updateCameraFollow();
        }

        // After all game logic/scripts run, consume the first frame flag
        if (GameManager.isFirstPlayFrameTrue()) {
            GameManager.consumeFirstPlayFrameFlag();
        }

    } else {
        // Editor mode: Only update orbit controls
        ThreeScene.getControls().update();
    }

    ThreeScene.renderThreeScene();
}

document.addEventListener('DOMContentLoaded', init);