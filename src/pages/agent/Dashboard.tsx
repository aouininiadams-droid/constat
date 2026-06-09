import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTracking } from '../../contexts/TrackingContext';
import { Mission } from '../../types';
import { LogOut, MapPin, Navigation, Phone, ChevronRight, Bell, User, Loader2, Signal, AlertTriangle, X, Clock, Camera, ShieldCheck, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatShortAddress } from '../../lib/utils';

import { MissionTimer } from '../../components/MissionTimer';

export default function AgentDashboard() {
  const { profile, user } = useAuth();
  const { isTracking, error: trackingError } = useTracking();
  const [pendingMissions, setPendingMissions] = useState<Mission[]>([]);
  const [assignedMissions, setAssignedMissions] = useState<Mission[]>([]);
  const [historyMissions, setHistoryMissions] = useState<Mission[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [updating, setUpdating] = useState<string | null>(null);
  const [newMissionNotification, setNewMissionNotification] = useState(false);
  const [dismissedMissions, setDismissedMissions] = useState<string[]>([]);
  const navigate = useNavigate();

  // Combine active missions for display
  const activeMissions = [...pendingMissions, ...assignedMissions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  useEffect(() => {
    if (!user) return;

    // Pending missions (available for any agent to claim - must be unassigned)
    const qPending = query(
      collection(db, 'missions'),
      where('status', '==', 'pending'),
      where('assignedAgentId', '==', null),
      orderBy('createdAt', 'desc')
    );

    const unsubscribePending = onSnapshot(qPending, (snapshot) => {
      // All results from this query are now guaranteed to be unassigned by the query + rules
      const pendingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
      
      setPendingMissions(pendingData);

      const hasUnseenPending = pendingData.some(m => !dismissedMissions.includes(m.id));
      setNewMissionNotification(hasUnseenPending);
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'missions/pending');
    });

    // My active missions (assigned to me) - includes those assigned during creation
    const qMyActive = query(
      collection(db, 'missions'),
      where('assignedAgentId', '==', user.uid),
      where('status', 'in', ['pending', 'in_progress', 'accepted', 'arrived']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeMyActive = onSnapshot(qMyActive, (snapshot) => {
      const myActiveData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
      setAssignedMissions(myActiveData);
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'missions/assigned');
    });

    // History missions (assigned to me and finished)
    const qHistory = query(
      collection(db, 'missions'),
      where('assignedAgentId', '==', user.uid),
      where('status', 'in', ['completed', 'cancelled']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
      setHistoryMissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'missions');
    });

    return () => {
      unsubscribePending();
      unsubscribeMyActive();
      unsubscribeHistory();
    };
  }, [user, dismissedMissions]);

  const handleDismissAlert = () => {
    const pendingIds = pendingMissions.map(m => m.id);
    setDismissedMissions(prev => [...new Set([...prev, ...pendingIds])]);
    setNewMissionNotification(false);
  };

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  const updateMissionStatus = async (e: React.MouseEvent, missionId: string, newStatus: Mission['status']) => {
    e.stopPropagation();
    if (!user) return;
    setUpdating(missionId);
    try {
      const data: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      if (newStatus === 'in_progress') {
        data.assignedAgentId = user.uid;
      }
      await updateDoc(doc(db, 'missions', missionId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `missions/${missionId}`);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Mobile-First Header */}
      <header className="bg-slate-900 text-white px-4 py-4 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center p-0.5 shadow-lg border border-blue-500/30">
               <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight">{profile?.displayName}</h1>
              <div className="flex items-center gap-1.5 leading-none">
                <span className={`w-1.5 h-1.5 rounded-full ${isTracking ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">
                  MAI Intervention Agent - {isTracking ? 'Suivi Activé' : 'Hors Ligne'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-20">
        {activeTab === 'active' ? (
          <>
            {trackingError && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
                <Signal className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-semibold">{trackingError}</p>
              </div>
            )}

            <AnimatePresence>
              {newMissionNotification && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, scale: 0.95 }}
                  animate={{ height: 'auto', opacity: 1, scale: 1 }}
                  exit={{ height: 0, opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-2xl shadow-blue-200 border-2 border-blue-400/30 flex items-center justify-between relative group">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20" />
                        <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm relative border border-white/20">
                          <Bell className="w-6 h-6 text-white animate-[ring_1s_ease-in-out_infinite]" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-black text-xs uppercase tracking-[0.1em] mb-0.5 opacity-80">Alerte Prioritaire</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black tracking-tight leading-none">
                            {pendingMissions.length} Mission(s) en attente
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={handleDismissAlert} 
                      className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors backdrop-blur-sm border border-white/10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Missions Actives</h2>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeMissions.length}
                </span>
              </div>

              <div className="space-y-4">
                {activeMissions.length === 0 ? (
                  <div className="bg-white p-10 rounded-3xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                    <Navigation className="w-12 h-12 text-slate-200 mb-2" />
                    <p className="text-slate-400 font-medium">Aucune mission active</p>
                  </div>
                ) : (
                  activeMissions.map(mission => (
                    <div
                      key={mission.id}
                      onClick={() => navigate(`/missions/${mission.id}`)}
                      className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all flex items-center justify-between overflow-hidden relative group"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        mission.status === 'pending' ? 'bg-amber-400' :
                        mission.status === 'accepted' ? 'bg-blue-400' :
                        mission.status === 'in_progress' ? 'bg-blue-600' :
                        'bg-indigo-500'
                      }`} />
                      
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                            mission.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                            mission.status === 'accepted' ? 'bg-blue-50 text-blue-600' :
                            mission.status === 'in_progress' ? 'bg-blue-600 text-white' :
                            'bg-indigo-100 text-indigo-700'
                          }`}>
                            {mission.status === 'pending' ? 'EN ATTENTE' :
                            mission.status === 'accepted' ? 'Acceptée' :
                            mission.status === 'in_progress' ? 'EN ROUTE' :
                            'SUR PLACE'}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 uppercase truncate tracking-tight mb-1">
                          {mission.customerName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          <span className="truncate">{formatShortAddress(mission.location.address)}</span>
                        </div>
                        {mission.incidentDate && (
                          <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[10px] uppercase mt-1 mb-2">
                             <Calendar className="w-3.5 h-3.5" />
                             Sinistre: {new Date(mission.incidentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </div>
                        )}
                        <MissionTimer 
                          createdAt={mission.createdAt} 
                          interventionDelay={mission.interventionDelay || 'Mission Urbain (30 min max)'} 
                        />
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        {mission.status === 'pending' && (
                          <button
                            onClick={(e) => updateMissionStatus(e, mission.id, 'in_progress')}
                            disabled={updating === mission.id}
                            className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-tight px-4 py-2 rounded-xl shadow-lg shadow-emerald-100 flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {updating === mission.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Navigation className="w-3.5 h-3.5" />
                                Accepter
                              </>
                            )}
                          </button>
                        )}

                        {mission.status === 'in_progress' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/missions/${mission.id}`);
                            }}
                            className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-tight px-3 py-2 rounded-xl shadow-lg shadow-blue-100 flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            Prendre Photo & Arriver
                          </button>
                        )}

                        {(mission.status === 'arrived' || mission.status === 'accepted') && (
                          <div className="p-3 bg-slate-50 rounded-2xl group-active:bg-blue-50 transition-colors">
                            <ChevronRight className="w-5 h-5 text-slate-400 group-active:text-blue-500" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Historique des Missions</h2>
              <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {historyMissions.length}
              </span>
            </div>

            <div className="space-y-4">
              {historyMissions.length === 0 ? (
                <div className="bg-white p-10 rounded-3xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                  <Clock className="w-12 h-12 text-slate-200 mb-2" />
                  <p className="text-slate-400 font-medium">Aucun historique disponible</p>
                </div>
              ) : (
                historyMissions.map(mission => (
                  <div
                    key={mission.id}
                    onClick={() => navigate(`/missions/${mission.id}`)}
                    className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all flex items-center justify-between overflow-hidden relative group opacity-80 grayscale-[0.5]"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      mission.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          mission.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                          {mission.status === 'completed' ? 'Terminée' : 'Annulée'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {new Date(mission.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 uppercase truncate tracking-tight mb-1">
                        {mission.customerName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{formatShortAddress(mission.location.address)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl group-active:bg-slate-100 transition-colors">
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Bottom Nav Simulation */}
      <footer className="bg-white border-t border-slate-200 p-4 flex items-center justify-around fixed bottom-0 left-0 right-0 z-40">
        <button 
          onClick={() => setActiveTab('active')} 
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'active' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Navigation className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Missions</span>
        </button>
        <div className="h-8 w-px bg-slate-100" />
        <button 
          onClick={() => setActiveTab('history')} 
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'history' ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Clock className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Historique</span>
        </button>
      </footer>
    </div>
  );
}
