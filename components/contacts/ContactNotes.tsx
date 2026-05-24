"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  getContactNotes,
  createContactNote,
  deleteContactNote,
  type ContactNote,
} from "@/actions/notes";

export function ContactNotes({
  contactId,
  userEmail,
}: {
  contactId: string;
  userEmail: string | undefined;
}) {
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [isAdding, startAdd] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getContactNotes(contactId).then(r => {
      if (r.success) setNotes(r.data);
      setLoading(false);
    });
  }, [contactId]);

  function handleAdd() {
    const content = text.trim();
    if (!content) return;
    startAdd(async () => {
      const r = await createContactNote({ contactId, content });
      if (!r.success) { toast.error(r.error); return; }
      setNotes(prev => [r.data, ...prev]);
      setText("");
      textareaRef.current?.focus();
    });
  }

  async function handleDelete(id: string) {
    const r = await deleteContactNote({ id, contactId });
    if (!r.success) { toast.error(r.error); return; }
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  return (
    <section className="rounded-xl border border-border-default bg-bg-surface p-6">
      <div className="flex items-center gap-2 pb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-subtle text-text-secondary">
          <MessageSquare size={14} />
        </div>
        <h2 className="text-base font-semibold text-text-primary">Notas internas</h2>
        <span className="ml-auto text-xs text-text-muted">Solo visibles en ContactShip</span>
      </div>

      {/* Composer */}
      <div className="flex flex-col gap-2 pb-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleAdd(); }}
          rows={3}
          placeholder="Añadí una nota interna… (Cmd+Enter para guardar)"
          className="w-full resize-none rounded-lg border border-border-default bg-bg-subtle px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-brand/20"
          disabled={isAdding}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAdd} disabled={!text.trim() || isAdding}>
            {isAdding ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Guardar nota
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-text-muted" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-center text-sm text-text-muted py-4">Sin notas todavía.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map(note => (
            <li key={note.id} className="flex flex-col gap-1 rounded-lg border border-border-default bg-bg-subtle px-4 py-3">
              <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{note.content}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  <span suppressHydrationWarning>
                    {new Date(note.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {note.user_email && (
                    <>
                      <span>·</span>
                      <span>{note.user_email}</span>
                    </>
                  )}
                </div>
                {/* Only show delete for current user's notes */}
                {(!note.user_email || note.user_email === userEmail) && (
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    className="text-text-muted hover:text-error transition-colors"
                    title="Eliminar nota"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
