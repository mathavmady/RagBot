import { useState, useRef } from 'react'
import { Upload, File, X, CheckCircle2, AlertCircle, UploadCloud } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout.jsx'
import Button from '../../components/common/Button.jsx'
import { documentService } from '../../services/documentService.js'
import { formatFileSize, classNames } from '../../utils/helpers.js'
import { SUPPORTED_DOC_TYPES, MAX_FILE_SIZE_MB } from '../../utils/constants.js'
import toast from 'react-hot-toast'

const ALLOWED = SUPPORTED_DOC_TYPES.map(t => `.${t.ext}`).join(',')

function FileItem({ item, onRemove }) {
  const pct = item.progress || 0
  const isErr = item.status === 'error'
  const isDone = item.status === 'done'

  return (
    <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        isErr ? 'bg-red-50 text-red-600' : isDone ? 'bg-green-50 text-green-600' : 'bg-crimson-50 text-crimson-700'
      }`}>
        {isDone ? <CheckCircle2 size={17}/> : isErr ? <AlertCircle size={17}/> : <File size={17}/>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 font-sans truncate">{item.file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-gray-400 font-sans">{formatFileSize(item.file.size)}</p>
          {item.status === 'uploading' && (
            <div className="flex-1 max-w-[140px]">
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-crimson-600 rounded-full transition-all duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
          {isErr  && <p className="text-xs text-red-600 font-sans truncate">{item.error}</p>}
          {isDone && <p className="text-xs text-green-600 font-sans">{item.chunks} chunks indexed</p>}
          {item.status === 'uploading' && <p className="text-xs text-crimson-600 font-sans">{pct}%</p>}
        </div>
      </div>
      {!item.status && (
        <button
          onClick={() => onRemove(item.id)}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <X size={14}/>
        </button>
      )}
    </div>
  )
}

export default function UploadMaterials() {
  const [queue,   setQueue]   = useState([])
  const [dragging, setDrag]  = useState(false)
  const fileRef = useRef(null)

  const addFiles = (files) => {
    const valid = [...files].filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      if (!['pdf','docx','pptx'].includes(ext)) { toast.error(`${f.name}: unsupported type`); return false }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { toast.error(`${f.name}: exceeds ${MAX_FILE_SIZE_MB}MB`); return false }
      return true
    })
    setQueue(prev => [
      ...prev,
      ...valid.map(f => ({ id: Date.now() + Math.random(), file: f, status: null, progress: 0 }))
    ])
  }

  const removeItem = (id) => setQueue(prev => prev.filter(i => i.id !== id))

  const uploadAll = async () => {
    const pending = queue.filter(i => !i.status || i.status === 'error')
    for (const item of pending) {
      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading', progress: 0 } : i))
      try {
        const fd = new FormData()
        fd.append('file', item.file)
        const res = await documentService.uploadDocument(fd, (pct) =>
          setQueue(prev => prev.map(i => i.id === item.id ? { ...i, progress: pct } : i))
        )
        setQueue(prev => prev.map(i => i.id === item.id
          ? { ...i, status: 'done', progress: 100, chunks: res.data?.total_chunks }
          : i
        ))
        toast.success(`${item.file.name} indexed successfully!`)
      } catch (err) {
        setQueue(prev => prev.map(i => i.id === item.id
          ? { ...i, status: 'error', error: err.message || 'Upload failed' }
          : i
        ))
      }
    }
  }

  const canUpload = queue.some(i => !i.status || i.status === 'error')

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <p className="text-xs text-gray-400 font-sans uppercase tracking-widest mb-1">Faculty</p>
          <h1 className="font-display text-3xl font-semibold text-gray-900">Upload Study Materials</h1>
          <p className="text-sm text-gray-500 font-sans mt-1">
            Documents are parsed, chunked, embedded, and stored in the RAG index.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
          onClick={() => fileRef.current?.click()}
          className={classNames(
            'border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200',
            dragging ? 'border-crimson-500 bg-crimson-50 scale-[1.01]' : 'border-gray-200 bg-gray-50 hover:border-crimson-300 hover:bg-crimson-50/40'
          )}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-crimson-100' : 'bg-white border border-gray-200'}`}>
            <UploadCloud size={24} className={dragging ? 'text-crimson-700' : 'text-gray-400'}/>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-700 font-sans">
              {dragging ? 'Drop files here' : 'Drop files or click to browse'}
            </p>
            <p className="text-xs text-gray-400 font-sans mt-1">
              PDF, DOCX, PPTX · Max {MAX_FILE_SIZE_MB}MB per file
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            {SUPPORTED_DOC_TYPES.map(t => (
              <span key={t.ext} className="text-xs bg-white border border-gray-200 text-gray-500 px-2.5 py-1 rounded-full font-sans">
                .{t.ext}
              </span>
            ))}
          </div>
          <input ref={fileRef} type="file" multiple accept={ALLOWED} className="hidden" onChange={e => addFiles(e.target.files)}/>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 font-sans">{queue.length} file{queue.length > 1 ? 's' : ''} queued</p>
              <button onClick={() => setQueue([])} className="text-xs text-gray-400 hover:text-red-600 font-sans transition-colors">
                Clear all
              </button>
            </div>
            {queue.map(item => <FileItem key={item.id} item={item} onRemove={removeItem}/>)}
            {canUpload && (
              <Button fullWidth onClick={uploadAll} size="lg" icon={<Upload size={16}/>}>
                Upload & Index {queue.filter(i => !i.status || i.status === 'error').length} document{queue.filter(i => !i.status || i.status === 'error').length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 font-sans mb-3">How ingestion works</h3>
          <div className="space-y-2">
            {[
              ['Extract', 'Text is extracted page-by-page from your document'],
              ['Chunk', 'Pages are split into overlapping 512-word segments'],
              ['Embed', 'Each chunk is converted into a 1024-dim vector using Qwen3'],
              ['Index', 'Vectors and metadata are stored in Pinecone for retrieval'],
            ].map(([step, desc]) => (
              <div key={step} className="flex items-start gap-3">
                <span className="text-[10px] font-semibold bg-crimson-50 text-crimson-700 border border-crimson-100 px-2 py-0.5 rounded font-sans shrink-0 mt-0.5 uppercase tracking-wide">
                  {step}
                </span>
                <p className="text-xs text-gray-500 font-sans">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
