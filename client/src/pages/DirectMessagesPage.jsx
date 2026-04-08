import { useEffect, useState, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { messageApi, miscApi } from '../api/services';
import { getSocket, joinDmChatRoom, onMessageReceive, sendSocketMessage } from '../socket';

function dmKeyFor(a, b) {
  return [String(a), String(b)].sort().join('::');
}

function Avatar({ user, size = 28 }) {
  const style = { width: size, height: size };
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className="rounded-full object-cover flex-shrink-0" style={style} />;
  }
  return (
    <div
      className="rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-[10px] font-medium"
      style={style}
    >
      {(user?.name || '?').slice(0, 1)}
    </div>
  );
}

export default function DirectMessagesPage() {
  const me = useSelector((s) => s.auth.user);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [peer, setPeer] = useState(null);
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim() || q.trim().length < 2) {
        setResults([]);
        return;
      }
      try {
        const { data } = await miscApi.searchUsers(q.trim());
        const users = (data.users || []).filter((u) => String(u._id) !== String(me?._id));
        setResults(users);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, me?._id]);

  const loadThread = useCallback(async () => {
    if (!peer?._id) {
      setItems([]);
      return;
    }
    const { data } = await messageApi.listDm(peer._id);
    setItems(data.messages || []);
  }, [peer?._id]);

  useEffect(() => {
    if (!peer?._id || !me?._id) return undefined;
    joinDmChatRoom(peer._id);
    let cancelled = false;
    (async () => {
      try {
        await loadThread();
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    const expectedKey = dmKeyFor(me._id, peer._id);
    const off = onMessageReceive((payload) => {
      const m = payload?.message;
      if (!m || m.channel !== 'dm') return;
      if (String(m.dmKey) !== expectedKey) return;
      setItems((prev) => [...prev.filter((x) => x._id !== m._id), m]);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [peer?._id, me?._id, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [items]);

  function send(e) {
    e.preventDefault();
    if (!peer?._id || !text.trim()) return;
    const trimmed = text.trim();
    const socket = getSocket();
    if (socket?.connected) {
      sendSocketMessage({ channel: 'dm', recipientId: peer._id, text: trimmed }, () => {});
    } else {
      messageApi.send({ channel: 'dm', recipientId: peer._id, text: trimmed });
    }
    setText('');
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Direct messages</h1>
      <div className="grid md:grid-cols-5 gap-4 min-h-[420px]">
        <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <label className="text-xs text-slate-500">Find people (name or email)</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
          />
          <ul className="mt-3 space-y-1 max-h-[320px] overflow-y-auto">
            {results.map((u) => (
              <li key={u._id}>
                <button
                  type="button"
                  className={`w-full flex items-center gap-2 text-left text-sm rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    peer?._id === u._id ? 'bg-sky-50 dark:bg-sky-950/40' : ''
                  }`}
                  onClick={() => {
                    setPeer(u);
                    setResults([]);
                    setQ('');
                  }}
                >
                  <Avatar user={u} />
                  <span className="truncate">
                    {u.name}
                    <span className="block text-xs text-slate-500 truncate">{u.email}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col min-h-[360px]">
          {!peer ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm p-6">
              Select someone to start a conversation.
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Avatar user={peer} />
                <span className="font-medium text-sm">{peer.name}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {items.map((m) => (
                  <div
                    key={m._id}
                    className={`flex gap-2 text-sm ${String(m.sender?._id) === String(me?._id) ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar user={m.sender} />
                    <div
                      className={`rounded-lg px-3 py-2 max-w-[85%] ${
                        String(m.sender?._id) === String(me?._id)
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <div className="text-[10px] opacity-80 mb-0.5">
                        {m.sender?.name} · {new Date(m.createdAt).toLocaleString()}
                      </div>
                      <div className="whitespace-pre-wrap">{m.text}</div>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-950"
                  placeholder="Message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-medium"
                  disabled={!text.trim()}
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
