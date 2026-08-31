export type RPCAction = 'SAVE_DRAFT' | 'REMOVE_PARTICIPANT' | 'SUBMIT_APPLICATION';

export interface RPCEnvelope<T = Record<string, unknown>> {
  action: RPCAction;
  caseId: string;
  payload: T;
}

export interface RPCResponse<T = Record<string, unknown>> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface EntityParticipant {
  id?: string;
  participantName: string;
  participantRole: 'UBO' | 'DIRECTOR' | 'SIGNATORY' | 'SETTLOR';
  shareholdingPercentage?: number;
}