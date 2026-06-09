import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Mission, UserProfile } from '../../types';
import { Loader2, ArrowLeft, Truck, MapPin, Search, Navigation, Info, Calendar, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatShortAddress } from '../../lib/utils';
import L from 'leaflet';
import 'leaflet.heat';

// Leaflet marker fix
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MissionIcon = (status: string) => L.divIcon({
  className: 'custom-mission-icon',
  html: `<div style="background-color: ${
    status === 'in_progress' ? '#3B82F6' : 
    status === 'arrived' ? '#6366F1' : 
    '#F59E0B'
  }; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const AgentIcon = (isOnline: boolean) => L.divIcon({
  className: 'custom-agent-icon',
  html: `<div style="background-color: ${isOnline ? '#10B981' : '#94A3B8'}; width: 18px; height: 10px; border-radius: 2px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 10],
  iconAnchor: [9, 5]
});

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function HeatMapLayer({ points, active }: { points: [number, number, number][], active: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    
    // @ts-ignore - leaflet.heat adds this to L
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, active]);

  return null;
}

export default function LiveMap() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [agents, setAgents] = useState<UserProfile[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([34.0209, -6.8416]);
  const [mapZoom, setMapZoom] = useState(12);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [missionFilters, setMissionFilters] = useState<string[]>(['pending', 'in_progress', 'arrived']);
  const [missionSearch, setMissionSearch] = useState('');
  const [agentSearch, setAgentSearch] = useState('');
  const [activePopover, setActivePopover] = useState<'missions' | 'agents' | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date());

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync(new Date());
    }, 1000);
  };

  const toggleMissionFilter = (status: string) => {
    setMissionFilters(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const filteredMissions = missions.filter(m => {
    const matchesStatus = missionFilters.includes(m.status);
    const searchStr = missionSearch.toLowerCase();
    const matchesSearch = 
      (m.customerName?.toLowerCase().includes(searchStr) ?? false) ||
      (m.licensePlate?.toLowerCase().includes(searchStr) ?? false) ||
      (m.folderReference?.toLowerCase().includes(searchStr) ?? false) ||
      (m.vehicle?.toLowerCase().includes(searchStr) ?? false);
    return matchesStatus && matchesSearch;
  });
  const filteredAgents = agents.filter(a => 
    (a.displayName?.toLowerCase().includes(agentSearch.toLowerCase()) ?? false)
  );

  useEffect(() => {
    const missionQ = query(collection(db, 'missions'), where('status', '!=', 'completed'));
    const unsubMissions = onSnapshot(missionQ, (snapshot) => {
      const allMissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mission));
      // Filter out cancelled missions in JS since firestore doesn't support multiple != filters
      setMissions(allMissions.filter(m => m.status !== 'cancelled'));
    });

    const agentQ = query(collection(db, 'users'), where('role', '==', 'agent'));
    const unsubAgents = onSnapshot(agentQ, (snapshot) => {
      setAgents(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    return () => {
      unsubMissions();
      unsubAgents();
    };
  }, []);

  return (
    <div className="h-screen w-full relative overflow-hidden flex flex-col">
      {/* Overlay Header */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between gap-2 pointer-events-none">
        <button
          onClick={() => navigate('/dispatch')}
          className="pointer-events-auto bg-white px-2.5 py-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 sm:gap-2 font-bold text-slate-800 text-[10px] sm:text-xs md:text-sm shrink-0"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 h-5 shrink-0" />
          <span className="hidden min-[420px]:inline whitespace-nowrap">Tableau de Bord</span>
          <span className="inline min-[420px]:hidden whitespace-nowrap">Dashboard</span>
        </button>
        
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`h-8 sm:h-11 px-2.5 sm:px-4 rounded-lg sm:rounded-2xl shadow-xl font-bold text-[8px] sm:text-[10px] uppercase tracking-widest transition-all border flex items-center gap-1.5 sm:gap-2 whitespace-nowrap bg-white text-slate-600 border-slate-100 hover:bg-slate-50 relative`}
            title="Actualiser la position des agents"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <div className="flex flex-col items-start leading-none gap-0.5">
              <span className="hidden sm:inline">ACTUALISER</span>
              <span className="sm:hidden text-[7px]">SYNC</span>
              <span className="text-[6px] sm:text-[7px] text-slate-400 font-normal normal-case">
                {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </button>

          <button
            onClick={() => setShowHeatMap(!showHeatMap)}
            className={`h-8 sm:h-11 px-2.5 sm:px-4 rounded-lg sm:rounded-2xl shadow-xl font-bold text-[8px] sm:text-[10px] uppercase tracking-widest transition-all border flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              showHeatMap 
                ? 'bg-orange-500 text-white border-orange-400 shadow-orange-200' 
                : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${showHeatMap ? 'bg-white animate-pulse' : 'bg-orange-500'}`} />
            <span className="hidden sm:inline">{showHeatMap ? 'Masquer Densité' : 'Carte de Chaleur'}</span>
            <span className="sm:hidden">{showHeatMap ? 'Masquer' : 'Chaleur'}</span>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur rounded-lg sm:rounded-2xl shadow-xl border border-white/20 px-1.5 sm:px-2">
            <div className="relative">
              <button
                onClick={() => setActivePopover(activePopover === 'missions' ? null : 'missions')}
                className={`flex items-center gap-1 sm:gap-2 px-1.5 sm:px-4 h-7 sm:h-9 transition-all active:scale-95 rounded-md ${activePopover === 'missions' ? 'bg-slate-100' : ''}`}
              >
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full shrink-0" />
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  {filteredMissions.length}
                  <span className="hidden sm:inline"> Missions</span>
                  <span className="sm:hidden ml-0.5">M</span>
                </span>
              </button>
              
              {activePopover === 'missions' && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[1001] pointer-events-auto overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-50 mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Filtrer Missions</span>
                  </div>
                  
                  {/* Status Toggles */}
                  <div className="flex flex-col gap-1 px-1 mb-2">
                    {[
                      { id: 'pending', label: 'Attente', color: 'bg-amber-500' },
                      { id: 'in_progress', label: 'En Route', color: 'bg-blue-500' },
                      { id: 'arrived', label: 'Sur Place', color: 'bg-indigo-500' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => toggleMissionFilter(f.id)}
                        className={`flex h-7 rounded items-center gap-2 px-2 transition-all ${missionFilters.includes(f.id) ? 'bg-slate-100' : 'opacity-30 grayscale'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${f.color}`} />
                        <span className="text-[10px] font-bold text-slate-700">{f.label}</span>
                        <div className="flex-1" />
                        <div className={`w-3 h-3 rounded border flex items-center justify-center ${missionFilters.includes(f.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                          {missionFilters.includes(f.id) && <div className="w-1 h-1 bg-white rounded-sm" />}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="px-1 mb-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Matricule, Réf, Client..."
                        value={missionSearch}
                        onChange={(e) => setMissionSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 pl-6 pr-2 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>

                  {/* Mission List in Popover */}
                  <div className="max-h-48 overflow-y-auto space-y-1 px-1">
                    {filteredMissions.map((mission) => (
                      <button
                        key={mission.id}
                        onClick={() => {
                          setMapCenter([mission.location.lat, mission.location.lng]);
                          setMapZoom(17);
                          setActivePopover(null);
                        }}
                        className="w-full p-2 hover:bg-slate-50 rounded-lg transition-all text-left group active:bg-blue-50"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-black text-slate-900 truncate uppercase">{mission.customerName}</span>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            mission.status === 'in_progress' ? 'bg-blue-500' : 
                            mission.status === 'arrived' ? 'bg-indigo-500' : 'bg-amber-500'
                          }`} />
                        </div>
                        <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500">
                          <span className="bg-slate-100 px-1 rounded text-slate-600 tracking-tighter">{mission.licensePlate}</span>
                          {mission.folderReference && (
                            <span className="text-blue-600 truncate">#{mission.folderReference}</span>
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredMissions.length === 0 && (
                      <p className="text-[9px] text-slate-400 text-center py-4">Aucune mission</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-4 bg-slate-200" />

            <div className="relative">
              <button
                onClick={() => setActivePopover(activePopover === 'agents' ? null : 'agents')}
                className={`flex items-center gap-1 sm:gap-2 px-1.5 sm:px-4 h-7 sm:h-9 transition-all active:scale-95 rounded-md ${activePopover === 'agents' ? 'bg-slate-100' : ''}`}
              >
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  {filteredAgents.length}
                  <span className="hidden sm:inline"> Actifs</span>
                  <span className="sm:hidden ml-0.5">A</span>
                </span>
              </button>

              {activePopover === 'agents' && (
                <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[1001] pointer-events-auto overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-50 mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Rechercher Agent</span>
                  </div>
                  <div className="px-2 mb-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Nom de l'agent..."
                        value={agentSearch}
                        onChange={(e) => setAgentSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 px-1">
                    {agents.filter(a => a.displayName?.toLowerCase().includes(agentSearch.toLowerCase())).map((agent) => (
                      <button
                        key={agent.userId}
                        onClick={() => {
                          if (agent.lastPosition) {
                            setMapCenter([agent.lastPosition.lat, agent.lastPosition.lng]);
                            setMapZoom(16);
                            setActivePopover(null);
                          }
                        }}
                        className="flex items-center gap-2 w-full p-2 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${agent.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[11px] font-bold text-slate-700 truncate">{agent.displayName}</span>
                      </button>
                    ))}
                    {agents.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-4">Aucun agent trouvé</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Map */}
      <div className="flex-1 relative z-10" onClick={() => setActivePopover(null)}>
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={mapCenter} zoom={mapZoom} />
          <HeatMapLayer 
            active={showHeatMap} 
            points={missions.map(m => [m.location.lat, m.location.lng, 1])} 
          />
          
          {/* Mission Markers */}
          {filteredMissions.map(mission => (
            <Marker
              key={mission.id}
              position={[mission.location.lat, mission.location.lng]}
              icon={MissionIcon(mission.status)}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <h4 className="font-bold text-slate-900 border-b pb-1 mb-2 uppercase tracking-tight text-xs">
                    {mission.customerName}
                  </h4>
                  <p className="text-[10px] text-slate-600 mb-1 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-blue-500" /> {mission.vehicle}
                  </p>
                  <p className="text-[10px] text-slate-600 mb-2 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-red-500" /> {formatShortAddress(mission.location.address)}
                  </p>
                  <div className="flex items-center justify-between font-mono text-[9px] pt-1">
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                      mission.status === 'in_progress' ? 'bg-blue-600 text-white animate-pulse' : 
                      mission.status === 'arrived' ? 'bg-indigo-600 text-white' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {mission.status === 'in_progress' ? 'EN ROUTE' : 
                       mission.status === 'arrived' ? 'SUR PLACE' :
                       'EN ATTENTE'}
                    </span>
                    <button 
                      onClick={() => navigate(`/missions/${mission.id}`)}
                      className="text-blue-600 font-extrabold uppercase ml-2"
                    >
                      DÉTAILS
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Agent Markers */}
          {filteredAgents.map(agent => (
            agent.lastPosition && (
              <Marker
                key={agent.userId}
                position={[agent.lastPosition.lat, agent.lastPosition.lng]}
                icon={AgentIcon(agent.isOnline)}
              >
                <Popup>
                  <div className="p-1 min-w-[120px]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${agent.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <h4 className="font-bold text-slate-900 text-xs">{agent.displayName}</h4>
                    </div>
                    <p className="text-[9px] text-slate-500">
                      MàJ: {new Date(agent.lastPosition.updatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>

      {/* Sidebar List Overlay */}
      <div className="absolute top-20 left-4 w-72 max-h-[60vh] bg-white/95 backdrop-blur rounded-3xl shadow-2xl overflow-hidden border border-slate-200 hidden md:flex flex-col z-[1000]">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            Missions Actives
          </h3>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{filteredMissions.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-1">
          {filteredMissions.map(m => (
            <div 
              key={m.id}
              onClick={() => {
                setMapCenter([m.location.lat, m.location.lng]);
                setMapZoom(16);
              }}
              className="p-3 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-xs font-bold text-slate-900 truncate pr-2 uppercase tracking-tight">{m.customerName}</h4>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  m.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 
                  m.status === 'arrived' ? 'bg-indigo-500' :
                  'bg-amber-500'
                }`} />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded tracking-tighter uppercase">{m.licensePlate}</span>
                {m.folderReference && (
                  <span className="text-[9px] font-bold text-blue-600 truncate">REF: {m.folderReference}</span>
                )}
                {m.incidentDate && (
                  <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(m.incidentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 italic">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  <span className="truncate">{formatShortAddress(m.location.address)}</span>
                </div>
                
              {m.assignedAgentId && (
                <div className="mt-2 flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase">
                  <Navigation className="w-3 h-3 text-blue-500" />
                  <span>{agents.find(a => a.userId === m.assignedAgentId)?.displayName || 'Assigned'}</span>
                </div>
              )}
            </div>
          ))}
          {filteredMissions.length === 0 && (
            <div className="py-10 text-center text-slate-400">
               <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
               <p className="text-xs font-bold uppercase tracking-widest">Aucune mission trouvée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
