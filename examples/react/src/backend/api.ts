import { defineApi } from '@leptonjs/core';
import { greeting } from './handlers/greeting';

export const api = defineApi({ greeting });
