const PREFIX = 'ipsc-calendar/';
const JS_ROOT = new URL('../../ipsc-calendar/assets/js/', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
	if (specifier.startsWith(PREFIX)) {
		return nextResolve(new URL(`${specifier.slice(PREFIX.length)}.js`, JS_ROOT).href, context);
	}
	return nextResolve(specifier, context);
}
