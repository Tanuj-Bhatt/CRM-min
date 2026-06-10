import { Component, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <ng-container *ngIf="authService.currentUser() as user; else noAuth">
      <div class="app-layout">
        <!-- Mobile overlay -->
        <div class="sidebar-overlay" [class.visible]="sidebarOpen()" (click)="closeSidebar()"></div>

        <!-- Sidebar -->
        <aside class="sidebar" [class.open]="sidebarOpen()">
          <div class="sidebar-brand">
            <div class="brand-logo">▲</div>
            <div class="brand-text">
              <span class="brand-name">AeroCRM</span>
              <span class="brand-version">v24.0 Enterprise</span>
            </div>
            <button class="sidebar-close" (click)="closeSidebar()">✕</button>
          </div>
          <nav class="sidebar-nav">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
              <span class="nav-icon">📊</span><span class="nav-label">Dashboard</span>
            </a>
            <a routerLink="/leads" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
              <span class="nav-icon">💼</span><span class="nav-label">Leads Pipeline</span>
            </a>
            <a routerLink="/contacts" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
              <span class="nav-icon">👥</span><span class="nav-label">Contacts</span>
            </a>
            <a *ngIf="user.role === 'Admin' || user.role === 'Manager'" routerLink="/team" routerLinkActive="active" class="nav-item" (click)="closeSidebar()">
              <span class="nav-icon">🛡️</span><span class="nav-label">Team & Security</span>
            </a>
          </nav>
          <div class="sidebar-footer">
            <div class="user-profile">
              <div class="avatar-glow">{{ user.firstName[0] }}{{ user.lastName[0] }}</div>
              <div class="user-info">
                <span class="user-name">{{ user.firstName }} {{ user.lastName }}</span>
                <span class="badge" [ngClass]="'badge-' + user.role.toLowerCase()">{{ user.role }}</span>
              </div>
            </div>
          </div>
        </aside>

        <!-- Main panel -->
        <div class="main-panel">
          <header class="app-header">
            <div class="header-left">
              <button class="hamburger" (click)="toggleSidebar()" aria-label="Toggle menu">
                <span></span><span></span><span></span>
              </button>
              <span class="org-name">🏢 {{ user.organizationName }}</span>
            </div>
            <div class="header-right">
              <button class="theme-btn" (click)="toggleTheme()" [title]="isDark() ? 'Light mode' : 'Dark mode'">
                {{ isDark() ? '☀️' : '🌙' }}
              </button>
              <button (click)="logout()" class="btn btn-outline btn-sm">
                <span>🚪</span><span class="logout-label">Logout</span>
              </button>
            </div>
          </header>
          <main class="content-viewport">
            <router-outlet></router-outlet>
          </main>
        </div>
      </div>
    </ng-container>
    <ng-template #noAuth><router-outlet></router-outlet></ng-template>
  `,
  styles: [`
    .app-layout{display:flex;height:100vh;width:100vw;overflow:hidden;background:var(--bg-primary)}

    /* Sidebar */
    .sidebar{width:250px;min-width:250px;height:100%;display:flex;flex-direction:column;background:var(--bg-secondary);border-right:1px solid var(--border-color);transition:transform var(--transition-normal);z-index:100;flex-shrink:0}
    .sidebar-brand{padding:20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border-color)}
    .brand-logo{font-size:1.4rem;font-weight:800;background:linear-gradient(135deg,var(--primary),var(--secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .brand-text{display:flex;flex-direction:column;flex:1}
    .brand-name{font-weight:800;font-size:1rem;color:var(--text-primary)}
    .brand-version{font-size:.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em}
    .sidebar-close{display:none;background:transparent;border:none;color:var(--text-muted);font-size:1rem;cursor:pointer;padding:4px;border-radius:4px}
    .sidebar-close:hover{color:var(--text-primary)}
    .sidebar-nav{flex:1;padding:16px 10px;display:flex;flex-direction:column;gap:4px;overflow-y:auto}
    .nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--radius-sm);color:var(--text-secondary);text-decoration:none;font-weight:500;font-size:.875rem;transition:all var(--transition-fast);border-left:3px solid transparent}
    .nav-item:hover{color:var(--text-primary);background:var(--input-bg)}
    .nav-item.active{color:var(--primary);background:rgba(99,102,241,.08);border-left-color:var(--primary);font-weight:600}
    .nav-icon{font-size:1rem;flex-shrink:0}
    .sidebar-footer{padding:16px;border-top:1px solid var(--border-color)}
    .user-profile{display:flex;align-items:center;gap:10px}
    .avatar-glow{width:38px;height:38px;min-width:38px;background:linear-gradient(135deg,var(--secondary),var(--primary));border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:.8rem;box-shadow:0 0 10px rgba(13,148,136,.25)}
    .user-info{display:flex;flex-direction:column;gap:3px;overflow:hidden;min-width:0}
    .user-name{font-size:.825rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

    /* Overlay */
    .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99;backdrop-filter:blur(2px)}

    /* Main panel */
    .main-panel{flex:1;display:flex;flex-direction:column;height:100%;overflow:hidden;min-width:0}
    .app-header{height:60px;min-height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color)}
    .header-left{display:flex;align-items:center;gap:12px}
    .org-name{font-size:.95rem;font-weight:600;color:var(--text-primary)}
    .header-right{display:flex;align-items:center;gap:8px}
    .hamburger{display:none;flex-direction:column;gap:4px;background:transparent;border:none;cursor:pointer;padding:6px;border-radius:var(--radius-sm)}
    .hamburger span{display:block;width:20px;height:2px;background:var(--text-secondary);border-radius:2px;transition:all var(--transition-fast)}
    .hamburger:hover span{background:var(--text-primary)}
    .theme-btn{background:var(--input-bg);border:1px solid var(--border-color);border-radius:var(--radius-sm);width:34px;height:34px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all var(--transition-fast)}
    .theme-btn:hover{border-color:var(--primary);background:rgba(99,102,241,.08)}
    .content-viewport{flex:1;padding:28px;overflow-y:auto;background:var(--bg-primary)}

    /* Mobile */
    @media(max-width:768px){
      .hamburger{display:flex}
      .sidebar{position:fixed;top:0;left:0;transform:translateX(-100%)}
      .sidebar.open{transform:translateX(0)}
      .sidebar-close{display:block}
      .sidebar-overlay.visible{display:block}
      .content-viewport{padding:16px}
      .org-name{font-size:.8rem}
      .logout-label{display:none}
    }
    @media(max-width:480px){
      .content-viewport{padding:12px}
      .app-header{padding:0 14px}
    }
  `]
})
export class AppComponent {
  readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isDark = signal(true);
  readonly sidebarOpen = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('crm-theme');
      this.isDark.set(saved !== 'light');
    }
    effect(() => {
      if (isPlatformBrowser(this.platformId)) {
        const theme = this.isDark() ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('crm-theme', theme);
      }
    });
  }

  toggleTheme(): void { this.isDark.update(v => !v); }
  toggleSidebar(): void { this.sidebarOpen.update(v => !v); }
  closeSidebar(): void { this.sidebarOpen.set(false); }

  logout(): void {
    this.authService.logout();
  }
}