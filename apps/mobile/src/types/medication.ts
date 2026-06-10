export interface MedLog {
  id: string;
  givenAt: string;
  skipped: boolean;
  skipReason: string | null;
  notes: string | null;
  givenBy: { id: string; name: string };
}

export interface Medication {
  id: string;
  familyId: string;
  name: string;
  dosage: string;
  form: string | null;
  frequency: string;
  times: string[];
  instructions: string | null;
  startDate: string;
  endDate: string | null;
  stock: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  logs: MedLog[];
}

export interface CreateMedicationInput {
  name: string;
  dosage: string;
  form?: string;
  frequency: string;
  times: string[];
  instructions?: string;
  startDate: string;
  endDate?: string;
  stock?: number;
}
