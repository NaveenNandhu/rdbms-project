import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProjectStateService } from '../../core/services/project-state.service';

interface ChatMessage {
  sender: 'user' | 'tutor';
  text: string;
  time: string;
  followups?: string[];
}

@Component({
  selector: 'app-tutor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto h-[calc(100vh-7rem)] flex flex-col space-y-4 fade-in pb-4">
      <!-- Header & Context Selector -->
      <div class="bg-white p-4 rounded-2xl border border-surface-border shadow-soft flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-xl bg-blue-100 text-primary-600 flex items-center justify-center font-bold text-lg">
            🎓
          </div>
          <div>
            <h1 class="text-base font-bold text-content-main">AI Database Tutor</h1>
            <p class="text-xs text-content-muted">Ask questions about your uploaded database design in plain English or formal theory.</p>
          </div>
        </div>

        <!-- Context Selector Dropdown & Mode Badge -->
        <div class="flex items-center space-x-3 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-content-muted font-medium">Context:</span>
            <select
              [(ngModel)]="contextType"
              class="border border-surface-border rounded-lg px-2.5 py-1 text-xs font-semibold bg-surface-subtle"
            >
              <option value="ENTIRE_DATABASE">Entire Database</option>
              <option value="TABLE">Current Table ({{ state.selectedTableName() || 'Selected' }})</option>
              <option value="ANALYSIS">Current Analysis Session</option>
            </select>
          </div>

          <span class="px-2.5 py-1 rounded-md text-xs font-semibold" [ngClass]="state.learningMode() === 'BEGINNER' ? 'bg-blue-50 text-primary-700' : 'bg-blue-50 text-blue-700'">
            {{ state.learningMode() }} MODE
          </span>
        </div>
      </div>

      <!-- Chat History Stream -->
      <div class="flex-1 bg-white rounded-2xl border border-surface-border shadow-soft p-5 overflow-y-auto space-y-4">
        <div *ngFor="let msg of messages" class="space-y-2">
          <!-- User Message -->
          <div *ngIf="msg.sender === 'user'" class="flex justify-end">
            <div class="max-w-xl bg-primary text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed shadow-soft">
              {{ msg.text }}
            </div>
          </div>

          <!-- Tutor Message -->
          <div *ngIf="msg.sender === 'tutor'" class="flex justify-start items-start gap-2.5">
            <div class="w-8 h-8 rounded-full bg-blue-100 text-primary-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-blue-200">
              AI
            </div>
            <div class="max-w-2xl bg-surface-subtle border border-surface-border p-4 rounded-2xl rounded-tl-none text-xs text-content-main leading-relaxed space-y-2">
              <div class="whitespace-pre-line prose prose-xs max-w-none">{{ msg.text }}</div>

              <!-- Follow-up suggestion pills -->
              <div *ngIf="msg.followups && msg.followups.length > 0" class="pt-2 border-t border-gray-200/60">
                <div class="text-[10px] font-bold text-content-muted uppercase mb-1.5">Suggested Questions:</div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    *ngFor="let f of msg.followups"
                    (click)="askQuestion(f)"
                    class="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-surface-border text-primary font-medium text-[11px] transition-colors"
                  >
                    {{ f }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="isLoading()" class="flex items-center gap-2 text-xs text-content-muted p-2">
          <span class="animate-spin text-base">⏳</span>
          <span>Tutor is analyzing your database schema and preparing explanation...</span>
        </div>
      </div>

      <!-- Pre-crafted Educational Prompt Pills -->
      <div class="flex flex-wrap gap-2 text-xs flex-shrink-0">
        <button
          *ngFor="let p of quickPrompts"
          (click)="askQuestion(p)"
          class="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-content-main border border-surface-border text-xs transition-colors flex items-center gap-1.5"
        >
          <span>💡</span>
          <span>{{ p }}</span>
        </button>
      </div>

      <!-- Chat Input Box -->
      <div class="bg-white p-2 rounded-2xl border border-surface-border shadow-soft flex items-center gap-2 flex-shrink-0">
        <input
          [(ngModel)]="inputText"
          (keyup.enter)="sendMessage()"
          placeholder="Ask anything (e.g. 'Why is student_enrollment not in 2NF?', 'What is a foreign key?')..."
          class="flex-1 px-4 py-2.5 text-xs text-content-main focus:outline-none"
        />
        <button
          (click)="sendMessage()"
          [disabled]="!inputText.trim() || isLoading()"
          class="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-semibold text-xs shadow-soft transition-all"
        >
          Send
        </button>
      </div>
    </div>
  `
})
export class TutorComponent implements OnInit {
  private api = inject(ApiService);
  public state = inject(ProjectStateService);

  public contextType: 'ENTIRE_DATABASE' | 'TABLE' | 'ANALYSIS' = 'TABLE';
  public inputText: string = '';
  public isLoading = signal<boolean>(false);

  public messages: ChatMessage[] = [];

  public get quickPrompts(): string[] {
    const analysis = this.state.activeAnalysis();
    if (analysis && analysis.tables.length > 0) {
      const firstTable = analysis.tables[0].name;
      const topIssue = analysis.recommendations.recommendations[0]?.title || `What is the normal form of ${firstTable}?`;
      return [
        `What is the primary key of ${firstTable}?`,
        topIssue,
        `How can I improve the normalization of ${firstTable}?`,
        'What is an update anomaly scenario in this schema?'
      ];
    }
    return [
      'What is a primary key?',
      'How does 2NF differ from 3NF?',
      'Explain referential integrity with ON DELETE CASCADE.',
      'What is an update anomaly?'
    ];
  }

  ngOnInit(): void {
    const firstTable = this.state.activeAnalysis()?.tables[0]?.name || 'your database';
    // Initial welcome message from AI tutor
    this.messages.push({
      sender: 'tutor',
      text: `Hello! I am your **DB Insight AI Tutor**.\n\nI have loaded your active database schema. You can ask me to explain normalization (1NF to BCNF), foreign keys, integrity rules, or why certain anomalies happen in **${firstTable}**.\n\nHow can I help you learn today?`,
      time: new Date().toLocaleTimeString(),
      followups: [
        `What is the candidate key of ${firstTable}?`,
        'What is referential integrity?',
        'How do I eliminate update anomalies?'
      ]
    });
  }

  public sendMessage() {
    if (!this.inputText.trim() || this.isLoading()) return;
    const q = this.inputText.trim();
    this.inputText = '';
    this.askQuestion(q);
  }

  public askQuestion(question: string) {
    this.messages.push({
      sender: 'user',
      text: question,
      time: new Date().toLocaleTimeString()
    });

    this.isLoading.set(true);

    const context = {
      mode: this.state.learningMode(),
      contextType: this.contextType,
      selectedTableName: this.state.selectedTableName(),
      schemaOverview: {
        tables: this.state.activeAnalysis()?.tables || [],
        relationships: this.state.activeAnalysis()?.relationships.relationships || []
      },
      analysisSummary: {
        overallRank: this.state.activeAnalysis()?.overallSchemaRank || '1NF',
        score: this.state.activeAnalysis()?.recommendations.overallDesignScore || 70,
        issuesCount: this.state.activeAnalysis()?.recommendations.recommendations.length || 0
      }
    };

    this.api.askTutor(question, context).subscribe({
      next: (res) => {
        this.messages.push({
          sender: 'tutor',
          text: res.answer,
          time: new Date().toLocaleTimeString(),
          followups: res.suggestedFollowups
        });
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
