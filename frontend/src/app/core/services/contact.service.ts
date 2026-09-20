import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Contact, PagedResult, ImportCsvResult } from '../models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/contacts`;

  getContacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(this.baseUrl);
  }

  getPagedContacts(page = 1, pageSize = 20, search?: string): Observable<PagedResult<Contact>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) params = params.set('search', search);

    return this.http.get<PagedResult<Contact>>(`${this.baseUrl}/paged`, { params });
  }

  getContactById(id: string): Observable<Contact> {
    return this.http.get<Contact>(`${this.baseUrl}/${id}`);
  }

  createContact(contact: any): Observable<Contact> {
    return this.http.post<Contact>(this.baseUrl, contact);
  }

  updateContact(id: string, contact: any): Observable<Contact> {
    return this.http.put<Contact>(`${this.baseUrl}/${id}`, contact);
  }

  deleteContact(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
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
