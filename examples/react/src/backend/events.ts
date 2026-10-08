import { defineEvent, defineEvents } from '@leptonjs/registry';
import z from 'zod';

export const events = defineEvents({
    clock: {
        tick: defineEvent(z.number()),
    },
    echo: {
        shout: defineEvent(z.string(), z.string(), (text, emit) => {
            emit(text.toUpperCase());
        }),
    },
});
