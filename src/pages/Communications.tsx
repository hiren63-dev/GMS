import { useState } from 'react';
import { Send, Bell, Settings, Search, CheckCircle, Smartphone, Mail, Briefcase, Zap, Plus, Copy } from 'lucide-react';

const WHATSAPP_TEMPLATES = [
  { id: 'wt1', title: 'Membership Expiry (3 Days)', type: 'Automatic', message: 'Hi {{name}}, your Pulse Fitness membership expires in 3 days. Renew before {{date}} to avoid interruption! - Team Pulse' },
  { id: 'wt2', title: 'Birthday Wishes', type: 'Automatic', message: "Happy Birthday {{name}}! 🎂 To celebrate, we've added a 1-day guest pass to your account. Enjoy your special day! - Team Pulse" },
  { id: 'wt3', title: 'Inactive Member (7 Days)', type: 'Automatic', message: 'We miss you at the gym, {{name}}! 🏋️ Need some motivation to get back? Reply HELP for a free trainer session.' },
  { id: 'wt4', title: 'Payment Confirmation', type: 'Manual', message: "Hi {{name}}, we've received your payment of ₹{{amount}}. Your receipt no: {{receipt}}. Thank you for choosing Pulse Fitness!" },
];

const AUTOMATIONS = [
  { id: 'a1', name: 'Renewal Reminder', desc: 'Send WhatsApp 3 days before expiry', icon: Bell, status: true, color: '#f59e0b' },
  { id: 'a2', name: 'Birthday Bot', desc: 'Send automated greetings & offers', icon: Zap, status: true, color: '#ec4899' },
  { id: 'a3', name: 'Churn Prevention', desc: 'Alert staff if member inactive for 10 days', icon: Briefcase, status: false, color: '#8b5cf6' },
];

export default function Communications() {
  const [activeTab, setActiveTab] = useState<'templates' | 'automation' | 'bulk'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(WHATSAPP_TEMPLATES[0]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, height: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Communications Hub</h1>
          <p className="page-subtitle">Automated member outreach and mass messaging system</p>
        </div>
        <div className="tabs-container" style={{ background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 12 }}>
          <button className={`btn btn-sm ${activeTab === 'templates' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('templates')}>Templates</button>
          <button className={`btn btn-sm ${activeTab === 'automation' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('automation')}>Automations</button>
          <button className={`btn btn-sm ${activeTab === 'bulk' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('bulk')}>Bulk Send</button>
        </div>
      </div>

      {activeTab === 'templates' && (
        <div className="grid grid-3 gap-6 flex-1" style={{ alignItems: 'start' }}>
          {/* Template List */}
          <div className="card col-span-1 p-0" style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 250px)', overflow: 'hidden' }}>
            <div className="p-4 border-bottom flex items-center gap-3">
              <Search size={18} className="text-muted" />
              <input className="input-clear w-full" placeholder="Search templates..." style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }} />
            </div>
            <div className="flex-1 overflow-y-auto" style={{ padding: 12 }}>
              {WHATSAPP_TEMPLATES.map(t => (
                <div 
                  key={t.id} 
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-all ${selectedTemplate.id === t.id ? 'bg-primary/10 border-primary/20' : 'hover:bg-background-alt'}`}
                  style={{ border: '1px solid transparent' }}
                  onClick={() => setSelectedTemplate(t)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm">{t.title}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${t.type === 'Automatic' ? 'bg-success/20 text-success' : 'bg-info/20 text-info'}`}>
                      {t.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate">{t.message}</p>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm btn-full mt-2 gap-2"><Plus size={14} /> New Template</button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2 rounded bg-success/10 text-success"><Smartphone size={20} /></div>
                     <h2 className="font-bold text-lg">WhatsApp Preview</h2>
                  </div>
                  <div className="flex gap-2">
                     <button className="btn btn-ghost btn-sm gap-2"><Copy size={14} /> Copy</button>
                     <button className="btn btn-primary btn-sm gap-2"><Send size={14} /> Send Test</button>
                  </div>
               </div>

               <div className="chat-preview rounded-xl p-8 flex justify-center items-center" style={{ background: 'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)', backgroundSize: 'cover' }}>
                  <div className="glass-morphism p-4 rounded-xl max-w-sm ml-auto mr-0 relative" style={{ background: '#075e54', border: 'none' }}>
                    <p className="text-sm text-white" style={{ lineHeight: 1.6 }}>
                      {selectedTemplate.message.replace('{{name}}', 'Arjun').replace('{{date}}', '22-Mar').replace('{{amount}}', '2950').replace('{{receipt}}', 'REC-4512')}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-white/60">12:45 PM</span>
                      <CheckCircle size={10} className="text-info" />
                    </div>
                    <div style={{ position: 'absolute', right: -8, top: 0, width: 0, height: 0, borderTop: '10px solid #075e54', borderRight: '10px solid transparent' }} />
                  </div>
               </div>
            </div>

            <div className="card bg-background-alt border-accent/20">
               <h3 className="font-bold mb-3 flex items-center gap-2 text-accent"><Settings size={16} /> Template Configuration</h3>
               <div className="grid grid-2 gap-4">
                  <div className="form-group">
                    <label className="text-xs text-muted mb-1 block">Trigger Event</label>
                    <select className="select select-sm w-full"><option>Days Before Expiry</option><option>On Birthday</option><option>Manual Trigger</option></select>
                  </div>
                  <div className="form-group">
                    <label className="text-xs text-muted mb-1 block">Value (Days)</label>
                    <input className="input input-sm w-full" type="number" defaultValue={3} />
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'automation' && (
        <div className="grid grid-3 gap-6">
          {AUTOMATIONS.map(a => (
            <div key={a.id} className="card p-6" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
               <div className="flex justify-between items-start">
                  <div className="p-4 rounded-2xl" style={{ border: `1px solid ${a.color}20`, background: `${a.color}10`, color: a.color }}>
                    <a.icon size={28} />
                  </div>
                  <div className="toggle-switch">
                    <input type="checkbox" checked={a.status} readOnly style={{ display: 'none' }} />
                    <div 
                       className={`w-12 h-6 rounded-full relative transition-all cursor-pointer ${a.status ? 'bg-success' : 'bg-muted'}`}
                       style={{ opacity: a.status ? 1 : 0.4 }}
                    >
                       <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${a.status ? 'right-0.5' : 'left-0.5'}`} />
                    </div>
                  </div>
               </div>
               <div>
                  <h3 className="text-lg font-bold">{a.name}</h3>
                  <p className="text-secondary text-sm mt-1">{a.desc}</p>
               </div>
               <div className="mt-auto pt-6 border-top flex justify-between items-center text-xs">
                  <span className="text-muted">Last run: Today, 09:30 AM</span>
                  <button className="btn btn-ghost btn-xs text-secondary font-bold">Configure</button>
               </div>
            </div>
          ))}
          <div className="card border-dashed p-8 text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 250, background: 'transparent' }}>
             <button className="btn btn-secondary border-dashed gap-2"><Plus size={16} /> Create Rule</button>
          </div>
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="card max-w-2xl mx-auto w-full">
           <h2 className="text-xl font-bold mb-6 flex items-center gap-3"><Send size={24} className="text-primary" /> Send Bulk Message</h2>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="form-group">
                 <label className="form-label">Recipient Segment</label>
                 <select className="select w-full">
                    <option>All Active Members (42)</option>
                    <option>Expiring in 7 Days (8)</option>
                    <option>Morning Batch Only (15)</option>
                    <option>Inactive for 15+ Days (12)</option>
                 </select>
              </div>
              <div className="form-group">
                 <label className="form-label">Channel</label>
                 <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="channel" defaultChecked /> <WhatsAppIcon /> WhatsApp</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="channel" /> <Mail size={16} /> Email</label>
                 </div>
              </div>
              <div className="form-group">
                 <label className="form-label">Message</label>
                 <textarea className="input w-full" rows={6} placeholder="Type your announcement here... Use {{name}} for personalization."></textarea>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                 <button className="btn btn-secondary">Schedule for Later</button>
                 <button className="btn btn-primary btn-full md:w-auto px-8 gap-2"><Send size={16} /> Send to 42 Members</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

const WhatsAppIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.031 6.172c-2.32 0-4.518.953-6.19 2.686-3.417 3.536-3.417 9.284 0 12.821.413.428.852.81 1.306 1.15l-.65 2.376 2.45-.636c.553.313 1.135.539 1.741.674.41.091.826.137 1.242.137 2.321 0 4.518-.953 6.19-2.686 3.417-3.535 3.417-9.284 0-12.821-1.672-1.733-3.87-2.686-6.19-2.686zm-4.721 17.5l.386-.145c.484-.182.997-.435 1.543-.761l.246-.14.281.026c.453.042.89.063 1.303.063.297 0 .59-.011.884-.033l.36-.027.273.238 1.414 1.233.193.167-.044-.216-.41-2.031-.058-.287.16-.242c.86-1.304 1.325-2.824 1.325-4.406 0-1.898-.744-3.682-2.095-5.023s-3.125-2.095-5.023-2.095-3.682.744-5.023 2.095-2.095 3.125-2.095 5.023c0 1.582.465 3.102 1.325 4.406l.16.242-.058.287-.41 2.031-.044.216.193-.167 1.414-1.233z" />
  </svg>
);
