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
        this.newProjectBtn = document.getElementById('new-project');
        this.addMachineBtn = document.getElementById('add-machine-btn');
        this.resetViewBtn = document.getElementById('reset-view-btn');
        this.saveBtn = document.getElementById('save-btn');
        this.loadDropdown = document.getElementById('load-dropdown');
        this.exportBtn = document.getElementById('export-btn');
        this.importBtn = document.getElementById('import-btn');
        this.importFile = document.getElementById('import-file');

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

        // Auto save every 10 seconds
        setInterval(() => { this.autosave() }, 10000);

        // Restore the latest autosave if one is available
        if(!this.tryRestoreLatestSave()) {
            // Add a starter machine
            this.addMachine();
        }
    }

    setupEventListeners() {
        // Button event listeners
        this.newProjectBtn.addEventListener('click', () => this.newProject());
        this.addMachineBtn.addEventListener('click', () => this.addMachine());
        this.resetViewBtn.addEventListener('click', () => this.resetView());
        this.saveBtn.addEventListener('click', () => this.saveState());
        this.loadDropdown.addEventListener('change', () => this.loadState());
        this.exportBtn.addEventListener('click', () => this.exportState());
        this.importBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.handleImportFile(e));

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

    tryRestoreLatestSave() {
        // Get saved states from localStorage
        const savedStates = JSON.parse(localStorage.getItem('craftingCalculatorStates') || '{}');
        let latestSave

        // Find the latest
        const saves = Object.keys(savedStates);
        if (saves.length === 0) {
            // Users first time using the app, no saves available
            // Load the default save
            const defaultSave = this.getDefaultSave();
            this.applyStateObject(defaultSave.data)

            console.log("First time visitor detected. Restored default save:", defaultSave);
        } else {
            // Sort by timestamp and get the latest one
            saves.sort((a, b) => new Date(savedStates[b].timestamp) - new Date(savedStates[a].timestamp));
            latestSave = saves[0];

            // Load the latest
            this.loadState(latestSave);

            console.log("Restored latest save:", latestSave);
        }


        return true;
    }

    autosave() {
        if(this.machines.length === 0) return;

        const formatDateTime = function (date) {
            const pad = n => n.toString().padStart(2, '0');
            return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        }
        const autoSaveName = `autosave-${formatDateTime(new Date())}-${this.machines.length} machines`;

        this.saveState(autoSaveName)
    }

    // Save/Load functionality
    saveState(stateName) {

        while (!stateName) {
            // Prompt for a name for this saved state
            stateName = prompt('Enter a name for this saved state:');

            if(stateName === null) return; // User cancelled

            stateName = stateName.trim()
            if(stateName.startsWith('autosave')) {
                alert("Autosaves cannot be manually named. They will be created automatically every 10 seconds.");
                stateName = null;
            }
        }

        if (!stateName || stateName.trim() === '') return;

        // Create a data structure to store the state
        const state = this.createStateObject();

        // Get existing saved states
        let savedStates = JSON.parse(localStorage.getItem('craftingCalculatorStates') || '{}');

        // Add this state with timestamp
        savedStates[stateName] = {
            timestamp: new Date().toISOString(),
            name: stateName,
            hash: this.simpleHash(state),
            data: state
        };

        if (stateName.startsWith('autosave')) {
            // Delete all old autosaves with tha same hash
            for(const name in savedStates) {
                if (name.startsWith('autosave-') && name !== stateName) {
                    if (savedStates[name].hash === savedStates[stateName].hash) {
                        delete savedStates[name];
                    }
                }
            }

            // Limit to 5 autosaves
            const autosaves = Object.keys(savedStates).filter(name => name.startsWith('autosave-'));
            if (autosaves.length > 5) {
                // Sort by timestamp and remove oldest
                autosaves.sort((a, b) => new Date(savedStates[b].timestamp) - new Date(savedStates[a].timestamp));
                for (let i = 5; i < autosaves.length; i++) {
                    delete savedStates[autosaves[i]];
                }
            }

        }

        // Save back to localStorage
        localStorage.setItem('craftingCalculatorStates', JSON.stringify(savedStates));

        // Update the dropdown
        this.loadSavedStatesList();

        if (!stateName.startsWith('autosave')) {
            alert(`State "${stateName}" saved successfully!`);
        }

        console.log(`State "${stateName}" saved successfully!`, savedStates[stateName]);
    }

    simpleHash(obj) {
        const str = JSON.stringify(obj);
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
        }
        return hash >>> 0; // Convert to unsigned 32-bit integer
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

    loadState(stateName) {
        if(!stateName) {
            stateName = this.loadDropdown.value;
        }

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

        // Apply the state to the application
        this.applyStateObject(state);

        // alert(`State "${stateName}" loaded successfully!`);
    }

    newProject() {
        // Confirm before clearing
        if (!confirm('Create a new project? This will clear your current work.')) {
            return;
        }

        // Clear the canvas
        this.clearCanvas();

        // Reset view
        this.resetView();

        // Reset IDs
        this.nextMachineId = 1;
        this.nextLinkId = 1;

        // Add a starter machine
        this.addMachine();
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

    createIconsHolder() {
        const iconsHolder = document.createElement('div');
        iconsHolder.classList.add('icons-holder');

        const infoIcon = document.createElement('div');
        infoIcon.classList.add('info-icon');
        infoIcon.style.display = 'none';

        const errorIcon = document.createElement('div');
        errorIcon.classList.add('error-icon');
        errorIcon.style.display = 'none';

        iconsHolder.appendChild(infoIcon);
        iconsHolder.appendChild(errorIcon);

        return iconsHolder;
   }

    // Create a state object from the current application state
    createStateObject() {
        return {
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
    }
    
    // Apply a state object to the application
    applyStateObject(state) {
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

            const efficiency = document.createElement('span');
            efficiency.className = 'efficiency';

            const headerName = document.createElement('span');
            headerName.className = 'machine-header-name';
            headerName.textContent = machineData.name;

            // Add machine header with name
            const header = document.createElement('div');
            header.className = 'machine-header';
            header.appendChild(headerName);
            header.appendChild(efficiency);
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
            label.classList.add('link-label');

            const labelText = document.createElement('div');
            labelText.classList.add('link-text');
            labelText.textContent = '? items/min';
            labelText.title = "Click to set max throughput rate";
            labelText.style.cursor = 'pointer';

            // Add click event to set throughput
            labelText.addEventListener('click', (e) => {
                e.stopPropagation();
                const linkObj = this.links.find(l => l.label.contains(labelText));
                if (linkObj) {
                    this.setLinkThroughput(linkObj);
                }
            });

            label.appendChild(this.createIconsHolder());
            label.appendChild(labelText);

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
                throughput: linkData.throughput,
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
        this.updateMachineStatuses();
    }

    // Export the current state to a file
    exportState() {
        if (this.machines.length === 0) {
            alert("Nothing to export. Create some machines first.");
            return;
        }

        // Prompt for a name
        const exportName = prompt('Enter a name for this export:');
        if (!exportName || exportName.trim() === '') return; // User cancelled

        // Create a data structure to store the state using our helper method
        const state = this.createStateObject();

        // Create the export object with metadata
        const exportData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            name: exportName,
            data: state
        };

        // Convert to JSON and create a Blob
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create a download link and trigger the download
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${exportName.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        console.log(`Exported "${exportName}" successfully!`);
    }

    // Handle file import
    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) {
            return; // No file selected
        }

        // Confirm before importing
        if (!confirm(`Import state from "${file.name}"? This will replace your current work.`)) {
            this.importFile.value = ''; // Clear the file input
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Parse the JSON file
                const importData = JSON.parse(e.target.result);

                // Basic validation
                if (!importData.data || !importData.data.machines || !Array.isArray(importData.data.machines)) {
                    throw new Error('Invalid import file format');
                }

                // Apply the imported state using our helper method
                this.applyStateObject(importData.data);

                alert(`Import from "${file.name}" successful!`);
                
            } catch (error) {
                console.error('Import error:', error);
                alert(`Error importing file: ${error.message}`);
            }
            
            // Clear the file input so the same file can be selected again
            this.importFile.value = '';
        };
        
        reader.onerror = () => {
            alert('Error reading the file');
            this.importFile.value = '';
        };
        
        reader.readAsText(file);
    }

}
