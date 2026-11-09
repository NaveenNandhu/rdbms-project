import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnalysisPayload, Project, User, LearningUnit } from '../models/schema.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  public get baseUrl(): string {
    const custom = localStorage.getItem('db_insight_api_url');
    if (custom) return custom.replace(/\/+$/, '');
    if (typeof window !== 'undefined' && (window as any).__API_URL__) {
      return (window as any).__API_URL__;
    }
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '/api';
    }
    return 'http://localhost:5000/api';
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('db_insight_token');
    const geminiKey = localStorage.getItem('db_insight_gemini_key');
    const openAiKey = localStorage.getItem('db_insight_openai_key');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    if (geminiKey) {
      headers = headers.set('x-gemini-key', geminiKey.trim());
    }
    if (openAiKey) {
      headers = headers.set('x-openai-key', openAiKey.trim());
    }
    return headers;
  }

  // --- Auth ---
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials);
  }

  register(data: { email: string; password: string; fullName: string; role?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, data);
  }

  getProfile(): Observable<any> {
    return this.http.get(`${this.baseUrl}/auth/profile`, { headers: this.getHeaders() });
  }

  // --- Projects ---
  getDashboardOverview(): Observable<any> {
    return this.http.get(`${this.baseUrl}/projects/dashboard`, { headers: this.getHeaders() });
  }

  listProjects(): Observable<{ success: boolean; projects: Project[] }> {
    return this.http.get<{ success: boolean; projects: Project[] }>(`${this.baseUrl}/projects`, { headers: this.getHeaders() });
  }

  getProject(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/projects/${id}`, { headers: this.getHeaders() });
  }

  createProject(data: { title: string; description?: string; dialect?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/projects`, data, { headers: this.getHeaders() });
  }

  deleteProject(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/projects/${id}`, { headers: this.getHeaders() });
  }

  // --- Analysis Engine ---
  previewSql(sql: string, dialect: string = 'postgresql'): Observable<any> {
    return this.http.post(`${this.baseUrl}/analysis/preview-sql`, { sql, dialect });
  }

  parseDiagram(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/analysis/parse-diagram`, formData, { headers: this.getHeaders() });
  }

  executeAnalysis(payload: {
    projectId?: string;
    projectTitle?: string;
    sql?: string;
    tables?: any[];
    userFds?: any[];
    dialect?: string;
  }): Observable<AnalysisPayload> {
    return this.http.post<AnalysisPayload>(`${this.baseUrl}/analysis/execute`, payload, { headers: this.getHeaders() });
  }

  addCustomFd(data: { table: string; determinants: string[]; dependents: string[] }): Observable<any> {
    return this.http.post(`${this.baseUrl}/analysis/add-fd`, data, { headers: this.getHeaders() });
  }

  // --- AI Tutor ---
  askTutor(question: string, context: any): Observable<{ success: boolean; answer: string; suggestedFollowups: string[] }> {
    return this.http.post<{ success: boolean; answer: string; suggestedFollowups: string[] }>(
      `${this.baseUrl}/tutor/ask`,
      { question, context },
      { headers: this.getHeaders() }
    );
  }

  // --- Learning Center ---
  getCurriculum(): Observable<{ success: boolean; units: LearningUnit[] }> {
    return this.http.get<{ success: boolean; units: LearningUnit[] }>(`${this.baseUrl}/learning/curriculum`);
  }

  getTopic(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/learning/topic/${id}`);
  }

  submitQuiz(topicId: string, answers: Record<string, number>): Observable<any> {
    return this.http.post(`${this.baseUrl}/learning/submit-quiz`, { topicId, answers }, { headers: this.getHeaders() });
  }

  upsertUnit(unit: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/learning/unit`, unit, { headers: this.getHeaders() });
  }

  upsertTopic(topic: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/learning/topic`, topic, { headers: this.getHeaders() });
  }

  // --- Reports ---
  exportPdf(data: any): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/reports/export-pdf`, data, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }

  downloadSql(correctedSql: string, projectName: string = 'database_corrected'): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/reports/download-sql`, { correctedSql, projectName }, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }
}
