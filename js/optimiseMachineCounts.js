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

CraftingCalculator.prototype.optimizeMachineCount = function () {

    if (this.optimizeMachineCountErrorCheck()) {
        return;
    }

    this.optimizeMachineCountsPromptUser(this.optimizeMachineCount3.bind(this));
}

CraftingCalculator.prototype.optimizeMachineCount3 = function (rootMachineId = null, rootMachineCount = null) {

    if (this.optimizeMachineCountErrorCheck()) {
        return;
    }

    // Keep track of machines we've processed
    let tempProvisionalCounts = {};
    let processedMachineIds = [];

    if (rootMachineId !== null && rootMachineCount !== null) {
        // If root machine ID and count are provided, set the provisional count of the root machine
        const rootMachine = this.machines.find(m => m.id === rootMachineId);
        if (!rootMachine) {
            alert(`Root machine with ID ${rootMachineId} not found`);
            return;
        }
        tempProvisionalCounts[rootMachine.id] = rootMachineCount;
        processedMachineIds.push(rootMachine.id);
    }

    // List of machines without output links
    // const outputMachines = this.machines.filter(m => !this.links.some(l => l.sourceId === m.id));

    // Get list of machines ordered with
    // And anything connected to the root machine first
    const machines = this.optimizeMachineGetOrderedMachines(rootMachineId, processedMachineIds);

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

    const upgradeProvisionalCountsToMachineCounts = (provisionalCounts) => {

        // Get the highest provisional count for generator machines in provisionalCounts
        const generatorMachineIds = Object.keys(provisionalCounts).filter(mid => !this.links.filter(l => l.target.id == mid).length)
        const maxProvisionalCount = Math.max(...generatorMachineIds.map(mid => provisionalCounts[mid] || 0));

        // We now need to make the generator machine with the highest provisional count to equal 1
        // and then scale all other machines based on that ratio
        const ratio = 1 / maxProvisionalCount;
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
    machines.forEach(machine => {
        optimizeMachineAndDownstream(machine);

        if (Object.keys(tempProvisionalCounts).length) {
            upgradeProvisionalCountsToMachineCounts(tempProvisionalCounts);
        }

    });

    // Update all machine statuses to reflect new counts
    this.updateMachineStatuses();
};

CraftingCalculator.prototype.optimizeMachineCountsPromptUser = function (callback) {

    callback(this.machines.filter(m => m.name === 'Machine 1')[0].id, 1);
    console.error("TODO");
}

// Get list of machines ordered with
// And anything connected to the root machine first
CraftingCalculator.prototype.optimizeMachineGetOrderedMachines = function (rootMachineId, processedMachineIds) {
    console.error("TODO");
    // return this.machines
    return this.machines.filter(m => !this.links.some(l => l.sourceId === m.id));
}