export type UserRole = 'dispatch' | 'agent';

export interface UserProfile {
  userId: string;
  email: string;
  role: UserRole;
  displayName?: string;
  lastPosition?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
  isOnline: boolean;
  createdAt: string;
}

export type MissionStatus = 'pending' | 'accepted' | 'in_progress' | 'arrived' | 'completed' | 'cancelled';

export interface Mission {
  id: string;
  customerName: string;
  vehicle: string;
  licensePlate: string;
  phone: string;
  compagnie: string;
  folderReference?: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  locationLink?: string;
  agentNotes?: string;
  arrivalPhotos?: string[] | Record<string, string>;
  assignedAgentId?: string;
  dispatcherId: string;
  status: MissionStatus;
  resolutionReason?: string;
  isFlagged?: boolean;
  interventionDelay?: string;
  incidentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MapPosition {
  lat: number;
  lng: number;
}
