CraftingCalculator.prototype.optimizeMachineCountErrorCheck = function () {

    // Check if any links have a max throughput set
    // If so this function cannot be used
    if (this.links.some(link => link.throughput !== null)) {
        alert("Cannot optimize machine count when links have a max throughput set");
        return true;
    }

    if (this.getAllLinksInALoop().length) {
        alert("Cannot optimize machine count when there are loops in the graph");
        return;
    }

    return false;
}

CraftingCalculator.prototype.optimizeMachineCountWithPromptModal = function () {

    if (this.optimizeMachineCountErrorCheck()) {
        return;
    }

    this.optimizeMachineCountsPromptUser(this.optimizeMachineCount.bind(this));
}

CraftingCalculator.prototype.optimizeMachineCount = function (rootMachineId = null, rootMachineCount = null) {

    if (this.optimizeMachineCountErrorCheck()) {
        return;
    }

    // Keep track of machines we've processed
    let tempProvisionalCounts = {};
    let processedMachineIds = [];

    // List of machines without output links
    const outputMachines = this.machines.filter(m => !this.links.some(l => l.sourceId === m.id));

    const getRatioBetweenMachines = (source, target, item) => {
        const numberOfLinksFromSourceMachineCarryingThisItem = this.links.filter(l => l.source.id === source.id && l.item && l.item === item).length;
        const machineOutputRateOfThisLink = source.outputItems[item].rate / numberOfLinksFromSourceMachineCarryingThisItem;

        const numberOfLinksInputtingTargetMachineCarryingThisItem = this.links.filter(l => l.target.id === target.id && l.item && l.item === item).length;
        const consumptionRateOfDestinationMachine = target.inputItems[item].rate / numberOfLinksInputtingTargetMachineCarryingThisItem;

        return consumptionRateOfDestinationMachine / machineOutputRateOfThisLink;
    }

    const calculateRatioedCount = (machine) => {

        const outputLinks = this.links.filter(l => l.source.id === machine.id && l.item);
        const inputLinks = this.links.filter(l => l.target.id === machine.id && l.item);

        // First check all connected machines.
        // If any connected machine has a provisional count
        // Then we can calculate a provisional count for this machine based on the ratio of the two machines
        let ratioedCountOfConnectedMachines = [];

        outputLinks.forEach(l => {
            if (typeof tempProvisionalCounts[l.target.id] !== 'undefined') {
                const ratioBetweenSourceAndDestinationMachines = getRatioBetweenMachines(machine, l.target, l.item);
                ratioedCountOfConnectedMachines.push(tempProvisionalCounts[l.target.id] * ratioBetweenSourceAndDestinationMachines);
            }
        })

        inputLinks.forEach(l => {
            if (typeof tempProvisionalCounts[l.source.id] !== 'undefined') {
                const ratioBetweenSourceAndDestinationMachines = 1 / getRatioBetweenMachines(l.source, machine, l.item);
                ratioedCountOfConnectedMachines.push(tempProvisionalCounts[l.source.id] / ratioBetweenSourceAndDestinationMachines);
            }
        })

        if (ratioedCountOfConnectedMachines.length > 0) {
            // Using average instead of min to better balance converging production lines
            const sum = ratioedCountOfConnectedMachines.reduce((acc, val) => acc + val, 0);
            return sum / ratioedCountOfConnectedMachines.length;
        }

        // No connected machine has a provisional count
        // So return 1
        return 1;
    }

    const optimizeMachineAndDownstream = (machine) => {
        if (processedMachineIds.includes(machine.id)) {
            return;
        }

        // Depth first search (DFS)
        // Check all downstream machines
        this.links
            .filter(l => l.source.id === machine.id && l.item)
            .map(l => l.target)
            .forEach(optimizeMachineAndDownstream)

        // Mark this machine as processed
        tempProvisionalCounts[machine.id] = calculateRatioedCount(machine);
        processedMachineIds.push(machine.id);
    };

    const upgradeProvisionalCountsToMachineCounts = (provisionalCounts, rootMachineId = null, rootMachineCount = null) => {

        // Get the highest provisional count for generator machines in provisionalCounts
        let ratio
        if (rootMachineId !== null && rootMachineCount !== null && rootMachineId in provisionalCounts) {
            ratio = rootMachineCount / provisionalCounts[rootMachineId];
        } else {
            const generatorMachineIds = Object.keys(provisionalCounts).filter(mid => !this.links.filter(l => l.target.id == mid).length)
            const maxProvisionalCount = Math.max(...generatorMachineIds.map(mid => provisionalCounts[mid] || 0));
            ratio = 1 / maxProvisionalCount;
        }

        // We now need to make the generator machine with the highest provisional count to equal 1
        // and then scale all other machines based on that ratio
        const that = this
        this.machines.forEach(m => {
            if (provisionalCounts[m.id]) {
                that.setMachineCount(m, parseFloat((provisionalCounts[m.id] * ratio).toFixed(2)));
            }
        });

        // Reset the provisional counts
        provisionalCounts = {};
    };

    // Start optimization
    outputMachines.forEach(machine => {
        optimizeMachineAndDownstream(machine);

        if (Object.keys(tempProvisionalCounts).length) {
            upgradeProvisionalCountsToMachineCounts(tempProvisionalCounts, rootMachineId, rootMachineCount);
        }

    });

    // Update all machine statuses to reflect new counts
    this.updateMachineStatuses();
};

CraftingCalculator.prototype.optimizeMachineCountsPromptUser = function (callback) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('optimize-machine-count-modal');

    if (!modal) {
        // Create the modal element
        modal = document.createElement('dialog');
        modal.id = 'optimize-machine-count-modal';
        modal.className = 'optimize-modal';

        // Set modal content
        modal.innerHTML = `
            <form method="dialog">
                <h3>Optimize Machine Counts</h3>
                <p>Set one machine's count to a specific value.<br>
                   I will calculate the optimal count of all other machines to maximize the output.</p>
                
                <div class="modal-field">
                    <label for="optimize-machine-select">Select a machine:</label>
                    <select id="optimize-machine-select" required>
                        <option value="">-- Select Machine --</option>
                    </select>
                </div>
                
                <div class="modal-field">
                    <label for="optimize-machine-count">How many of this machine should there be:</label>
                    <input type="number" id="optimize-machine-count" step="0.01" value="1" min="0.01" required>
                </div>
                
                <div class="modal-buttons">
                    <button type="button" value="cancel">Cancel</button>
                    <button value="confirm" id="optimize-confirm-btn">Calculate</button>
                </div>
            </form>
        `;

        // Add modal to the document
        document.body.appendChild(modal);
    }

    // Get select element and populate with machines
    const selectElement = document.getElementById('optimize-machine-select');
    // Clear existing options (except the first one)
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }

    // Add all machines to the dropdown
    this.machines.forEach(machine => {
        const isThereAnotherMachineWithTheSameName = this.machines.some(m => m.id !== machine.id && m.name === machine.name);
        const option = document.createElement('option');
        option.value = machine.id;
        option.textContent = machine.name + (isThereAnotherMachineWithTheSameName ? ` (ID: ${machine.id})` : '');
        selectElement.appendChild(option);
    });

    // Set up the count input
    const countInput = document.getElementById('optimize-machine-count');
    countInput.value = 1;

    // Show the modal
    modal.showModal();

    // Handle dialog close
    modal.addEventListener('close', () => {
        if (modal.returnValue === 'confirm') {
            const selectedMachineId = parseInt(selectElement.value, 10);
            const machineCount = parseFloat(countInput.value);

            if (selectedMachineId && !isNaN(machineCount) && machineCount > 0) {
                callback(selectedMachineId, machineCount);
            }
        }
    }, {once: true}); // Use once: true to prevent multiple event handlers
}