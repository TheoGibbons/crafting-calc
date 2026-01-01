// Global variable
window.app = null

document.addEventListener('DOMContentLoaded', function () {

    // if (document.getElementById('environment')?.value !== 'testing') {
        // Initialize the application
        app = new CraftingCalculator();
        app.initialize();
    // }

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
        this.optimizeMachinesBtn = document.getElementById('optimize-machines-btn');
        this.importSaveBtn = document.getElementById('import-save-btn');

        // Import-from-save modal refs (created lazily)
        this.importSaveModal = null;
        this.importSaveSelect = null;
        this.importSavePreview = null;
        this.importSaveError = null;
        this.importSaveConfirmBtn = null;

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

        this.localStorageKey = 'craftingCalculatorStates';
    }

    initialize() {
        // Initialize with center transform
        this.updateCanvasTransform();

        // Add event listeners
        this.setupEventListeners();

        // Initialize factory output panel
        this.initializeFactoryOutputPanel();
        this.initializeFactoryInputPanel();

        // Auto save every 10 seconds
        // If there is a queryString like ?disable_auto_save=true
        if (window.location.search.includes('disable_auto_save=true') ||
            document.getElementById('environment')?.value === 'testing'
        ) {
            console.log("Auto save is disabled.");
        } else {
            setInterval(() => {this.autosave()}, 10000);

            // Restore the latest autosave if one is available
            this.tryRestoreLatestSave()
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
        this.optimizeMachinesBtn.addEventListener('click', () => this.optimizeMachineCountWithPromptModal());
        if (this.importSaveBtn) {
            this.importSaveBtn.addEventListener('click', () => this.openImportSaveModal());
        }

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
        const delta = -Math.sign(e.deltaY) * 0.05;
        const newScale = Math.max(0.1, Math.min(3, this.scale + delta));

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
        const savedStates = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
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

        const factoryOutput = this.calculateFactoryOutputs();
        const factoryOutputStr = Object.keys(factoryOutput).join(', ').substring(0, 35);

        const autoSaveName = `autosave-${this.machines.length} machines-[${factoryOutputStr}]`;

        this.saveState(autoSaveName)
    }

    // Save/Load functionality
    saveState(stateName) {

        while (!stateName) {
            // Prompt for a name for this saved state
            const defaultName = Object.keys(this.calculateFactoryOutputs().factoryOutputs).join(', ');
            stateName = prompt('Enter a name for this saved state:', defaultName);

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
        let savedStates = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');

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
        localStorage.setItem(this.localStorageKey, JSON.stringify(savedStates));

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
        const savedStates = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');

        // Clear dropdown except for the default option
        while (this.loadDropdown.options.length > 1) {
            this.loadDropdown.remove(1);
        }

        const entries = Object.entries(savedStates)

        entries.sort((a, b) =>
            Math.sign((new Date(b[1].timestamp)).getTime() - (new Date(a[1].timestamp)).getTime())
        );

        // Add each saved state to the dropdown
        entries.forEach(([name, stateData]) => {
            const option = document.createElement('option');
            option.value = name;

            // Format the date for display
            const date = new Date(stateData.timestamp);
            const formattedDate = date.toLocaleString("en-NZ");

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
        const savedStates = JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');

        if (!savedStates[stateName]) {
            alert(`Error: Could not find saved state "${stateName}"`);
            return;
        }

        const state = savedStates[stateName].data;

        // Apply the state to the application
        this.applyStateObject(state);

        // alert(`State "${stateName}" loaded successfully!`);
    }

    newProject(askConfirmation = true, addStarterMachine = true) {

        if (askConfirmation) {
            // Confirm before clearing
            if (!confirm('Create a new project? This will clear your current work.')) {
                return;
            }
        }

        // Clear the canvas
        this.clearCanvas();

        // Reset view
        this.resetView();

        // Reset IDs
        this.nextMachineId = 1;
        this.nextLinkId = 1;

        if (addStarterMachine) {
            // Add a starter machine
            this.addMachine();
        }

        return this
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
                outputs: [...machine.outputs],
                // Persist optional machine colour
                color: machine.color || null
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

        console.log("Applying state:", state);

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

            // Restore saved colour if present
            if (machineData.color) {
                machine.style.backgroundColor = machineData.color;
            }

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
            countBadge.textContent = machineData.count; // Round to 2 decimal places
            countBadge.title = "Click to change machine count";

            // Add click to set count
            countBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                const machineObj = this.machines.find(m => m.id === machineData.id);
                this.promptToSetMachineCount(machineObj);
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
                inputs: [...machineData.inputs],
                outputs: [...machineData.outputs],
                inputItems: {...machineData.inputItems},
                outputItems: {...machineData.outputItems},
                // Keep colour on machine object as well
                color: machineData.color || null
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
                    this.promptToSetLinkMaxThroughput(linkObj);
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
        this.refreshFactoryPanelsIfVisible();
    }

    // Factory Output Panel functionality
    initializeFactoryOutputPanel() {
        // Get panel and button elements
        this.factoryOutputPanel = document.getElementById('factory-output-panel');
        this.toggleFactoryOutputBtn = document.getElementById('toggle-factory-output-btn');
        this.closeFactoryOutputBtn = document.getElementById('close-factory-output-btn');
        this.factoryOutputContent = document.getElementById('factory-output-content');

        // Add event listeners
        this.toggleFactoryOutputBtn.addEventListener('click', () => this.toggleFactoryOutputPanel());
        this.closeFactoryOutputBtn.addEventListener('click', () => this.hideFactoryOutputPanel());

        // // Add update factory output to machine status updates
        // const originalUpdateMachineStatuses = this.updateMachineStatuses;
        // this.updateMachineStatuses = () => {
        //     originalUpdateMachineStatuses.call(this);
        //     this.updateFactoryOutputPanel();
        // };
    }

    // Factory Input Panel functionality
    initializeFactoryInputPanel() {
        this.factoryInputPanel = document.getElementById('factory-input-panel');
        this.toggleFactoryInputBtn = document.getElementById('toggle-factory-input-btn');
        this.closeFactoryInputBtn = document.getElementById('close-factory-input-btn');
        this.factoryInputContent = document.getElementById('factory-input-content');
        this.factoryInputContentSplit = document.getElementById('factory-input-content-split');
        this.factoryInputContentMerged = document.getElementById('factory-input-content-merged');
        this.factoryInputSplitBtn = document.getElementById('factory-input-split');
        this.factoryInputMergeBtn = document.getElementById('factory-input-merge');

        this.toggleFactoryInputBtn.addEventListener('click', () => this.toggleFactoryInputPanel());
        this.closeFactoryInputBtn.addEventListener('click', () => this.hideFactoryInputPanel());
        this.factoryInputSplitBtn.addEventListener('click', () => {
            this.factoryInputPanel.classList.remove('merge-inputs');
        });
        this.factoryInputMergeBtn.addEventListener('click', () => {
            this.factoryInputPanel.classList.add('merge-inputs');
        });
    }

    toggleFactoryOutputPanel() {
        if (this.factoryOutputPanel.classList.contains('hidden')) {
            this.showFactoryOutputPanel();
        } else {
            this.hideFactoryOutputPanel();
        }
    }

    showFactoryOutputPanel() {
        this.factoryOutputPanel.classList.remove('hidden');
        this.toggleFactoryOutputBtn.style.display = 'none';
        // this.updateFactoryOutputPanel();
        this.refreshFactoryPanelsIfVisible();
    }

    hideFactoryOutputPanel() {
        this.factoryOutputPanel.classList.add('hidden');
        this.toggleFactoryOutputBtn.style.display = 'block';
    }

    toggleFactoryInputPanel() {
        if (this.factoryInputPanel.classList.contains('hidden')) {
            this.showFactoryInputPanel();
        } else {
            this.hideFactoryInputPanel();
        }
    }

    showFactoryInputPanel() {
        this.factoryInputPanel.classList.remove('hidden');
        if (this.toggleFactoryInputBtn) {
            this.toggleFactoryInputBtn.style.display = 'none';
        }
        this.updateFactoryInputPanel();
    }

    hideFactoryInputPanel() {
        this.factoryInputPanel.classList.add('hidden');
        if (this.toggleFactoryInputBtn) {
            this.toggleFactoryInputBtn.style.display = 'block';
        }
    }

    updateFactoryOutputPanel() {
        // if (this.factoryOutputPanel.classList.contains('hidden')) {
        //     return; // Don't update if panel is hidden
        // }

        // Clear the content
        this.factoryOutputContent.innerHTML = '';

        // Calculate the net output of the factory
        const { factoryOutputs, outputsWaste } = this.calculateFactoryOutputs();

        if (Object.keys(factoryOutputs).length === 0 && Object.keys(outputsWaste).length === 0) {
            // No outputs, show a message
            const noOutputsMsg = document.createElement('div');
            noOutputsMsg.classList.add('no-outputs');
            noOutputsMsg.textContent = 'No factory outputs detected.';
            this.factoryOutputContent.appendChild(noOutputsMsg);
            return;
        }

        // Helper function to create output item elements
        const createOutputItem = (item, rate) => {
            const outputItem = document.createElement('div');
            outputItem.classList.add('output-item');

            const itemName = document.createElement('div');
            itemName.classList.add('output-item-name');
            itemName.innerHTML = item;

            const outputRate = document.createElement('div');
            outputRate.classList.add('output-rate');
            outputRate.textContent = `${rate.toFixed(2)}/min`;

            outputItem.appendChild(itemName);
            outputItem.appendChild(outputRate);
            return outputItem;
        };

        // Sort and add main outputs
        const sortedOutputs = Object.entries(factoryOutputs).sort((a, b) => a[0].localeCompare(b[0]));
        sortedOutputs.forEach(([item, rate]) => {
            this.factoryOutputContent.appendChild(createOutputItem(item, rate));
        });

        // Add waste section if there are waste outputs
        if (Object.keys(outputsWaste).length > 0) {
            const wasteSection = document.createElement('div');
            wasteSection.classList.add('waste-section');

            const wasteHeader = document.createElement('div');
            wasteHeader.classList.add('waste-header');
            wasteHeader.innerHTML = '<i class="fas fa-chevron-down waste-toggle-icon"></i> Waste';
            wasteHeader.style.cursor = 'pointer';

            const wasteContent = document.createElement('div');
            wasteContent.classList.add('waste-content');

            // Toggle collapse on header click
            wasteHeader.addEventListener('click', () => {
                wasteContent.classList.toggle('collapsed');
                const icon = wasteHeader.querySelector('.waste-toggle-icon');
                if (wasteContent.classList.contains('collapsed')) {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-right');
                } else {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-down');
                }
            });

            // Sort and add waste outputs
            const sortedWaste = Object.entries(outputsWaste).sort((a, b) => a[0].localeCompare(b[0]));
            sortedWaste.forEach(([item, rate]) => {
                wasteContent.appendChild(createOutputItem(item, rate));
            });

            wasteSection.appendChild(wasteHeader);
            wasteSection.appendChild(wasteContent);
            this.factoryOutputContent.appendChild(wasteSection);
        }
    }

    updateFactoryInputPanel() {
        if (!this.factoryInputContent) return;

        if (this.factoryInputContentSplit) this.factoryInputContentSplit.innerHTML = '';
        if (this.factoryInputContentMerged) this.factoryInputContentMerged.innerHTML = '';

        const inputMachines = this.calculateFactoryInputsPerMachine();
        const machineIds = Object.keys(inputMachines);

        if (machineIds.length === 0) {
            const noInputsMsg = document.createElement('div');
            noInputsMsg.classList.add('no-inputs');
            noInputsMsg.textContent = 'No factory inputs detected.';
            const target = this.factoryInputPanel && this.factoryInputPanel.classList.contains('merge-inputs')
                ? this.factoryInputContentMerged || this.factoryInputContent
                : this.factoryInputContentSplit || this.factoryInputContent;
            target.appendChild(noInputsMsg);
            return;
        }

        // Always render split view into its container
        if (this.factoryInputContentSplit) {
            machineIds
                .map(id => inputMachines[id])
                .sort((a, b) => a.items.map(i => i.item).join(', ').localeCompare(b.items.map(i => i.item).join(', ')))
                .forEach(machineInfo => {
                    const block = document.createElement('div');
                    block.classList.add('input-machine-block');

                    const title = document.createElement('div');
                    title.classList.add('input-machine-title');
                    title.textContent = machineInfo.name || 'Machine';
                    block.appendChild(title);

                    if (!machineInfo.items || machineInfo.items.length === 0) {
                        const noItems = document.createElement('div');
                        noItems.classList.add('no-inputs');
                        noItems.textContent = 'No items.';
                        block.appendChild(noItems);
                    } else {
                        machineInfo.items.forEach(entry => {
                            const row = document.createElement('div');
                            row.classList.add('input-item-row');

                            const itemSpan = document.createElement('span');
                            itemSpan.classList.add('input-item-name');
                            itemSpan.textContent = entry.item || '(unknown item)';

                            const rateDiv = document.createElement('div');
                            rateDiv.classList.add('input-rate');
                            if (typeof entry.rate === 'number') {
                                rateDiv.textContent = `${entry.rate.toFixed(2)}/min`;
                            } else {
                                rateDiv.textContent = '-';
                            }

                            row.appendChild(itemSpan);
                            row.appendChild(rateDiv);
                            block.appendChild(row);
                        });
                    }

                    this.factoryInputContentSplit.appendChild(block);
                });
        }

        // Render merged view into its container
        if (this.factoryInputContentMerged) {
            const totals = this.calculateFactoryInputsMerged(inputMachines);
            const itemEntries = Object.entries(totals);

            if (itemEntries.length === 0) {
                const noInputsMsg = document.createElement('div');
                noInputsMsg.classList.add('no-inputs');
                noInputsMsg.textContent = 'No factory inputs detected.';
                this.factoryInputContentMerged.appendChild(noInputsMsg);
            } else {
                itemEntries
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .forEach(([item, rate]) => {
                        const row = document.createElement('div');
                        row.classList.add('input-item-row');

                        const itemSpan = document.createElement('span');
                        itemSpan.classList.add('input-item-name');
                        itemSpan.textContent = item || '(unknown item)';

                        const rateDiv = document.createElement('div');
                        rateDiv.classList.add('input-rate');
                        if (typeof rate === 'number') {
                            rateDiv.textContent = `${rate.toFixed(2)}/min`;
                        } else {
                            rateDiv.textContent = '-';
                        }

                        row.appendChild(itemSpan);
                        row.appendChild(rateDiv);
                        this.factoryInputContentMerged.appendChild(row);
                    });
            }
        }
    }

    calculateFactoryInputsMerged(inputMachines) {
        const totals = {};
        Object.values(inputMachines).forEach(machineInfo => {
            if (!machineInfo.items) return;
            machineInfo.items.forEach(entry => {
                if (!entry || typeof entry.rate !== 'number') return;
                const key = entry.item || '(unknown item)';
                totals[key] = (totals[key] || 0) + entry.rate;
            });
        });
        return totals;
    }

    calculateFactoryOutputs() {
        const factoryOutputs = {};
        const outputsWaste = {};

        // Loop through all machines
        this.machines.forEach(machine => {

            const itemsProducedFromThisMachine = {};
            const itemsSentToOtherMachines = {};

            Object.entries(machine.outputItems).forEach(([item, output]) => {
                itemsProducedFromThisMachine[item] = (itemsProducedFromThisMachine[item] || 0) + (output.rate * machine.count);

                this.links.forEach(link => {
                    if (link.source.id === machine.id && link.item === item) {
                        itemsSentToOtherMachines[escapeHtml(item)] = (itemsSentToOtherMachines[escapeHtml(item)] || 0) + (link.currentThroughput || 0);
                    }
                });
            });

            // Calculate net outputs for this machine
            Object.keys(itemsProducedFromThisMachine).forEach(item => {
                const produced = itemsProducedFromThisMachine[item] || 0;
                const sentAway = itemsSentToOtherMachines[item] || 0;
                const netOutput = produced - sentAway;

                if (netOutput > 0) {
                    if (itemsSentToOtherMachines[item]) {
                        const itemName = `${escapeHtml(item)}<br/><small style="font-size: xx-small;">${escapeHtml(machine.name)}</small>`
                        outputsWaste[itemName] = (outputsWaste[itemName] || 0) + netOutput;
                    } else {
                        factoryOutputs[escapeHtml(item)] = (factoryOutputs[escapeHtml(item)] || 0) + netOutput;
                    }
                }
            });

        });

        return {factoryOutputs, outputsWaste};
    }

    calculateFactoryInputsPerMachine() {
        const inputMachines = {};

        this.machines.forEach(machine => {
            if (machine.inputs.length === 0) {
                inputMachines[machine.id] = {
                    name: machine.name,
                    items: Object.entries(machine.outputItems).map(([key, item]) => ({
                        item: key,
                        rate: (item.rate || 0) * (machine.count || 1)
                    }))
                };
            }
        });

        return inputMachines;
    }

    refreshFactoryPanelsIfVisible() {
        if (!this.factoryOutputPanel.classList.contains('hidden')) {
            this.updateFactoryOutputPanel();
        }
        if (!this.factoryInputPanel.classList.contains('hidden')) {
            this.updateFactoryInputPanel();
        }
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

        // Get the state data
        const exportData = this.getExportData(exportName);

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

    // Get export data without downloading
    getExportData(exportName) {
        // Create a data structure to store the state using our helper method
        const state = this.createStateObject();

        // Create the export object with metadata
        return {
            version: "1.0",
            timestamp: new Date().toISOString(),
            name: exportName || "Test Export",
            data: state
        };
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

    // ===== Import Another Save (merge) functionality =====

    getSavedStatesMap() {
        return JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
    }

    getSavedStatesList() {
        const savedStates = this.getSavedStatesMap();
        return Object.values(savedStates)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    ensureImportSaveModal() {
        if (this.importSaveModal) return;

        const modal = document.createElement('dialog');
        modal.id = 'import-save-modal';
        modal.className = 'my-modal';

        modal.innerHTML = `
            <form method="dialog" class="import-save-form">
                <h3>Import Machines from Saved State</h3>
                <p>Select another save to import its machines and links to the center of the viewport without clearing current machines.</p>

                <div class="modal-field">
                    <label for="import-save-select">Saved state:</label>
                    <select id="import-save-select" required>
                        <option value="">-- Select Saved State --</option>
                    </select>
                </div>

                <div class="modal-preview" id="import-save-preview">
                    <em>No save selected.</em>
                </div>

                <div class="modal-error" id="import-save-error" style="display:none;color:#c00;"></div>

                <div class="modal-buttons">
                    <button type="button" value="cancel" id="import-save-cancel-btn">Cancel</button>
                    <button value="confirm" id="import-save-confirm-btn" disabled>Import</button>
                </div>
            </form>
        `;

        document.body.appendChild(modal);

        this.importSaveModal = modal;
        this.importSaveSelect = modal.querySelector('#import-save-select');
        this.importSavePreview = modal.querySelector('#import-save-preview');
        this.importSaveError = modal.querySelector('#import-save-error');
        this.importSaveConfirmBtn = modal.querySelector('#import-save-confirm-btn');

        // Wire modal events
        const cancelBtn = modal.querySelector('#import-save-cancel-btn');
        cancelBtn.addEventListener('click', () => {
            modal.close('cancel');
        });

        this.importSaveSelect.addEventListener('change', () => {
            const name = this.importSaveSelect.value;
            this.updateImportSavePreview(name);
        });

        this.importSaveConfirmBtn.addEventListener('click', (e) => {
            // Allow <form method="dialog"> to close, but we need to stop
            // it from submitting anywhere
            e.preventDefault();
            const name = this.importSaveSelect.value;
            if (!name) return;
            try {
                this.importSaveIntoCurrent(name);
                modal.close('confirm');
            } catch (err) {
                console.error('Import-from-save error:', err);
                this.showImportSaveError(err.message || 'Error importing saved state');
            }
        });
    }

    openImportSaveModal() {
        this.ensureImportSaveModal();

        // Reset UI
        this.importSaveError.style.display = 'none';
        this.importSaveError.textContent = '';
        this.importSaveConfirmBtn.disabled = true;

        // Rebuild select options from latest localStorage
        const savedStates = this.getSavedStatesMap();
        // Clear options except placeholder
        while (this.importSaveSelect.options.length > 1) {
            this.importSaveSelect.remove(1);
        }

        Object.entries(savedStates)
            .sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp))
            .forEach(([name, stateData]) => {
                const opt = document.createElement('option');
                opt.value = name;
                const date = new Date(stateData.timestamp);
                const formattedDate = date.toLocaleString();
                opt.textContent = `${name} (${formattedDate})`;
                this.importSaveSelect.appendChild(opt);
            });

        this.importSaveSelect.value = '';
        this.importSavePreview.innerHTML = '';

        if (typeof this.importSaveModal.showModal === 'function') {
            this.importSaveModal.showModal();
        } else {
            this.importSaveModal.show();
        }

        this.importSaveSelect.focus();
    }

    showImportSaveError(message) {
        this.importSaveError.textContent = message;
        this.importSaveError.style.display = 'block';
    }

    updateImportSavePreview(stateName) {
        this.importSaveError.style.display = 'none';
        this.importSaveError.textContent = '';
        this.importSaveConfirmBtn.disabled = !stateName;

        if (!stateName) {
            this.importSavePreview.innerHTML = '<em>No save selected.</em>';
            return;
        }

        const savedStates = this.getSavedStatesMap();
        const entry = savedStates[stateName];
        if (!entry || !entry.data) {
            this.importSavePreview.innerHTML = '<span style="color:#c00;">Save not found or invalid.</span>';
            this.importSaveConfirmBtn.disabled = true;
            return;
        }

        const machines = Array.isArray(entry.data.machines) ? entry.data.machines.length : 0;
        const links = Array.isArray(entry.data.links) ? entry.data.links.length : 0;
        const date = new Date(entry.timestamp);
        const formattedDate = date.toLocaleString();

        this.importSavePreview.innerHTML = `
            <div><strong>Name:</strong> ${entry.name || stateName}</div>
            <div><strong>Saved:</strong> ${formattedDate}</div>
            <div><strong>Machines:</strong> ${machines}</div>
            <div><strong>Links:</strong> ${links}</div>
        `;
    }

    importSaveIntoCurrent(stateName) {
        const savedStates = this.getSavedStatesMap();
        const entry = savedStates[stateName];
        if (!entry || !entry.data) {
            throw new Error(`Could not find saved state "${stateName}"`);
        }

        const state = entry.data;
        if (!Array.isArray(state.machines) || !Array.isArray(state.links)) {
            throw new Error('Saved state has invalid structure');
        }

        this.mergeStateObject(state);
    }

    mergeStateObject(importState) {
        // Compute center of imported machines in their own coordinate space
        if (!importState.machines || !importState.machines.length) {
            return;
        }

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        importState.machines.forEach(m => {
            const x = m.left || 0;
            const y = m.top || 0;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        });

        const importedCenterX = (minX + maxX) / 2;
        const importedCenterY = (minY + maxY) / 2;

        // Compute current viewport center in canvas coordinates
        const rect = this.canvasContainer.getBoundingClientRect();
        const viewportCenterX = rect.left + rect.width / 2;
        const viewportCenterY = rect.top + rect.height / 2;

        const canvasCenterX = (viewportCenterX - this.panX) / this.scale;
        const canvasCenterY = (viewportCenterY - this.panY) / this.scale;

        const offsetX = canvasCenterX - importedCenterX;
        const offsetY = canvasCenterY - importedCenterY;

        // Map old machine IDs to new ones
        const machineIdMap = {};

        // Create machines
        importState.machines.forEach(srcMachine => {
            const newId = this.nextMachineId++;

            const machine = document.createElement('div');
            machine.className = 'machine';
            machine.dataset.id = newId;
            machine.style.left = `${(srcMachine.left || 0) + offsetX}px`;
            machine.style.top = `${(srcMachine.top || 0) + offsetY}px`;

            // Restore colour for imported machines if present
            if (srcMachine.color) {
                machine.style.backgroundColor = srcMachine.color;
            }

            const efficiency = document.createElement('span');
            efficiency.className = 'efficiency';

            const headerName = document.createElement('span');
            headerName.className = 'machine-header-name';
            headerName.textContent = srcMachine.name;

            const header = document.createElement('div');
            header.className = 'machine-header';
            header.appendChild(headerName);
            header.appendChild(efficiency);
            header.title = 'Click to rename';

            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const machineObj = this.machines.find(m => m.id === newId);
                this.renameMachine(machineObj);
            });
            machine.appendChild(header);

            const countBadge = document.createElement('div');
            countBadge.className = 'machine-count';
            countBadge.textContent = srcMachine.count; // already a number
            countBadge.title = 'Click to change machine count';

            countBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                const machineObj = this.machines.find(m => m.id === newId);
                this.promptToSetMachineCount(machineObj);
            });
            machine.appendChild(countBadge);

            const rates = document.createElement('div');
            rates.className = 'machine-rates';

            const inputsContainer = this.createInputsContainer(machine);
            const outputsContainer = this.createOutputsContainer(machine);
            rates.appendChild(inputsContainer);
            rates.appendChild(outputsContainer);

            machine.appendChild(rates);
            this.canvas.appendChild(machine);

            const machineObj = {
                id: newId,
                element: machine,
                name: srcMachine.name,
                count: srcMachine.count,
                inputs: [...(srcMachine.inputs || [])],
                outputs: [...(srcMachine.outputs || [])],
                inputItems: {...(srcMachine.inputItems || {})},
                outputItems: {...(srcMachine.outputItems || {})},
                // Preserve colour in imported machine object
                color: srcMachine.color || null
            };

            this.machines.push(machineObj);
            machineIdMap[srcMachine.id] = machineObj;

            machine.addEventListener('mousedown', (e) => this.handleMachineMouseDown(e, machine));
            machine.addEventListener('contextmenu', (e) => this.handleMachineContextMenu(e, machine));
        });

        // Create links
        importState.links.forEach(srcLink => {
            const sourceMachine = machineIdMap[srcLink.sourceId];
            const targetMachine = machineIdMap[srcLink.targetId];
            if (!sourceMachine || !targetMachine) {
                console.warn('Skipping link; missing source/target in imported state', srcLink);
                return;
            }

            const id = this.nextLinkId++;
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
            labelText.title = 'Click to set max throughput rate';
            labelText.style.cursor = 'pointer';

            labelText.addEventListener('click', (e) => {
                e.stopPropagation();
                const linkObj = this.links.find(l => l.label.contains(labelText));
                if (linkObj) {
                    this.promptToSetLinkMaxThroughput(linkObj);
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
                throughput: srcLink.throughput,
                item: srcLink.item || ''
            };

            this.links.push(link);

            // Maintain inputs/outputs references
            if (!sourceMachine.outputs.includes(targetMachine.id)) {
                sourceMachine.outputs.push(targetMachine.id);
            }
            if (!targetMachine.inputs.includes(sourceMachine.id)) {
                targetMachine.inputs.push(sourceMachine.id);
            }

            this.updateLinkPosition(link);
            this.updateLinkLabel(link);

            hitbox.addEventListener('contextmenu', (e) => this.handleLinkContextMenu(e, link));
        });

        // Refresh IO displays and statuses
        this.machines.forEach(machine => {
            this.updateMachineInputItemsDisplay(machine);
            this.updateMachineOutputItemsDisplay(machine);
        });

        this.updateMachineStatuses();
        this.updateLinks();
        this.refreshFactoryPanelsIfVisible();
    }

}
