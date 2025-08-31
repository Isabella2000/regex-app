"use client";

import React, { useMemo, useState, useCallback } from "react";

type Row = {
  raw: string;
  fecha: string;
  statuscode: string;
  descripcion: string;
  iporigen: string;
  lineNumber: number;
};

type RegexError = {
  field: keyof Pick<Row, "fecha" | "statuscode" | "descripcion" | "iporigen">;
  message: string;
};

const FIELD_LABELS: Record<keyof Pick<Row, "fecha" | "statuscode" | "descripcion" | "iporigen">, string> = {
  fecha: "Fecha",
  statuscode: "Status Code",
  descripcion: "Descripción",
  iporigen: "IP Origen",
};

export default function Home() {
  const [active, setActive] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [formatErrors, setFormatErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  // filtros regex (texto crudo de usuario)
  const [regexInputs, setRegexInputs] = useState<{
    fecha: string;
    statuscode: string;
    descripcion: string;
    iporigen: string;
  }>({ fecha: "", statuscode: "", descripcion: "", iporigen: "" });

  const [regexFlags, setRegexFlags] = useState<{
    i: boolean; // ignore case
    m: boolean; // multiline (no suele impactar aquí, pero permitido)
  }>({ i: true, m: false });

  const [regexParseErrors, setRegexParseErrors] = useState<Array<RegexError>>([]);
  const tabs = ["Resultados", "Errores"];

  const onPickFile = useCallback(async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;

    setFileName(f.name);
    const text = await f.text();

    const lines = text.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim().length > 0);
    const parsed: Row[] = [];
    const errs: string[] = [];

    // Validadores (suaves para fecha, estrictos para status e IP)
    const ipV4 =
      /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    const statusRe = /^\d{3}$/;

    lines.forEach((line, idx) => {
      const lineNumber = idx + 1;
      const parts = line.split(";");
      if (parts.length !== 4) {
        errs.push(`Línea ${lineNumber}: formato inválido (se esperaban 4 campos separados por ';').`);
        return;
      }
      const [fecha, statuscode, descripcion, iporigen] = parts.map(p => p.trim());

      if (!statusRe.test(statuscode)) {
        errs.push(`Línea ${lineNumber}: statuscode inválido (deben ser 3 dígitos).`);
        return;
      }
      if (!ipV4.test(iporigen)) {
        errs.push(`Línea ${lineNumber}: iporigen inválido (IPv4).`);
        return;
      }
      // fecha: se acepta cualquier string sin ';' (porque puede venir en múltiples formatos)
      if (fecha.length === 0 || /;/.test(fecha)) {
        errs.push(`Línea ${lineNumber}: fecha inválida.`);
        return;
      }
      parsed.push({ raw: line, fecha, statuscode, descripcion, iporigen, lineNumber });
    });

    setRows(parsed);
    setFormatErrors(errs);
  }, []);

  // Construye RegExp por campo (o ignora si el input está vacío)
  const compiledRegexes = useMemo(() => {
    const errors: RegexError[] = [];
    const flags = `${regexFlags.i ? "i" : ""}${regexFlags.m ? "m" : ""}`;

    function compileOne(field: keyof typeof regexInputs): RegExp | null {
      const src = regexInputs[field].trim();
      if (!src) return null;
      try {
        return new RegExp(src, flags);
      } catch (e: any) {
        errors.push({ field, message: e?.message ?? "Expresión inválida" });
        return null;
      }
    }

    const out = {
      fecha: compileOne("fecha"),
      statuscode: compileOne("statuscode"),
      descripcion: compileOne("descripcion"),
      iporigen: compileOne("iporigen"),
    };

    setRegexParseErrors(errors);
    return out;
  }, [regexInputs, regexFlags]);

  // FILTRADO **SOLO CON REGEX**
  const filtered = useMemo(() => {
    // si hay errores de regex, no filtrar
    if (regexParseErrors.length > 0) return [];

    return rows.filter((r) => {
      // AND lógico: cada regex presente debe hacer match en su campo
      if (compiledRegexes.fecha && !compiledRegexes.fecha.test(r.fecha)) return false;
      if (compiledRegexes.statuscode && !compiledRegexes.statuscode.test(r.statuscode)) return false;
      if (compiledRegexes.descripcion && !compiledRegexes.descripcion.test(r.descripcion)) return false;
      if (compiledRegexes.iporigen && !compiledRegexes.iporigen.test(r.iporigen)) return false;
      return true;
    });
  }, [rows, compiledRegexes, regexParseErrors]);

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg text-slate-100">
      <div className="frosted-backdrop rounded-2xl shadow w-[90%] max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        <header className="w-full px-4 pb-4 sm:px-6 lg:px-8 flex flex-col gap-2 border-b border-slate-800">
          <h1 className="text-3xl sm:text-3xl font-bold tracking-tight">
            Filtro Expresiones Regulares (Regex)
          </h1>
          <p className="text-slate-600 mt-1">
            Formato requerido por línea: <code className="bg-white/50 px-2 py-0.5 rounded">fecha;statuscode;descripcion;iporigen</code>
          </p>
        </header>

        <main className="py-6 grid gap-6">
          {/* Carga de archivo */}
          <div className="frosted-backdrop-inside rounded-2xl p-2 flex flex-col md:flex-row md:items-center gap-4 shadow">
            <label className="inline-flex items-center gap-3">
              <input
                type="file"
                accept=".txt"
                onChange={onPickFile}
                className="block text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
              />
            </label>
            <div className="text-sm text-slate-600">
              {fileName ? `Archivo: ${fileName}` : "Selecciona un archivo .txt"}
            </div>
          </div>

          {/* Formulario de filtros (SOLO REGEX) */}
          <section className="frosted-backdrop-inside rounded-2xl p-4 sm:p-6 shadow grid gap-4">
            <h2 className="text-lg font-semibold">Filtros (expresiones regulares)</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(
                [
                  ["fecha", "Ej: ^2025-08-"],
                  ["statuscode", "Ej: ^(200|404)$"],
                  ["descripcion", "Ej: error|timeout"],
                  ["iporigen", "Ej: ^192\\.168\\."],
                ] as const
              ).map(([field, placeholder]) => (
                <div key={field} className="grid gap-1">
                  <label className="text-sm text-slate-600">{FIELD_LABELS[field]}</label>
                  <input
                    value={regexInputs[field]}
                    onChange={(e) =>
                      setRegexInputs((s) => ({ ...s, [field]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className="w-full text-sm rounded-xl bg-white/50 border border-slate-800 p-2 outline-none"
                  />
                  {/* error de regex por campo */}
                  {regexParseErrors.find((x) => x.field === field) && (
                    <p className="text-xs text-red-400">
                      {regexParseErrors.find((x) => x.field === field)?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Resultados */}
          <section className="frosted-backdrop-inside rounded-2xl p-4 sm:p-6 shadow">
            <h2 className="text-lg font-semibold">Lecturas</h2>
            <div className="text-sm text-end text-slate-600">
              Total leídas: <span className="font-semibold">{rows.length}</span> · &nbsp;
              Coincidencias:{" "}<span className="font-semibold">{regexParseErrors.length > 0 ? 0 : filtered.length}</span> · &nbsp;
              Errores leidos:{" "}<span className="font-semibold">{formatErrors.length}</span>
            </div>

            {regexParseErrors.length > 0 ? (
              <div className="mt-3 rounded-xl border border-yellow-700 bg-yellow-900/30 p-3 text-yellow-200">
                Corrige las expresiones inválidas para ver resultados.
              </div>
            ) : filtered.length === 0 ? (
              <div className="mt-3 text-slate-600">Sin resultados…</div>
            ) : (
              <div className="w-full mx-auto">
                {/* Contenedor Tabs */}
                <div className="flex relative border-b border-gray-300">
                  {tabs.map((tab, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={`relative px-4 py-2 text-sm font-medium transition-colors ${active === i ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      {tab}
                    </button>
                  ))}

                  {/* Indicador animado */}
                  <span
                    className="absolute bottom-0 h-0.5 bg-blue-600 transition-all duration-300"
                    style={{
                      left: `${active * (25 / tabs.length)}%`,
                      width: `${25 / tabs.length}%`,
                    }}
                  />
                </div>

                {/* Contenido */}
                <div className="mt-4">
                  {active === 0 && <ul className="mt-4 grid grid-cols-2 gap-2 max-h-[60vh] overflow-auto pr-1">
                    {filtered.map((r) => (
                      <li
                        key={`${r.lineNumber}-${r.raw}`}
                        className="rounded-xl border border-slate-600 border-l-6 border-l-blue-400 bg-white/50 p-3 text-sm"
                      >
                        <div className="text-slate-600 mb-1">Línea {r.lineNumber}</div>
                        <div className="font-mono break-all">{r.raw}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          Fecha: <span className="font-mono">{r.fecha}</span> · Status:{" "}
                          <span className="font-mono">{r.statuscode}</span> · Ip:{" "}
                          <span className="font-mono">{r.iporigen}</span>
                        </div>
                      </li>
                    ))}
                  </ul>}
                  {/* Errores de formato del archivo */}
                  {active === 1
                    ? formatErrors.length > 0 && (
                      <ul className="mt-4 grid grid-cols-2 gap-2 max-h-[60vh] overflow-auto pr-1">
                        {formatErrors.map((e, i) => (
                          <li key={i} className="rounded-xl border border-slate-600 border-l-6 border-l-red-400 bg-white/50 p-3 text-sm">{e}</li>
                        ))}
                      </ul>
                    )
                    : <>No hay errores.</>
                  }
                </div>
              </div>
            )}
          </section>
        </main>
        Hecho por mi :)
      </div>
    </div>
  );
}
