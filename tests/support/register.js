// Lets Node resolve the "ipsc-calendar/<module>" IDs used by the browser import map.
import { register } from 'node:module';

register('./resolve-hooks.js', import.meta.url);
