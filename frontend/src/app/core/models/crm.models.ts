export enum Role {
  Admin = 'Admin',
  Manager = 'Manager',
  Agent = 'Agent'
}

export enum LeadStatus {
  New = 'New',
  Contacted = 'Contacted',
  Qualified = 'Qualified',
  Lost = 'Lost',
  Won = 'Won'
}

export enum ActivityType {
  Email = 'Email',
  Phone = 'Phone',
  Meeting = 'Meeting',
  Note = 'Note',
  AISummary = 'AISummary'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  estimatedValue: number;
  status: LeadStatus;
  source: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  leadId?: string;
  contactId?: string;
  userId: string;
  userName: string;
  type: ActivityType;
  details: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string;
  organizationName: string;
}
