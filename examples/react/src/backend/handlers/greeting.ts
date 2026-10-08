import { defineApi } from '@leptonjs/core';
import { defineRoute } from '@leptonjs/registry';
import z from 'zod';

export const getGreeting = defineRoute(z.string(), z.string(), async (name) => `Hello, ${name}!`);

export const greeting = defineApi({ getGreeting });
