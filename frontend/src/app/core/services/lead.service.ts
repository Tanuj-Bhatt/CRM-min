import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Lead, ActivityLog, PagedResult, SendEmailDto, ImportCsvResult } from '../models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/leads`;

  getLeads(): Observable<Lead[]> {
    return this.http.get<Lead[]>(this.baseUrl);
  }

  getPagedLeads(page = 1, pageSize = 20, search?: string, status?: string, source?: string): Observable<PagedResult<Lead>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    if (source) params = params.set('source', source);

    return this.http.get<PagedResult<Lead>>(`${this.baseUrl}/paged`, { params });
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

  sendEmail(leadId: string, emailDto: SendEmailDto): Observable<{ message: string; activity: ActivityLog }> {
    return this.http.post<{ message: string; activity: ActivityLog }>(`${this.baseUrl}/${leadId}/send-email`, emailDto);
  }

  exportCsv(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/csv`, { responseType: 'blob' });
  }

  importCsv(file: File): Observable<ImportCsvResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ImportCsvResult>(`${this.baseUrl}/import/csv`, formData);
  }
}
