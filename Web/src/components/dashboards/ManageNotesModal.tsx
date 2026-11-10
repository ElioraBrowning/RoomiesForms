import { useState, useEffect, useCallback } from 'react';
import { type QuickNote, DEFAULT_QUICK_NOTES, saveQuickNotes } from '../../utils/quickNotes';

interface ManageNotesModalProps {
  notes: QuickNote[];
  isOpen: boolean;
  onClose: (updatedNotes: QuickNote[]) => void;
}

export default function ManageNotesModal({
  notes: initialNotes,
  isOpen,
  onClose,
}: ManageNotesModalProps) {
  const [notes, setNotes] = useState<QuickNote[]>(initialNotes);
  const [newLabel, setNewLabel] = useState('');
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleDone = useCallback(() => {
    saveQuickNotes(notes);
    onClose(notes);
  }, [notes, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleDone();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDone]);

  if (!isOpen) return null;

  const handleAddNote = () => {
    if (!newLabel.trim() || !newText.trim()) return;

    const newNote: QuickNote = {
      id: `qn-${Date.now()}`,
      label: newLabel.trim(),
      text: newText.trim(),
    };

    const updated = [...notes, newNote];
    setNotes(updated);
    saveQuickNotes(updated);
    setNewLabel('');
    setNewText('');
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveQuickNotes(updated);
  };

  const handleUpdateNote = (id: string, label: string, text: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, label, text } : n));
    setNotes(updated);
    saveQuickNotes(updated);
    setEditingId(null);
  };

  const handleResetDefaults = () => {
    setNotes(DEFAULT_QUICK_NOTES);
    saveQuickNotes(DEFAULT_QUICK_NOTES);
  };

  return (
    <div className="dean-modal-root" role="dialog" aria-modal="true">
      <div className="dean-modal-backdrop" onClick={handleDone} aria-hidden="true" />
      <div className="dean-modal-box">
        <div className="dean-modal-header">
          <div>
            <h3 className="dean-modal-title">Manage Quick Notes</h3>
            <p className="dean-modal-sub">
              Customize the one-click template chips used when requesting form revisions.
            </p>
          </div>
          <button
            type="button"
            className="dean-drawer-close"
            onClick={handleDone}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="dean-modal-body">
          {/* List of Existing Notes */}
          <div className="dean-notes-list">
            {notes.map((note) => {
              const isEditing = editingId === note.id;

              return (
                <div key={note.id} className="dean-note-item">
                  {isEditing ? (
                    <EditNoteForm
                      note={note}
                      onSave={(label, text) => handleUpdateNote(note.id, label, text)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="dean-note-view">
                      <div className="dean-note-info">
                        <span className="dean-note-chip-preview">{note.label}</span>
                        <p className="dean-note-text-preview">{note.text}</p>
                      </div>
                      <div className="dean-note-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={() => setEditingId(note.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small dean-btn-delete"
                          onClick={() => handleDeleteNote(note.id)}
                          title="Delete note"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add New Note Section */}
          <div className="dean-add-note-card">
            <h4 className="dean-add-note-title">Add New Quick Note</h4>
            <div className="dean-add-field">
              <label htmlFor="new-note-label" className="dean-field-label">
                Chip Label (short)
              </label>
              <input
                id="new-note-label"
                type="text"
                className="input"
                placeholder="e.g. Missing Offer Letter"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>

            <div className="dean-add-field">
              <label htmlFor="new-note-text" className="dean-field-label">
                Feedback Message Template
              </label>
              <textarea
                id="new-note-text"
                className="input dean-add-textarea"
                rows={2}
                placeholder="e.g. Please attach an official signed employment offer letter stating your weekly hours."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-small dean-btn-add"
              onClick={handleAddNote}
              disabled={!newLabel.trim() || !newText.trim()}
            >
              + Add Quick Note
            </button>
          </div>
        </div>

        <div className="dean-modal-footer">
          <button
            type="button"
            className="btn btn-link dean-reset-link"
            onClick={handleResetDefaults}
          >
            Reset to Standard Defaults
          </button>
          <button
            type="button"
            className="btn btn-primary btn-small dean-btn-done"
            onClick={handleDone}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function EditNoteForm({
  note,
  onSave,
  onCancel,
}: {
  note: QuickNote;
  onSave: (label: string, text: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(note.label);
  const [text, setText] = useState(note.text);

  return (
    <div className="dean-edit-note-form">
      <input
        type="text"
        className="input dean-edit-input"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <textarea
        className="input dean-edit-textarea"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="dean-edit-actions">
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={() => onSave(label.trim(), text.trim())}
          disabled={!label.trim() || !text.trim()}
        >
          Save
        </button>
        <button type="button" className="btn btn-secondary btn-small" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
