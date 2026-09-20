import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AutomationSettings, UpdateAutomationSettings, WebhookLeadPayload } from '../models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class AutomationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/automations`;

  getSettings(): Observable<AutomationSettings> {
    return this.http.get<AutomationSettings>(`${this.baseUrl}/settings`);
  }

  updateSettings(dto: UpdateAutomationSettings): Observable<AutomationSettings> {
    return this.http.put<AutomationSettings>(`${this.baseUrl}/settings`, dto);
  }

  regenerateApiKey(): Observable<{ webhookApiKey: string }> {
    return this.http.post<{ webhookApiKey: string }>(`${this.baseUrl}/regenerate-key`, {});
  }

  sendTestLead(apiKey: string, payload: WebhookLeadPayload): Observable<any> {
    const headers = new HttpHeaders({
      'X-API-Key': apiKey
    });
    return this.http.post<any>(`${this.baseUrl}/capture`, payload, { headers });
  }
}
