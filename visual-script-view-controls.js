// visual-script-view-controls.js
import * as DOM from './dom-elements.js';

export class VisualScriptViewControls {
    constructor(interactionManager) {
        this.manager = interactionManager; // Main VisualScriptInteractionManager

        this.isPanningGraph = false; // For middle-mouse pan
        this.panStartMouseX = 0;
        this.panStartMouseY = 0;
        this.panStartPanX = 0;
        this.panStartPanY = 0;

        this.isMarqueeSelecting = false;
        this.marqueeStartX = 0;
        this.marqueeStartY = 0;

        // Right-click specific state
        this.isRightMouseDown = false;
        this.rightMouseDownStartPos = { x: 0, y: 0 }; // Screen coords
        this.isRightClickPanning = false;
        this.rightClickPanThreshold = 5; // Pixels

        // Bind methods that will be used as event handlers
        this._onGraphMouseMove = this._onGraphMouseMove.bind(this);
        this._onGraphMouseUp = this._onGraphMouseUp.bind(this);
        this._onGraphContextMenu = this._onGraphContextMenu.bind(this); // For right-click menu

        // Bind right-click specific handlers
        this._onRightGraphMouseMove = this._onRightGraphMouseMove.bind(this);
        this._onRightGraphMouseUp = this._onRightGraphMouseUp.bind(this);
    }

    handleGraphWheel(event) {
        event.preventDefault();
        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
        const mouseX = event.clientX - graphRect.left;
        const mouseY = event.clientY - graphRect.top;
        
        this.manager.updateScale(event.deltaY < 0 ? 1.1 : 1 / 1.1, mouseX, mouseY);
        this.manager.redrawConnections();
    }

    handleGraphMouseDown(event) {
        if (event.target.closest('.visual-script-node') || event.target.closest('.vs-pin') || event.target.closest('.vs-context-menu')) {
            return;
        }

        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();

        if (event.button === 0) { // Left mouse button for marquee selection
            this.manager.clearSelection();
            this.isMarqueeSelecting = true;
            this.marqueeStartX = (event.clientX - graphRect.left - this.manager.panX) / this.manager.currentScale;
            this.marqueeStartY = (event.clientY - graphRect.top - this.manager.panY) / this.manager.currentScale;

            DOM.vsMarqueeSelectionRect.style.left = `${event.clientX - graphRect.left}px`;
            DOM.vsMarqueeSelectionRect.style.top = `${event.clientY - graphRect.top}px`;
            DOM.vsMarqueeSelectionRect.style.width = '0px';
            DOM.vsMarqueeSelectionRect.style.height = '0px';
            DOM.vsMarqueeSelectionRect.style.display = 'block';

            document.addEventListener('mousemove', this._onGraphMouseMove);
            document.addEventListener('mouseup', this._onGraphMouseUp, { once: true });

        } else if (event.button === 1) { // Middle mouse button for panning
            event.preventDefault(); 
            this.isPanningGraph = true;
            this.panStartMouseX = event.clientX;
            this.panStartMouseY = event.clientY;
            this.panStartPanX = this.manager.panX;
            this.panStartPanY = this.manager.panY;
            DOM.visualScriptGraphContainer.style.cursor = 'grabbing';

            document.addEventListener('mousemove', this._onGraphMouseMove);
            document.addEventListener('mouseup', this._onGraphMouseUp, { once: true });
        } else if (event.button === 2) { // Right mouse button
            event.preventDefault(); // Prevent default context menu here temporarily
            this.isRightMouseDown = true;
            this.isRightClickPanning = false; // Reset panning state for this new right-click
            this.rightMouseDownStartPos = { x: event.clientX, y: event.clientY };

            document.addEventListener('mousemove', this._onRightGraphMouseMove);
            document.addEventListener('mouseup', this._onRightGraphMouseUp, { once: true });
        }
    }

    _onGraphMouseMove(event) { // Handles Left (marquee) and Middle (pan) drags
        event.preventDefault();
        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();

        if (this.isPanningGraph) { // Middle mouse pan
            const deltaMouseX = event.clientX - this.panStartMouseX;
            const deltaMouseY = event.clientY - this.panStartMouseY;
            this.manager.setPan(this.panStartPanX + deltaMouseX, this.panStartPanY + deltaMouseY);
            this.manager.redrawConnections();
        } else if (this.isMarqueeSelecting) { // Left mouse marquee
            const currentMouseX = event.clientX - graphRect.left; 
            const currentMouseY = event.clientY - graphRect.top;  

            const marqueeScreenStartX = (this.marqueeStartX * this.manager.currentScale) + this.manager.panX;
            const marqueeScreenStartY = (this.marqueeStartY * this.manager.currentScale) + this.manager.panY;

            const left = Math.min(marqueeScreenStartX, currentMouseX);
            const top = Math.min(marqueeScreenStartY, currentMouseY);
            const width = Math.abs(currentMouseX - marqueeScreenStartX);
            const height = Math.abs(currentMouseY - marqueeScreenStartY);

            DOM.vsMarqueeSelectionRect.style.left = `${left}px`;
            DOM.vsMarqueeSelectionRect.style.top = `${top}px`;
            DOM.vsMarqueeSelectionRect.style.width = `${width}px`;
            DOM.vsMarqueeSelectionRect.style.height = `${height}px`;
        }
    }

    _onGraphMouseUp(event) { // Handles Left (marquee) and Middle (pan) mouse up
        event.preventDefault();
        DOM.visualScriptGraphContainer.style.cursor = 'default';
        document.removeEventListener('mousemove', this._onGraphMouseMove);

        if (this.isPanningGraph) {
            this.isPanningGraph = false;
        } else if (this.isMarqueeSelecting) {
            this.isMarqueeSelecting = false;
            DOM.vsMarqueeSelectionRect.style.display = 'none';

            const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
            const marqueeEndLogicalX = (event.clientX - graphRect.left - this.manager.panX) / this.manager.currentScale;
            const marqueeEndLogicalY = (event.clientY - graphRect.top - this.manager.panY) / this.manager.currentScale;

            const rX1 = Math.min(this.marqueeStartX, marqueeEndLogicalX);
            const rY1 = Math.min(this.marqueeStartY, marqueeEndLogicalY);
            const rX2 = Math.max(this.marqueeStartX, marqueeEndLogicalX);
            const rY2 = Math.max(this.marqueeStartY, marqueeEndLogicalY);
            
            this.manager.clearSelection(false); 
            const graphNodes = this.manager.getGraph().nodes;
            graphNodes.forEach(node => {
                if (node.element) {
                    const nodeLogicalWidth = node.element.offsetWidth; 
                    const nodeLogicalHeight = node.element.offsetHeight;
                    
                    if (node.x < rX2 && node.x + nodeLogicalWidth > rX1 &&
                        node.y < rY2 && node.y + nodeLogicalHeight > rY1) {
                        this.manager.selectedNodes.add(node.id);
                    }
                }
            });
            this.manager.updateSelectedNodesVisuals();
        }
    }

    // --- Right-click specific handlers ---
    _onRightGraphMouseMove(event) {
        event.preventDefault();
        if (this.isRightMouseDown) { // Check if it should transition to panning
            const dx = event.clientX - this.rightMouseDownStartPos.x;
            const dy = event.clientY - this.rightMouseDownStartPos.y;
            if (Math.sqrt(dx * dx + dy * dy) > this.rightClickPanThreshold) {
                this.isRightClickPanning = true;
                this.isRightMouseDown = false; // No longer a potential menu click

                // Initialize pan state for right-click pan
                this.panStartMouseX = event.clientX;
                this.panStartMouseY = event.clientY;
                this.panStartPanX = this.manager.panX;
                this.panStartPanY = this.manager.panY;
                DOM.visualScriptGraphContainer.style.cursor = 'grabbing';
            }
        }

        if (this.isRightClickPanning) { // Perform pan
            const deltaMouseX = event.clientX - this.panStartMouseX;
            const deltaMouseY = event.clientY - this.panStartMouseY;
            this.manager.setPan(this.panStartPanX + deltaMouseX, this.panStartPanY + deltaMouseY);
            this.manager.redrawConnections();
        }
    }

    _onRightGraphMouseUp(event) {
        event.preventDefault();
        document.removeEventListener('mousemove', this._onRightGraphMouseMove);
        // Note: mouseup listener is {once: true}, so it's auto-removed. This is just defensive.

        if (this.isRightClickPanning) {
            DOM.visualScriptGraphContainer.style.cursor = 'default';
        }
        // isRightClickPanning and isRightMouseDown are reset when contextmenu event fires or here.
        // The contextmenu event will fire *after* mousedown but *before* mouseup for a right click.
        // So, by the time mouseup fires, we should know if it was a pan or click.
        // We reset isRightMouseDown here to be safe.
        this.isRightMouseDown = false;
        // isRightClickPanning is reset by _onGraphContextMenu if it was a click,
        // or here if it was a pan.
    }

    _onGraphContextMenu(event) {
        event.preventDefault();
        if (event.target.closest('.visual-script-node') || event.target.closest('.vs-pin') || event.target.closest('.vs-context-menu')) {
            return; // Don't show graph context menu if on a node/pin/existing menu
        }

        if (this.isRightClickPanning) {
            // If it was a pan, reset panning state and do nothing else
            this.isRightClickPanning = false;
            DOM.visualScriptGraphContainer.style.cursor = 'default';
        } else {
            // It was a click (no significant drag)
            const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
            const clickScreenX = event.clientX - graphRect.left;
            const clickScreenY = event.clientY - graphRect.top;
            this.manager.requestShowNodeContextMenu(clickScreenX, clickScreenY);
        }
        // Reset right mouse down state after context menu logic is handled.
        this.isRightMouseDown = false;
    }
    
    destroy() {
        if (this.isPanningGraph || this.isMarqueeSelecting) {
            document.removeEventListener('mousemove', this._onGraphMouseMove);
            document.removeEventListener('mouseup', this._onGraphMouseUp);
        }
        if (this.isRightMouseDown || this.isRightClickPanning) {
            document.removeEventListener('mousemove', this._onRightGraphMouseMove);
            document.removeEventListener('mouseup', this._onRightGraphMouseUp);
        }
        DOM.visualScriptGraphContainer.style.cursor = 'default';
        if (this.isMarqueeSelecting) {
             DOM.vsMarqueeSelectionRect.style.display = 'none';
        }
        // Remove contextmenu listener from manager.destroy
    }
}