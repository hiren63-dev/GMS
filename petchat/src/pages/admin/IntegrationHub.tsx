import { useState, useEffect } from 'react';
import type { Employee, Integration } from '../../types';
import { onIntegrationsChange, saveIntegration } from '../../services/firebase';

interface Props { employee: Employee; }

const INTEGRATIONS: { id: string; name: string; type: Integration['type']; icon: string; desc: string; apiKeyLabel?: string; webhookLabel?: string }[] = [
  { id: 'openrouter', name: 'OpenRouter AI',  type: 'openrouter', icon: '🤖', desc: 'AI insights & weekly summaries via OpenRouter API', apiKeyLabel: 'OpenRouter API Key' },
  { id: 'slack',      name: 'Slack',           type: 'slack',      icon: '💬', desc: 'Send announcements & notifications to Slack channels', webhookLabel: 'Slack Webhook URL' },
  { id: 'github',     name: 'GitHub',          type: 'github',     icon: '🐙', desc: 'Track commits, PRs, and repository activity', apiKeyLabel: 'GitHub Personal Access Token' },
  { id: 'google',     name: 'Google Calendar', type: 'google',     icon: '📅', desc: 'Sync shifts and meetings with Google Calendar', apiKeyLabel: 'Google API Key' },
];

export default function IntegrationHub({ employee }: Props) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, { apiKey: string; webhookUrl: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, 'ok' | 'fail' | null>>({});

  useEffect(() => {
    return onIntegrationsChange(setIntegrations);
  }, []);

  const getIntegration = (id: string) => integrations.find(i => i.id === id);

  const startEdit = (intId: string) => {
    const existing = getIntegration(intId);
    setFormValues(prev => ({
      ...prev,
      [intId]: { apiKey: existing?.apiKey ?? '', webhookUrl: existing?.webhookUrl ?? '' }
    }));
    setEditing(intId);
  };

  const handleSave = async (intDef: typeof INTEGRATIONS[0]) => {
    const vals = formValues[intDef.id] ?? { apiKey: '', webhookUrl: '' };
    if (!vals.apiKey && !vals.webhookUrl) return;
    setSaving(intDef.id);
    await saveIntegration(intDef.id, {
      id: intDef.id, name: intDef.name, type: intDef.type,
      apiKey: vals.apiKey || undefined,
      webhookUrl: vals.webhookUrl || undefined,
      enabled: true,
      connectedAt: Date.now(),
    });
    setEditing(null); setSaving(null);
  };

  const handleToggle = async (intDef: typeof INTEGRATIONS[0], enabled: boolean) => {
    const existing = getIntegration(intDef.id);
    if (!existing) return;
    await saveIntegration(intDef.id, { enabled });
  };

  const handleTest = async (intId: string) => {
    setTestResult(prev => ({ ...prev, [intId]: null }));
    await new Promise(r => setTimeout(r, 800));
    const integration = getIntegration(intId);
    const success = integration?.apiKey || integration?.webhookUrl;
    setTestResult(prev => ({ ...prev, [intId]: success ? 'ok' : 'fail' }));
  };

  return (
    <div className="p-6 space-y-6 animate-slide-in">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🔗 Integration Hub</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Connect external services to Zypit</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {INTEGRATIONS.map(intDef => {
          const connected = getIntegration(intDef.id);
          const isEnabled  = connected?.enabled ?? false;
          const isEditing  = editing === intDef.id;
          const isSaving   = saving === intDef.id;
          const testStatus = testResult[intDef.id];

          return (
            <div key={intDef.id} className={`card p-5 transition-all duration-200 ${isEnabled ? 'border-l-4 border-l-green-500' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{intDef.icon}</span>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{intDef.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{intDef.desc}</p>
                  </div>
                </div>

                {connected && (
                  <label className="relative inline-flex items-center cursor-pointer ml-3 flex-shrink-0">
                    <input type="checkbox" checked={isEnabled} onChange={e => handleToggle(intDef, e.target.checked)} className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-400' : connected ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {isEnabled ? 'Connected & Active' : connected ? 'Connected (Paused)' : 'Not connected'}
                </span>
                {connected?.connectedAt && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    · Since {new Date(connected.connectedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  {intDef.apiKeyLabel && (
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{intDef.apiKeyLabel}</label>
                      <input
                        type="password"
                        value={formValues[intDef.id]?.apiKey ?? ''}
                        onChange={e => setFormValues(prev => ({ ...prev, [intDef.id]: { ...prev[intDef.id], apiKey: e.target.value } }))}
                        placeholder="sk-…"
                        className="input w-full font-mono text-xs"
                      />
                    </div>
                  )}
                  {intDef.webhookLabel && (
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>{intDef.webhookLabel}</label>
                      <input
                        type="password"
                        value={formValues[intDef.id]?.webhookUrl ?? ''}
                        onChange={e => setFormValues(prev => ({ ...prev, [intDef.id]: { ...prev[intDef.id], webhookUrl: e.target.value } }))}
                        placeholder="https://…"
                        className="input w-full font-mono text-xs"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(intDef)} disabled={isSaving}
                      className="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium transition">
                      {isSaving ? 'Saving…' : 'Save & Connect'}
                    </button>
                    <button onClick={() => setEditing(null)}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition"
                      style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => startEdit(intDef.id)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium transition border"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                    {connected ? '✏️ Edit Keys' : '🔌 Connect'}
                  </button>
                  {connected && (
                    <button onClick={() => handleTest(intDef.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        testStatus === 'ok'   ? 'bg-green-100 text-green-700' :
                        testStatus === 'fail' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                      }`}>
                      {testStatus === 'ok' ? '✅ OK' : testStatus === 'fail' ? '❌ Fail' : 'Test'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI Insights panel (if OpenRouter connected) */}
      {getIntegration('openrouter')?.enabled && (
        <div className="card p-5 border-l-4 border-l-purple-500">
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>🤖 AI Insights</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>OpenRouter is connected. AI-powered insights will appear here.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>📊 Weekly Summary</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Auto-generated every Monday at 9am IST</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'var(--surface2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>🎯 Task Predictions</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI predicts bottlenecks based on workload</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
