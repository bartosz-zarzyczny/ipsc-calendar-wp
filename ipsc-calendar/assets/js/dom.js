/**
 * Minimal DOM builder: h('a', { class: 'x', href, onClick }, 'text', child).
 */

const PROPERTIES = new Set(['value', 'checked', 'selected', 'disabled', 'hidden', 'open', 'indeterminate']);

export function h(tag, props, ...children) {
	const el = document.createElement(tag);

	for (const [key, value] of Object.entries(props || {})) {
		if (value == null || value === false) continue;

		if (key === 'class') {
			el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
		} else if (key === 'dataset') {
			Object.assign(el.dataset, value);
		} else if (key === 'style') {
			for (const [prop, v] of Object.entries(value)) if (v != null) el.style.setProperty(prop, v);
		} else if (key.startsWith('on') && typeof value === 'function') {
			el.addEventListener(key.slice(2).toLowerCase(), value);
		} else if (PROPERTIES.has(key)) {
			el[key] = value;
		} else {
			el.setAttribute(key, value === true ? '' : String(value));
		}
	}

	append(el, children);
	return el;
}

function append(parent, children) {
	for (const child of children) {
		if (child == null || child === false) continue;
		if (Array.isArray(child)) append(parent, child);
		else parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
	}
}

/** Allows only http(s), webcal and site-relative URLs coming from content. */
export function safeUrl(value) {
	if (!value || typeof value !== 'string') return null;
	return /^(https?:|webcal:)?\/\//i.test(value) || value.startsWith('/') ? value : null;
}

const ICONS = {
	calendar: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 7h14v10H5V9Z',
	clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7Z',
	pin: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z',
	users: 'M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.7 0-8 1.3-8 4v3h10v-3c0-1 .4-2 1.2-2.7A13 13 0 0 0 8 13Zm8 0c-.3 0-.7 0-1 .1 1.2.9 2 2 2 3.9v3h7v-3c0-2.7-5.3-4-8-4Z',
	tag: 'M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7c0 .6.2 1.1.6 1.4l9 9a2 2 0 0 0 2.8 0l7-7a2 2 0 0 0 0-2.8ZM6.5 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
	search: 'M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z',
	filter: 'M3 5h18v2l-7 7v6l-4-2v-4L3 7V5Z',
	chevronLeft: 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12l4.6-4.6Z',
	chevronRight: 'M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6-4.6 4.6Z',
	chevronDown: 'M7.4 8.6 6 10l6 6 6-6-1.4-1.4L12 13.2 7.4 8.6Z',
	close: 'M18.3 5.7 16.9 4.3 12 9.2 7.1 4.3 5.7 5.7l4.9 4.9-4.9 4.9 1.4 1.4 4.9-4.9 4.9 4.9 1.4-1.4-4.9-4.9 4.9-4.9Z',
	star: 'm12 17.3 6.2 3.7-1.6-7 5.4-4.7-7.1-.6L12 2 9.1 8.7 2 9.3l5.4 4.7-1.6 7 6.2-3.7Z',
	list: 'M3 5h2v2H3V5Zm4 0h14v2H7V5ZM3 11h2v2H3v-2Zm4 0h14v2H7v-2Zm-4 6h2v2H3v-2Zm4 0h14v2H7v-2Z',
	grid: 'M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z',
	external: 'M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
};

export function icon(name) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('focusable', 'false');
	svg.setAttribute('class', 'ic-icon');
	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', ICONS[name] || '');
	path.setAttribute('fill', 'currentColor');
	svg.append(path);
	return svg;
}
