import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { UserProfile, MapPosition } from '../../../types';
import { X, MapPin, Truck, Hash, Phone, User, Briefcase, Navigation, Timer, Calendar } from 'lucide-react';
import LocationPicker from './LocationPicker';

interface Props {
  onClose: () => void;
  agents: UserProfile[];
}

export default function MissionForm({ onClose, agents }: Props) {
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [phone, setPhone] = useState('');
  const [folderReference, setFolderReference] = useState('');
  const [compagnie, setCompagnie] = useState('Maroc Assistance Internationale');
  const [interventionDelay, setInterventionDelay] = useState('Mission Urbain (30 min max)');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationLink, setLocationLink] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !user) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'missions'), {
        customerName,
        vehicle,
        licensePlate,
        phone,
        folderReference: folderReference || null,
        compagnie,
        interventionDelay,
        incidentDate,
        location,
        locationLink: locationLink || null,
        agentNotes: agentNotes || null,
        assignedAgentId: assignedAgentId || null,
        dispatcherId: user.uid,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      onClose();
    } catch (err) {
      console.error(err);
      alert("Échec de la création de l'intervention");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Nouvelle Intervention</h2>
          <p className="text-sm text-slate-500">Remplissez les détails pour dépêcher un agent</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Compagnie</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                  value={compagnie}
                  onChange={(e) => setCompagnie(e.target.value)}
                >
                  <option value="Maroc Assistance Internationale">Maroc Assistance Internationale</option>
                  <option value="Wafa ima assistance">Wafa ima assistance</option>
                  <option value="Cover Edge">Cover Edge</option>
                  <option value="Rma assistance">Rma assistance</option>
                  <option value="Africa First">Africa First</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Référence Dossier</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="ex. 12345/ABC"
                  value={folderReference}
                  onChange={(e) => setFolderReference(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Matricule (Plaque)</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase"
                  placeholder="XXXX-A-XX"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Modèle du Véhicule</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="ex. Peugeot 3008"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Numéro de Téléphone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="+212 6XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Délais l'intervention</label>
              <div className="relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                  value={interventionDelay}
                  onChange={(e) => setInterventionDelay(e.target.value)}
                >
                  <option value="Mission Urbain (30 min max)">Mission Urbain (30 min max)</option>
                  <option value="Mission Rayon (45 min max)">Mission Rayon (45 min max)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Date de Sinistre</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nom du Client</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="ex. Jean Dupont"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Localisation</label>
              <div className="mb-2">
                <div className="relative">
                  <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Lien Maps (Optionnel)"
                    value={locationLink}
                    onChange={(e) => setLocationLink(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl transition-all ${
                  location ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                <MapPin className="w-5 h-5 text-blue-500" />
                {location ? (
                  <span className="font-medium truncate">{location.address}</span>
                ) : (
                  <span className="font-medium italic">Choisir sur la carte</span>
                )}
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Assigner un Agent (Optionnel)</label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 pb-2">
                {agents.map(agent => (
                  <button
                    key={agent.userId}
                    type="button"
                    onClick={() => setAssignedAgentId(agent.userId)}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-all text-left ${
                      assignedAgentId === agent.userId ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${agent.isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                    <span className="text-sm font-medium">{agent.displayName}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Message pour l'Agent</label>
          <textarea
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24 text-sm"
            placeholder="Instructions particulières, détails sur la panne, etc..."
            value={agentNotes}
            onChange={(e) => setAgentNotes(e.target.value)}
          />
        </div>

        <button
          disabled={loading || !location}
          type="submit"
          className="w-full bg-slate-900 border-none hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          <Navigation className="w-5 h-5 text-blue-400" />
          {loading ? 'Création...' : "Lancer l'Intervention"}
        </button>
      </form>

      {showMap && (
        <div className="fixed inset-0 z-[60] bg-white lg:m-20 lg:rounded-3xl lg:shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between bg-slate-50">
            <h3 className="font-bold flex items-center gap-2">
              <MapPin className="text-blue-600" /> Choisir la Position
            </h3>
            <button onClick={() => setShowMap(false)} className="p-2 hover:bg-slate-200 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <LocationPicker 
              onSelect={(loc) => {
                setLocation(loc);
                setShowMap(false);
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
