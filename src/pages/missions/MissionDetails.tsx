import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Mission, UserProfile, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, Bike, Phone, Calendar, MapPin, 
  Clock, CheckCircle2, AlertCircle, Loader2,
  Navigation, User, ShieldCheck, MessageSquare, Camera, Image as ImageIcon, X,
  Download, ChevronRight, Timer, ExternalLink, Info, ClipboardList
} from 'lucide-react';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';

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

import { MissionTimer } from '../../components/MissionTimer';
import { formatShortAddress } from '../../lib/utils';

export default function MissionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [agent, setAgent] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [arrivalPhotosList, setArrivalPhotosList] = useState<Record<string, string>>({});
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);

  const PHOTO_CATEGORIES = [
    'Face Avant',
    'Face Arrière',
    'Carte Grise',
    'Attestation Assurance'
  ];

  const outcomes = [
    { id: 'completed', label: 'Fin mission', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'disagreement', label: 'Désaccord', icon: <AlertCircle className="w-4 h-4 text-amber-500" /> },
    { id: 'arrangement', label: 'Arrangement', icon: <CheckCircle2 className="w-4 h-4 text-blue-500" /> },
    { id: 'injured', label: 'Blessé', icon: <AlertCircle className="w-4 h-4 text-rose-500" /> },
    { id: 'missing_papers', label: 'Manque papier', icon: <ClipboardList className="w-4 h-4 text-slate-500" /> },
    { id: 'left_scene', label: 'Quitte le lieu de sinistre', icon: <AlertCircle className="w-4 h-4 text-orange-500" /> },
    { id: 'false_claim', label: 'Faux sinistre', isFlag: true, icon: <ShieldCheck className="w-4 h-4 text-rose-600" /> }
  ];

  useEffect(() => {
    if (!id) return;

    const unsub = onSnapshot(doc(db, 'missions', id), async (docSnap) => {
      if (docSnap.exists()) {
        const missionData = { id: docSnap.id, ...docSnap.data() } as Mission;
        setMission(missionData);
        
        if (missionData.assignedAgentId) {
          const agentSnap = await getDoc(doc(db, 'users', missionData.assignedAgentId));
          if (agentSnap.exists()) {
            setAgent(agentSnap.data() as UserProfile);
          }
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `missions/${id}`);
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const acceptMission = async () => {
    if (!mission || !id || !auth.currentUser) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'missions', id), {
        status: 'in_progress',
        assignedAgentId: auth.currentUser.uid,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `missions/${id}`);
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async (newStatus: Mission['status'], additionalData: any = {}) => {
    if (!mission || !id) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'missions', id), {
        status: newStatus,
        ...additionalData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `missions/${id}`);
    } finally {
      setUpdating(false);
    }
  };

  const compressImage = (base64: string, maxWidth = 1024, maxHeight = 1024, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64);
        setArrivalPhotosList(prev => ({
          ...prev,
          [category]: compressed
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (category: string) => {
    setArrivalPhotosList(prev => {
      const newPhotos = { ...prev };
      delete newPhotos[category];
      return newPhotos;
    });
  };

  const downloadPhoto = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllPhotos = () => {
    if (!mission?.arrivalPhotos) return;
    
    if (Array.isArray(mission.arrivalPhotos)) {
      mission.arrivalPhotos.forEach((photo, idx) => {
        setTimeout(() => {
          downloadPhoto(photo, `mission-${id}-photo-${idx + 1}.jpg`);
        }, idx * 250);
      });
    } else if (mission.arrivalPhotos) {
      Object.entries(mission.arrivalPhotos as Record<string, string>).forEach(([category, photo], idx) => {
        setTimeout(() => {
          downloadPhoto(photo, `mission-${id}-${category.replace(/\s+/g, '-').toLowerCase()}.jpg`);
        }, idx * 250);
      });
    }
  };

  const confirmArrival = async () => {
    if (Object.keys(arrivalPhotosList).length === 0) return;
    await updateStatus('arrived', { arrivalPhotos: arrivalPhotosList });
  };

  const openInMaps = () => {
    if (!mission) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${mission.location.lat},${mission.location.lng}`;
    window.open(url, '_blank');
  };

  const handleBack = () => {
    if (profile?.role === 'dispatch') {
      navigate('/dispatch');
    } else if (profile?.role === 'agent') {
      navigate('/agent');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F8FAFC] p-6 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Intervention non trouvée</h2>
        <p className="text-slate-500 mb-6 max-w-xs">L'intervention recherchée n'est plus accessible ou a été supprimée.</p>
        <button
          onClick={handleBack}
          className="bg-slate-100 text-slate-900 font-bold px-6 py-2.5 rounded-xl transition-all hover:bg-slate-200"
        >
          Retourner au tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-blue-100">
      {/* Dynamic Header Raill */}
      <div className="sticky top-0 z-[1000] bg-white/80 backdrop-blur-md border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 font-semibold transition-colors py-1.5"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Retour</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${
              mission.status === 'completed' ? 'bg-emerald-500' :
              mission.status === 'cancelled' ? 'bg-rose-500' :
              mission.status === 'in_progress' ? 'bg-blue-600 animate-pulse' :
              mission.status === 'arrived' ? 'bg-indigo-600' :
              'bg-amber-500'
            }`} />
            <span className="text-[11px] font-black tracking-widest text-slate-900 uppercase">
              {mission.status === 'pending' ? 'En attente' : 
               mission.status === 'in_progress' ? 'En route' : 
               mission.status === 'arrived' ? 'Sur place' :
               mission.status === 'completed' ? 'Terminée' :
               'Annulée'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 pb-32 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Mission Hero Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-200/50"
            >
              <div className="mb-10">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">
                  <ShieldCheck className="w-3 h-3" />
                  Compagnie d'Assistance
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-6">
                  {mission.compagnie}
                </h1>
                
                <div className="flex flex-wrap gap-3">
                  {mission.folderReference && (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(mission.folderReference!);
                        const btn = document.getElementById('copy-ref-btn');
                        if (btn) {
                          const originalText = btn.innerHTML;
                          btn.innerHTML = '<span class="text-emerald-600">Copié !</span>';
                          btn.classList.add('bg-emerald-50', 'border-emerald-200');
                          setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.classList.remove('bg-emerald-50', 'border-emerald-200');
                          }, 2000);
                        }
                      }}
                      id="copy-ref-btn"
                      className="inline-flex items-center gap-2 text-slate-600 font-bold hover:text-blue-600 transition-all bg-slate-50 px-5 py-2.5 rounded-full border border-slate-100 hover:border-blue-200 group active:scale-95"
                    >
                      <ClipboardList className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                      REF: {mission.folderReference}
                    </button>
                  )}

                  <a 
                    href={`tel:${mission.phone}`}
                    className="inline-flex items-center gap-2 text-white font-bold bg-blue-600 hover:bg-blue-700 transition-all px-6 py-2.5 rounded-full shadow-lg shadow-blue-200 active:scale-95"
                  >
                    <Phone className="w-4 h-4" />
                    Appeler le Client
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-6 pt-8 border-t border-slate-100">
                <div className="col-span-2 md:col-span-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nom du Client</p>
                  <p className="text-sm font-bold text-slate-900">{mission.customerName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Matricule</p>
                  <p className="text-sm font-bold text-slate-900 uppercase">{mission.licensePlate}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Véhicule</p>
                  <p className="text-sm font-bold text-slate-900">{mission.vehicle}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Téléphone</p>
                  <p className="text-sm font-bold text-slate-900">{mission.phone}</p>
                </div>
                {mission.incidentDate && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date Sinistre</p>
                    <p className="text-sm font-bold text-slate-900">{new Date(mission.incidentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  </div>
                )}
              </div>

              {mission.status !== 'completed' && mission.status !== 'cancelled' && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Timer className="w-3.5 h-3.5 text-blue-500" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temps restant estimé</h4>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <MissionTimer 
                      createdAt={mission.createdAt} 
                      interventionDelay={mission.interventionDelay || 'Mission Urbain (30 min max)'} 
                    />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Dispatcher Alert Area */}
            <AnimatePresence>
              {mission.agentNotes && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#FFFBF2] rounded-[2rem] p-8 border border-[#FFF3D6] shadow-sm relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-8 text-[#E2B747]/20 group-hover:text-[#E2B747]/40 transition-colors">
                    <MessageSquare size={80} strokeWidth={1} />
                  </div>
                  <h3 className="text-[10px] font-black text-[#8B6E2F] uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                    <MessageSquare className="w-4 h-4" />
                    Consignes du Dispatcher
                  </h3>
                  <div className="relative z-10">
                    <blockquote className="text-xl md:text-2xl font-bold text-[#56451C] leading-tight italic">
                      "{mission.agentNotes}"
                    </blockquote>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Visual Evidence / Photos */}
            {mission.arrivalPhotos && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-600" />
                    PREUVES D'ARRIVÉE
                  </h3>
                  <button
                    onClick={downloadAllPhotos}
                    className="text-[10px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Tout télécharger
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.isArray(mission.arrivalPhotos) ? (
                    mission.arrivalPhotos.map((photo, idx) => (
                      <motion.div 
                        key={idx} 
                        whileHover={{ y: -4 }}
                        className="rounded-2xl overflow-hidden aspect-square border border-slate-200/60 bg-slate-100 relative group"
                      >
                        <img 
                          src={photo} 
                          alt={`Photo ${idx + 1}`} 
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => window.open(photo, '_blank')}
                        />
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPhoto(photo, `photo-${idx+1}.jpg`);
                            }}
                            className="w-full bg-white text-slate-900 text-[8px] font-black py-1.5 rounded-lg flex items-center justify-center gap-1.5"
                          >
                            <Download size={10} />
                            TÉLÉCHARGER
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    Object.entries(mission.arrivalPhotos as Record<string, string>).map(([category, photo], idx) => (
                      <motion.div 
                        key={category} 
                        whileHover={{ y: -4 }}
                        className="rounded-2xl overflow-hidden aspect-square border border-slate-200/60 bg-slate-100 relative group"
                      >
                        <img 
                          src={photo} 
                          alt={category} 
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => window.open(photo as string, '_blank')}
                        />
                        <div className="absolute inset-x-0 top-0 p-2 bg-gradient-to-b from-black/50 to-transparent">
                          <span className="text-[8px] font-black text-white uppercase tracking-wider">{category}</span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPhoto(photo as string, `${category}.jpg`);
                            }}
                            className="w-full bg-white text-slate-900 text-[8px] font-black py-1.5 rounded-lg flex items-center justify-center gap-1.5"
                          >
                            <Download size={10} />
                            TÉLÉCHARGER
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Strategic Map Integration */}
            <div className="bg-white rounded-[2rem] overflow-hidden border border-slate-200/60 shadow-sm">
              <div className="h-[200px] relative">
                <MapContainer 
                  center={[mission.location.lat, mission.location.lng]} 
                  zoom={15} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[mission.location.lat, mission.location.lng]} />
                </MapContainer>
                <div className="absolute bottom-6 left-6 right-6 z-[500] flex justify-between items-end">
                   <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-100 max-w-[280px]">
                      <div className="flex items-start gap-3">
                        <div className="bg-rose-50 p-2 rounded-xl">
                          <MapPin size={18} className="text-rose-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destinations</p>
                          <p className="text-xs font-bold text-slate-900 leading-snug">{formatShortAddress(mission.location.address)}</p>
                        </div>
                      </div>
                   </div>
                   <button
                    onClick={openInMaps}
                    className="bg-white text-slate-900 font-black text-[10px] px-5 py-3 rounded-xl shadow-xl border border-slate-100 flex items-center gap-2 hover:bg-slate-50 transition-all uppercase"
                   >
                    <ExternalLink size={14} className="text-blue-600" />
                    Ouvrir Navigation
                   </button>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar / Interaction Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Status & Timeline Dashboard */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Détails Tempoeurs
              </h3>
              <div className="space-y-4">
                {mission.incidentDate && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-1 rounded-full bg-amber-400" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Date de Sinistre</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-800">
                      {new Date(mission.incidentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Mission Créée</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-800">
                    {new Date(mission.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-1 rounded-full bg-blue-400" />
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Mise à jour</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-800">
                    {new Date(mission.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Agent Assignment Card */}
              <div className="mt-8 pt-8 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Intervenant</p>
                {agent ? (
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-none mb-1">{agent.displayName}</p>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${agent.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          {agent.isOnline ? 'Actif sur zone' : 'Déconnecté'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-100 rounded-2xl p-6 text-center">
                    <Loader2 className="w-6 h-6 text-slate-200 animate-spin mx-auto mb-2" />
                    <p className="text-[10px] font-black text-slate-400 uppercase">En attente d'assignation</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Matrix */}
            <AnimatePresence>
              {mission.status !== 'completed' && mission.status !== 'cancelled' && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-slate-200 border border-slate-800"
                >
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Commandes Opérationnelles
                  </h3>
                  
                  <div className="space-y-4">
                    {profile?.role === 'agent' && (
                      <>
                        {mission.status === 'pending' && (
                          <button
                            onClick={acceptMission}
                            disabled={updating}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40"
                          >
                            {updating ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} />}
                            ACCEPTER LA MISSION
                          </button>
                        )}

                        {mission.status === 'in_progress' && mission.assignedAgentId === auth.currentUser?.uid && (
                          <div className="space-y-6">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                {PHOTO_CATEGORIES.map((category) => (
                                  <div key={category} className="space-y-1.5">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">{category}</p>
                                    <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-800/50 group transition-all hover:border-blue-500/50">
                                      {arrivalPhotosList[category] ? (
                                        <>
                                          <img src={arrivalPhotosList[category]} className="w-full h-full object-cover" />
                                          <button 
                                            onClick={() => removePhoto(category)}
                                            className="absolute top-2 right-2 bg-rose-500/90 text-white p-1.5 rounded-xl shadow-lg backdrop-blur-sm"
                                          >
                                            <X size={14} />
                                          </button>
                                        </>
                                      ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer group-hover:bg-slate-800 transition-colors">
                                          <Camera size={24} className="text-slate-600 group-hover:text-blue-500 transition-colors mb-2" />
                                          <span className="text-[8px] font-black text-slate-500 uppercase">Prendre photo</span>
                                          <input 
                                            type="file" 
                                            accept="image/*" 
                                            capture="environment" 
                                            className="hidden" 
                                            onChange={(e) => handlePhotoCapture(e, category)} 
                                          />
                                        </label>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              <button
                                onClick={confirmArrival}
                                disabled={updating || Object.keys(arrivalPhotosList).length < PHOTO_CATEGORIES.length}
                                className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                                  Object.keys(arrivalPhotosList).length < PHOTO_CATEGORIES.length
                                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                    : 'bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse shadow-emerald-500/20'
                                }`}
                              >
                                {updating ? <Loader2 size={18} className="animate-spin" /> : 'CONFIRMER L\'ARRIVÉE'}
                              </button>
                              
                              {Object.keys(arrivalPhotosList).length < PHOTO_CATEGORIES.length && (
                                <p className="text-[9px] font-bold text-slate-500 text-center uppercase tracking-widest">
                                  {PHOTO_CATEGORIES.length - Object.keys(arrivalPhotosList).length} photos restantes obligatoires
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {mission.status === 'arrived' && mission.assignedAgentId === auth.currentUser?.uid && (
                          <div className="space-y-6">
                            <div className="bg-slate-800 p-2 rounded-2xl border border-slate-700">
                              <p className="text-[10px] font-black text-slate-500 uppercase text-center py-2">Sélectionnez la finalité</p>
                              <div className="grid grid-cols-1 gap-1">
                                {outcomes.map((outcome) => (
                                  <button
                                    key={outcome.id}
                                    onClick={() => setSelectedOutcome(outcome.id)}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
                                      selectedOutcome === outcome.id 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={selectedOutcome === outcome.id ? 'text-white' : 'text-slate-500'}>
                                        {outcome.icon}
                                      </div>
                                      <span className="text-[11px] font-bold uppercase">{outcome.label}</span>
                                    </div>
                                    <ChevronRight size={14} opacity={0.3} />
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {selectedOutcome && (
                              <button
                                onClick={() => {
                                  const outcome = outcomes.find(o => o.id === selectedOutcome);
                                  updateStatus('completed', {
                                    resolutionReason: outcome?.label,
                                    isFlagged: outcome?.isFlag || false
                                  });
                                }}
                                disabled={updating}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl transition-all"
                              >
                                TERMINER L'INTERVENTION
                              </button>
                            )}
                          </div>
                        )}
                        
                        <button
                          onClick={() => {
                            if(confirm('Êtes-vous sûr de vouloir annuler cette mission ?')) {
                              updateStatus('cancelled');
                            }
                          }}
                          disabled={updating}
                          className="w-full text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest pt-4 border-t border-slate-800"
                        >
                          Annuler la mission
                        </button>
                      </>
                    )}

                    {profile?.role === 'dispatch' && (
                       <button
                        onClick={() => {
                          if(confirm('Annuler définitivement cette mission ?')) {
                            updateStatus('cancelled');
                          }
                        }}
                        disabled={updating}
                        className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-rose-500/30"
                      >
                        {updating ? <Loader2 size={18} className="animate-spin" /> : <AlertCircle size={18} />}
                        ANNULER LA MISSION
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resolved/Cancelled States */}
            {mission.status === 'completed' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2rem] p-8 border border-emerald-100 shadow-sm text-center"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Intervention Terminée</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Status: Mission Accomplie</p>
                
                {mission.resolutionReason && (
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[11px] font-bold text-slate-700 mb-4">
                      RÉSULTAT: {mission.resolutionReason}
                   </div>
                )}

                {mission.isFlagged && (
                  <div className="flex items-center justify-center gap-2 text-[10px] font-black text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
                    <ShieldCheck size={14} />
                    SIGNALEMENT ACTIF AU DISPATCH
                  </div>
                )}
              </motion.div>
            )}

            {mission.status === 'cancelled' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[2rem] p-8 border border-rose-100 shadow-sm text-center"
              >
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Mission Annulée</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Opération interrompue par le système</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
