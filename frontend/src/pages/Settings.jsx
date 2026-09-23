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

  const updateBracket = (index, field, value) => {
    setSettings((s) => {
      const next = structuredClone(s);
      const brackets = next.irpf.brackets;
      if (field === 'upTo') brackets[index].upTo = value === '' ? null : Number(value);
      else brackets[index].rate = value === '' ? 0 : Number(value) / 100;
      return next;
    });
  };

  const addBracket = () => {
    setSettings((s) => {
      const next = structuredClone(s);
      next.irpf.brackets.splice(Math.max(0, next.irpf.brackets.length - 1), 0, { upTo: null, rate: 0 });
      return next;
    });
  };

  const removeBracket = (index) => {
    setSettings((s) => {
      const next = structuredClone(s);
      if (next.irpf.brackets.length > 1) next.irpf.brackets.splice(index, 1);
      return next;
    });
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

      <section className="card">
        <h2 className="card__title">Escala de IRPF (simulación)</h2>
        <p className="muted small">
          Tramos usados para la simulación de IRPF de la página de Impuestos. El último tramo (sin
          límite) aplica al resto.
        </p>
        <div className="form__grid">
          <label className="field">
            <span>Mínimo personal y familiar (€)</span>
            <input
              type="number"
              min="0"
              step="100"
              value={settings.irpf.minimoPersonal ?? 5550}
              onChange={(e) => patch(['irpf', 'minimoPersonal'], e.target.value === '' ? 0 : Number(e.target.value))}
            />
          </label>
        </div>
        <table className="table">
          <thead>
            <tr><th>Hasta (€)</th><th className="num">Tipo %</th><th className="actions-col" /></tr>
          </thead>
          <tbody>
            {settings.irpf.brackets.map((b, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="Sin límite"
                    value={b.upTo ?? ''}
                    onChange={(e) => updateBracket(i, 'upTo', e.target.value)}
                  />
                </td>
                <td className="num">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    style={{ width: 90, textAlign: 'right' }}
                    value={Math.round(b.rate * 1000) / 10}
                    onChange={(e) => updateBracket(i, 'rate', e.target.value)}
                  />
                </td>
                <td className="actions-col">
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => removeBracket(i)}>Quitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="form__actions">
          <button type="button" className="btn" onClick={addBracket}>+ Añadir tramo</button>
          <button type="button" className="btn btn--primary" onClick={save}>Guardar configuración</button>
        </div>
      </section>
    </div>
  );
}
