import type { EventData, EventName, RegisteredEvents } from '@leptonjs/client';
import { useEffect, useState } from 'react';

export const useEvent = <K extends EventName<RegisteredEvents>>(
    name: K,
    initial?: EventData<RegisteredEvents, K>,
): EventData<RegisteredEvents, K> => {
    const [value, setValue] = useState<EventData<RegisteredEvents, K>>(initial);

    useEffect(() => {
        return window.__lepton.listen(name, (payload) => {
            setValue(payload as EventData<RegisteredEvents, K>);
        });
    }, [name]);

    return value;
};
