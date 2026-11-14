// Einstellungen: Lautstärke und Grafikqualität. Beides wirkt sofort und steht in save.settings.
import { el } from './dom.js';
import { screenHeader, screenFooter } from './menus.js';

const QUALITIES = [
  { id: 'high', label: 'Hoch', text: 'Schatten und volle Bildschärfe.' },
  { id: 'low', label: 'Niedrig', text: 'Ohne Schatten, weniger Effekte. Läuft flüssiger auf schwächeren Geräten.' },
];

/**
 * @param {HTMLElement} c
 * @param {Record<string, any>} props
 * @param {any} app
 */
export function renderSettings(c, props, app) {
  const { volume, quality } = app.save.settings;

  const output = el('output', { class: 'setting-value', for: 'volume', text: volume === 0 ? 'Aus' : `${volume} %` });
  const slider = el('input', {
    id: 'volume', class: 'slider', type: 'range', min: '0', max: '100', step: '5', value: String(volume),
    'aria-describedby': 'volume-hint',
    // Beim Ziehen sofort hörbar machen, gespeichert wird beim Loslassen.
    oninput: () => {
      const v = Number(slider.value);
      output.textContent = v === 0 ? 'Aus' : `${v} %`;
      app.sfx.setVolume(v);
    },
    onchange: () => {
      const v = Number(slider.value);
      app.update((save) => { save.settings.volume = v; });
      app.applySettings();
      app.sfx.play('pickup'); // Hörprobe
    },
  });

  const options = QUALITIES.map((q) => el('label', { class: 'option' },
    el('input', {
      type: 'radio', name: 'quality', value: q.id, checked: q.id === quality,
      onchange: () => {
        app.update((save) => { save.settings.quality = q.id; });
        app.applySettings();
      },
    }),
    el('span', { class: 'option-body' },
      el('span', { class: 'option-title', text: q.label }),
      el('span', { class: 'option-text muted', text: q.text }))));

  const sides = [
    { id: 'right', label: 'Rechts', text: 'Knöpfe unten rechts, laufen mit dem linken Daumen.' },
    { id: 'left', label: 'Links', text: 'Knöpfe unten links, laufen mit dem rechten Daumen.' },
  ].map((o) => el('label', { class: 'option' },
    el('input', {
      type: 'radio', name: 'buttonSide', value: o.id, checked: o.id === app.save.settings.buttonSide,
      onchange: () => { app.update((save) => { save.settings.buttonSide = o.id; }); app.applySettings(); },
    }),
    el('span', { class: 'option-body' },
      el('span', { class: 'option-title', text: o.label }),
      el('span', { class: 'option-text muted', text: o.text }))));

  c.append(
    screenHeader('Einstellungen'),
    el('div', { class: 'settings-list' },
      el('section', { class: 'panel setting' },
        el('div', { class: 'setting-head' },
          el('label', { class: 'setting-label', for: 'volume', text: 'Lautstärke' }),
          output),
        slider,
        el('p', { class: 'hint', id: 'volume-hint', text: 'Ganz links ist der Ton aus.' })),
      el('fieldset', { class: 'panel setting' },
        el('legend', { class: 'setting-label', text: 'Grafikqualität' }),
        ...options),
      el('fieldset', { class: 'panel setting' },
        el('legend', { class: 'setting-label', text: 'Knöpfe im Abenteuer' }),
        ...sides)),
    screenFooter(() => app.screens.show('main')),
  );
}
