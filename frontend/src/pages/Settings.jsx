import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const ENGINES = [
  { value: 'local', label: 'Local (Tesseract.js)' },
  { value: 'cloud', label: 'Nube (Google Vision)' },
];

const LANGUAGES = [
  { value: 'spa', label: 'Español' },
  { value: 'eng', label: 'Inglés' },
  { value: 'spa+eng', label: 'Español + Inglés' },
];

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/settings').then(setSettings).catch((e) => setError(e.message));
  }, []);

  const patch = (path, value) => {
    setSettings((s) => {
      const next = structuredClone(s);
      if (path.length === 1) next[path[0]] = value;
      else next[path[0]][path[1]] = value;
      return next;
    });
  };

  const save = async () => {
    setError(null);
    setSaved(false);
    try {
      const updated = await api.put('/settings', settings);
      setSettings(updated);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    }
  };

  if (!settings) return <div className="page"><p className="muted">Cargando configuración…</p></div>;

  const ocr = settings.invoiceOcr;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Configuración</h1>
          <p className="page__subtitle">Opciones generales de la aplicación</p>
        </div>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {saved && <p className="alert alert--success">Configuración guardada.</p>}

      <section className="card">
        <h2 className="card__title">Módulo OCR de facturas</h2>
        <p className="muted small">
          Al subir una factura (PDF o imagen) se extrae automáticamente el nº de factura y el importe
          para generar el movimiento correspondiente.
        </p>

        <div className="form__grid">
          <label className="field">
            <span>Módulo activado</span>
            <select value={ocr.enabled ? '1' : '0'} onChange={(e) => patch(['invoiceOcr', 'enabled'], e.target.value === '1')}>
              <option value="1">Activado</option>
              <option value="0">Desactivado</option>
            </select>
          </label>

          <label className="field">
            <span>Motor de OCR</span>
            <select value={ocr.engine} onChange={(e) => patch(['invoiceOcr', 'engine'], e.target.value)}>
              {ENGINES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Idioma</span>
            <select value={ocr.language} onChange={(e) => patch(['invoiceOcr', 'language'], e.target.value)}>
              {LANGUAGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <label className="field">
            <span>Confirmación</span>
            <select value={ocr.autoSave ? '1' : '0'} onChange={(e) => patch(['invoiceOcr', 'autoSave'], e.target.value === '1')}>
              <option value="0">Revisar antes de guardar</option>
              <option value="1">Guardar automáticamente</option>
            </select>
          </label>

          {ocr.engine === 'cloud' && (
            <label className="field field--full">
              <span>API key de Google Vision</span>
              <input
                type="password"
                value={ocr.cloud.apiKey}
                onChange={(e) => patch(['invoiceOcr', 'cloud'], { ...ocr.cloud, apiKey: e.target.value })}
                placeholder="AIza…"
              />
            </label>
          )}
        </div>

        <div className="form__actions">
          <button type="button" className="btn btn--primary" onClick={save}>Guardar configuración</button>
        </div>
      </section>
    </div>
  );
}
