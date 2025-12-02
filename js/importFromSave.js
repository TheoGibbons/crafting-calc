// Import-from-save (merge) functionality for CraftingCalculator
// This file extends CraftingCalculator with methods to import machines/links
// from another saved state into the current project without clearing it.

CraftingCalculator.prototype.getSavedStatesMap = function() {
    return JSON.parse(localStorage.getItem(this.localStorageKey) || '{}');
};

CraftingCalculator.prototype.getSavedStatesList = function() {
    const savedStates = this.getSavedStatesMap();
    return Object.values(savedStates)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

CraftingCalculator.prototype.ensureImportSaveModal = function() {
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
};

CraftingCalculator.prototype.openImportSaveModal = function() {
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
};

CraftingCalculator.prototype.showImportSaveError = function(message) {
    this.importSaveError.textContent = message;
    this.importSaveError.style.display = 'block';
};

CraftingCalculator.prototype.updateImportSavePreview = function(stateName) {
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
};

CraftingCalculator.prototype.importSaveIntoCurrent = function(stateName) {
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
};

CraftingCalculator.prototype.mergeStateObject = function(importState) {
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
            outputItems: {...(srcMachine.outputItems || {})}
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
};

