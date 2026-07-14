import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { X, RefreshCw, Trash2, Database, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminLogsModalProps {
  onClose: () => void;
}

export default function AdminLogsModal({ onClose }: AdminLogsModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Вы действительно хотите очистить локальные логи? Это не удалит записи из Google Таблицы.')) {
      return;
    }
    try {
      const res = await fetch('/api/logs/clear', { method: 'POST' });
      if (res.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#F5F2ED] rounded-3xl shadow-xl border border-natural-text/10 max-w-4xl w-full overflow-hidden flex flex-col h-[80vh]"
        id="admin-logs-modal"
      >
        {/* Header */}
        <div className="bg-natural-dark p-5 text-natural-bg flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <span className="font-serif font-bold text-lg">Логирование работы ассистента</span>
          </div>
          <button onClick={onClose} className="text-natural-bg/80 hover:text-white transition-colors cursor-pointer" id="close-logs-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="bg-natural-sand/30 border-b border-natural-text/10 p-4 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-natural-text/60 font-medium">Синхронизировано с Google Sheet:</span>
            <a
              href="https://docs.google.com/spreadsheets/d/1SKdhOx3xt8SHBo5xeJhXdOj48QLN7zkQt_61moUiN7k/edit?gid=1655651342#gid=1655651342"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-natural-accent hover:text-natural-dark hover:underline font-bold flex items-center gap-1 shrink-0"
            >
              <span>Открыть Google Таблицу</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-1.5 bg-white border border-natural-text/10 hover:bg-natural-sand/30 disabled:opacity-50 text-natural-text py-1.5 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Обновить</span>
            </button>

            <button
              onClick={handleClearLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 py-1.5 px-3.5 rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистить</span>
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-grow overflow-auto p-4 bg-[#F5F2ED]">
          {logs.length > 0 ? (
            <div className="bg-white border border-natural-text/10 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-natural-text/80 border-collapse">
                  <thead>
                    <tr className="bg-natural-sand/20 border-b border-natural-text/10 text-[10px] text-natural-text/40 font-bold uppercase select-none">
                      <th className="p-3">Время (UTC)</th>
                      <th className="p-3">Запрос</th>
                      <th className="p-3">Найдено в таблице</th>
                      <th className="p-3">Модель ИИ</th>
                      <th className="p-3">Ответ ассистента</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-natural-text/5 font-mono">
                    {logs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-natural-sand/10 transition-colors">
                        <td className="p-3 text-natural-text/50 whitespace-nowrap align-top">{log.timestamp}</td>
                        <td className="p-3 text-natural-text font-bold align-top max-w-[150px] truncate" title={log.query}>
                          {log.query}
                        </td>
                        <td className="p-3 align-top whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.foundInTable === 'Да'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-natural-sand/40 text-natural-text/60'
                          }`}>
                            {log.foundInTable}
                          </span>
                        </td>
                        <td className="p-3 text-natural-text/70 align-top whitespace-nowrap">{log.usedAI}</td>
                        <td className="p-3 text-natural-text font-sans leading-relaxed align-top max-w-sm line-clamp-3" title={log.answer}>
                          {log.answer}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-natural-text/40 space-y-2">
              <AlertCircle className="w-10 h-10 text-natural-text/20" />
              <p className="font-bold font-serif text-sm text-natural-text/80">Лог-записей пока нет</p>
              <p className="text-xs">Начните диалог с кофейным сомелье, чтобы увидеть логи в реальном времени.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
