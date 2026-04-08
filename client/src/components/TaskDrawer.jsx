import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { commentApi, miscApi, taskApi } from '../api/services';
import { fetchTasks } from '../store/tasksSlice';
import { getSocket } from '../socket';

const LABEL_PRESETS = ['Bug', 'Feature', 'Urgent'];

function CommentNode({ node, onReply, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const u = node.user;
  const when = new Date(node.createdAt).toLocaleString();
  return (
    <div className={`border-l border-slate-200 dark:border-slate-800 pl-3 ${depth ? 'mt-3' : 'mt-2'}`}>
      <div className="text-sm flex items-center gap-2">
        {u?.avatarUrl ? (
          <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : null}
        <span className="font-medium">{u?.name}</span>
        <span className="text-slate-500 text-xs ml-2">{when}</span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 whitespace-pre-wrap">{node.text}</p>
      <button type="button" className="text-xs text-sky-600 mt-1" onClick={() => setOpen(!open)}>
        Reply
      </button>
      {open && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const text = fd.get('text');
            onReply(String(text), node._id);
            e.currentTarget.reset();
            setOpen(false);
          }}
        >
          <input
            name="text"
            className="flex-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm"
            required
          />
          <button type="submit" className="text-xs bg-sky-600 text-white rounded px-2">
            Send
          </button>
        </form>
      )}
      {(node.replies || []).map((ch) => (
        <CommentNode key={ch._id} node={ch} onReply={onReply} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function TaskDrawer({ projectId, task, isProjectAdmin, onClose }) {
  const dispatch = useDispatch();
  const filters = useSelector((s) => s.tasks.filters);
  const isCreate = !task;
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [status, setStatus] = useState(task?.status || 'To Do');
  const [priority, setPriority] = useState(task?.priority || 'Medium');
  const [dueDate, setDueDate] = useState(() => {
    const d = task?.dueDate;
    if (!d) return '';
    return typeof d === 'string' ? d.slice(0, 10) : new Date(d).toISOString().slice(0, 10);
  });
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo?._id || '');
  const [labels, setLabels] = useState((task?.labels || []).join(', ') || '');
  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [autoPriority, setAutoPriority] = useState(task?.autoPriority !== false);
  const [location, setLocation] = useState(task?.location || null);
  const [screenRecorder, setScreenRecorder] = useState(null);
  const screenChunksRef = useRef([]);
  const [comments, setComments] = useState([]);
  const [versions, setVersions] = useState([]);
  const [busy, setBusy] = useState(false);

  const refreshList = useCallback(async () => {
    await dispatch(
      fetchTasks({
        projectId,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        assignedTo: filters.assignedTo || undefined,
        label: filters.label || undefined,
        search: filters.search || undefined,
      })
    );
  }, [dispatch, projectId, filters]);

  useEffect(() => {
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    setStatus(task?.status || 'To Do');
    setPriority(task?.priority || 'Medium');
    setDueDate(
      task?.dueDate
        ? typeof task.dueDate === 'string'
          ? task.dueDate.slice(0, 10)
          : new Date(task.dueDate).toISOString().slice(0, 10)
        : ''
    );
    setAssignedTo(task?.assignedTo?._id || '');
    setLabels((task?.labels || []).join(', ') || '');
    setAttachments(task?.attachments || []);
    setAutoPriority(task?.autoPriority !== false);
    setLocation(task?.location || null);
  }, [task?._id]);

  const loadMeta = useCallback(async () => {
    if (!task?._id) return;
    const [c, v] = await Promise.all([
      commentApi.list(task._id),
      taskApi.versions(projectId, task._id),
    ]);
    setComments(c.data.comments || []);
    setVersions(v.data.versions || []);
  }, [task?._id, projectId]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const s = getSocket();
    if (!s || !task?._id) return undefined;
    const handler = (payload) => {
      if (String(payload.taskId) === String(task._id)) {
        loadMeta();
      }
    };
    s.on('comment:added', handler);
    return () => {
      s.off('comment:added', handler);
    };
  }, [task?._id, loadMeta]);

  async function uploadFile(file) {
    const { data } = await miscApi.upload(file);
    const row = {
      url: data.url,
      publicId: data.publicId,
      originalName: data.originalName,
      resourceType: data.resourceType || (file.type?.startsWith('video') ? 'video' : 'auto'),
    };
    const next = [...attachments, row];
    setAttachments(next);
    if (task?._id) {
      await taskApi.update(projectId, task._id, { attachments: next });
      await refreshList();
    }
  }

  async function saveTask(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const lbls = labels
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const body = {
        title,
        description,
        status,
        priority,
        dueDate: dueDate || null,
        assignedTo: assignedTo || null,
        labels: lbls,
        attachments,
        autoPriority,
        location,
      };
      if (isCreate) {
        await taskApi.create({ ...body, projectId });
      } else {
        await taskApi.update(projectId, task._id, body);
      }
      await refreshList();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function removeTask() {
    if (!task?._id || !isProjectAdmin) return;
    if (!window.confirm('Delete this task?')) return;
    await taskApi.delete(projectId, task._id);
    await refreshList();
    onClose();
  }

  async function postComment(text, parentComment = null) {
    await commentApi.add({ taskId: task._id, text, parentComment });
    const c = await commentApi.list(task._id);
    setComments(c.data.comments || []);
  }

  function captureGeo() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Browser geolocation',
          capturedAt: new Date().toISOString(),
        });
      },
      () => alert('Could not read location'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function startScreenCapture() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const rec = new MediaRecorder(stream);
      screenChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) screenChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(screenChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `screen-${Date.now()}.webm`, { type: 'video/webm' });
        await uploadFile(file);
        setScreenRecorder(null);
      };
      rec.start(250);
      setScreenRecorder(rec);
    } catch {
      alert('Screen capture cancelled or not allowed');
    }
  }

  async function rollbackVer(version) {
    if (!window.confirm(`Rollback to version ${version}?`)) return;
    await taskApi.rollback(projectId, task._id, version);
    await refreshList();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="w-full max-w-lg h-full bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold">{isCreate ? 'New task' : 'Task'}</h2>
          <button type="button" className="text-slate-500" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={saveTask} className="p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-500">Title</label>
            <input
              className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Description</label>
            <textarea
              className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Status</label>
              <select
                className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option>To Do</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500">Priority</label>
              <select
                className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Due date</label>
              <input
                type="date"
                className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Assignee user id</label>
              <input
                className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="User ObjectId"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Labels (comma separated)</label>
            <input
              className="w-full mt-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="Bug, Feature, Urgent"
            />
            <div className="flex gap-2 mt-2 flex-wrap">
              {LABEL_PRESETS.map((lb) => (
                <button
                  key={lb}
                  type="button"
                  className="text-xs border rounded-full px-2 py-0.5"
                  onClick={() =>
                    setLabels((prev) => {
                      const parts = prev
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (parts.includes(lb)) return parts.join(', ');
                      return [...parts, lb].join(', ');
                    })
                  }
                >
                  + {lb}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoPriority}
              onChange={(e) => setAutoPriority(e.target.checked)}
            />
            <span>Auto-priority from due date (≤1d High, ≤3d Medium, else Low)</span>
          </label>
          <div>
            <label className="text-xs text-slate-500">Task location</label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="text-xs rounded border border-slate-300 dark:border-slate-600 px-2 py-1"
                onClick={captureGeo}
              >
                Capture GPS
              </button>
              {location?.lat != null && location?.lng != null ? (
                <>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {Number(location.lat).toFixed(4)}, {Number(location.lng).toFixed(4)}
                  </span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=15/${location.lat}/${location.lng}`}
                    className="text-xs text-sky-600"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Map
                  </a>
                  <button
                    type="button"
                    className="text-xs text-slate-500"
                    onClick={() => setLocation(null)}
                  >
                    Clear
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-500">No location</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Screen recording → Cloudinary</label>
            <div className="mt-1 flex gap-2 flex-wrap">
              {!screenRecorder ? (
                <button
                  type="button"
                  className="text-xs rounded bg-slate-800 text-white px-2 py-1 dark:bg-slate-700"
                  onClick={startScreenCapture}
                >
                  Start recording
                </button>
              ) : (
                <button
                  type="button"
                  className="text-xs rounded bg-red-600 text-white px-2 py-1"
                  onClick={() => screenRecorder.stop()}
                >
                  Stop & upload
                </button>
              )}
              <span className="text-xs text-slate-500 self-center">Uses browser MediaRecorder (WebM)</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">Attachments</label>
            <input
              type="file"
              className="block text-sm mt-1"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) uploadFile(f);
              }}
            />
            <ul className="mt-2 space-y-1 text-sm">
              {attachments.map((a, i) => (
                <li key={`${a.url}-${i}`}>
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-sky-600">
                    {a.resourceType === 'video' ? '▶ ' : ''}
                    {a.originalName || 'File'}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-sky-600 text-white text-sm px-4 py-2 font-medium"
            >
              {isCreate ? 'Create' : 'Save'}
            </button>
            {isProjectAdmin && !isCreate && (
              <button
                type="button"
                onClick={removeTask}
                className="rounded-lg border border-red-600 text-red-600 text-sm px-4 py-2"
              >
                Delete
              </button>
            )}
          </div>
        </form>

        {!isCreate && (
          <>
            <div className="px-4 pb-4">
              <h3 className="text-sm font-semibold mb-2">Comments</h3>
              <form
                className="flex gap-2 mb-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  postComment(String(fd.get('text')), null);
                  e.currentTarget.reset();
                }}
              >
                <input
                  name="text"
                  className="flex-1 rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-sm"
                  placeholder="Write a comment…"
                  required
                />
                <button type="submit" className="text-sm bg-slate-900 dark:bg-sky-600 text-white px-3 rounded">
                  Post
                </button>
              </form>
              <div>
                {comments.map((c) => (
                  <CommentNode key={c._id} node={c} onReply={(text, pid) => postComment(text, pid)} />
                ))}
              </div>
            </div>
            <div className="px-4 pb-6">
              <h3 className="text-sm font-semibold mb-2">Version history</h3>
              <ul className="space-y-2 text-sm">
                {versions.map((ver) => (
                  <li
                    key={ver._id}
                    className="border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2 flex justify-between gap-2"
                  >
                    <div>
                      <div className="font-medium">v{ver.version}</div>
                      <div className="text-xs text-slate-500">
                        {ver.editedBy?.name} · {new Date(ver.createdAt).toLocaleString()}
                      </div>
                      <div className="text-xs mt-1 line-clamp-2">
                        {ver.snapshot?.title} · {ver.snapshot?.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-sky-600 self-start"
                      onClick={() => rollbackVer(ver.version)}
                    >
                      Rollback
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
