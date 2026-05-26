'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Reporte {
  id: string;
  periodo: string;
  tipo: string;
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  generadoPor: string;
  fechaCreacion: string;
  detalles: any[];
}

export default function Home() {
  const [token, setToken] = useState<string>('');
  const [role, setRole] = useState<string>('admin');
  const [username, setUsername] = useState<string>('Samuel');
  const [periodo, setPeriodo] = useState<string>('2026-05');
  const [tipo, setTipo] = useState<string>('finanzas');
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [infoMsg, setInfoMsg] = useState<string>('');

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  };

  // Login handler to fetch token from API Gateway mock endpoint
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setInfoMsg('');
    try {
      const response = await axios.post(`${getApiUrl()}/auth/login`, {
        username,
        role
      });
      setToken(response.data.token);
      setInfoMsg(`Autenticado exitosamente como ${username} (${role}). Token generado.`);
    } catch (err: any) {
      console.error(err);
      setError('Error al autenticar con el API Gateway. Asegúrese de que esté en ejecución.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarReporte = async () => {
    if (!token) {
      setError('Debe iniciar sesión primero para obtener un token JWT.');
      return;
    }
    
    // Client-side validation format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(periodo)) {
      setError('Formato de periodo inválido. Debe ser YYYY-MM.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMsg('');
    
    try {
      const response = await axios.post(
        `${getApiUrl()}/reportes/generar`,
        { periodo, tipo },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setReporte(response.data);
      setInfoMsg('Reporte generado exitosamente y cargado desde el microservicio.');
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 403) {
        setError('Acceso denegado (403): Permisos insuficientes para el rol asignado.');
      } else if (err.response?.status === 401) {
        setError('No autorizado (401): Token JWT inválido o expirado.');
      } else {
        setError(err.response?.data?.message || 'Error de comunicación con el backend.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
      {/* Header */}
      <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-indigo-400 bg-clip-text text-transparent">
            ServiPlus Reportes Operativos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Plataforma Analítica y Auditoría en Tiempo Real • Módulo de Finanzas
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-lg text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-400">Gateway Status: Online</span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Controls Column */}
        <section className="space-y-6 lg:col-span-1">
          
          {/* Authentication Panel */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-850 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200">1. Autenticación (RBAC Simulado)</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rol Asignado</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="admin">Administrador (Acceso Completo)</option>
                  <option value="analista">Analista (Acceso Permitido)</option>
                  <option value="user">Usuario Común (Acceso Restringido)</option>
                </select>
              </div>
              <button
                onClick={handleLogin}
                className="w-full bg-indigo-650 hover:bg-indigo-600 transition-colors text-white font-medium text-sm py-2 rounded-lg shadow-lg"
              >
                Obtener Token JWT
              </button>
            </div>
            {token && (
              <div className="mt-3 p-2 bg-slate-950 border border-slate-850 rounded-lg text-xs break-all text-slate-400">
                <span className="text-teal-400 font-semibold">JWT: </span>
                {token.substring(0, 30)}...
              </div>
            )}
          </div>

          {/* Form Generation Panel */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-850 p-6 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-200">2. Parámetros del Reporte</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Periodo (Format: YYYY-MM)</label>
                <input
                  type="text"
                  placeholder="Ej: 2026-05"
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tipo de Reporte</label>
                <input
                  type="text"
                  value={tipo}
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-850 rounded-lg px-3 py-2 text-sm text-slate-500 focus:outline-none cursor-not-allowed"
                />
              </div>
              <button
                onClick={handleGenerarReporte}
                className="w-full bg-teal-500 hover:bg-teal-400 transition-all text-slate-950 font-bold text-sm py-2.5 rounded-lg shadow-lg"
              >
                Generar Reporte
              </button>
            </div>
          </div>
        </section>

        {/* Output Column */}
        <section className="lg:col-span-2 space-y-6">
          {/* Notifications */}
          {error && (
            <div className="bg-rose-950/50 border border-rose-800 text-rose-300 p-4 rounded-xl text-sm flex items-start gap-2">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {infoMsg && (
            <div className="bg-emerald-950/40 border border-emerald-900 text-emerald-300 p-4 rounded-xl text-sm flex items-start gap-2">
              <span className="font-semibold">Info:</span> {infoMsg}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/20 border border-slate-850 rounded-2xl h-64">
              <div className="h-8 w-8 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin mb-4"></div>
              <p className="text-slate-400 text-sm">Procesando petición y comunicando microservicios...</p>
            </div>
          )}

          {/* Report Viewer */}
          {!loading && reporte && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Metrics cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl shadow-md">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Ingresos</span>
                  <div className="text-xl md:text-2xl font-black text-emerald-400 mt-1">${reporte.totalIngresos.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl shadow-md">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Egresos</span>
                  <div className="text-xl md:text-2xl font-black text-rose-400 mt-1">${reporte.totalEgresos.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl shadow-md">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Balance General</span>
                  <div className={`text-xl md:text-2xl font-black mt-1 ${reporte.balance >= 0 ? 'text-teal-400' : 'text-rose-500'}`}>
                    ${reporte.balance.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-slate-900/50 border border-slate-850 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 bg-slate-900 border-b border-slate-850 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-200">Detalles del Reporte ({reporte.periodo})</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full font-mono">ID: {reporte.id}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-850 text-slate-400 uppercase tracking-wider">
                        <th className="p-4 font-semibold">Descripción</th>
                        <th className="p-4 font-semibold">Tipo</th>
                        <th className="p-4 font-semibold">Fecha</th>
                        <th className="p-4 font-semibold text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {reporte.detalles.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 text-slate-200 font-medium">{item.descripcion}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.tipo === 'ingreso' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900' : 'bg-rose-950/60 text-rose-400 border border-rose-900'}`}>
                              {item.tipo.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400">{item.fecha}</td>
                          <td className={`p-4 text-right font-semibold ${item.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${item.monto.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Audit Details */}
              <div className="text-[10px] text-slate-500 flex justify-between items-center px-2">
                <span>Generado por: {reporte.generadoPor}</span>
                <span>Creación: {new Date(reporte.fechaCreacion).toLocaleString()}</span>
              </div>

            </div>
          )}

          {!reporte && !loading && (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/10 border border-slate-850 border-dashed rounded-2xl h-64 text-slate-500">
              <svg className="w-12 h-12 mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">Ningún reporte generado para este periodo. Use los controles de la izquierda.</p>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
