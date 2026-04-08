import { useEffect, useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { messageApi } from '../api/services';
import { getSocket, joinProjectChatRoom, onMessageReceive, sendSocketMessage } from '../socket';

function Avatar({ user, size = 8 }) {
  const cls = `w-${size} h-${size} rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden`;
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${cls} object-cover`} style={{ width: 28, height: 28 }} />;
  }
  return <div className={cls} style={{ width: 28, height: 28 }} />;
}

export default function ProjectChat() {
  const { projectId } = useOutletContext();
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!projectId) return undefined;
    joinProjectChatRoom(projectId);
    let cancelled = false;
    (async () => {
      try {
        const { data } = await messageApi.listProject(projectId);
        if (!cancelled) setItems(data.messages || []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    const off = onMessageReceive((payload) => {
      const m = payload?.message;
      const pid = m?.projectId?._id || m?.projectId;
      if (m && String(pid) === String(projectId)) {
        setItems((prev) => [...prev.filter((x) => x._id !== m._id), m]);
      }
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [projectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const socket = getSocket();
    if (socket?.connected) {
      sendSocketMessage(
        { channel: 'project', projectId, text: text.trim() },
        () => {}
      );
    } else {
      messageApi.send({ channel: 'project', projectId, text: text.trim() });
    }
    setText('');
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-[min(70vh,560px)]">
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 text-sm font-medium">
        Project channel
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((m) => (
          <div key={m._id} className="flex gap-2 text-sm">
            <Avatar user={m.sender} />
            <div>
              <div className="font-medium text-xs text-slate-500">
                {m.sender?.name}{' '}
                <span className="font-normal">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950"
          placeholder="Message the team…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium"
        >
          Send
        </button>
      </form>
    </div>
  );
}
