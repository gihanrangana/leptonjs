import { app } from '@leptonjs/core';
import { routes, setup } from './app';

void app.start({
    routes,
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
