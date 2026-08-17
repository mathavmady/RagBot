import { useEffect, useState, useRef } from 'react'
import { FileText, Trash2, Upload, Search, RefreshCw, UploadCloud, File, CheckCircle2, AlertCircle } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout.jsx'
import Button from '../../components/common/Button.jsx'
import Input  from '../../components/common/Input.jsx'
import { ConfirmModal } from '../../components/common/Modal.jsx'
import { adminService } from '../../services/adminService.js'
import { formatTimestamp, formatFileSize, classNames } from '../../utils/helpers.js'
import { SkeletonCard } from '../../components/common/Loader.jsx'
import { SUPPORTED_DOC_TYPES, MAX_FILE_SIZE_MB } from '../../utils/constants.js'
import toast from 'react-hot-toast'

function DocTypeIcon({ filename }) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  const colors = { pdf: 'text-red-600 bg-red-50 border-red-100', docx: 'text-blue-600 bg-blue-50 border-blue-100', pptx: 'text-orange-600 bg-orange-50 border-orange-100' }
  return (
    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${colors[ext] || 'text-gray-500 bg-gray-50 border-gray-100'}`}>
      <FileText size={16}/>
    </div>
  )
}

function UploadZone({ onFiles }) {
  const [drag, setDrag] = useState(false)
  const ref = useRef(null)
  const ALLOWED = SUPPORTED_DOC_TYPES.map(t => `.${t.ext}`).join(',')

  const process = (files) => {
    const valid = [...files].filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      if (!['pdf','docx','pptx'].includes(ext)) { toast.error(`${f.name}: unsupported type`); return false }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { toast.error(`${f.name}: too large`); return false }
      return true
    })
    if (valid.length) onFiles(valid)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); process(e.dataTransfer.files) }}
      onClick={() => ref.current?.click()}
      className={classNames(
        'border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all duration-200 text-center',
        drag ? 'border-crimson-500 bg-crimson-50 scale-[1.01]' : 'border-gray-200 hover:border-crimson-300 hover:bg-crimson-50/30'
      )}
    >
      <UploadCloud size={22} className={drag ? 'text-crimson-600' : 'text-gray-400'}/>
      <div>
        <p className="text-sm font-medium text-gray-700 font-sans">Drop files or click to upload</p>
        <p className="text-xs text-gray-400 font-sans mt-0.5">PDF · DOCX · PPTX — Max {MAX_FILE_SIZE_MB}MB</p>
      </div>
      <input ref={ref} type="file" multiple accept={ALLOWED} className="hidden" onChange={e => process(e.target.files)}/>
    </div>
  )
}

function UploadQueueItem({ item }) {
  const pct = item.progress || 0
  const isErr  = item.status === 'error'
  const isDone = item.status === 'done'
  return (
    <div className="flex items-center gap-3 p-3.5 bg-white border border-gray-100 rounded-xl">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isErr ? 'bg-red-50 text-red-600' : isDone ? 'bg-green-50 text-green-600' : 'bg-crimson-50 text-crimson-700'}`}>
        {isDone ? <CheckCircle2 size={15}/> : isErr ? <AlertCircle size={15}/> : <File size={15}/>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium font-sans truncate text-gray-800">{item.file.name}</p>
        <div className="flex items-center gap-2 mt-1">
          {item.status === 'uploading' ? (
            <div className="flex-1 h-1 bg-gray-100 rounded-full"><div className="h-full bg-crimson-600 rounded-full transition-all" style={{ width: `${pct}%` }}/></div>
          ) : isErr ? (
            <p className="text-[10px] text-red-600 font-sans truncate">{item.error}</p>
          ) : isDone ? (
            <p className="text-[10px] text-green-600 font-sans">{item.chunks} chunks indexed</p>
          ) : (
            <p className="text-[10px] text-gray-400 font-sans">Ready to upload</p>
          )}
        </div>
      </div>
      {item.status === 'uploading' && <span className="text-[10px] text-crimson-600 font-sans shrink-0">{pct}%</span>}
    </div>
  )
}

export default function ManageDocuments() {
  const [docs,      setDocs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [queue,     setQueue]     = useState([])
  const [uploading, setUploading] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [delLoad,   setDelLoad]   = useState(false)

  const load = () => {
    setLoading(true)
    adminService.getDocuments()
      .then(r => setDocs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const addToQueue = (files) => {
    setQueue(prev => [...prev, ...files.map(f => ({ id: Date.now()+Math.random(), file: f, status: null, progress: 0 }))])
  }

  const uploadAll = async () => {
    const pending = queue.filter(i => !i.status || i.status === 'error')
    setUploading(true)
    for (const item of pending) {
      setQueue(p => p.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i))
      try {
        const fd = new FormData()
        fd.append('file', item.file)
        const res = await adminService.uploadDocument(fd, pct =>
          setQueue(p => p.map(i => i.id === item.id ? { ...i, progress: pct } : i))
        )
        setQueue(p => p.map(i => i.id === item.id ? { ...i, status: 'done', progress: 100, chunks: res.data?.total_chunks } : i))
        toast.success(`${item.file.name} indexed.`)
      } catch (err) {
        setQueue(p => p.map(i => i.id === item.id ? { ...i, status: 'error', error: err.message } : i))
      }
    }
    setUploading(false)
    load()
  }

  const handleDelete = async () => {
    if (!delTarget) return
    setDelLoad(true)
    try {
      await adminService.deleteDocument(delTarget.filename || delTarget.name)
      toast.success(`"${delTarget.name || delTarget.filename}" removed.`)
      setDocs(prev => prev.filter(d => d.id !== delTarget.id))
    } catch (err) {
      toast.error(err.message || 'Delete failed.')
    } finally {
      setDelLoad(false)
      setDelTarget(null)
    }
  }

  const filtered = docs.filter(d =>
    (d.name || d.filename || '').toLowerCase().includes(search.toLowerCase())
  )

  const canUpload = queue.some(i => !i.status || i.status === 'error')

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 font-sans uppercase tracking-widest mb-1">Admin</p>
            <h1 className="font-display text-3xl font-semibold text-gray-900">Study Materials</h1>
            <p className="text-sm text-gray-500 font-sans mt-1">{docs.length} document{docs.length !== 1 ? 's' : ''} indexed in Pinecone</p>
          </div>
          <Button variant="secondary" onClick={load} icon={<RefreshCw size={14}/>} size="sm">Refresh</Button>
        </div>

        {/* Upload zone */}
        <div className="space-y-3">
          <UploadZone onFiles={addToQueue}/>
          {queue.length > 0 && (
            <div className="space-y-2">
              {queue.map(item => <UploadQueueItem key={item.id} item={item}/>)}
              <div className="flex items-center justify-between">
                {canUpload && <Button onClick={uploadAll} loading={uploading ? 'Uploading…' : false} icon={<Upload size={14}/>} size="sm">Upload & Index</Button>}
                <button onClick={() => setQueue([])} className="text-xs text-gray-400 hover:text-red-600 font-sans transition-colors ml-auto">Clear queue</button>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <Input placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} icon={<Search size={15}/>}/>

        {/* Document list */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-card overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_,i) => <SkeletonCard key={i}/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center"><FileText size={20} className="text-gray-300"/></div>
              <p className="text-sm text-gray-400 font-sans">{search ? 'No documents match your search.' : 'No documents indexed yet.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((doc, i) => (
                <div key={doc.id || i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/40 transition-colors group">
                  <DocTypeIcon filename={doc.name || doc.filename}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 font-sans truncate">{doc.name || doc.filename}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 font-sans">{doc.totalChunks || doc.chunks || '—'} chunks</span>
                      {doc.fileSize && <span className="text-xs text-gray-400 font-sans">{formatFileSize(doc.fileSize)}</span>}
                      {doc.uploadedAt && <span className="text-xs text-gray-400 font-sans hidden md:inline">{formatTimestamp(doc.uploadedAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDelTarget(doc)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        loading={delLoad}
        title="Delete document?"
        message={`"${delTarget?.name || delTarget?.filename}" will be removed from the RAG index. Students will no longer get answers from this material.`}
        confirmLabel="Delete & remove"
      />
    </AppLayout>
  )
}
