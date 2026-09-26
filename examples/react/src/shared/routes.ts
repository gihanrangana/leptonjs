import { defineRoutes, route } from '@leptonjs/registry';
import z from 'zod';

export const routes = defineRoutes({
    getGreeting: route('getGreeting', z.string(), z.string()),
});
