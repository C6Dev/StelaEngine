// visual-script-connection-dom.js
import * as DOM from './dom-elements.js';

export function createConnectionLineElement(connectionId, isPending = false) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.dataset.connectionId = connectionId;
    if (isPending) {
        line.classList.add('vs-connection-line-pending');
    } else {
        line.classList.add('vs-connection-line');
    }
    DOM.visualScriptSvgLayer.appendChild(line);
    return line;
}

export function updateConnectionLineElement(lineElement, startPos, endPos) {
    if (lineElement) {
        lineElement.setAttribute('x1', startPos.x);
        lineElement.setAttribute('y1', startPos.y);
        lineElement.setAttribute('x2', endPos.x);
        lineElement.setAttribute('y2', endPos.y);
    }
}

export function removeConnectionLineElement(lineElement) {
    if (lineElement && lineElement.parentElement) {
        lineElement.parentElement.removeChild(lineElement);
    }
}