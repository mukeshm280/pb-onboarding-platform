/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import type { EntityParticipant } from '../types/rpc';
import { ParticipantTree } from './ParticipantTree';

describe('ParticipantTree', () => {
  beforeEach(() => {
    const store = new Map<string, string>();

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
        setItem: jest.fn((key: string, value: string) => {
          store.set(key, value);
        }),
        removeItem: jest.fn((key: string) => {
          store.delete(key);
        }),
        clear: jest.fn(() => {
          store.clear();
        }),
      },
      configurable: true,
    });
  });

  it('allows deleting the only participant without rehydrating stale storage data', async () => {
    const initialParticipants: EntityParticipant[] = [
      {
        participantName: 'test',
        participantRole: 'UBO',
        shareholdingPercentage: 20,
      },
    ];

    const StatefulParticipantTree = () => {
      const [participants, setParticipants] = useState<EntityParticipant[]>(initialParticipants);
      return <ParticipantTree caseId="case-1" participants={participants} onUpdate={setParticipants} />;
    };

    localStorage.setItem('pb-onboarding:participants:case-1', JSON.stringify(initialParticipants));

    render(<StatefulParticipantTree />);

    fireEvent.click(screen.getByTitle('Remove this participant'));

    await waitFor(() => {
      expect(screen.queryByTitle('Remove this participant')).not.toBeInTheDocument();
      expect(localStorage.getItem('pb-onboarding:participants:case-1')).toBeNull();
    });
  });
});
