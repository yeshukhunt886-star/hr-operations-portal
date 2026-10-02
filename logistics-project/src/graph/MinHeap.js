/**
 * Generic binary min-heap / priority queue.
 * Used by Dijkstra (distance ordering) and the delivery task
 * scheduler (priority/deadline ordering).
 *
 * compare(a, b) must return < 0 if a comes before b, > 0 if after, 0 if equal.
 */
class MinHeap {
  constructor(compare) {
    this._heap = [];
    this._compare = compare || ((a, b) => a - b);
  }

  size() {
    return this._heap.length;
  }

  isEmpty() {
    return this._heap.length === 0;
  }

  peek() {
    return this._heap[0];
  }

  push(item) {
    this._heap.push(item);
    this._bubbleUp(this._heap.length - 1);
  }

  pop() {
    if (this._heap.length === 0) return undefined;
    const top = this._heap[0];
    const last = this._heap.pop();
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._bubbleDown(0);
    }
    return top;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this._compare(this._heap[index], this._heap[parent]) < 0) {
        this._swap(index, parent);
        index = parent;
      } else break;
    }
  }

  _bubbleDown(index) {
    const n = this._heap.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;
      if (left < n && this._compare(this._heap[left], this._heap[smallest]) < 0) smallest = left;
      if (right < n && this._compare(this._heap[right], this._heap[smallest]) < 0) smallest = right;
      if (smallest === index) break;
      this._swap(index, smallest);
      index = smallest;
    }
  }

  _swap(i, j) {
    const tmp = this._heap[i];
    this._heap[i] = this._heap[j];
    this._heap[j] = tmp;
  }
}

module.exports = MinHeap;
