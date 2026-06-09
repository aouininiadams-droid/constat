import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Mission, UserProfile } from '../../types';
import { Plus, Map as MapIcon, LogOut, Clock, CheckCircle2, AlertCircle, ChevronRight, User, MapPin, Navigation, Calendar, Search, X, History, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MissionForm from './components/MissionForm';
import { MissionTimer } from '../../components/MissionTimer';
import { formatShortAddress } from '../../lib/utils';

export default function DispatchDashboard() {
  const { profile } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());
  const navigate = useNavigate();

  const handleSync = () => {
    setIsSyncing(true);
    // onSnapshot already handles updates, but we provide visual feedback and a slight delay
    // to give the user a sense of "actualization"
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync(new Date());
    }, 1000);
  };

  useEffect(() => {
    const q = query(collection(db, 'missions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
      setMissions(missionData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'missions');
    });

    const agentQ = query(collection(db, 'users'), where('role', '==', 'agent'));
    const unsubAgents = onSnapshot(agentQ, (snapshot) => {
      const agentData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAgents(agentData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users/agents');
    });

    return () => {
      unsubscribe();
      unsubAgents();
    };
  }, []);

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  const filteredMissions = missions.filter(m => {
    const statusMatch = filterStatus === 'all' || m.status === filterStatus;
    const agentMatch = filterAgent === 'all' || m.assignedAgentId === filterAgent;
    
    const searchStr = searchQuery.toLowerCase().trim();
    const searchMatch = searchStr === '' || 
      (m.customerName?.toLowerCase().includes(searchStr) ?? false) ||
      (m.folderReference?.toLowerCase().includes(searchStr) ?? false) ||
      (m.licensePlate?.toLowerCase().includes(searchStr) ?? false) ||
      (m.vehicle?.toLowerCase().includes(searchStr) ?? false) ||
      (m.phone?.includes(searchStr) ?? false);

    return statusMatch && agentMatch && searchMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <Plus className="text-white w-4 h-4 sm:w-6 sm:h-6 border-2 border-white rounded-md" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-black text-slate-900 leading-tight uppercase tracking-tighter truncate">MAI Dispatch</h1>
              <p className="hidden sm:block text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mt-0.5 mt-0.5">Maroc Assistance Internationale</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`p-2 transition-all rounded-lg ${
                isSyncing ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title="Actualiser les données"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/dispatch/history')}
              className="flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 sm:px-4 py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-all shadow-sm active:scale-95"
            >
              <History className="w-4 h-4 text-blue-600" />
              <span>Historique</span>
            </button>
            <button
              onClick={() => navigate('/dispatch/map')}
              className="flex items-center gap-1.5 sm:gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 sm:px-4 py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-all shadow-sm active:scale-95"
            >
              <MapIcon className="w-4 h-4 text-blue-600" />
              <span className="hidden min-[400px]:inline">Suivi Direct</span>
              <span className="min-[400px]:hidden">Suivi</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Missions</h2>
            <div className="flex items-center gap-2 text-slate-500">
               <p>Gestion des interventions sur le terrain</p>
               <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-black uppercase tracking-widest text-slate-500">
                 Dernier sync: {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
               </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Mission
          </button>
        </div>

        {/* Stats & Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Tout', value: 'all', count: missions.length, color: 'bg-slate-100' },
            { label: 'EN ATTENTE', value: 'pending', count: missions.filter(m => m.status === 'pending').length, color: 'bg-amber-100 text-amber-700' },
            { label: 'EN ROUTE', value: 'in_progress', count: missions.filter(m => m.status === 'in_progress' || m.status === 'accepted').length, color: 'bg-blue-100 text-blue-700' },
            { label: 'SUR PLACE', value: 'arrived', count: missions.filter(m => m.status === 'arrived').length, color: 'bg-indigo-100 text-indigo-700' },
            { label: 'TERMINÉ', value: 'completed', count: missions.filter(m => m.status === 'completed').length, color: 'bg-emerald-100 text-emerald-700' },
            { label: 'ANNULÉ', value: 'cancelled', count: missions.filter(m => m.status === 'cancelled').length, color: 'bg-rose-100 text-rose-700' },
          ].map(stat => (
            <button
              key={stat.value}
              onClick={() => setFilterStatus(stat.value)}
              className={`p-4 rounded-2xl flex flex-col items-center justify-center transition-all border-2 ${
                filterStatus === stat.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-transparent bg-white shadow-sm hover:border-slate-200'
              }`}
            >
              <span className="text-2xl font-bold">{stat.count}</span>
              <span className="text-xs font-medium uppercase tracking-wider opacity-70 leading-none mt-1">{stat.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Agent Filter */}
        <div className="space-y-6 mb-8">
          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Rechercher par nom, référence, matricule, téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-[1.25rem] font-medium text-slate-900 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm shadow-slate-100/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Agent Filter */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <User className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filtrer par Agent</h3>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setFilterAgent('all')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 ${
                  filterAgent === 'all' 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                    : 'bg-white border-white text-slate-600 hover:border-slate-200'
                }`}
              >
                TOUS LES AGENTS
              </button>
              {agents.map((agent) => (
                <button
                  key={agent.userId}
                  onClick={() => setFilterAgent(agent.userId)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 ${
                    filterAgent === agent.userId 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                      : 'bg-white border-white text-slate-600 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${agent.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse' : 'bg-slate-300'}`} />
                    {agent.displayName?.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mission List */}
        <div className="space-y-4">
          {filteredMissions.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">Aucune mission trouvée</h3>
              <p className="text-slate-500">Créez une nouvelle mission pour commencer</p>
            </div>
          ) : (
            filteredMissions.map((mission) => (
              <div
                key={mission.id}
                onClick={() => navigate(`/missions/${mission.id}`)}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-blue-300 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${
                    mission.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                    mission.status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                    mission.status === 'in_progress' ? 'bg-blue-600 text-white' :
                    mission.status === 'arrived' ? 'bg-indigo-600 text-white' :
                    mission.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    {mission.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : 
                     mission.status === 'cancelled' ? <AlertCircle className="w-6 h-6" /> : 
                     mission.status === 'in_progress' ? <Navigation className="w-6 h-6" /> :
                     mission.status === 'arrived' ? <MapPin className="w-6 h-6" /> :
                     <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight flex items-center gap-2">
                      {mission.customerName} - {mission.vehicle}
                      {mission.isFlagged && (
                        <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          ALERTE
                        </span>
                      )}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1">
                      <span className="text-sm text-slate-500 flex items-center gap-1 italic">
                        <MapIcon className="w-3.5 h-3.5" /> {formatShortAddress(mission.location.address)}
                      </span>
                      <span className="text-sm text-slate-400 font-mono text-xs font-bold bg-slate-50 px-2 py-0.5 rounded">
                        {mission.licensePlate}
                      </span>
                      {mission.incidentDate && (
                        <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-md">
                          <Calendar className="w-3 h-3" />
                          {new Date(mission.incidentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {mission.status !== 'completed' && mission.status !== 'cancelled' && (
                      <div className="mt-4 max-w-xs">
                        <MissionTimer 
                          createdAt={mission.createdAt} 
                          interventionDelay={mission.interventionDelay || 'Mission Urbain (30 min max)'} 
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Assignée à</span>
                    <div className="flex items-center gap-2 mt-1">
                      {mission.assignedAgentId ? (
                        <>
                          <User className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-slate-700">
                            {agents.find(a => a.userId === mission.assignedAgentId)?.displayName || 'Agent inconnu'}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-amber-600 italic">Non assignée</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <MissionForm 
              onClose={() => setShowForm(false)} 
              agents={agents}
            />
          </div>
        </div>
      )}
    </div>
  );
}
