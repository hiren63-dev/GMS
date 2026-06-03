import { useState } from 'react';
import { useApp } from '../store/useStore';
import { formatDate, generateId } from '../utils/helpers';
import { Wrench, AlertTriangle, CheckCircle, PenTool, Plus, Trash2, Edit2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import type { Equipment as EquipmentType } from '../types';

export default function Equipment() {
  const { equipment, addEquipment, updateEquipment, deleteEquipment, addToast } = useApp();
  const working = equipment.filter(e => e.status === 'Working').length;
  
  const [addOpen, setAddOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<EquipmentType | null>(null);
  
  const [form, setForm] = useState<Partial<EquipmentType>>({
    name: '', category: 'Cardio', status: 'Working',
    lastMaintenance: new Date().toISOString().split('T')[0],
    nextMaintenance: '', cost: 0,
    purchaseDate: new Date().toISOString().split('T')[0], vendor: ''
  });

  const handleSave = () => {
    if (!form.name || !form.nextMaintenance || !form.cost) {
      addToast('Please fill all required fields', 'error');
      return;
    }
    
    if (editAsset) {
      updateEquipment(editAsset.id, form);
      addToast('Equipment updated', 'success');
    } else {
      addEquipment({
        id: generateId(),
        ...form,
        name: form.name!,
        category: form.category as any,
        status: form.status as any,
        lastMaintenance: form.lastMaintenance!,
        nextMaintenance: form.nextMaintenance!,
        cost: form.cost!,
        purchaseDate: form.purchaseDate!,
        vendor: form.vendor!
      });
      addToast('Equipment added', 'success');
    }
    
    setAddOpen(false);
    setEditAsset(null);
    setForm({ name: '', category: 'Cardio', status: 'Working', lastMaintenance: new Date().toISOString().split('T')[0], nextMaintenance: '', cost: 0, purchaseDate: new Date().toISOString().split('T')[0], vendor: '' });
  };

  const openEdit = (e: EquipmentType) => {
    setEditAsset(e);
    setForm(e);
    setAddOpen(true);
  };
  
  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      deleteEquipment(id);
      addToast('Equipment deleted', 'info');
    }
  };
  const maintenance = equipment.filter(e => e.status === 'Under Maintenance').length;
  const outOfOrder = equipment.filter(e => e.status === 'Out of Order').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipment Inventory</h1>
          <p className="page-subtitle">Track machinery status, maintenance logs, and asset value</p>
        </div>
        <div className="page-header-actions">
           <button className="btn btn-primary gap-2" onClick={() => setAddOpen(true)}><Plus size={16} /> Add Asset</button>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card card-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-success/10 text-success"><CheckCircle size={24} /></div>
          <div>
            <div className="text-2xl font-bold">{working}</div>
            <div className="text-xs text-muted font-bold uppercase tracking-tight">Fully Operational</div>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-warning/10 text-warning"><Wrench size={24} /></div>
          <div>
            <div className="text-2xl font-bold">{maintenance}</div>
            <div className="text-xs text-muted font-bold uppercase tracking-tight">Under Service</div>
          </div>
        </div>
        <div className="card card-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-danger/10 text-danger"><AlertTriangle size={24} /></div>
          <div>
            <div className="text-2xl font-bold">{outOfOrder}</div>
            <div className="text-xs text-muted font-bold uppercase tracking-tight">Out of Order</div>
          </div>
        </div>
      </div>

      {outOfOrder > 0 && (
        <div className="card p-4 flex items-center justify-between" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
           <div className="flex items-center gap-3">
              <AlertTriangle className="text-danger" size={20} />
              <span className="font-bold text-sm">{outOfOrder} machines require immediate attention!</span>
           </div>
           <button className="btn btn-xs btn-primary bg-danger border-danger">Assign Technician</button>
        </div>
      )}

      <div className="card card-no-padding">
        <div className="card-header border-bottom flex items-center gap-2" style={{ padding: '16px 20px' }}>
          <PenTool size={18} className="text-accent" />
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Asset Inventory & Maintenance</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Machine Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Last Service</th>
                <th>Next Service</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map(e => {
                const isOverdue = new Date(e.nextMaintenance) < new Date() && e.status !== 'Out of Order';
                return (
                  <tr key={e.id}>
                    <td><span style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</span></td>
                    <td><span className="badge badge-info">{e.category}</span></td>
                    <td>
                      <span className={`badge ${
                        e.status === 'Working' ? 'badge-success' : 
                        e.status === 'Under Maintenance' ? 'badge-warning' : 
                        'badge-danger'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{formatDate(e.lastMaintenance)}</td>
                    <td>
                       <div className="flex items-center gap-2">
                          <span style={{ fontSize: 13, color: isOverdue ? 'var(--accent-danger)' : 'var(--text-primary)', fontWeight: isOverdue ? 700 : 400 }}>
                            {formatDate(e.nextMaintenance)}
                          </span>
                          {isOverdue && <AlertTriangle size={12} className="text-danger" />}
                       </div>
                    </td>
                    <td>
                       <div className="flex gap-2 items-center">
                         <select 
                           className="select select-sm" 
                           value={e.status} 
                           onChange={(evt) => {
                             updateEquipment(e.id, { status: evt.target.value as any });
                             addToast(`Status updated to ${evt.target.value}`, 'info');
                           }}
                           style={{ width: 140, padding: '4px 8px', fontSize: 12, height: 28 }}
                         >
                           <option value="Working">Working</option>
                           <option value="Under Maintenance">Under Maintenance</option>
                           <option value="Out of Order">Out of Order</option>
                         </select>
                         <button className="btn btn-ghost btn-xs text-primary" onClick={() => openEdit(e)} data-tooltip="Edit"><Edit2 size={14} /></button>
                         <button className="btn btn-ghost btn-xs text-danger" onClick={() => handleDelete(e.id)} data-tooltip="Delete"><Trash2 size={14} /></button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add/Edit Modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setEditAsset(null); }} title={editAsset ? "Edit Asset" : "Add Asset"}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setAddOpen(false); setEditAsset(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </>}
      >
        <div className="grid grid-2" style={{ gap: 14 }}>
          <div className="form-group">
            <label className="form-label required">Machine Name</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Treadmill A1" />
          </div>
          <div className="form-group">
            <label className="form-label required">Category</label>
            <select className="select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))}>
              <option>Cardio</option>
              <option>Strength</option>
              <option>Free Weights</option>
              <option>Accessories</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Status</label>
            <select className="select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
              <option>Working</option>
              <option>Under Maintenance</option>
              <option>Out of Order</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Cost (₹)</label>
            <input className="input" type="number" value={form.cost || ''} onChange={e => setForm(p => ({ ...p, cost: +e.target.value }))} placeholder="50000" />
          </div>
          <div className="form-group">
            <label className="form-label required">Last Maintenance</label>
            <input className="input" type="date" value={form.lastMaintenance} onChange={e => setForm(p => ({ ...p, lastMaintenance: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label required">Next Maintenance</label>
            <input className="input" type="date" value={form.nextMaintenance} onChange={e => setForm(p => ({ ...p, nextMaintenance: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
