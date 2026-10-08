# @leptonjs/react

React hook for LeptonJS push events.

## Installation

```bash
npm install @leptonjs/react
```

Peers: `react` ≥ 18, and the same version of `@leptonjs/client`. Event names are typed only after `declarations.d.ts` augments `@leptonjs/client`. See the [client README](../client/README.md).

## `useEvent(name, initial)`

Subscribes to a push event and returns the latest payload. The hook unsubscribes on unmount and when `name` changes.

```tsx
import { useEvent } from '@leptonjs/react';

function Clock() {
    const tick = useEvent('clock.tick', 0);
    return <p>Tick: {tick}</p>;
}
```

| Argument | Meaning |
| --- | --- |
| `name` | Dotted event name, such as `'clock.tick'` |
| `initial` | Value used until the first SSE message. It is not sent to the backend |

This hook only listens. It cannot start an input event. For `echo.shout`, call `ipc.on(name, input, cb)` from `@leptonjs/client`.

```tsx
import { ipc } from '@leptonjs/client';
import { useEvent } from '@leptonjs/react';
import { useState } from 'react';

function App() {
    const tick = useEvent('clock.tick', 0);
    const [shout, setShout] = useState('');

    const onShout = () => {
        const stop = ipc.on('echo.shout', 'hello', (result) => {
            setShout(result);
            stop();
        });
    };

    return (
        <main>
            <p>Tick: {tick}</p>
            <button type="button" onClick={onShout}>
                Shout
            </button>
            <p>{shout}</p>
        </main>
    );
}
```

Route calls also stay on `ipc` (`ipc.invoke` or the nested proxy). This package does not wrap those.

## License

MIT
