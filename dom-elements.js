// Main Layout Panels
export const leftPanel = document.getElementById('left-panel');
export const centerColumn = document.getElementById('center-column');
export const rightPanel = document.getElementById('right-panel');
export const bottomPanel = document.getElementById('bottom-panel');

// Header Elements
export const currentProjectDisplay = document.getElementById('current-project-display');
export const fileMenuBtn = document.getElementById('file-menu-btn');
export const fileDropdownContent = document.getElementById('file-dropdown-content');
export const newProjectBtn = document.getElementById('new-project-btn');
export const saveProjectBtn = document.getElementById('save-project-btn');
export const saveProjectAsBtn = document.getElementById('save-project-as-btn');
export const loadProjectBtn = document.getElementById('load-project-btn');
export const addObjectMenuBtn = document.getElementById('add-object-menu-btn');
export const addObjectDropdownContent = document.getElementById('add-object-dropdown-content');
export const addCubeBtn = document.getElementById('add-cube-btn');
export const addSphereBtn = document.getElementById('add-sphere-btn');
export const addCylinderBtn = document.getElementById('add-cylinder-btn');

// Gizmo Controls
export const gizmoTranslateBtn = document.getElementById('gizmo-translate-btn');
export const gizmoRotateBtn = document.getElementById('gizmo-rotate-btn');
export const gizmoScaleBtn = document.getElementById('gizmo-scale-btn');

// Game Controls
export const playGameBtn = document.getElementById('play-game-btn');
export const stopGameBtn = document.getElementById('stop-game-btn');
export const ejectCameraBtn = document.getElementById('eject-camera-btn');

// Left Panel (Hierarchy)
export const objectListContainer = document.getElementById('object-list-container'); 
export const objectListDiv = document.getElementById('object-list');

// Center Column (Viewport/Script Editor)
export const centerTabs = document.getElementById('center-tabs');
export const sceneTabBtn = document.getElementById('scene-tab-btn');
export const scriptEditorTabBtn = document.getElementById('script-editor-tab-btn');
export const currentScriptNameTabSpan = document.getElementById('current-script-name-tab');
export const visualScriptEditorTabBtn = document.getElementById('visual-script-editor-tab-btn'); 
export const currentVisualScriptNameTabSpan = document.getElementById('current-visual-script-name-tab'); 

export const centerContent = document.getElementById('center-content');
export const sceneViewContent = document.getElementById('scene-view-content');
export const viewerContainer = document.getElementById('viewer-container'); 

export const scriptEditorContent = document.getElementById('script-editor-content');
export const scriptInput = document.getElementById('script-input'); 
export const scriptControls = document.getElementById('script-controls');
export const runUpdateBtn = document.getElementById('run-update-btn'); 
export const runOnceBtn = document.getElementById('run-once-btn');
export const clearActiveScriptBtn = document.getElementById('clear-active-script-btn'); 
export const saveScriptBtn = document.getElementById('save-script-btn');

// Visual Script Editor Elements
export const visualScriptEditorContent = document.getElementById('visual-script-editor-content'); 
export const vsAddNodeBtn = document.getElementById('vs-add-node-btn');
export const vsNodeTypeSelect = document.getElementById('vs-node-type-select');
export const vsSaveAsTextBtn = document.getElementById('vs-save-as-text-btn'); 
export const visualScriptGraphContainer = document.getElementById('visual-script-graph-container');
export const visualScriptSvgLayer = document.getElementById('visual-script-svg-layer');
export const visualScriptNodesContainer = document.getElementById('visual-script-nodes-container');
export const vsMarqueeSelectionRect = document.getElementById('vs-marquee-selection-rect');

// Right Panel (Properties)
export const propertiesPanel = document.getElementById('properties-panel');
export const selectedObjectIndicator = document.getElementById('selected-object-indicator');
export const objectNameGroup = document.getElementById('object-name-group');
export const objectTransformGroup = document.getElementById('object-transform-group');
export const propNameInput = document.getElementById('prop-name');
export const propPosXInput = document.getElementById('prop-pos-x');
export const propPosYInput = document.getElementById('prop-pos-y');
export const propPosZInput = document.getElementById('prop-pos-z');
export const propRotXInput = document.getElementById('prop-rot-x');
export const propRotYInput = document.getElementById('prop-rot-y');
export const propRotZInput = document.getElementById('prop-rot-z');
export const propScaleXInput = document.getElementById('prop-scale-x');
export const propScaleYInput = document.getElementById('prop-scale-y');
export const propScaleZInput = document.getElementById('prop-scale-z');
export const deleteObjectBtn = document.getElementById('delete-object-btn');

// Parenting in Properties Panel
export const objectParentingGroup = document.getElementById('object-parenting-group'); 
export const propParentSelect = document.getElementById('prop-parent-select'); 

// Camera Attachment in Properties Panel
export const objectCameraGroup = document.getElementById('object-camera-group');
export const cameraAttachmentStatusDiv = document.getElementById('camera-attachment-status');
export const setActiveCameraBtn = document.getElementById('set-active-camera-btn');
export const clearActiveCameraBtn = document.getElementById('clear-active-camera-btn');

// Scene Settings in Properties Panel
export const sceneSettingsGroup = document.getElementById('scene-settings-group');
export const propBgColorInput = document.getElementById('prop-bg-color');

// Script Components in Properties Panel
export const objectScriptsGroup = document.getElementById('object-scripts-group');
export const scriptComponentListDiv = document.getElementById('script-component-list');
export const availableScriptsDropdown = document.getElementById('available-scripts-dropdown');
export const addScriptComponentBtn = document.getElementById('add-script-component-btn');

// Bottom Panel (Project/Console)
export const bottomTabs = document.getElementById('bottom-tabs');
export const projectTabBtn = document.getElementById('project-tab-btn');
export const consoleTabBtn = document.getElementById('console-tab-btn');

export const bottomContent = document.getElementById('bottom-content');
export const projectContent = document.getElementById('project-content');
export const scriptFileListHeader = document.getElementById('script-file-list-header');
export const createNewScriptBtn = document.getElementById('create-new-script-btn');
export const scriptFileListDiv = document.getElementById('script-file-list');

export const consoleContent = document.getElementById('console-content');
export const scriptOutputLabel = document.getElementById('script-output-label'); 
export const scriptOutputDiv = document.getElementById('script-output');

// Load Project Modal
export const loadProjectModal = document.getElementById('load-project-modal');
export const closeLoadProjectModalBtn = document.getElementById('close-load-project-modal');
export const loadProjectListDiv = document.getElementById('load-project-list');
export const noProjectsMessage = document.getElementById('no-projects-message');

// Hidden file input for project loading
export const loadProjectFileInput = document.getElementById('load-project-file-input');