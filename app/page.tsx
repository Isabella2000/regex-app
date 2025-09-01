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

const FIELD_LABELS: Record<keyof Pick<Row, "statuscode" | "iporigen">, string> = {
  statuscode: "Status Code",
  iporigen: "IP Origen",
};

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [formatErrors, setFormatErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const [filters, setFilters] = useState<{ statuscode: string; iporigen: string }>({
    statuscode: "",
    iporigen: "",
  });

  const onPickFile = useCallback(async (archive: React.ChangeEvent<HTMLInputElement>) => {
    const file = archive.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const text = await file.text();

    const lines: string[] = text.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim().length > 0);
    const parsed: Row[] = [];
    const errs: string[] = [];

    const ipV4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    const statusregex = /^(1\d{2}|2\d{2}|3\d{2}|4\d{2}|5\d{2})$/;
    const fechaRegex = /^(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
    const descripcionRegex = /^"(.*)"$/;

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const parts = line.split(";");
      if (parts.length !== 4) {
        errs.push(`Línea ${lineNumber}: formato inválido (se esperaban 4 campos separados por ';').`);
        return;
      }
      let [fecha, statuscode, descripcion, iporigen] = parts.map(p => p.trim());

      // Validaciones
      if (!fechaRegex.test(fecha)) {
        errs.push(`Línea ${lineNumber}: fecha inválida (formato esperado yyyy-mm-dd).`);
        return;
      }
      if (!statusregex.test(statuscode)) {
        errs.push(`Línea ${lineNumber}: statuscode inválido (deben ser códigos HTTP válidos).`);
        return;
      }
      if (!ipV4Regex.test(iporigen)) {
        errs.push(`Línea ${lineNumber}: iporigen inválido (IPv4).`);
        return;
      }
      if (!descripcionRegex.test(descripcion)) {
        errs.push(`Línea ${lineNumber}: descripción inválida (debe empezar y terminar con comillas).`);
        return;
      }
      descripcion = descripcion.replace(/^"|"$/g, "");

      parsed.push({ raw: line, fecha, statuscode, descripcion, iporigen, lineNumber });
    });

    setRows(parsed);
    setFormatErrors(errs);
  }, []);


  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filters.statuscode && !r.statuscode.includes(filters.statuscode)) return false;
      if (filters.iporigen && !r.iporigen.includes(filters.iporigen)) return false;
      return true;
    });
  }, [rows, filters]);

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg text-slate-100">
      <div className="frosted-backdrop rounded-2xl shadow w-[90%] max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        <header className="w-full px-4 pb-4 sm:px-6 lg:px-8 flex flex-col gap-2 border-b border-slate-800">
          <h1 className="text-3xl font-bold tracking-tight">
            Filtro Expresiones Regulares (Regex)
          </h1>
          <p className="text-slate-600 mt-1">
            Formato requerido por línea: <code className="bg-white/50 px-2 py-0.5 rounded">fecha;statuscode;descripcion;iporigen</code>
          </p>
        </header>

        <main className="py-6 grid gap-6">
          <div className="grid grid-cols-2 w-full gap-6">
            {/* Carga de archivo */}
            <section className="frosted-backdrop-inside rounded-2xl p-2 flex flex-col gap-4 shadow">
              <h2 className="text-lg font-semibold">Archivo de carga</h2>
              <div>
                <label className="inline-flex items-center gap-3">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={onPickFile}
                    className="block text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
                  />
                </label>
              </div>
              <div className="text-sm text-slate-600">
                {fileName ? `Archivo: ${fileName}` : "Selecciona un archivo .txt"}
              </div>
            </section>

            {/* Filtros */}
            <section className="frosted-backdrop-inside rounded-2xl p-4 sm:p-6 shadow grid gap-4">
              <h2 className="text-lg font-semibold">Filtros</h2>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    ["statuscode", "Ej: 200"],
                    ["iporigen", "Ej: 192.168.120.100"],
                  ] as const
                ).map(([field, placeholder]) => (
                  <div key={field} className="grid gap-1">
                    <label className="text-sm text-slate-600">{FIELD_LABELS[field]}</label>
                    <input
                      value={filters[field]}
                      onChange={(e) =>
                        setFilters((s) => ({ ...s, [field]: e.target.value }))
                      }
                      placeholder={placeholder}
                      className="w-full text-sm rounded-xl bg-white/50 border border-slate-800 p-2 outline-none"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Resultados */}
          <section className="frosted-backdrop-inside rounded-2xl p-4 sm:p-6 shadow flex flex-col h-[60vh]">
            <div className="flex w-full justify-between">
              <h2 className="text-lg font-semibold">Resultados</h2>
              <div className="text-sm text-end text-slate-600">
                Total leídas: <span className="font-semibold">{rows.length}</span> · &nbsp;
                Coincidencias:{" "}
                <span className="font-semibold">{filtered.length}</span>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="mt-3 text-slate-600">Sin resultados…</div>
            ) : (
              // Este div fuerza el scroll
              <div className="mt-4 flex-1 overflow-y-auto pr-1">
                <ul className="grid grid-cols-2 gap-2">
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
                </ul>
              </div>
            )}
          </section>
        </main>
        <footer className="p-3 text-center text-xs text-slate-500">
          Isabella Collante Mendez :)
        </footer>
      </div>
    </div>
  );
}
