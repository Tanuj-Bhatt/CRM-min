import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse } from '../models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  
  private readonly baseUrl = `${environment.apiUrl}/auth`;
  
  // Reactive state for the current logged-in user
  readonly currentUser = signal<LoginResponse | null>(null);

  constructor() {
    this.loadSession();
  }

  login(credentials: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(response => this.setSession(response))
    );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register`, data);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/forgot-password`, { email });
  }

  logout(): void {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  isAuthenticated(): boolean {
    return !!this.currentUser();
  }

  hasRole(allowedRoles: string[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }

  private setSession(authResult: LoginResponse): void {
    localStorage.setItem('crm_token', authResult.token);
    localStorage.setItem('crm_user', JSON.stringify(authResult));
    this.currentUser.set(authResult);
  }

  private loadSession(): void {
    const token = localStorage.getItem('crm_token');
    const userJson = localStorage.getItem('crm_user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as LoginResponse;
        this.currentUser.set(user);
      } catch (e) {
        this.logout();
      }
    }
  }
}
