import test from "node:test";
import assert from "node:assert/strict";

import MinHeap
    from "../src/dsa/MinHeap.js";

import Graph
    from "../src/dsa/Graph.js";


test("MinHeap extracts values in ascending order", () => {
    const heap =
        new MinHeap();

    heap.insert(50);
    heap.insert(20);
    heap.insert(10);
    heap.insert(40);
    heap.insert(5);

    assert.equal(
        heap.extractMin(),
        5
    );

    assert.equal(
        heap.extractMin(),
        10
    );

    assert.equal(
        heap.extractMin(),
        20
    );

    assert.equal(
        heap.extractMin(),
        40
    );

    assert.equal(
        heap.extractMin(),
        50
    );

    assert.equal(
        heap.isEmpty(),
        true
    );
});


test("MinHeap works with objects", () => {
    const heap =
        new MinHeap(
            (a, b) =>
                a.priority -
                b.priority
        );

    heap.insert({
        id: "A",
        priority: 30
    });

    heap.insert({
        id: "B",
        priority: 10
    });

    heap.insert({
        id: "C",
        priority: 20
    });

    assert.equal(
        heap.extractMin().id,
        "B"
    );

    assert.equal(
        heap.extractMin().id,
        "C"
    );

    assert.equal(
        heap.extractMin().id,
        "A"
    );
});


test("Graph creates locations", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);

    assert.equal(
        graph.hasLocation(1),
        true
    );

    assert.equal(
        graph.hasLocation(2),
        true
    );

    assert.equal(
        graph.getLocationCount(),
        2
    );
});


test("Graph creates directed connection", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);

    graph.addConnection(
        1,
        2,
        10,
        true
    );

    assert.deepEqual(
        graph.getNeighbors(1),
        [
            {
                to: 2,
                weight: 10
            }
        ]
    );

    assert.deepEqual(
        graph.getNeighbors(2),
        []
    );
});


test("Graph creates bidirectional connection", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);

    graph.addConnection(
        1,
        2,
        15,
        false
    );

    assert.deepEqual(
        graph.getNeighbors(1),
        [
            {
                to: 2,
                weight: 15
            }
        ]
    );

    assert.deepEqual(
        graph.getNeighbors(2),
        [
            {
                to: 1,
                weight: 15
            }
        ]
    );
});


test("Graph rejects negative weights", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);

    assert.throws(
        () => {
            graph.addConnection(
                1,
                2,
                -5,
                true
            );
        },
        /Negative edge weights/
    );
});


test("Graph rejects duplicate connections", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);

    graph.addConnection(
        1,
        2,
        10,
        true
    );

    assert.throws(
        () => {
            graph.addConnection(
                1,
                2,
                20,
                true
            );
        },
        /already exists/
    );
});


test("BFS finds reachable locations", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);
    graph.addLocation(3);
    graph.addLocation(4);

    graph.addConnection(
        1,
        2,
        10,
        true
    );

    graph.addConnection(
        2,
        3,
        10,
        true
    );

    graph.addConnection(
        3,
        4,
        10,
        true
    );

    const result =
        graph.bfs(1);

    assert.deepEqual(
        result,
        [1, 2, 3, 4]
    );
});


test("DFS finds reachable locations", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);
    graph.addLocation(3);

    graph.addConnection(
        1,
        2,
        10,
        true
    );

    graph.addConnection(
        2,
        3,
        10,
        true
    );

    const result =
        graph.dfs(1);

    assert.deepEqual(
        result,
        [1, 2, 3]
    );
});


test("Dijkstra finds shortest path", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);
    graph.addLocation(3);
    graph.addLocation(4);

    graph.addConnection(
        1,
        2,
        10,
        true
    );

    graph.addConnection(
        1,
        3,
        5,
        true
    );

    graph.addConnection(
        3,
        2,
        2,
        true
    );

    graph.addConnection(
        2,
        4,
        1,
        true
    );

    graph.addConnection(
        3,
        4,
        20,
        true
    );

    const result =
        graph.dijkstra(
            1,
            4
        );

    assert.equal(
        result.reachable,
        true
    );

    assert.equal(
        result.distance,
        8
    );

    assert.deepEqual(
        result.path,
        [1, 3, 2, 4]
    );
});


test("Dijkstra returns unreachable result", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);
    graph.addLocation(3);

    graph.addConnection(
        1,
        2,
        10,
        true
    );

    const result =
        graph.dijkstra(
            1,
            3
        );

    assert.equal(
        result.reachable,
        false
    );

    assert.equal(
        result.distance,
        null
    );

    assert.deepEqual(
        result.path,
        []
    );
});


test("Dijkstra same source and destination returns zero", () => {
    const graph =
        new Graph();

    graph.addLocation(1);

    const result =
        graph.dijkstra(
            1,
            1
        );

    assert.equal(
        result.reachable,
        true
    );

    assert.equal(
        result.distance,
        0
    );

    assert.deepEqual(
        result.path,
        [1]
    );
});


test("Graph handles cycles without infinite traversal", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);
    graph.addLocation(3);

    graph.addConnection(
        1,
        2,
        5,
        true
    );

    graph.addConnection(
        2,
        3,
        5,
        true
    );

    graph.addConnection(
        3,
        1,
        5,
        true
    );

    const result =
        graph.bfs(1);

    assert.deepEqual(
        result,
        [1, 2, 3]
    );
});


test("Graph supports isolated locations", () => {
    const graph =
        new Graph();

    graph.addLocation(1);
    graph.addLocation(2);

    assert.deepEqual(
        graph.bfs(1),
        [1]
    );

    assert.deepEqual(
        graph.dfs(2),
        [2]
    );
});