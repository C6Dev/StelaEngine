// visual-script-view-controls.js
import * as DOM from './dom-elements.js';

export class VisualScriptViewControls {
    constructor(interactionManager) {
        this.manager = interactionManager; // Main VisualScriptInteractionManager

        this.isPanningGraph = false;
        this.panStartMouseX = 0;
        this.panStartMouseY = 0;
        this.panStartPanX = 0;
        this.panStartPanY = 0;

        this.isMarqueeSelecting = false;
        this.marqueeStartX = 0;
        this.marqueeStartY = 0;

        // Bind methods that will be used as event handlers
        this._onGraphMouseMove = this._onGraphMouseMove.bind(this);
        this._onGraphMouseUp = this._onGraphMouseUp.bind(this);
    }

    handleGraphWheel(event) {
        event.preventDefault();
        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
        const mouseX = event.clientX - graphRect.left;
        const mouseY = event.clientY - graphRect.top;

        const oldScale = this.manager.currentScale;
        const scaleFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        
        this.manager.updateScale(scaleFactor, mouseX, mouseY);
        this.manager.redrawConnections();
    }

    handleGraphMouseDown(event) {
        // Ignore if interacting with a node or pin directly
        if (event.target.closest('.visual-script-node') || event.target.closest('.vs-pin')) {
            return;
        }

        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();

        if (event.button === 0) { // Left mouse button for marquee selection
            this.manager.clearSelection();
            this.isMarqueeSelecting = true;
            // Calculate marquee start in logical (unscaled, unpanned) coordinates
            this.marqueeStartX = (event.clientX - graphRect.left - this.manager.panX) / this.manager.currentScale;
            this.marqueeStartY = (event.clientY - graphRect.top - this.manager.panY) / this.manager.currentScale;

            // Initialize marquee rect style (screen coordinates)
            DOM.vsMarqueeSelectionRect.style.left = `${event.clientX - graphRect.left}px`;
            DOM.vsMarqueeSelectionRect.style.top = `${event.clientY - graphRect.top}px`;
            DOM.vsMarqueeSelectionRect.style.width = '0px';
            DOM.vsMarqueeSelectionRect.style.height = '0px';
            DOM.vsMarqueeSelectionRect.style.display = 'block';

            document.addEventListener('mousemove', this._onGraphMouseMove);
            document.addEventListener('mouseup', this._onGraphMouseUp, { once: true });

        } else if (event.button === 1) { // Middle mouse button for panning
            event.preventDefault(); // Prevent default middle-click scroll
            this.isPanningGraph = true;
            this.panStartMouseX = event.clientX;
            this.panStartMouseY = event.clientY;
            this.panStartPanX = this.manager.panX;
            this.panStartPanY = this.manager.panY;
            DOM.visualScriptGraphContainer.style.cursor = 'grabbing';

            document.addEventListener('mousemove', this._onGraphMouseMove);
            document.addEventListener('mouseup', this._onGraphMouseUp, { once: true });
        }
    }

    _onGraphMouseMove(event) {
        event.preventDefault();
        const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();

        if (this.isPanningGraph) {
            const deltaMouseX = event.clientX - this.panStartMouseX;
            const deltaMouseY = event.clientY - this.panStartMouseY;
            this.manager.setPan(this.panStartPanX + deltaMouseX, this.panStartPanY + deltaMouseY);
            this.manager.redrawConnections();
        } else if (this.isMarqueeSelecting) {
            const currentMouseX = event.clientX - graphRect.left; // Screen coordinates
            const currentMouseY = event.clientY - graphRect.top;  // Screen coordinates

            // Marquee start point in current screen coordinates
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

    _onGraphMouseUp(event) {
        event.preventDefault();
        DOM.visualScriptGraphContainer.style.cursor = 'default';
        document.removeEventListener('mousemove', this._onGraphMouseMove);
        // mouseup is {once: true}, so it's removed automatically

        if (this.isPanningGraph) {
            this.isPanningGraph = false;
        } else if (this.isMarqueeSelecting) {
            this.isMarqueeSelecting = false;
            DOM.vsMarqueeSelectionRect.style.display = 'none';

            const graphRect = DOM.visualScriptGraphContainer.getBoundingClientRect();
            // Calculate marquee end in logical coordinates
            const marqueeEndLogicalX = (event.clientX - graphRect.left - this.manager.panX) / this.manager.currentScale;
            const marqueeEndLogicalY = (event.clientY - graphRect.top - this.manager.panY) / this.manager.currentScale;

            const rX1 = Math.min(this.marqueeStartX, marqueeEndLogicalX);
            const rY1 = Math.min(this.marqueeStartY, marqueeEndLogicalY);
            const rX2 = Math.max(this.marqueeStartX, marqueeEndLogicalX);
            const rY2 = Math.max(this.marqueeStartY, marqueeEndLogicalY);
            
            this.manager.clearSelection(false); // Don't update visuals yet
            const graphNodes = this.manager.getGraph().nodes;
            graphNodes.forEach(node => {
                if (node.element) {
                    // Node dimensions in logical coordinates
                    const nodeLogicalWidth = node.element.offsetWidth; //offsetWidth is already logical due to no scaling on the node element itself initially
                    const nodeLogicalHeight = node.element.offsetHeight;
                    
                    // Check for overlap
                    if (node.x < rX2 && node.x + nodeLogicalWidth > rX1 &&
                        node.y < rY2 && node.y + nodeLogicalHeight > rY1) {
                        this.manager.selectedNodes.add(node.id);
                    }
                }
            });
            this.manager.updateSelectedNodesVisuals();
        }
    }
    
    destroy() {
        // Clean up any persistent listeners if they were not {once: true}
        // For this module, mousemove and mouseup are added/removed dynamically.
        // So, only need to ensure they are removed if an operation was active during destroy.
        if (this.isPanningGraph || this.isMarqueeSelecting) {
            document.removeEventListener('mousemove', this._onGraphMouseMove);
            document.removeEventListener('mouseup', this._onGraphMouseUp);
            DOM.visualScriptGraphContainer.style.cursor = 'default';
            if (this.isMarqueeSelecting) {
                 DOM.vsMarqueeSelectionRect.style.display = 'none';
            }
        }
    }
}