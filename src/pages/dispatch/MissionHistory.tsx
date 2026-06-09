import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Mission } from '../../types';
import { ArrowLeft, Search, X, Calendar, User, MapPin, ClipboardList, Filter, ChevronRight, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatShortAddress } from '../../lib/utils';

export default function MissionHistory() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'cancelled'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'missions'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionData: Mission[] = [];
      snapshot.forEach((doc) => {
        missionData.push({ id: doc.id, ...doc.data() } as Mission);
      });
      setMissions(missionData);
      setLoading(loading && false); // Only set loading false once
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredMissions = missions.filter(m => {
    const isPastMission = m.status === 'completed' || m.status === 'cancelled';
    if (!isPastMission && filterType !== 'all') return false;
    
    // Status filter
    if (filterType === 'completed' && m.status !== 'completed') return false;
    if (filterType === 'cancelled' && m.status !== 'cancelled') return false;

    // Search query
    const searchStr = searchQuery.toLowerCase().trim();
    if (searchStr === '') return true;

    return (
      (m.customerName?.toLowerCase().includes(searchStr) ?? false) ||
      (m.folderReference?.toLowerCase().includes(searchStr) ?? false) ||
      (m.licensePlate?.toLowerCase().includes(searchStr) ?? false) ||
      (m.vehicle?.toLowerCase().includes(searchStr) ?? false) ||
      (m.phone?.includes(searchStr) ?? false) ||
      (m.compagnie?.toLowerCase().includes(searchStr) ?? false)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Historique des Missions
            </h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1 text-[10px]">
              {filteredMissions.length} Missions trouvées
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Search & Filter Bar */}
        <div className="space-y-6 mb-10">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Rechercher par référence, matricule, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
             <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
             {[
               { id: 'all', label: 'Toutes' },
               { id: 'completed', label: 'Terminées' },
               { id: 'cancelled', label: 'Annulées' }
             ].map((type) => (
               <button
                 key={type.id}
                 onClick={() => setFilterType(type.id as any)}
                 className={`px-6 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 ${
                   filterType === type.id 
                     ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                     : 'bg-white border-white text-slate-600 hover:border-slate-200'
                 }`}
               >
                 {type.label.toUpperCase()}
               </button>
             ))}
          </div>
        </div>

        {/* Results List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-bold">Chargement de l'historique...</p>
          </div>
        ) : filteredMissions.length > 0 ? (
          <div className="space-y-4">
            {filteredMissions.map((mission) => (
              <div
                key={mission.id}
                onClick={() => navigate(`/missions/${mission.id}`)}
                className="bg-white rounded-[1.5rem] p-6 border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                         mission.status === 'completed' 
                           ? 'bg-emerald-50 text-emerald-600' 
                           : mission.status === 'cancelled'
                           ? 'bg-red-50 text-red-600'
                           : 'bg-blue-50 text-blue-600'
                       }`}>
                         {mission.status === 'completed' ? 'Terminée' : mission.status === 'cancelled' ? 'Annulée' : 'En cours'}
                       </span>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         {new Date(mission.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                    
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {mission.customerName}
                    </h3>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Compagnie</p>
                        <p className="text-xs font-bold text-slate-700">{mission.compagnie}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Référence</p>
                        <p className="text-xs font-bold text-slate-700">{mission.folderReference || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Véhicule</p>
                        <p className="text-xs font-bold text-slate-700">{mission.vehicle} ({mission.licensePlate})</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lieu</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{formatShortAddress(mission.location.address)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl mb-4">
               <Search className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-slate-900 font-black">Aucune mission trouvée</p>
            <p className="text-slate-400 text-sm mt-1">Essayez une autre recherche ou changez les filtres.</p>
          </div>
        )}
      </div>
    </div>
  );
}
