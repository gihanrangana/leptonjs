import { listen } from '@leptonjs/client';
import type { EventPayload, TypedEvent } from '@leptonjs/registry';
import { useEffect, useState } from 'react';

/**
 * Subscribe to a typed LeptonJS SSE event.
 * Returns the latest payload and unsubscribes on unmount / event change.
 */
export const useEvent = <E extends TypedEvent<unknown>>(event: E, initial: EventPayload<E>) => {
    const [value, setValue] = useState<EventPayload<E>>(initial);

    useEffect(() => listen(event, setValue), [event]);

    return value;
};
