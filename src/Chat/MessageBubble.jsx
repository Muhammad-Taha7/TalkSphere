import React from 'react'
import { UserAvatar } from './UserAvatar'

/* ── WhatsApp-style tick icons ── */
const SingleTick = ({ className }) => (
  <svg className={className} viewBox="0 0 16 11" width="16" height="11" fill="currentColor">
    <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L4.196 8.365 1.791 6.093a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .525.222.72.72 0 0 0 .525-.222l6.677-8.154a.46.46 0 0 0 .102-.382.42.42 0 0 0-.178-.304l-.377-.28z" />
  </svg>
)

const DoubleTick = ({ className }) => (
  <svg className={className} viewBox="0 0 18 11" width="18" height="11" fill="currentColor">
    <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L4.196 8.365 1.791 6.093a.463.463 0 0 0-.336-.146.47.47 0 0 0-.343.146l-.311.31a.445.445 0 0 0-.14.337c0 .136.047.25.14.343l2.996 2.996a.724.724 0 0 0 .525.222.72.72 0 0 0 .525-.222l6.677-8.154a.46.46 0 0 0 .102-.382.42.42 0 0 0-.178-.304l-.377-.28z" />
    <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L8.196 8.365l-1.1-1.04-.725.886 1.545 1.545a.724.724 0 0 0 .525.222.72.72 0 0 0 .525-.222l6.677-8.154a.46.46 0 0 0 .102-.382.42.42 0 0 0-.178-.304l-.377-.28z" />
  </svg>
)

export const MessageBubble = ({
  message,
  time,
  isOwn,
  showAvatar,
  senderPhotoURL,
  onDelete,
  onEdit,
  deliveredByOther,
  seenByOther,
}) => {

  const isImage = message.type === 'image'
  const isFile = message.type === 'file'

  return (
    <div className={`group flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-3' : 'mt-0.5'}`}>
      <div className={`flex max-w-[85%] gap-2 sm:max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className="w-7 shrink-0">
          {showAvatar && !isOwn && (
            <UserAvatar name={message.senderName} photoURL={senderPhotoURL} size={28} />
          )}
        </div>
        <div className="relative min-w-0">
          {/* Message content */}
          <div
            className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
              isOwn
                ? 'rounded-br-md bg-indigo-600 text-white'
                : 'rounded-bl-md bg-slate-100 text-slate-800'
            }`}
          >
            {isImage && message.fileURL && (
              <a href={message.fileURL} target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src={message.fileURL}
                  alt={message.fileName || 'image'}
                  className="max-h-52 max-w-full rounded-lg object-cover mb-1"
                  loading="lazy"
                />
              </a>
            )}
            {isFile && message.fileURL && (
              <a
                href={message.fileURL}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition mb-1 ${
                  isOwn
                    ? 'border-white/20 text-white hover:bg-white/10'
                    : 'border-slate-200 text-indigo-600 hover:bg-slate-50'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="truncate">{message.fileName || 'Download file'}</span>
              </a>
            )}
            {!isImage && message.text && (
              <span className="break-words">{message.text}</span>
            )}
            {message.edited && (
              <span className={`ml-1.5 text-[10px] italic ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
                (edited)
              </span>
            )}
          </div>

          {/* Time + ticks + actions */}
          <div className={`mt-0.5 flex items-center gap-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {time && (
              <span className="text-[10px] text-slate-400">{time}</span>
            )}

            {/* Ticks for own messages */}
            {isOwn && (
              deliveredByOther ? (
                <DoubleTick className={`h-[11px] w-[18px] ${seenByOther ? 'text-emerald-500' : 'text-slate-400'}`} />
              ) : (
                <SingleTick className="h-[11px] w-[16px] text-slate-400" />
              )
            )}

            {/* Edit/Delete on hover (desktop) or always visible (mobile) */}
            {(onDelete || onEdit) && isOwn && (
              <div className="flex items-center gap-3 text-[11px] font-semibold opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-0">
                {onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="text-indigo-500 transition hover:text-indigo-600"
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="text-red-500 transition hover:text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
            {/* Mobile: always show Delete via long-press hint */}
            {(onDelete || onEdit) && isOwn && (
              <div className="flex items-center gap-3 text-[11px] font-semibold sm:hidden">
                {onEdit && (
                  <button type="button" onClick={onEdit} className="text-indigo-500">
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button type="button" onClick={onDelete} className="text-red-500">
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
