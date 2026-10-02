    export default class MinHeap {
        constructor(compareFunction) {
            this.heap = [];

            this.compare =
                compareFunction ||
                ((a, b) => a - b);
        }

        size() {
            return this.heap.length;
        }

        isEmpty() {
            return this.heap.length === 0;
        }

        peek() {
            if (this.isEmpty()) {
                return null;
            }

            return this.heap[0];
        }

        insert(value) {
            this.heap.push(value);

            this.bubbleUp(
                this.heap.length - 1
            );
        }

        extractMin() {
            if (this.isEmpty()) {
                return null;
            }

            if (this.heap.length === 1) {
                return this.heap.pop();
            }

            const minimum = this.heap[0];

            this.heap[0] =
                this.heap.pop();

            this.bubbleDown(0);

            return minimum;
        }

        bubbleUp(index) {
            while (index > 0) {
                const parentIndex =
                    Math.floor(
                        (index - 1) / 2
                    );

                if (
                    this.compare(
                        this.heap[index],
                        this.heap[parentIndex]
                    ) >= 0
                ) {
                    break;
                }

                this.swap(
                    index,
                    parentIndex
                );

                index = parentIndex;
            }
        }

        bubbleDown(index) {
            const length =
                this.heap.length;

            while (true) {
                const leftIndex =
                    index * 2 + 1;

                const rightIndex =
                    index * 2 + 2;

                let smallestIndex =
                    index;

                if (
                    leftIndex < length &&
                    this.compare(
                        this.heap[leftIndex],
                        this.heap[smallestIndex]
                    ) < 0
                ) {
                    smallestIndex =
                        leftIndex;
                }

                if (
                    rightIndex < length &&
                    this.compare(
                        this.heap[rightIndex],
                        this.heap[smallestIndex]
                    ) < 0
                ) {
                    smallestIndex =
                        rightIndex;
                }

                if (
                    smallestIndex ===
                    index
                ) {
                    break;
                }

                this.swap(
                    index,
                    smallestIndex
                );

                index = smallestIndex;
            }
        }

        swap(indexA, indexB) {
            const temporary =
                this.heap[indexA];

            this.heap[indexA] =
                this.heap[indexB];

            this.heap[indexB] =
                temporary;
        }

        clear() {
            this.heap = [];
        }

        toArray() {
            return [...this.heap];
        }
    }