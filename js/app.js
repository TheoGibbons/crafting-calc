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
        this.saveBtn = document.getElementById('save-btn');
        this.loadDropdown = document.getElementById('load-dropdown');

        // Canvas state
        this.scale = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.startPanX = 0;
        this.startPanY = 0;

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
        this.saveBtn.addEventListener('click', () => this.saveState());
        this.loadDropdown.addEventListener('change', () => this.loadState());

        // Pan functionality
        this.canvasContainer.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleDocumentMouseMove(e));
        document.addEventListener('mouseup', () => this.handleDocumentMouseUp());

        // Zoom functionality
        this.canvasContainer.addEventListener('wheel', (e) => this.handleCanvasWheel(e));

        // Load saved states when the app initializes
        this.loadSavedStatesList();
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

    // Save/Load functionality
    saveState() {
        // Prompt for a name for this saved state
        const stateName = prompt('Enter a name for this saved state:');
        if (!stateName || stateName.trim() === '') return;

        // Create a data structure to store the state
        const state = {
            machines: this.machines.map(machine => ({
                id: machine.id,
                name: machine.name,
                count: machine.count,
                left: parseInt(machine.element.style.left),
                top: parseInt(machine.element.style.top),
                inputItems: {...machine.inputItems},
                outputItems: {...machine.outputItems},
                inputs: [...machine.inputs],
                outputs: [...machine.outputs]
            })),
            links: this.links.map(link => ({
                id: link.id,
                sourceId: link.source.id,
                targetId: link.target.id,
                throughput: link.throughput,
                item: link.item
            })),
            nextMachineId: this.nextMachineId,
            nextLinkId: this.nextLinkId,
            scale: this.scale,
            panX: this.panX,
            panY: this.panY
        };

        // Get existing saved states
        let savedStates = JSON.parse(localStorage.getItem('craftingCalculatorStates') || '{}');

        // Add this state with timestamp
        savedStates[stateName] = {
            timestamp: new Date().toISOString(),
            data: state
        };

        // Save back to localStorage
        localStorage.setItem('craftingCalculatorStates', JSON.stringify(savedStates));

        // Update the dropdown
        this.loadSavedStatesList();

        alert(`State "${stateName}" saved successfully!`);
    }

    loadSavedStatesList() {
        // Get saved states from localStorage
        const savedStates = JSON.parse(localStorage.getItem('craftingCalculatorStates') || '{}');

        // Clear dropdown except for the default option
        while (this.loadDropdown.options.length > 1) {
            this.loadDropdown.remove(1);
        }

        // Add each saved state to the dropdown
        Object.entries(savedStates).forEach(([name, stateData]) => {
            const option = document.createElement('option');
            option.value = name;

            // Format the date for display
            const date = new Date(stateData.timestamp);
            const formattedDate = date.toLocaleString();

            option.textContent = `${name} (${formattedDate})`;
            this.loadDropdown.appendChild(option);
        });
    }

    loadState() {
        const stateName = this.loadDropdown.value;
        if (!stateName) return; // No selection made

        // Reset dropdown selection
        this.loadDropdown.selectedIndex = 0;

        // Get saved states from localStorage
        const savedStates = JSON.parse(localStorage.getItem('craftingCalculatorStates') || '{}');

        if (!savedStates[stateName]) {
            alert(`Error: Could not find saved state "${stateName}"`);
            return;
        }

        const state = savedStates[stateName].data;

        // Confirm before loading
        if (!confirm(`Load saved state "${stateName}"? This will replace your current work.`)) {
            return;
        }

        // Clear current state
        this.clearCanvas();

        // Restore canvas view
        this.scale = state.scale || 1;
        this.panX = state.panX || 0;
        this.panY = state.panY || 0;
        this.updateCanvasTransform();

        // Set next IDs
        this.nextMachineId = state.nextMachineId;
        this.nextLinkId = state.nextLinkId;

        // Recreate machines
        const machinesById = {};
        state.machines.forEach(machineData => {
            // Create machine element
            const machine = document.createElement('div');
            machine.className = 'machine';
            machine.dataset.id = machineData.id;
            machine.style.left = `${machineData.left}px`;
            machine.style.top = `${machineData.top}px`;

            // Add machine header with name
            const header = document.createElement('div');
            header.className = 'machine-header';
            header.textContent = machineData.name;
            header.title = "Click to rename";

            // Add click to rename
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const machineObj = this.machines.find(m => m.id === machineData.id);
                this.renameMachine(machineObj);
            });
            machine.appendChild(header);

            // Add machine count badge
            const countBadge = document.createElement('div');
            countBadge.className = 'machine-count';
            countBadge.textContent = machineData.count;
            countBadge.title = "Click to change machine count";
            countBadge.style.display = machineData.count > 1 ? 'flex' : 'none';

            // Add click to set count
            countBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                const machineObj = this.machines.find(m => m.id === machineData.id);
                this.setMachineCount(machineObj);
            });
            machine.appendChild(countBadge);

            // Add rates section for machine inputs and outputs
            const rates = document.createElement('div');
            rates.className = 'machine-rates';

            // Create inputs container
            const inputsContainer = this.createInputsContainer(machine);
            rates.appendChild(inputsContainer);

            // Create outputs container
            const outputsContainer = this.createOutputsContainer(machine);
            rates.appendChild(outputsContainer);

            machine.appendChild(rates);
            this.canvas.appendChild(machine);

            // Add to machines array
            const machineObj = {
                id: machineData.id,
                element: machine,
                name: machineData.name,
                count: machineData.count,
                inputRate: 0,
                outputRate: 0,
                inputs: [...machineData.inputs],
                outputs: [...machineData.outputs],
                inputItems: {...machineData.inputItems},
                outputItems: {...machineData.outputItems}
            };

            this.machines.push(machineObj);
            machinesById[machineData.id] = machineObj;

            // Make draggable
            machine.addEventListener('mousedown', (e) => this.handleMachineMouseDown(e, machine));

            // Add context menu
            machine.addEventListener('contextmenu', (e) => this.handleMachineContextMenu(e, machine));
        });

        // Recreate links
        state.links.forEach(linkData => {
            const sourceMachine = machinesById[linkData.sourceId];
            const targetMachine = machinesById[linkData.targetId];

            if (!sourceMachine || !targetMachine) {
                console.error(`Could not find machines for link: ${linkData.id}`);
                return;
            }

            // Create link element
            const id = linkData.id;
            const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            linkGroup.classList.add('link');
            linkGroup.dataset.id = id;
            linkGroup.style.overflow = 'visible';

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.classList.add('link-line');

            const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hitbox.classList.add('link-hitbox');

            const label = document.createElement('div');
            label.classList.add('throughput-label');
            label.title = "Click to set throughput rate";
            label.style.cursor = 'pointer';

            // Add click event to set throughput
            label.addEventListener('click', (e) => {
                e.stopPropagation();
                const linkObj = this.links.find(l => l.label === label);
                if (linkObj) {
                    this.setLinkThroughput(linkObj);
                }
            });

            linkGroup.appendChild(line);
            linkGroup.appendChild(hitbox);
            this.canvas.appendChild(linkGroup);
            this.canvas.appendChild(label);

            const link = {
                id,
                source: sourceMachine,
                target: targetMachine,
                element: linkGroup,
                line,
                hitbox,
                label,
                throughput: linkData.throughput || 0,
                item: linkData.item || ''
            };

            this.links.push(link);

            // Position the link
            this.updateLinkPosition(link);
            this.updateLinkLabel(link);

            // Add event listener for context menu
            hitbox.addEventListener('contextmenu', (e) => this.handleLinkContextMenu(e, link));
        });

        // Update all machines with input/output information
        this.machines.forEach(machine => {
            this.updateMachineInputItemsDisplay(machine);
            this.updateMachineOutputItemsDisplay(machine);
        });

        // Update machine status colors
        this.updateMachineStatus();

        alert(`State "${stateName}" loaded successfully!`);
    }

    clearCanvas() {
        // Remove all machines
        this.machines.forEach(machine => {
            machine.element.remove();
        });

        // Remove all links
        this.links.forEach(link => {
            link.element.remove();
            link.label.remove();
        });

        // Reset arrays
        this.machines = [];
        this.links = [];
    }
}
