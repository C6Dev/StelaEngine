import * as ThreeScene from './three-scene.js';
import * as ObjectManager from './object-manager.js';
import * as UIManager from './ui-manager.js';
import * as ScriptEngine from './script-engine.js';
import * as DOM from './dom-elements.js';
import * as THREE from 'three'; 
import * as GameManager from './game-manager.js';
import * as VisualScriptEditorManager from './ui-visual-script-editor-manager.js'; // For accessing active graph

const keyStates = {};

function init() {
    ThreeScene.initThreeScene();
    GameManager.initGameManager(); 

    UIManager.initUIManager();

    ObjectManager.initObjectManager({
        populatePropertiesPanel: UIManager.populatePropertiesPanel,
        updateObjectListUI: UIManager.updateObjectListUI,
        refreshCameraTarget: (objectName) => { 
            if (GameManager.getIsPlaying()) {
                const target = objectName ? ObjectManager.getSceneObjects()[objectName] : null;
                ThreeScene.setCameraTarget(target);
            }
        }
    });

    ScriptEngine.initScriptEngine(keyStates, GameManager.getGameContext); 

    ObjectManager.addSceneObject('cube');

    setupKeyboardListeners();
    setupViewerMouseListener();
    setupGameControls();

    animate();
}

function setupGameControls() {
    DOM.playGameBtn.addEventListener('click', GameManager.startGame);
    DOM.stopGameBtn.addEventListener('click', GameManager.stopGame);
}

function setupViewerMouseListener() {
    DOM.viewerContainer.addEventListener('mousedown', (event) => {
        if (GameManager.getIsPlaying()) return; 

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
            } else {
                const parentInScene = findParentInSceneObjects(clickedObject, sceneObjs, ThreeScene.getScene());
                if (parentInScene) {
                    ObjectManager.setSelectedObjectAndUpdateUI(parentInScene);
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
        if (event.target.tagName === 'TEXTAREA' || (event.target.tagName === 'INPUT' && !GameManager.getIsPlaying())) {
            if (event.key === 'Enter' && event.target.closest('#properties-panel')) {
                event.preventDefault(); 
            } else {
                if (!(event.ctrlKey && event.key.toLowerCase() === 's')) {
                    return; 
                }
            }
        }
        keyStates[event.key.toUpperCase()] = true;

        if (event.ctrlKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            if (DOM.scriptEditorContent.classList.contains('active')) {
                DOM.saveScriptBtn.click();
            }
        }
        
        if (event.key === 'Delete' && !(event.target.tagName === 'TEXTAREA' || event.target.tagName === 'INPUT')) {
            if (ObjectManager.getSelectedObject() && !GameManager.getIsPlaying()) { 
                DOM.deleteObjectBtn.click(); 
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
    const gameContext = GameManager.getGameContext(); // Get context once

    if (isPlaying) {
        ScriptEngine.executeComponentScripts(); // Text scripts

        // Execute the active visual script from the editor
        const activeVSGraph = VisualScriptEditorManager.getActiveVisualScriptGraph();
        if (activeVSGraph) {
            activeVSGraph.setContext(
                ObjectManager.getSelectedObject(), // Contextual 'object' for VS is the selected one (can be null)
                ObjectManager.getSceneObjects(), 
                keyStates, 
                gameContext, // Contains isFirstFrame
                ScriptEngine.customConsole
            );
            activeVSGraph.executeEvent('event-start'); // VS Execution Manager internally checks gameContext.isFirstFrame
            activeVSGraph.executeEvent('event-update'); // Runs if game is playing
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