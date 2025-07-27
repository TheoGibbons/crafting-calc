CraftingCalculator.prototype.getDefaultSave = function () {
    return {
        "version": "1.0",
        "timestamp": "2025-07-27T06:11:16.320Z",
        "name": "Reinforced Iron Plate",
        "data": {
            "machines": [
                {
                    "id": 8,
                    "name": "Miner Mk.1 (Pure)",
                    "count": 1,
                    "left": 95,
                    "top": 355,
                    "inputItems": {},
                    "outputItems": {
                        "Iron Ore": {
                            "rate": 120,
                            "currentThroughput": 120,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "inputs": [],
                    "outputs": [
                        10
                    ]
                },
                {
                    "id": 10,
                    "name": "Smelter",
                    "count": 4,
                    "left": 605,
                    "top": 356,
                    "inputItems": {
                        "Iron Ore": {
                            "rate": 30,
                            "currentThroughput": 120,
                            "attemptedThroughput": 120,
                            "efficiency": 1,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "outputItems": {
                        "Iron Ingot": {
                            "rate": 30,
                            "currentThroughput": 120,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "inputs": [
                        8
                    ],
                    "outputs": [
                        11,
                        12
                    ]
                },
                {
                    "id": 11,
                    "name": "Constructor",
                    "count": 2,
                    "left": 1137,
                    "top": 147,
                    "inputItems": {
                        "Iron Ingot": {
                            "rate": 15,
                            "currentThroughput": 30,
                            "attemptedThroughput": 30,
                            "efficiency": 1,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "outputItems": {
                        "Iron Rod": {
                            "rate": 15,
                            "currentThroughput": 30,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "inputs": [
                        10
                    ],
                    "outputs": [
                        13
                    ]
                },
                {
                    "id": 12,
                    "name": "Constructor",
                    "count": 3,
                    "left": 1376,
                    "top": 562,
                    "inputItems": {
                        "Iron Ingot": {
                            "rate": 30,
                            "currentThroughput": 90,
                            "attemptedThroughput": 90,
                            "efficiency": 1,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "outputItems": {
                        "Iron Plate": {
                            "rate": 20,
                            "currentThroughput": 60,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "inputs": [
                        10
                    ],
                    "outputs": [
                        14
                    ]
                },
                {
                    "id": 13,
                    "name": "Constructor",
                    "count": 3,
                    "left": 1623,
                    "top": 147,
                    "inputItems": {
                        "Iron Rod": {
                            "rate": 10,
                            "currentThroughput": 30,
                            "attemptedThroughput": 30,
                            "efficiency": 1,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "outputItems": {
                        "Screws": {
                            "rate": 40,
                            "currentThroughput": 120,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "inputs": [
                        11
                    ],
                    "outputs": [
                        14
                    ]
                },
                {
                    "id": 14,
                    "name": "Assembler",
                    "count": 2,
                    "left": 2215,
                    "top": 390,
                    "inputItems": {
                        "Screws": {
                            "rate": 60,
                            "currentThroughput": 120,
                            "attemptedThroughput": 120,
                            "efficiency": 1,
                            "state": "normal",
                            "errorMessages": []
                        },
                        "Iron Plate": {
                            "rate": 30,
                            "currentThroughput": 60,
                            "attemptedThroughput": 60,
                            "efficiency": 1,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "outputItems": {
                        "Reinforced Iron Plate": {
                            "rate": 5,
                            "currentThroughput": 10,
                            "state": "normal",
                            "errorMessages": []
                        }
                    },
                    "inputs": [
                        12,
                        13
                    ],
                    "outputs": []
                }
            ],
            "links": [
                {
                    "id": 7,
                    "sourceId": 8,
                    "targetId": 10,
                    "throughput": null,
                    "item": "Iron Ore"
                },
                {
                    "id": 8,
                    "sourceId": 10,
                    "targetId": 11,
                    "throughput": null,
                    "item": "Iron Ingot"
                },
                {
                    "id": 10,
                    "sourceId": 11,
                    "targetId": 13,
                    "throughput": null,
                    "item": "Iron Rod"
                },
                {
                    "id": 11,
                    "sourceId": 12,
                    "targetId": 14,
                    "throughput": null,
                    "item": "Iron Plate"
                },
                {
                    "id": 12,
                    "sourceId": 13,
                    "targetId": 14,
                    "throughput": null,
                    "item": "Screws"
                },
                {
                    "id": 23,
                    "sourceId": 10,
                    "targetId": 12,
                    "throughput": null,
                    "item": "Iron Ingot"
                }
            ],
            "nextMachineId": 19,
            "nextLinkId": 24,
            "scale": 1,
            "panX": 0,
            "panY": 0
        }
    };

}
