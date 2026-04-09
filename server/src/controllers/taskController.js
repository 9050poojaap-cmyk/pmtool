import { validationResult } from "express-validator";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { logActivity } from "../services/activity.js";
import {
  saveTaskVersion,
  getVersionsForTask,
} from "../services/taskVersion.js";
import { TaskVersion } from "../models/TaskVersion.js";
import { Comment } from "../models/Comment.js";
import { emitToProject, emitToUser } from "../socket/index.js";
import { notifyTaskAssigned } from "../services/mailer.js";
import { applyAutoPriorityToTask } from "../services/autoPriority.js";

const STATUSES = ["To Do", "In Progress", "Done"];

async function nextPosition(projectId, status) {
  const last = await Task.findOne({ projectId, status })
    .sort({ position: -1 })
    .lean();
  return (last?.position ?? -1) + 1;
}

export async function createTask(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const projectId = req.project._id;
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      labels,
      autoPriority,
      location,
      attachments,
    } = req.body;
    const st = STATUSES.includes(status) ? status : "To Do";
    const position = await nextPosition(projectId, st);
    const task = await Task.create({
      title,
      description: description || "",
      status: st,
      priority: priority || "Medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || null,
      projectId,
      labels: Array.isArray(labels) ? labels : [],
      position,
      autoPriority: autoPriority !== false,
      attachments: Array.isArray(attachments) ? attachments : [],
      location:
        location &&
        typeof location.lat === "number" &&
        typeof location.lng === "number"
          ? {
              lat: location.lat,
              lng: location.lng,
              label: location.label || "",
              capturedAt: location.capturedAt
                ? new Date(location.capturedAt)
                : new Date(),
            }
          : null,
    });
    if (task.autoPriority) {
      applyAutoPriorityToTask(task);
      await task.save();
    } else if (priority) {
      task.priority = priority;
      await task.save();
    }
    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("projectId", "title workspaceId");
    await logActivity({
      action: `${req.user.name} created task "${title}"`,
      userId: req.user._id,
      taskId: task._id,
      projectId,
    });
    await saveTaskVersion(task, req.user._id, "created");
    emitToProject(projectId.toString(), "task:created", { task: populated });
    if (assignedTo) {
      const assignee = await User.findById(assignedTo);
      const proj = await Project.findById(projectId);
      if (assignee && proj) {
        await notifyTaskAssigned({
          assigneeEmail: assignee.email,
          assigneeName: assignee.name,
          taskTitle: title,
          projectTitle: proj.title,
        });
        emitToUser(assignee._id.toString(), "notification", {
          type: "task_assigned",
          message: `You were assigned: ${title}`,
          taskId: task._id,
          projectId,
        });
      }
    }
    res.status(201).json({ task: populated });
  } catch (e) {
    next(e);
  }
}

export async function listTasks(req, res, next) {
  try {
    const projectId = req.params.projectId || req.query.projectId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;
    const filter = { projectId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.label) filter.labels = req.query.label;
    if (req.query.search) {
      filter.title = { $regex: req.query.search, $options: "i" };
    }
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("assignedTo", "name email avatarUrl")
        .sort({ status: 1, position: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter),
    ]);
    res.json({
      tasks,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    next(e);
  }
}

export async function getTask(req, res, next) {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      projectId: req.params.projectId,
    })
      .populate("assignedTo", "name email avatarUrl")
      .populate("projectId", "title workspaceId");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json({ task });
  } catch (e) {
    next(e);
  }
}

export async function updateTask(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const task = await Task.findOne({
      _id: req.params.taskId,
      projectId: req.params.projectId,
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const prevAssigned = task.assignedTo?.toString();
    await saveTaskVersion(task, req.user._id, "before update");
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      labels,
      autoPriority,
      location,
      attachments,
    } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined && STATUSES.includes(status)) {
      const oldStatus = task.status;
      task.status = status;
      if (oldStatus !== status) {
        task.position = await nextPosition(task.projectId, status);
      }
    }
    if (dueDate !== undefined)
      task.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
    if (labels !== undefined) task.labels = Array.isArray(labels) ? labels : [];
    if (attachments !== undefined) {
      task.attachments = Array.isArray(attachments) ? attachments : [];
    }
    if (autoPriority !== undefined) task.autoPriority = !!autoPriority;
    if (location !== undefined) {
      if (location === null) {
        task.location = null;
      } else if (
        typeof location.lat === "number" &&
        typeof location.lng === "number"
      ) {
        task.location = {
          lat: location.lat,
          lng: location.lng,
          label: location.label || "",
          capturedAt: location.capturedAt
            ? new Date(location.capturedAt)
            : new Date(),
        };
      }
    }
    if (task.autoPriority) {
      applyAutoPriorityToTask(task);
    } else if (priority !== undefined) {
      task.priority = priority;
    }
    await task.save();
    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("projectId", "title workspaceId");
    await logActivity({
      action: `${req.user.name} updated task "${populated.title}"`,
      userId: req.user._id,
      taskId: task._id,
      projectId: task.projectId,
    });
    emitToProject(task.projectId.toString(), "task:updated", {
      task: populated,
    });
    if (
      assignedTo !== undefined &&
      populated.assignedTo &&
      populated.assignedTo._id.toString() !== prevAssigned
    ) {
      const assignee = populated.assignedTo;
      const proj = await Project.findById(task.projectId);
      await notifyTaskAssigned({
        assigneeEmail: assignee.email,
        assigneeName: assignee.name,
        taskTitle: populated.title,
        projectTitle: proj?.title || "",
      });
      emitToUser(assignee._id.toString(), "notification", {
        type: "task_assigned",
        message: `You were assigned: ${populated.title}`,
        taskId: task._id,
        projectId: task.projectId,
      });
    }
    res.json({ task: populated });
  } catch (e) {
    next(e);
  }
}

export async function moveTask(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { taskId, status, position } = req.body;
    const projectId = req.project._id;
    const task = await Task.findOne({ _id: taskId, projectId });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const oldStatus = task.status;
    await saveTaskVersion(task, req.user._id, `move from ${oldStatus}`);
    task.status = status;
    if (position !== undefined && position !== null) {
      task.position = Number(position);
    } else {
      task.position = await nextPosition(projectId, status);
    }
    await task.save();
    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("projectId", "title workspaceId");
    await logActivity({
      action: `${req.user.name} moved task "${populated.title}" to ${status}`,
      userId: req.user._id,
      taskId: task._id,
      projectId: task.projectId,
      metadata: { from: oldStatus, to: status },
    });
    emitToProject(projectId.toString(), "task:moved", { task: populated });
    res.json({ task: populated });
  } catch (e) {
    next(e);
  }
}

export async function reorderColumn(req, res, next) {
  try {
    const { status, orderedTaskIds } = req.body;
    const projectId = req.params.projectId;
    if (!STATUSES.includes(status) || !Array.isArray(orderedTaskIds)) {
      return res.status(400).json({ message: "Invalid payload" });
    }
    const ops = orderedTaskIds.map((id, index) =>
      Task.updateOne(
        { _id: id, projectId, status },
        { $set: { position: index } },
      ),
    );
    await Promise.all(ops);
    const tasks = await Task.find({ projectId, status })
      .populate("assignedTo", "name email avatarUrl")
      .sort({ position: 1 })
      .lean();
    emitToProject(projectId.toString(), "tasks:reordered", { status, tasks });
    res.json({ success: true, tasks });
  } catch (e) {
    next(e);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const task = await Task.findOne({
      _id: req.params.taskId,
      projectId: req.params.projectId,
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const title = task.title;
    const projectId = task.projectId;
    await TaskVersion.deleteMany({ taskId: task._id });
    await Comment.deleteMany({ taskId: task._id });
    await task.deleteOne();
    await logActivity({
      action: `${req.user.name} deleted task "${title}"`,
      userId: req.user._id,
      projectId,
      metadata: { deletedTitle: title },
    });
    emitToProject(projectId.toString(), "task:deleted", {
      taskId: req.params.taskId,
    });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

export async function listVersions(req, res, next) {
  try {
    const versions = await getVersionsForTask(req.params.taskId);
    res.json({ versions });
  } catch (e) {
    next(e);
  }
}

export async function rollbackTask(req, res, next) {
  try {
    const version = Number(req.body?.version);
    if (!Number.isInteger(version) || version < 1) {
      return res.status(400).json({ message: "Valid version number required" });
    }
    const task = await Task.findOne({
      _id: req.params.taskId,
      projectId: req.params.projectId,
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const snapDoc = await TaskVersion.findOne({
      taskId: task._id,
      version: Number(version),
    });
    if (!snapDoc) {
      return res.status(404).json({ message: "Version not found" });
    }
    await saveTaskVersion(task, req.user._id, "before rollback");
    const s = snapDoc.snapshot;
    task.title = s.title;
    task.description = s.description;
    task.status = s.status;
    task.priority = s.priority;
    task.dueDate = s.dueDate;
    task.assignedTo = s.assignedTo || null;
    task.labels = s.labels || [];
    task.attachments = s.attachments || [];
    if (s.autoPriority !== undefined) task.autoPriority = s.autoPriority;
    task.location = s.location || null;
    await task.save();
    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email avatarUrl")
      .populate("projectId", "title workspaceId");
    await logActivity({
      action: `${req.user.name} rolled back task "${populated.title}" to version ${version}`,
      userId: req.user._id,
      taskId: task._id,
      projectId: task.projectId,
    });
    emitToProject(task.projectId.toString(), "task:updated", {
      task: populated,
    });
    res.json({ task: populated });
  } catch (e) {
    next(e);
  }
}
