import MinHeap from "./MinHeap.js";

export default class Graph {
    constructor() {
        /*
         * adjacency list
         *
         * Map:
         *
         * locationId -> [
         *   {
         *      to: destinationId,
         *      weight: 10
         *   }
         * ]
         */
        this.adjacencyList = new Map();
    }

    addLocation(locationId) {
        if (!this.adjacencyList.has(locationId)) {
            this.adjacencyList.set(
                locationId,
                []
            );
        }
    }

    hasLocation(locationId) {
        return this.adjacencyList.has(
            locationId
        );
    }

    removeLocation(locationId) {
        if (
            !this.adjacencyList.has(
                locationId
            )
        ) {
            return false;
        }

        /*
         * Remove the location itself.
         */
        this.adjacencyList.delete(
            locationId
        );

        /*
         * Remove every edge pointing
         * to this location.
         */
        for (
            const neighbors
            of this.adjacencyList.values()
        ) {
            const filtered =
                neighbors.filter(
                    (edge) =>
                        edge.to !==
                        locationId
                );

            neighbors.length = 0;

            neighbors.push(
                ...filtered
            );
        }

        return true;
    }

    addConnection(
        source,
        destination,
        weight,
        isDirected = true
    ) {
        if (
            !this.hasLocation(source)
        ) {
            throw new Error(
                `Source location ${source} does not exist`
            );
        }

        if (
            !this.hasLocation(
                destination
            )
        ) {
            throw new Error(
                `Destination location ${destination} does not exist`
            );
        }

        if (
            !Number.isFinite(weight)
        ) {
            throw new Error(
                "Connection weight must be a valid number"
            );
        }

        if (weight < 0) {
            throw new Error(
                "Negative edge weights are not allowed"
            );
        }

        if (source === destination) {
            throw new Error(
                "Self connections are not allowed"
            );
        }

        const existing =
            this.findEdge(
                source,
                destination
            );

        if (existing) {
            throw new Error(
                `Connection ${source} -> ${destination} already exists`
            );
        }

        this.adjacencyList
            .get(source)
            .push({
                to: destination,
                weight
            });

        if (!isDirected) {
            const reverseExists =
                this.findEdge(
                    destination,
                    source
                );

            if (!reverseExists) {
                this.adjacencyList
                    .get(destination)
                    .push({
                        to: source,
                        weight
                    });
            }
        }
    }

    removeConnection(
        source,
        destination
    ) {
        if (
            !this.hasLocation(source)
        ) {
            return false;
        }

        const neighbors =
            this.adjacencyList.get(
                source
            );

        const originalLength =
            neighbors.length;

        const filtered =
            neighbors.filter(
                (edge) =>
                    edge.to !==
                    destination
            );

        this.adjacencyList.set(
            source,
            filtered
        );

        return (
            filtered.length !==
            originalLength
        );
    }

    findEdge(
        source,
        destination
    ) {
        if (
            !this.hasLocation(source)
        ) {
            return null;
        }

        const neighbors =
            this.adjacencyList.get(
                source
            );

        return (
            neighbors.find(
                (edge) =>
                    edge.to ===
                    destination
            ) || null
        );
    }

    getNeighbors(locationId) {
        if (
            !this.hasLocation(
                locationId
            )
        ) {
            return [];
        }

        return [
            ...this.adjacencyList.get(
                locationId
            )
        ];
    }

    getLocationCount() {
        return this.adjacencyList.size;
    }

    getEdgeCount() {
        let count = 0;

        for (
            const neighbors
            of this.adjacencyList.values()
        ) {
            count += neighbors.length;
        }

        return count;
    }

    /*
     * Breadth First Search
     */
    bfs(startLocation) {
        if (
            !this.hasLocation(
                startLocation
            )
        ) {
            return [];
        }

        const visited =
            new Set();

        const queue = [];

        const result = [];

        visited.add(
            startLocation
        );

        queue.push(
            startLocation
        );

        while (
            queue.length > 0
        ) {
            const current =
                queue.shift();

            result.push(current);

            const neighbors =
                this.getNeighbors(
                    current
                );

            for (
                const edge
                of neighbors
            ) {
                if (
                    !visited.has(
                        edge.to
                    )
                ) {
                    visited.add(
                        edge.to
                    );

                    queue.push(
                        edge.to
                    );
                }
            }
        }

        return result;
    }

    /*
     * Depth First Search
     */
    dfs(startLocation) {
        if (
            !this.hasLocation(
                startLocation
            )
        ) {
            return [];
        }

        const visited =
            new Set();

        const result = [];

        const visit = (
            locationId
        ) => {
            if (
                visited.has(
                    locationId
                )
            ) {
                return;
            }

            visited.add(
                locationId
            );

            result.push(
                locationId
            );

            const neighbors =
                this.getNeighbors(
                    locationId
                );

            for (
                const edge
                of neighbors
            ) {
                visit(edge.to);
            }
        };

        visit(startLocation);

        return result;
    }

    /*
     * Dijkstra shortest path.
     *
     * This is included here as the next
     * DSA foundation, but we will expose
     * it through the API in STEP 6.
     */
    dijkstra(
        source,
        destination
    ) {
        if (
            !this.hasLocation(
                source
            )
        ) {
            throw new Error(
                `Source location ${source} does not exist`
            );
        }

        if (
            !this.hasLocation(
                destination
            )
        ) {
            throw new Error(
                `Destination location ${destination} does not exist`
            );
        }

        if (
            source === destination
        ) {
            return {
                reachable: true,
                distance: 0,
                path: [source]
            };
        }

        const distances =
            new Map();

        const previous =
            new Map();

        for (
            const locationId
            of this.adjacencyList.keys()
        ) {
            distances.set(
                locationId,
                Infinity
            );

            previous.set(
                locationId,
                null
            );
        }

        distances.set(
            source,
            0
        );

        /*
         * MinHeap compares objects
         * by distance.
         */
        const priorityQueue =
            new MinHeap(
                (a, b) =>
                    a.distance -
                    b.distance
            );

        priorityQueue.insert({
            locationId: source,
            distance: 0
        });

        while (
            !priorityQueue.isEmpty()
        ) {
            const current =
                priorityQueue.extractMin();

            const currentLocation =
                current.locationId;

            const currentDistance =
                current.distance;

            /*
             * Ignore stale heap entries.
             */
            if (
                currentDistance >
                distances.get(
                    currentLocation
                )
            ) {
                continue;
            }

            /*
             * We can stop once the
             * destination is extracted.
             */
            if (
                currentLocation ===
                destination
            ) {
                break;
            }

            const neighbors =
                this.getNeighbors(
                    currentLocation
                );

            for (
                const edge
                of neighbors
            ) {
                const newDistance =
                    currentDistance +
                    edge.weight;

                const oldDistance =
                    distances.get(
                        edge.to
                    );

                if (
                    newDistance <
                    oldDistance
                ) {
                    distances.set(
                        edge.to,
                        newDistance
                    );

                    previous.set(
                        edge.to,
                        currentLocation
                    );

                    priorityQueue.insert({
                        locationId:
                            edge.to,

                        distance:
                            newDistance
                    });
                }
            }
        }

        const destinationDistance =
            distances.get(
                destination
            );

        if (
            destinationDistance ===
            Infinity
        ) {
            return {
                reachable: false,
                distance: null,
                path: []
            };
        }

        /*
         * Reconstruct path.
         */
        const path = [];

        let current =
            destination;

        while (
            current !== null
        ) {
            path.push(current);

            current =
                previous.get(
                    current
                );
        }

        path.reverse();

        return {
            reachable: true,
            distance:
                destinationDistance,
            path
        };
    }

    /*
     * Return all locations reachable
     * from a starting node.
     */
    getReachableLocations(
        startLocation
    ) {
        return this.bfs(
            startLocation
        );
    }

    /*
     * Find connected components.
     *
     * For directed graphs this represents
     * reachability components based on
     * outgoing edges.
     */
    getConnectedComponents() {
        const visited =
            new Set();

        const components = [];

        for (
            const locationId
            of this.adjacencyList.keys()
        ) {
            if (
                visited.has(
                    locationId
                )
            ) {
                continue;
            }

            const component = [];

            const stack = [
                locationId
            ];

            visited.add(
                locationId
            );

            while (
                stack.length > 0
            ) {
                const current =
                    stack.pop();

                component.push(
                    current
                );

                const neighbors =
                    this.getNeighbors(
                        current
                    );

                for (
                    const edge
                    of neighbors
                ) {
                    if (
                        !visited.has(
                            edge.to
                        )
                    ) {
                        visited.add(
                            edge.to
                        );

                        stack.push(
                            edge.to
                        );
                    }
                }
            }

            components.push(
                component
            );
        }

        return components;
    }

    /*
     * Useful when debugging or testing.
     */
    toObject() {
        const result = {};

        for (
            const [
                locationId,
                neighbors
            ]
            of this.adjacencyList
        ) {
            result[locationId] =
                neighbors.map(
                    (edge) => ({
                        to: edge.to,
                        weight:
                            edge.weight
                    })
                );
        }

        return result;
    }
}