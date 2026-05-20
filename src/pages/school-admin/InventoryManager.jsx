import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  ClipboardList, 
  ArrowRightLeft,
  Settings,
  MoreVertical
} from 'lucide-react';
import GlassCard from '../../components/common/GlassCard';
import { getRecords } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

const InventoryManager = () => {
  const { userData } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchItems();
  }, [userData]);

  const fetchItems = async () => {
    try {
      const data = await getRecords('inventory', userData?.schoolId || 'default-school');
      setItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory & Assets</h1>
          <p className="text-dark-muted mt-1">Manage school property, stationary, and assets.</p>
        </div>
        
        <div className="flex gap-4">
          <button className="premium-button-primary">
            <Plus size={20} />
            Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6 border-l-4 border-primary-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-500">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{items.length}</h3>
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Total Items</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-orange-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{items.filter(i => i.quantity < 5).length}</h3>
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Low Stock</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-green-500/10 text-green-500">
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-bold">{items.filter(i => i.status === 'issued').length}</h3>
              <p className="text-xs text-dark-muted uppercase font-black tracking-widest">Issued Items</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-8">
           <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                className="w-full premium-input pl-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <button className="premium-button-secondary">
              <ArrowRightLeft size={18} />
              Stock Issue
           </button>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-border text-dark-muted text-[10px] uppercase tracking-[0.2em] font-black">
                   <th className="pb-4 px-4">Item Name</th>
                   <th className="pb-4 px-4">Category</th>
                   <th className="pb-4 px-4">Quantity</th>
                   <th className="pb-4 px-4">Unit Price</th>
                   <th className="pb-4 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                 {items.length === 0 ? (
                   <tr><td colSpan="5" className="py-20 text-center text-dark-muted">No inventory records.</td></tr>
                 ) : items.map((item) => (
                   <tr key={item.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 font-bold text-sm">{item.name}</td>
                      <td className="py-4 px-4 text-xs font-medium text-dark-muted uppercase">{item.category}</td>
                      <td className="py-4 px-4">
                         <span className={`px-2 py-0.5 rounded text-xs font-black ${item.quantity < 5 ? 'text-red-500 bg-red-500/10' : 'text-primary-500 bg-primary-500/10'}`}>
                           {item.quantity} {item.unit || 'pcs'}
                         </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-bold">PKR {item.price}</td>
                      <td className="py-4 px-4 text-right">
                         <button className="p-2 hover:bg-dark-hover rounded-lg text-dark-muted">
                            <MoreVertical size={16} />
                         </button>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default InventoryManager;
