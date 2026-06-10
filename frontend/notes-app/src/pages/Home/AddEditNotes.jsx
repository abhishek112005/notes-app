import React, { useState, useEffect, useRef } from 'react';
import TagInput from '../../components/Input/TagInput';
import { MdClose, MdAutoAwesome } from 'react-icons/md';
import axiosInstance from '../../utils/axiosInstance';
import { marked } from 'marked';

const COLORS = [
  { id: 'default', cls: 'bg-white/20 border-white/30',  label: 'None'   },
  { id: 'purple',  cls: 'bg-purple-500',                label: 'Purple' },
  { id: 'blue',    cls: 'bg-blue-500',                  label: 'Blue'   },
  { id: 'green',   cls: 'bg-green-500',                 label: 'Green'  },
  { id: 'yellow',  cls: 'bg-yellow-500',                label: 'Yellow' },
  { id: 'red',     cls: 'bg-red-500',                   label: 'Red'    },
  { id: 'pink',    cls: 'bg-pink-500',                  label: 'Pink'   },
];

const CATEGORIES = ['General', 'Work', 'Personal', 'Ideas', 'Meeting Notes', 'Journal'];

const TEMPLATES = {
  none:    { title: '',  content: '' },
  meeting: { title: 'Meeting Notes', content: `## Attendees\n- \n\n## Agenda\n1. \n\n## Discussion\n\n\n## Action Items\n- [ ] ` },
  journal: { title: `Journal — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, content: `## How I'm feeling\n\n\n## What happened\n\n\n## Reflections\n\n` },
  idea:    { title: 'New Idea',  content: `## Problem\n\n\n## Solution\n\n\n## Next Steps\n- [ ] ` },
  task:    { title: 'Task List', content: `## Today\n- [ ] \n- [ ] \n\n## This Week\n- [ ] \n- [ ] ` },
};

const TOOLBAR = [
  { label: 'B',  wrap: ['**', '**'],   title: 'Bold'      },
  { label: 'I',  wrap: ['*', '*'],     title: 'Italic'    },
  { label: 'H2', wrap: ['## ', ''],   title: 'Heading'   },
  { label: '`',  wrap: ['`', '`'],     title: 'Code'      },
  { label: '—',  wrap: ['- ', ''],     title: 'List item' },
  { label: '☑', wrap: ['- [ ] ', ''], title: 'Checkbox'  },
];

const AddEditNotes = ({ noteData, type, getAllNotes, onclose, showToastMessage }) => {
  const [title,    setTitle]    = useState('');
  const [content,  setContent]  = useState('');
  const [tags,     setTags]     = useState([]);
  const [color,    setColor]    = useState('default');
  const [category, setCategory] = useState('General');
  const [tab,      setTab]      = useState('write');
  const [error,    setError]    = useState(null);
  const [aiLoading, setAiLoading] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (noteData) {
      setTitle(noteData.title || '');
      setContent(noteData.content || '');
      setTags(noteData.tags || []);
      setColor(noteData.color || 'default');
      setCategory(noteData.category || 'General');
    }
  }, [noteData]);

  const applyTemplate = (key) => {
    if (key === 'none') return;
    const t = TEMPLATES[key];
    setTitle(t.title);
    setContent(t.content);
    setTab('write');
  };

  const insertMarkdown = (before, after) => {
    const el = textareaRef.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = content.slice(s, e);
    setContent(content.slice(0, s) + before + sel + after + content.slice(e));
    setTimeout(() => { el.focus(); el.setSelectionRange(s + before.length, s + before.length + sel.length); }, 0);
  };

  const aiSuggestTitle = async () => {
    if (!content) return showToastMessage('Write some content first', 'error');
    setAiLoading('title');
    try { const { data } = await axiosInstance.post('/ai/suggest-title', { content }); if (!data.error) setTitle(data.title); }
    catch { showToastMessage('AI unavailable — add GROQ_API_KEY to .env', 'error'); }
    finally { setAiLoading(''); }
  };

  const aiAutoTag = async () => {
    if (!content) return showToastMessage('Write some content first', 'error');
    setAiLoading('tags');
    try { const { data } = await axiosInstance.post('/ai/auto-tag', { title, content }); if (!data.error) setTags(prev => [...new Set([...prev, ...data.tags])]); }
    catch { showToastMessage('AI unavailable — add GROQ_API_KEY to .env', 'error'); }
    finally { setAiLoading(''); }
  };

  const aiWritingAssist = async (mode) => {
    if (!content) return showToastMessage('Write some content first', 'error');
    setAiLoading(mode);
    try {
      const { data } = await axiosInstance.post('/ai/writing-assist', { content, mode });
      if (!data.error) mode === 'continue' ? setContent(p => p + '\n\n' + data.result) : setContent(data.result);
    } catch { showToastMessage('AI unavailable — add GROQ_API_KEY to .env', 'error'); }
    finally { setAiLoading(''); }
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Please enter a title'); return; }
    if (!content.trim()) { setError('Please enter content'); return; }
    setError('');
    try {
      const payload = { title, content, tags, color, category };
      if (type === 'edit') await axiosInstance.put(`/edit-note/${noteData._id}`, payload);
      else await axiosInstance.post('/add-note', payload);
      showToastMessage(type === 'edit' ? 'Note updated' : 'Note added', 'success');
      getAllNotes();
      onclose();
    } catch { setError('Failed to save. Please try again.'); }
  };

  const previewHtml = marked.parse(content, { breaks: true });

  return (
    <div className="text-zinc-200">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white tracking-wide">{type === 'edit' ? 'Edit Note' : 'New Note'}</h2>
        <button onClick={onclose} className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-white/5">
          <MdClose className="text-lg" />
        </button>
      </div>

      {/* Template */}
      <div className="mb-4">
        <label className="input-label mb-1.5 block">Template</label>
        <select onChange={e => applyTemplate(e.target.value)} defaultValue="none"
          className="w-full glass-input rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 transition-colors">
          <option value="none"    style={{background:'#0a0810'}}>— Start blank —</option>
          <option value="meeting" style={{background:'#0a0810'}}>📋 Meeting Notes</option>
          <option value="journal" style={{background:'#0a0810'}}>📔 Daily Journal</option>
          <option value="idea"    style={{background:'#0a0810'}}>💡 Idea Capture</option>
          <option value="task"    style={{background:'#0a0810'}}>✅ Task List</option>
        </select>
      </div>

      {/* Title */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="input-label">Title</label>
          <button onClick={aiSuggestTitle} disabled={!!aiLoading}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50 transition-colors">
            <MdAutoAwesome className="text-xs" />
            {aiLoading === 'title' ? 'Thinking…' : 'AI suggest'}
          </button>
        </div>
        <input
          type="text"
          placeholder="Note title…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full glass-input rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
      </div>

      {/* Editor */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex gap-1">
            {['write', 'preview'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs px-3 py-1 rounded-lg capitalize transition-colors ${
                  tab === t ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}>
                {t}
              </button>
            ))}
          </div>
          {tab === 'write' && (
            <div className="flex gap-1 overflow-x-auto">
              {TOOLBAR.map(({ label, wrap, title: ttl }) => (
                <button key={label} title={ttl} onClick={() => insertMarkdown(wrap[0], wrap[1])}
                  className="text-xs w-7 h-7 rounded glass-card hover:bg-white/10 text-zinc-400 hover:text-zinc-200 font-mono transition-colors shrink-0">
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {tab === 'write' ? (
          <textarea
            ref={textareaRef}
            rows={9}
            placeholder="Write your note… (Markdown supported)"
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full glass-input rounded-lg px-3.5 py-3 text-sm text-zinc-300 placeholder:text-zinc-600 font-mono leading-relaxed resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        ) : (
          <div className="min-h-[200px] glass-input rounded-lg px-4 py-3 overflow-y-auto">
            <div className="prose-notes" dangerouslySetInnerHTML={{ __html: previewHtml || '<p style="color:#52525b">Nothing to preview…</p>' }} />
          </div>
        )}
      </div>

      {/* AI Writing Assist */}
      <div className="mb-4">
        <label className="input-label mb-2 block">✨ AI Writing Assist</label>
        <div className="flex flex-wrap gap-2">
          {[
            { mode: 'continue', label: 'Continue writing' },
            { mode: 'formal',   label: 'Make it formal'   },
            { mode: 'shorter',  label: 'Make it shorter'  },
          ].map(({ mode, label }) => (
            <button key={mode} onClick={() => aiWritingAssist(mode)} disabled={!!aiLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 text-violet-300 transition-colors disabled:opacity-50">
              {aiLoading === mode ? 'Working…' : label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="input-label">Tags</label>
          <button onClick={aiAutoTag} disabled={!!aiLoading}
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50 transition-colors">
            <MdAutoAwesome className="text-xs" />
            {aiLoading === 'tags' ? 'Tagging…' : 'AI auto-tag'}
          </button>
        </div>
        <TagInput tags={tags} setTags={setTags} />
      </div>

      {/* Color + Category */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <div className="flex-1">
          <label className="input-label mb-2 block">Color Label</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(({ id, cls, label }) => (
              <button key={id} title={label} onClick={() => setColor(id)}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${cls} ${
                  color === id ? 'border-white scale-125' : 'border-transparent hover:scale-110'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="input-label mb-1.5 block">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full glass-input rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50 transition-colors">
            {CATEGORIES.map(c => <option key={c} value={c} style={{background:'#0a0810'}}>{c}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      <button onClick={handleSave}
        className="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-lg shadow-violet-900/40 tracking-wide">
        {type === 'edit' ? '✓ Update Note' : '+ Add Note'}
      </button>
    </div>
  );
};

export default AddEditNotes;
