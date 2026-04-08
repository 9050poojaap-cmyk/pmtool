/** Days until due (start of UTC day). Returns null if no due date. */
function daysUntilDue(dueDate) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const startToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startDue = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return Math.ceil((startDue - startToday) / (24 * 60 * 60 * 1000));
}

/**
 * Rule: <=1 day → High, <=3 days → Medium, else Low.
 * Overdue (negative days) → High.
 */
export function derivePriorityFromDueDate(dueDate) {
  const d = daysUntilDue(dueDate);
  if (d === null) return 'Medium';
  if (d <= 1) return 'High';
  if (d <= 3) return 'Medium';
  return 'Low';
}

export function applyAutoPriorityToTask(taskDoc) {
  if (!taskDoc.autoPriority) return;
  taskDoc.priority = derivePriorityFromDueDate(taskDoc.dueDate);
}
