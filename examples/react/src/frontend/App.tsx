import { invoke } from '@leptonjs/client';
import { useEvent } from '@leptonjs/react';
import { events } from '@shared/events';
import { routes } from '@shared/routes';
import { useState } from 'react';

import './App.css';

const App: React.FC = () => {
    const [name, setName] = useState('World');
    const [greeting, setGreeting] = useState('');

    const tick = useEvent(events.tick, 0);

    const onGreet = async () => {
        setGreeting(await invoke(routes.getGreeting, name));
    };

    return (
        <main>
            <h1>LeptonJS Desktop + React</h1>
            <p>Tick: {tick}</p>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <button type="button" onClick={onGreet}>
                Greet
            </button>
            <p>{greeting}</p>
        </main>
    );
};

export default App;
