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

const keyStates = {};

async function init() { 
    ThreeScene.initThreeScene();
    GameManager.initGameManager(); 
    
    // Initialize FileManager first - it no longer directly interacts with localStorage for projects
    FileManager.initFileManager({ 
        refreshScriptLists: UIManager.populateScriptFileList, // Pass the UIManager function directly
        clearEditorForDeletedScript: (name, type) => { 
            if (type === 'text') UIManager.handleScriptDeletedInEditor(name, 'text'); // UIManager will delegate
            else if (type === 'visual') UIManager.handleScriptDeletedInEditor(name, 'visual'); // UIManager will delegate
        },
    });

    // UIManager initializes its sub-modules, including UIProjectFilesManager which needs FileManager
    UIManager.initUIManager(); 

    ObjectManager.initObjectManager({
        populatePropertiesPanel: UIManager.populatePropertiesPanel,
        updateObjectListUI: UIManager.updateObjectListUI,
        refreshCameraTarget: (objectName) => { 
            if (GameManager.getIsPlaying()) {
                const target = objectName ? ObjectManager.getSceneObjects()[objectName] : null;
                ThreeScene.setCameraTarget(target);
            }
        },
        onObjectTransformedByGizmo: () => {
            UIManager.populatePropertiesPanel();
            ProjectManager.markProjectDirty();
        }
    });

    ScriptEngine.initScriptEngine(keyStates, GameManager.getGameContext); 

    // Initialize ProjectManager, which now loads an empty initial project state
    // Pass the populateScriptFileList from UIManager to ProjectManager
    await ProjectManager.initProjectManager({
        populateScriptFileList: UIManager.populateScriptFileList 
    }); 

    setupKeyboardListeners();
    setupViewerMouseListener();
    setupGameControls();

    animate();
}

function setupGameControls() {
    DOM.playGameBtn.addEventListener('click', GameManager.startGame);
    DOM.stopGameBtn.addEventListener('click', GameManager.stopGame);
    DOM.ejectCameraBtn.addEventListener('click', () => {
        if (GameManager.getIsPlaying() && !GameManager.getIsCameraEjected()) {
            GameManager.ejectCamera();
        }
    });
}

function setupViewerMouseListener() {
    DOM.viewerContainer.addEventListener('mousedown', (event) => {
        if (GameManager.getIsPlaying()) return; 

        const transformControls = ThreeScene.getTransformControls();
        if (transformControls && transformControls.axis !== null && transformControls.dragging) { 
            return; 
        }

        event.preventDefault();

        const renderer = ThreeScene.getRenderer();
        if (!renderer) return;

        const viewerRect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(); 
        mouse.x = ((event.clientX - viewerRect.left) / viewerRect.width) * 2 - 1;
        mouse.y = -((event.clientY - viewerRect.top) / viewerRect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster(); 
        raycaster.setFromCamera(mouse, ThreeScene.getCamera());

        const sceneObjs = ObjectManager.getSceneObjects();
        const threeSceneObjects = Object.values(sceneObjs); 

        const validThreeObjects = threeSceneObjects.filter(obj => obj instanceof THREE.Object3D);

        const intersects = raycaster.intersectObjects(validThreeObjects, false);


        if (intersects.length > 0) {
            let clickedObject = intersects[0].object;
            while(clickedObject.parent && clickedObject.parent !== ThreeScene.getScene() && sceneObjs[clickedObject.parent.name]) {
                clickedObject = clickedObject.parent;
            }
            
            if (sceneObjs[clickedObject.name]) { 
                 ObjectManager.setSelectedObjectAndUpdateUI(clickedObject);
                 ProjectManager.markProjectDirty(); // Selecting an object could be considered a change
            } else {
                const parentInScene = findParentInSceneObjects(clickedObject, sceneObjs, ThreeScene.getScene());
                if (parentInScene) {
                    ObjectManager.setSelectedObjectAndUpdateUI(parentInScene);
                    ProjectManager.markProjectDirty();
                } else {
                    ObjectManager.setSelectedObjectAndUpdateUI(null);
                }
            }
        } else {
            ObjectManager.setSelectedObjectAndUpdateUI(null);
        }
    }, false);
}

function findParentInSceneObjects(object, sceneObjs, scene) {
    let current = object.parent;
    while(current && current !== scene) {
        if (sceneObjs[current.name]) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

function setupKeyboardListeners() {
    window.addEventListener('keydown', (event) => {
        // Prevent keyboard shortcuts if an input/textarea is focused, unless it's a global save (Ctrl+S)
        const isInputFocused = event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT';
        if (isInputFocused && !( (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') ) {
             if (event.key === 'Enter' && event.target.closest('#properties-panel')) {
                event.preventDefault(); 
                event.target.blur(); // Deselect input on enter
            }
            return;
        }
        
        keyStates[event.key.toUpperCase()] = true;

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            DOM.saveProjectBtn.click(); 
        }
        
        if (event.key === 'Delete' && !isInputFocused) {
            if (ObjectManager.getSelectedObject() && !GameManager.getIsPlaying()) { 
                DOM.deleteObjectBtn.click(); 
            }
        }

        if (!isInputFocused && !GameManager.getIsPlaying()) { // Gizmo shortcuts only if not playing and not in input
            if (event.key.toLowerCase() === 'w') {
                event.preventDefault();
                DOM.gizmoTranslateBtn.click();
            } else if (event.key.toLowerCase() === 'e') { 
                event.preventDefault();
                DOM.gizmoRotateBtn.click();
            } else if (event.key.toLowerCase() === 'r') { 
                event.preventDefault();
                DOM.gizmoScaleBtn.click();
            }
        }

    });
    window.addEventListener('keyup', (event) => {
        keyStates[event.key.toUpperCase()] = false;
    });
}

function animate() {
    requestAnimationFrame(animate);

    const isPlaying = GameManager.getIsPlaying();
    const gameContext = GameManager.getGameContext(); 
    // const currentProjectName = ProjectManager.getCurrentProjectName(); // Not directly used in animate loop like this

    if (isPlaying) { 
        ScriptEngine.executeComponentScripts(); // Project context is implicit via FileManager now

        const activeVSGraph = VisualScriptEditorManager.getActiveVisualScriptGraph();
        const currentOpenVSFileName = FileManager.getCurrentOpenVisualScriptName();
        
        // Check if the open visual script exists in the current project's loaded scripts
        if (activeVSGraph && currentOpenVSFileName && FileManager.visualScriptExists(currentOpenVSFileName)) { 
            activeVSGraph.setContext(
                ObjectManager.getSelectedObject(), 
                ObjectManager.getSceneObjects(), 
                keyStates, 
                gameContext, 
                ScriptEngine.customConsole
            );
            activeVSGraph.executeEvent('event-start'); 
            activeVSGraph.executeEvent('event-update'); 
            activeVSGraph.executeEvent('event-key-input'); 
        }
        
        if (GameManager.isFirstPlayFrameTrue()) { 
            GameManager.consumeFirstPlayFrameFlag();
        }
        ThreeScene.updateCameraFollow(); 
    } else {
        ThreeScene.getControls()?.update(); 
    }
    
    ThreeScene.renderThreeScene();
}

document.addEventListener('DOMContentLoaded', init);