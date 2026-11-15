// Kleine Helfer zum Bauen der Menüs. Text landet immer über Textknoten, nie über innerHTML.

/**
 * Erzeugt ein Element. `props`: `class`, `text` (textContent), `on<Ereignis>` (Listener),
 * sonst Attribute (true → leeres Attribut, false/null/undefined → weggelassen).
 * Kinder: Knoten oder Zeichenketten (werden zu Textknoten); null/false werden übersprungen.
 * @param {string} tag
 * @param {Record<string, any>} [props]
 * @param {...(Node|string|number|null|undefined|false)} children
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = String(value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
  return node;
}

/**
 * Sekunden als mm:ss; 0 oder ungültig → „–“.
 * @param {number} seconds
 */
export function formatTime(seconds) {
  if (!(seconds > 0)) return '–';
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const numberFormats = new Map();
/**
 * Zahl im deutschen Format mit festen Nachkommastellen.
 * @param {number} value
 * @param {number} [digits]
 */
export function formatNumber(value, digits = 0) {
  let f = numberFormats.get(digits);
  if (!f) numberFormats.set(digits, f = new Intl.NumberFormat('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  return f.format(value);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Baut ein SVG-Element mit Attributen und Kindern. */
export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  node.append(...children);
  return node;
}
