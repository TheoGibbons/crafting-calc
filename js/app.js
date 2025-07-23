document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    const app = new CraftingCalculator();
    app.initialize();
});

class CraftingCalculator {
    constructor() {
        // Canvas elements
        this.canvasContainer = document.getElementById('canvas-container');
        this.canvas = document.getElementById('canvas');
        this.addMachineBtn = document.getElementById('add-machine-btn');
        this.resetViewBtn = document.getElementById('reset-view-btn');

        // Canvas state
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.startPanX = 0;
        this.startPanY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Machine and link tracking
        this.machines = [];
        this.links = [];
        this.nextMachineId = 1;
        this.nextLinkId = 1;
        this.activeLinkStart = null;
        this.contextMenu = null;
    }

    initialize() {
        // Initialize with center transform
        this.updateCanvasTransform();

        // Add event listeners
        this.setupEventListeners();

        // Add a starter machine
        this.addMachine();
    }

    setupEventListeners() {
        // Button event listeners
        this.addMachineBtn.addEventListener('click', () => this.addMachine());
        this.resetViewBtn.addEventListener('click', () => this.resetView());

        // Pan functionality
        this.canvasContainer.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleDocumentMouseMove(e));
        document.addEventListener('mouseup', () => this.handleDocumentMouseUp());

        // Zoom functionality
        this.canvasContainer.addEventListener('wheel', (e) => this.handleCanvasWheel(e));
    }

    updateCanvasTransform() {
        this.canvas.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }

    handleCanvasMouseDown(e) {
        // Only handle left mouse button
        if (e.button !== 0) return;

        this.isPanning = true;
        this.startPanX = e.clientX - this.panX;
        this.startPanY = e.clientY - this.panY;
        this.canvasContainer.style.cursor = 'grabbing';
    }

    handleDocumentMouseMove(e) {
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        if (this.isPanning) {
            this.panX = e.clientX - this.startPanX;
            this.panY = e.clientY - this.startPanY;
            this.updateCanvasTransform();
            this.updateLinks();
        }
    }

    handleDocumentMouseUp() {
        this.isPanning = false;
        this.canvasContainer.style.cursor = 'grab';
    }

    handleCanvasWheel(e) {
        e.preventDefault();

        // Calculate where in the canvas we're zooming
        const rect = this.canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate current mouse position in canvas space
        const canvasX = (mouseX - this.panX) / this.scale;
        const canvasY = (mouseY - this.panY) / this.scale;

        // Adjust scale with wheel delta
        const delta = -Math.sign(e.deltaY) * 0.1;
        const newScale = Math.max(0.5, Math.min(3, this.scale + delta));

        // If scale hasn't changed, don't do anything
        if (newScale === this.scale) return;

        // Update scale
        this.scale = newScale;

        // Adjust pan to keep mouse position fixed
        this.panX = mouseX - canvasX * this.scale;
        this.panY = mouseY - canvasY * this.scale;

        // Update transform
        this.updateCanvasTransform();
        this.updateLinks();
    }

    resetView() {
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateCanvasTransform();
        this.updateLinks();
    }

    closeContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }

    updateLinks() {
        this.links.forEach(link => this.updateLinkPosition(link));
    }
}
