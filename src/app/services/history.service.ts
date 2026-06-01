import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export interface HistoryItem {
  title: string;
  url: string;
  visitedAt: string;
  dashboardId: string;
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private subjects = new Map<string, BehaviorSubject<HistoryItem[]>>();
  private maxItems = 20;
  private apiUrl   = 'http://localhost:8070/api';

  constructor(private http: HttpClient) {}

  getHistory$(dashboardId: string) {
    return this.ensureSubject(dashboardId).asObservable();
  }

  addEntry(dashboardId: string, title: string, url: string): void {
    const current = this.ensureSubject(dashboardId).getValue();

    if (current.length && current[0].url === url) return; // doublon consécutif

    const item: HistoryItem = { title, url, dashboardId, visitedAt: new Date().toISOString() };
    const list = [item, ...current.filter(h => h.url !== url)].slice(0, this.maxItems);

    localStorage.setItem(`history_${dashboardId}`, JSON.stringify(list));
    this.ensureSubject(dashboardId).next(list);
    this.syncToBackend('POST', dashboardId, item);
  }

  clearHistory(dashboardId: string): void {
    localStorage.removeItem(`history_${dashboardId}`);
    this.ensureSubject(dashboardId).next([]);
    this.syncToBackend('DELETE', dashboardId);
  }

  private ensureSubject(dashboardId: string): BehaviorSubject<HistoryItem[]> {
    if (!this.subjects.has(dashboardId)) {
      this.subjects.set(dashboardId, new BehaviorSubject<HistoryItem[]>(
        this.loadFromStorage(dashboardId)
      ));
    }
    return this.subjects.get(dashboardId)!;
  }

  private syncToBackend(method: 'POST' | 'DELETE', dashboardId: string, item?: HistoryItem): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const url = `${this.apiUrl}/history/${dashboardId}`;

    const req$ = method === 'POST'
      ? this.http.post(url, item, { headers })
      : this.http.delete(url, { headers });

    req$.subscribe({ error: err => console.warn('Sync backend échoué:', err) });
  }

  private loadFromStorage(dashboardId: string): HistoryItem[] {
    try {
      const raw = localStorage.getItem(`history_${dashboardId}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
}