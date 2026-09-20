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
  expectedCloseDate?: string;
  closeReason?: string;
  score: number;
  lastContactedAt?: string;
  isStale: boolean;
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

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface SendEmailDto {
  recipientEmail: string;
  subject: string;
  body: string;
}

export interface ImportCsvResult {
  totalProcessed: number;
  importedCount: number;
  failedCount: number;
  errors: string[];
}

export interface AutomationSettings {
  webhookApiKey: string;
  autoAssignRoundRobin: boolean;
  staleDealThresholdDays: number;
  webhookEndpointUrl: string;
}

export interface UpdateAutomationSettings {
  autoAssignRoundRobin: boolean;
  staleDealThresholdDays: number;
}

export interface WebhookLeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  estimatedValue?: number;
  source?: string;
  notes?: string;
}
