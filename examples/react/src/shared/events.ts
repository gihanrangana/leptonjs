import { defineEvents, event } from '@leptonjs/registry';
import z from 'zod';

export const events = defineEvents({
    tick: event('tick', z.number()),
});
