import MinHeap from "./MinHeap.js";

// Priority queue for delivery tasks.
class DeliveryPriorityQueue {
    constructor() {
        this.heap = new MinHeap((a, b) => this.compare(a, b));
    }

    // Lower priority number means higher priority.
    // 1 = Critical, 2 = High, 3 = Normal, 4 = Low, 5 = Very Low.
    compare(a, b) {
        const priorityA = Number(a.priority);
        const priorityB = Number(b.priority);

        if (priorityA !== priorityB) {
            return priorityA - priorityB;
        }

        const deadlineA = a.deadline
            ? new Date(a.deadline).getTime()
            : Number.MAX_SAFE_INTEGER;

        const deadlineB = b.deadline
            ? new Date(b.deadline).getTime()
            : Number.MAX_SAFE_INTEGER;

        if (deadlineA !== deadlineB) {
            return deadlineA - deadlineB;
        }

        return Number(a.id) - Number(b.id);
    }

    // Add a task.
    enqueue(task) {
        if (!task) {
            return;
        }

        this.heap.insert(task);
    }

    // Remove highest-priority task.
    dequeue() {
        return this.heap.extractMin();
    }

    // View highest-priority task.
    peek() {
        return this.heap.peek();
    }

    // Get queue size.
    size() {
        return this.heap.size();
    }

    // Check whether queue is empty.
    isEmpty() {
        return this.heap.isEmpty();
    }

    // Return tasks in priority order without permanently changing the queue.
    toArray() {
        const result = [];
        const temporary = [];

        while (!this.heap.isEmpty()) {
            const task = this.heap.extractMin();

            if (task) {
                result.push(task);
                temporary.push(task);
            }
        }

        for (const task of temporary) {
            this.heap.insert(task);
        }

        return result;
    }

    // Clear queue.
    clear() {
        this.heap.clear();
    }
}

export default DeliveryPriorityQueue;