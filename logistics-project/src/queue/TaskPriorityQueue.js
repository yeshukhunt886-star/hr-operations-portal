const MinHeap = require('../graph/MinHeap');

// Orders delivery tasks by: priority (lower = more urgent), then
// deadline (earlier first, nulls last), then createdAt/id as a
// deterministic tie-breaker (edge case #14).

function compareTasks(a, b) {
  if (a.priority !== b.priority) return a.priority - b.priority;

  const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
  const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
  if (aDeadline !== bDeadline) return aDeadline - bDeadline;

  const aCreated = new Date(a.created_at).getTime();
  const bCreated = new Date(b.created_at).getTime();
  if (aCreated !== bCreated) return aCreated - bCreated;

  return a.id - b.id;
}

// Builds an ordered (most-urgent-first) list of tasks using the min-heap.
// Pure function of the input array — independently testable.
function orderTasksByPriority(tasks) {
  const heap = new MinHeap(compareTasks);
  for (const task of tasks) heap.push(task);
  const ordered = [];
  while (!heap.isEmpty()) ordered.push(heap.pop());
  return ordered;
}

const MIN_PRIORITY = 1;
const MAX_PRIORITY = 10;

function isValidPriority(priority) {
  return Number.isInteger(priority) && priority >= MIN_PRIORITY && priority <= MAX_PRIORITY;
}

module.exports = { orderTasksByPriority, compareTasks, isValidPriority, MIN_PRIORITY, MAX_PRIORITY };
