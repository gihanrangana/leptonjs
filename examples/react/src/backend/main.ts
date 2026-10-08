import { app } from '@leptonjs/core';
import { api } from './api';
import { setup } from './app';
import { events } from './events';

void app.start({
    api,
    events,
    title: 'LeptonJS Desktop - React',
    splash: {
        image: 'src/assets/hero.png',
        backgroundColor: '#0f1419',
        width: 520,
        height: 360,
        minDurationMs: 2000,
    },
    setup,
});
