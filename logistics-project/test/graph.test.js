const test = require('node:test');
const assert = require('node:assert');
const Graph = require('../src/graph/Graph');
const MinHeap = require('../src/graph/MinHeap');
const { orderTasksByPriority } = require('../src/queue/TaskPriorityQueue');

test('MinHeap pops in ascending order', () => {
  const heap = new MinHeap((a, b) => a - b);
  [5, 1, 4, 2, 8, 0].forEach((n) => heap.push(n));
  const out = [];
  while (!heap.isEmpty()) out.push(heap.pop());
  assert.deepStrictEqual(out, [0, 1, 2, 4, 5, 8]);
});

test('dijkstra: same source and destination returns zero-cost path (#1)', () => {
  const g = new Graph();
  g.addNode('A');
  const result = g.dijkstra('A', 'A');
  assert.strictEqual(result.distance, 0);
  assert.deepStrictEqual(result.path, ['A']);
});

test('dijkstra: missing source/destination throws (#2, #3)', () => {
  const g = new Graph();
  g.addNode('A');
  assert.throws(() => g.dijkstra('X', 'A'), /does not exist/);
  assert.throws(() => g.dijkstra('A', 'X'), /does not exist/);
});

test('dijkstra: unreachable destination is reported cleanly (#4)', () => {
  const g = new Graph();
  g.addNode('A');
  g.addNode('B');
  const result = g.dijkstra('A', 'B');
  assert.strictEqual(result.reachable, false);
  assert.strictEqual(result.distance, Infinity);
});

test('dijkstra: handles cycles without infinite loop (#5)', () => {
  const g = new Graph();
  g.addEdge('A', 'B', 1);
  g.addEdge('B', 'C', 1);
  g.addEdge('C', 'A', 1); // cycle back to A
  const result = g.dijkstra('A', 'C');
  assert.strictEqual(result.distance, 2);
  assert.deepStrictEqual(result.path, ['A', 'B', 'C']);
});

test('dijkstra: finds shortest of multiple paths', () => {
  const g = new Graph();
  g.addEdge('A', 'B', 5);
  g.addEdge('A', 'C', 1);
  g.addEdge('C', 'B', 1);
  const result = g.dijkstra('A', 'B');
  assert.strictEqual(result.distance, 2);
  assert.deepStrictEqual(result.path, ['A', 'C', 'B']);
});

test('negative edge weight is rejected (#10)', () => {
  const g = new Graph();
  assert.throws(() => g.addEdge('A', 'B', -1), /Negative edge weights/);
});

test('zero-weight edge is allowed (#9)', () => {
  const g = new Graph();
  g.addEdge('A', 'B', 0);
  const result = g.dijkstra('A', 'B');
  assert.strictEqual(result.distance, 0);
});

test('bfsReachable finds all reachable nodes and handles isolated nodes (#6)', () => {
  const g = new Graph();
  g.addEdge('A', 'B', 1);
  g.addEdge('B', 'C', 1);
  g.addNode('Isolated');
  const reachableFromA = g.bfsReachable('A');
  assert.deepStrictEqual([...reachableFromA].sort(), ['A', 'B', 'C']);
  const reachableFromIsolated = g.bfsReachable('Isolated');
  assert.deepStrictEqual([...reachableFromIsolated], ['Isolated']);
});

test('directed edge is not traversable in reverse (#8)', () => {
  const g = new Graph();
  g.addEdge('A', 'B', 1); // directed A -> B only
  const result = g.dijkstra('B', 'A');
  assert.strictEqual(result.reachable, false);
});

test('orderTasksByPriority orders by priority then deadline then id (#14)', () => {
  const tasks = [
    { id: 1, priority: 5, deadline: null, created_at: '2024-01-01T00:00:00Z' },
    { id: 2, priority: 1, deadline: null, created_at: '2024-01-01T00:00:00Z' },
    { id: 3, priority: 1, deadline: '2024-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z' }
  ];
  const ordered = orderTasksByPriority(tasks);
  assert.deepStrictEqual(ordered.map((t) => t.id), [3, 2, 1]);
});
