import { ipc } from '@leptonjs/client';
import { useEvent } from '@leptonjs/react';
import { useEffect, useState } from 'react';

import './App.css';

const App: React.FC = () => {
    const [name, setName] = useState('World');
    const [greeting, setGreeting] = useState('');
    const [text, setText] = useState('hello');
    const [shout, setShout] = useState('');
    const [heard, setHeard] = useState(0);

    const tick = useEvent('clock.tick', 0);

    useEffect(() => {
        return ipc.on('clock.tick', (n) => {
            setHeard(n);
        });
    }, []);

    const onGreet = async () => {
        setGreeting(await ipc.invoke('greeting.getGreeting', name));
    };

    const onShout = () => {
        const stop = ipc.on('echo.shout', text, (result) => {
            setShout(result);
            stop();
        });
    };

    return (
        <main>
            <h1>LeptonJS Desktop + React</h1>
            <p>Tick: {tick}</p>
            <p>Heard: {heard}</p>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <button type="button" onClick={onGreet}>
                Greet
            </button>
            <p>{greeting}</p>
            <input value={text} onChange={(e) => setText(e.target.value)} />
            <button type="button" onClick={onShout}>
                Shout
            </button>
            <p>{shout}</p>
        </main>
    );
};

export default App;
