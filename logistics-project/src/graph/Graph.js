const MinHeap = require('./MinHeap');

/**
 * Adjacency-list weighted graph. Pure in-memory data structure —
 * no HTTP/DB dependency, so it is independently unit-testable.
 *
 * Node ids are opaque (we use DB location ids, but any comparable
 * value works). Edges are directed by default; a "bidirectional"
 * edge is simply added as two directed edges by the caller.
 */
class Graph {
  constructor() {
    /** @type {Map<any, Array<{to: any, weight: number, connectionId: any}>>} */
    this.adjacency = new Map();
  }

  addNode(id) {
    if (!this.adjacency.has(id)) this.adjacency.set(id, []);
  }

  hasNode(id) {
    return this.adjacency.has(id);
  }

  removeNode(id) {
    this.adjacency.delete(id);
    for (const edges of this.adjacency.values()) {
      const idx = edges.findIndex((e) => e.to === id);
      if (idx !== -1) edges.splice(idx, 1);
    }
  }

  /**
   * Adds a directed edge from -> to with given weight.
   * Negative weights are rejected (Dijkstra precondition, edge case #10).
   */
  addEdge(from, to, weight, connectionId = null) {
    if (weight < 0) {
      throw new Error('Negative edge weights are not allowed for Dijkstra-based routing.');
    }
    this.addNode(from);
    this.addNode(to);
    this.adjacency.get(from).push({ to, weight, connectionId });
  }

  removeEdge(from, to) {
    const edges = this.adjacency.get(from);
    if (!edges) return;
    const idx = edges.findIndex((e) => e.to === to);
    if (idx !== -1) edges.splice(idx, 1);
  }

  neighbors(id) {
    return this.adjacency.get(id) || [];
  }

  nodeCount() {
    return this.adjacency.size;
  }

  /**
   * Dijkstra shortest path using a binary min-heap.
   * Returns { distance, path, reachable }.
   * - source === destination -> { distance: 0, path: [source], reachable: true } (edge case #1)
   * - source or destination missing -> throws NotFoundError-style Error with code
   * - unreachable -> { distance: Infinity, path: [], reachable: false } (edge case #4)
   * - cycles are safe because we track finalized (visited) distances (edge case #5)
   */
  dijkstra(source, destination) {
    if (!this.hasNode(source)) {
      const err = new Error(`Source location "${source}" does not exist in the graph.`);
      err.code = 'SOURCE_NOT_FOUND';
      throw err;
    }
    if (!this.hasNode(destination)) {
      const err = new Error(`Destination location "${destination}" does not exist in the graph.`);
      err.code = 'DESTINATION_NOT_FOUND';
      throw err;
    }

    if (source === destination) {
      return { distance: 0, path: [source], reachable: true };
    }

    const distances = new Map();
    const previous = new Map();
    const visited = new Set();

    for (const node of this.adjacency.keys()) distances.set(node, Infinity);
    distances.set(source, 0);

    // Min-heap ordered by distance, tie-broken by insertion order for determinism (#11).
    const heap = new MinHeap((a, b) => a.distance - b.distance);
    heap.push({ node: source, distance: 0 });

    while (!heap.isEmpty()) {
      const { node, distance } = heap.pop();

      if (visited.has(node)) continue; // stale heap entry
      visited.add(node);

      if (node === destination) break;

      for (const edge of this.neighbors(node)) {
        if (visited.has(edge.to)) continue;
        const candidate = distance + edge.weight;
        if (candidate < distances.get(edge.to)) {
          distances.set(edge.to, candidate);
          previous.set(edge.to, node);
          heap.push({ node: edge.to, distance: candidate });
        }
      }
    }

    const finalDistance = distances.get(destination);
    if (finalDistance === undefined || finalDistance === Infinity) {
      return { distance: Infinity, path: [], reachable: false };
    }

    // Reconstruct path
    const path = [destination];
    let cur = destination;
    while (previous.has(cur)) {
      cur = previous.get(cur);
      path.push(cur);
    }
    path.reverse();

    return { distance: finalDistance, path, reachable: true };
  }

  /**
   * BFS reachability: returns the set of node ids reachable from source
   * (including source itself). Handles cycles and isolated nodes safely.
   */
  bfsReachable(source) {
    if (!this.hasNode(source)) {
      const err = new Error(`Location "${source}" does not exist in the graph.`);
      err.code = 'SOURCE_NOT_FOUND';
      throw err;
    }
    const visited = new Set([source]);
    const queue = [source];
    let head = 0;
    while (head < queue.length) {
      const node = queue[head++];
      for (const edge of this.neighbors(node)) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    return visited;
  }

  /** Iterative DFS variant of reachability (same semantics as bfsReachable). */
  dfsReachable(source) {
    if (!this.hasNode(source)) {
      const err = new Error(`Location "${source}" does not exist in the graph.`);
      err.code = 'SOURCE_NOT_FOUND';
      throw err;
    }
    const visited = new Set();
    const stack = [source];
    while (stack.length) {
      const node = stack.pop();
      if (visited.has(node)) continue;
      visited.add(node);
      for (const edge of this.neighbors(node)) {
        if (!visited.has(edge.to)) stack.push(edge.to);
      }
    }
    return visited;
  }

  /**
   * Connected components treating the graph as undirected
   * (useful for a general "reachability overview" of the network).
   */
  connectedComponents() {
    const undirected = new Map();
    for (const [node, edges] of this.adjacency.entries()) {
      if (!undirected.has(node)) undirected.set(node, new Set());
      for (const edge of edges) {
        if (!undirected.has(edge.to)) undirected.set(edge.to, new Set());
        undirected.get(node).add(edge.to);
        undirected.get(edge.to).add(node);
      }
    }

    const visited = new Set();
    const components = [];
    for (const node of undirected.keys()) {
      if (visited.has(node)) continue;
      const component = [];
      const stack = [node];
      visited.add(node);
      while (stack.length) {
        const cur = stack.pop();
        component.push(cur);
        for (const neighbor of undirected.get(cur)) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            stack.push(neighbor);
          }
        }
      }
      components.push(component);
    }
    return components;
  }
}

module.exports = Graph;
