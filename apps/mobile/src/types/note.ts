export type NoteType = 'general' | 'medical' | 'handoff' | 'symptom' | 'observation';

export interface Note {
  id: string;
  familyId: string;
  authorId: string;
  title: string | null;
  content: string;
  type: NoteType;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: { id: string; name: string };
}

export interface CreateNoteInput {
  title?: string;
  content: string;
  type?: NoteType;
}
