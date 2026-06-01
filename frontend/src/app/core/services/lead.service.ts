import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Lead, ActivityLog } from '../models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/leads`;

  getLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>(this.baseUrl);
  }

  getLeadById(id: string): Observable<Lead> {
    return this.http.get<Lead>(`${this.baseUrl}/${id}`);
  }

  createLead(lead: any): Observable<Lead> {
    return this.http.post<Lead>(this.baseUrl, lead);
  }

  updateLead(id: string, lead: any): Observable<Lead> {
    return this.http.put<Lead>(`${this.baseUrl}/${id}`, lead);
  }

  deleteLead(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getActivities(leadId: string): Observable<ActivityLog[]> {
    return this.http.get<ActivityLog[]>(`${this.baseUrl}/${leadId}/activities`);
  }

  addActivity(leadId: string, activity: { type: string; details: string }): Observable<ActivityLog> {
    return this.http.post<ActivityLog>(`${this.baseUrl}/${leadId}/activities`, activity);
  }

  getAISummary(leadId: string): Observable<{ summary: string }> {
    return this.http.get<{ summary: string }>(`${this.baseUrl}/${leadId}/ai-summary`);
  }

  getDraftEmail(leadId: string): Observable<{ email: string }> {
    return this.http.get<{ email: string }>(`${this.baseUrl}/${leadId}/draft-email`);
  }
}
