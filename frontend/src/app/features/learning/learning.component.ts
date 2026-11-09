import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LearningUnit, LearningTopic, QuizQuestion } from '../../core/models/schema.models';

@Component({
  selector: 'app-learning',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 fade-in pb-16">
      <!-- Header -->
      <div class="border-b border-surface-border dark:border-slate-800 pb-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-extrabold text-content-main dark:text-slate-100 tracking-tight flex items-center gap-2.5">
              <i class="fa-solid fa-graduation-cap text-primary"></i>
              <span>RDBMS Learning Center & Curriculum</span>
            </h1>
            <p class="text-xs text-content-muted dark:text-slate-400 mt-1">
              Interactive concept walkthroughs, formal relational design principles, and knowledge check quizzes.
            </p>
          </div>
        </div>
      </div>

      <!-- Main Learning Layout: Syllabus Sidebar + Topic Content -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Units & Topics Tree -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-surface-border dark:border-slate-800 shadow-soft space-y-4 transition-colors">
          <div class="font-bold text-sm text-content-main dark:text-slate-100 uppercase tracking-wider pb-2 border-b border-surface-border dark:border-slate-800 flex items-center justify-between">
            <span class="flex items-center gap-2">
              <i class="fa-solid fa-book-bookmark text-primary"></i>
              <span>Syllabus Units</span>
            </span>
            <span class="text-[11px] font-normal text-content-muted dark:text-slate-400">
              {{ units.length }} Units
            </span>
          </div>

          <div class="space-y-4 max-h-[700px] overflow-y-auto pr-1">
            <div *ngFor="let unit of units" class="space-y-2">
              <div class="text-xs font-bold text-primary dark:text-primary-400 bg-primary/10 dark:bg-primary/20 px-3 py-2 rounded-xl border border-primary/20 flex items-center justify-between">
                <span class="truncate">{{ unit.title }}</span>
                <span class="text-[10px] opacity-75 font-mono">({{ unit.topics.length }})</span>
              </div>

              <div class="pl-2 space-y-1">
                <button
                  *ngFor="let topic of unit.topics"
                  (click)="selectTopic(topic)"
                  class="w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2"
                  [ngClass]="activeTopic?.id === topic.id ? 'bg-primary/15 dark:bg-primary/25 text-primary-700 dark:text-primary-300 font-bold border-l-4 border-primary shadow-xs' : 'text-content-muted dark:text-slate-300 hover:text-content-main dark:hover:text-white hover:bg-surface-hover dark:hover:bg-slate-800/80'"
                >
                  <span class="truncate flex items-center gap-2">
                    <i class="fa-solid fa-file-lines text-[11px] opacity-60"></i>
                    <span>{{ topic.title }}</span>
                  </span>
                  <span *ngIf="topic.quizQuestions && topic.quizQuestions.length > 0" class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono flex-shrink-0">
                    {{ topic.quizQuestions.length }} Qs
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Topic Walkthrough & Interactive Quiz -->
        <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-surface-border dark:border-slate-800 shadow-soft space-y-6 transition-colors">
          <div *ngIf="activeTopic" class="space-y-6">
            <!-- Topic Header -->
            <div class="pb-4 border-b border-surface-border dark:border-slate-800 space-y-2">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="text-xl font-bold text-content-main dark:text-slate-100">{{ activeTopic.title }}</h2>
                <a
                  *ngIf="activeTopic.moduleLink"
                  [routerLink]="getSafeModuleLink(activeTopic.moduleLink)"
                  class="text-xs font-semibold text-primary dark:text-primary-400 hover:underline flex items-center gap-1.5"
                >
                  <span>Open in Analyzer</span>
                  <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </a>
              </div>
              <p class="text-xs text-content-muted dark:text-slate-400">{{ activeTopic.summary }}</p>
            </div>

            <!-- Concept Explanation Box -->
            <div class="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200/80 dark:border-blue-800/40 space-y-1.5 text-xs">
              <div class="font-bold text-primary dark:text-primary-300 flex items-center gap-2">
                <i class="fa-solid fa-lightbulb text-amber-500"></i>
                <span>Concept Explanation</span>
              </div>
              <p class="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                {{ activeTopic.beginnerExplanation || activeTopic.summary }}
              </p>
            </div>

            <!-- Detailed Learning Material Markdown -->
            <div class="p-5 bg-surface-subtle dark:bg-slate-800/50 rounded-2xl border border-surface-border dark:border-slate-700/60 text-xs leading-relaxed space-y-3 text-slate-800 dark:text-slate-200">
              <div class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
                <i class="fa-solid fa-book-open text-primary"></i>
                <span>Detailed Lesson Material</span>
              </div>
              <div class="whitespace-pre-line font-mono text-[11px] sm:text-xs text-slate-700 dark:text-slate-300">
                {{ activeTopic.contentMarkdown }}
              </div>
            </div>

            <!-- INTERACTIVE QUIZ SECTION -->
            <div *ngIf="activeTopic.quizQuestions && activeTopic.quizQuestions.length > 0" class="pt-4 border-t border-surface-border dark:border-slate-800 space-y-5">
              <!-- Quiz Header Banner -->
              <div class="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-surface-subtle dark:bg-slate-800/50 border border-surface-border dark:border-slate-700/60">
                <div>
                  <h3 class="font-bold text-sm text-content-main dark:text-slate-100 flex items-center gap-2">
                    <i class="fa-solid fa-circle-question text-primary"></i>
                    <span>Knowledge Check Quiz</span>
                  </h3>
                  <p class="text-[11px] text-content-muted dark:text-slate-400 mt-0.5">
                    {{ activeTopic.quizQuestions.length }} multiple-choice questions to verify your master of this concept.
                  </p>
                </div>

                <!-- Live Answer Count Indicator -->
                <div *ngIf="!quizResult()" class="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 text-content-muted dark:text-slate-300">
                  <span class="text-primary font-bold">{{ getAnsweredCount() }}</span> / {{ activeTopic.quizQuestions.length }} Answered
                </div>

                <!-- Result Score Badge -->
                <div *ngIf="quizResult()" class="flex items-center gap-2">
                  <div
                    class="text-xs font-extrabold px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5"
                    [ngClass]="quizResult().score >= 70 ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'"
                  >
                    <i [class]="quizResult().score >= 70 ? 'fa-solid fa-trophy text-emerald-500' : 'fa-solid fa-circle-info text-amber-500'"></i>
                    <span>Score: {{ quizResult().score }}% ({{ quizResult().correctCount }}/{{ quizResult().totalQuestions }})</span>
                  </div>
                  <button
                    (click)="resetQuiz()"
                    class="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-surface-border dark:border-slate-700 hover:bg-surface-hover dark:hover:bg-slate-800 text-xs font-semibold text-content-main dark:text-slate-200 transition-colors flex items-center gap-1.5 shadow-xs"
                    title="Retake this quiz"
                  >
                    <i class="fa-solid fa-rotate-right text-primary text-xs"></i>
                    <span>Retake</span>
                  </button>
                </div>
              </div>

              <!-- Question Cards List -->
              <div class="space-y-5">
                <div
                  *ngFor="let q of activeTopic.quizQuestions; let qIdx = index"
                  class="p-5 rounded-2xl border transition-all space-y-3.5"
                  [ngClass]="getQuestionCardClasses(q.id)"
                >
                  <!-- Question Title & Per-Question Evaluation Badge -->
                  <div class="flex items-start justify-between gap-3">
                    <div class="font-bold text-xs sm:text-sm text-content-main dark:text-slate-100 flex items-start gap-2.5">
                      <span class="w-6 h-6 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-400 font-bold flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                        {{ qIdx + 1 }}
                      </span>
                      <span class="pt-0.5 leading-snug">{{ q.questionText }}</span>
                    </div>

                    <!-- Evaluation Tag if submitted -->
                    <div *ngIf="getQuestionResult(q.id) as qResult" class="flex-shrink-0">
                      <span
                        *ngIf="qResult.isCorrect"
                        class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 flex items-center gap-1"
                      >
                        <i class="fa-solid fa-check text-xs"></i>
                        <span>Correct</span>
                      </span>
                      <span
                        *ngIf="!qResult.isCorrect"
                        class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700/60 flex items-center gap-1"
                      >
                        <i class="fa-solid fa-xmark text-xs"></i>
                        <span>Incorrect</span>
                      </span>
                    </div>
                  </div>

                  <!-- Options List -->
                  <div class="grid grid-cols-1 gap-2.5 pt-1">
                    <div
                      *ngFor="let opt of parseOptions(q.optionsJson); let optIdx = index"
                      (click)="selectOption(q.id, optIdx)"
                      class="flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all select-none"
                      [ngClass]="getOptionClasses(q.id, optIdx)"
                    >
                      <!-- Option letter badge (A, B, C, D) -->
                      <span
                        class="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] transition-colors flex-shrink-0"
                        [ngClass]="getOptionLetterClasses(q.id, optIdx)"
                      >
                        {{ getOptionLetter(optIdx) }}
                      </span>

                      <!-- Option Text -->
                      <span class="flex-1 font-medium leading-relaxed">
                        {{ opt }}
                      </span>

                      <!-- Evaluation check/cross indicator -->
                      <span *ngIf="quizResult()" class="flex-shrink-0">
                        <i *ngIf="getQuestionResult(q.id)?.correctAnswer === optIdx" class="fa-solid fa-circle-check text-emerald-500 text-sm"></i>
                        <i *ngIf="selectedAnswers[q.id] === optIdx && !getQuestionResult(q.id)?.isCorrect && getQuestionResult(q.id)?.correctAnswer !== optIdx" class="fa-solid fa-circle-xmark text-rose-500 text-sm"></i>
                      </span>
                    </div>
                  </div>

                  <!-- Post-Submission Explanation Card -->
                  <div
                    *ngIf="getQuestionResult(q.id) as qResult"
                    class="mt-3 p-3.5 rounded-xl border text-xs leading-relaxed transition-all"
                    [ngClass]="qResult.isCorrect ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'"
                  >
                    <div class="font-bold flex items-center gap-1.5 mb-1 text-primary dark:text-primary-400">
                      <i class="fa-solid fa-lightbulb text-amber-500"></i>
                      <span>Explanation:</span>
                    </div>
                    <p class="font-normal">{{ qResult.explanation || q.explanation || 'Review relational normalization rules to reinforce this core theory.' }}</p>
                  </div>
                </div>
              </div>

              <!-- Submit / Retake Actions -->
              <div class="pt-2 flex flex-wrap items-center gap-3">
                <button
                  *ngIf="!quizResult()"
                  (click)="submitQuiz()"
                  [disabled]="isSubmitting || getAnsweredCount() === 0"
                  class="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-soft transition-all transform active:scale-95 flex items-center gap-2"
                >
                  <i *ngIf="isSubmitting" class="fa-solid fa-circle-notch fa-spin text-xs"></i>
                  <i *ngIf="!isSubmitting" class="fa-solid fa-paper-plane text-xs"></i>
                  <span>{{ isSubmitting ? 'Evaluating...' : 'Submit Quiz Answers' }}</span>
                </button>

                <button
                  *ngIf="quizResult()"
                  (click)="resetQuiz()"
                  class="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-soft transition-all transform active:scale-95 flex items-center gap-2"
                >
                  <i class="fa-solid fa-rotate-right text-xs"></i>
                  <span>Retake Quiz</span>
                </button>

                <span *ngIf="!quizResult() && getAnsweredCount() < activeTopic.quizQuestions.length" class="text-xs text-content-muted dark:text-slate-400">
                  Tip: Select an option for each question before submitting.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LearningComponent implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);

  public units: LearningUnit[] = [];
  public activeTopic: LearningTopic | null = null;
  // Quiz state
  public selectedAnswers: Record<string, number> = {};
  public quizResult = signal<any | null>(null);
  public isSubmitting: boolean = false;

  public getSafeModuleLink(link?: string): string {
    if (!link) return '/normalization';
    if (link === '/integrity' || link === '/visualizer') return '/normalization';
    if (link === '/tutor') return '/learning';
    return link;
  }

  ngOnInit(): void {
    this.loadCurriculum();
  }

  public loadCurriculum(): void {
    this.api.getCurriculum().subscribe({
      next: (res) => {
        if (res.success && res.units) {
          this.units = res.units;
          if (this.units.length > 0 && this.units[0].topics.length > 0) {
            this.selectTopic(this.units[0].topics[0]);
          }
        }
      }
    });
  }

  public selectTopic(topic: LearningTopic): void {
    this.activeTopic = topic;
    this.resetQuiz();
  }

  public resetQuiz(): void {
    this.selectedAnswers = {};
    this.quizResult.set(null);
    this.isSubmitting = false;
  }

  public parseOptions(jsonStr: any): string[] {
    if (!jsonStr) return [];
    if (Array.isArray(jsonStr)) return jsonStr;
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      if (typeof jsonStr === 'string' && jsonStr.includes(',')) {
        return jsonStr.split(',').map(s => s.trim());
      }
      return [];
    }
  }

  public selectOption(questionId: string, optionIndex: number): void {
    // If already evaluated, don't allow modification unless retaking
    if (this.quizResult()) return;
    this.selectedAnswers[questionId] = optionIndex;
  }

  public getAnsweredCount(): number {
    return Object.keys(this.selectedAnswers).length;
  }

  public getOptionLetter(idx: number): string {
    return String.fromCharCode(65 + idx); // A, B, C, D...
  }

  public getQuestionResult(qId: string): any | null {
    const res = this.quizResult();
    if (!res || !res.results) return null;
    return res.results.find((r: any) => r.questionId === qId) || null;
  }

  public getQuestionCardClasses(qId: string): string {
    const qResult = this.getQuestionResult(qId);
    if (!qResult) {
      return 'bg-white dark:bg-slate-900 border-surface-border dark:border-slate-800 shadow-xs';
    }
    if (qResult.isCorrect) {
      return 'bg-emerald-50/20 dark:bg-emerald-950/15 border-emerald-300 dark:border-emerald-800/60 shadow-xs';
    }
    return 'bg-rose-50/20 dark:bg-rose-950/15 border-rose-300 dark:border-rose-800/60 shadow-xs';
  }

  public getOptionClasses(qId: string, optIdx: number): string {
    const qResult = this.getQuestionResult(qId);
    const isSelected = this.selectedAnswers[qId] === optIdx;

    if (!qResult) {
      if (isSelected) {
        return 'bg-primary/10 dark:bg-primary/20 border-primary text-primary-900 dark:text-white font-semibold ring-1 ring-primary/30';
      }
      return 'bg-surface-subtle dark:bg-slate-800/60 border-surface-border dark:border-slate-700/60 text-slate-800 dark:text-slate-200 hover:bg-surface-hover dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600';
    }

    // Post-submission evaluation view
    const isCorrectAnswer = qResult.correctAnswer === optIdx;
    if (isCorrectAnswer) {
      return 'bg-emerald-500/15 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/40';
    }
    if (isSelected && !qResult.isCorrect) {
      return 'bg-rose-500/15 dark:bg-rose-950/50 border-rose-500 text-rose-900 dark:text-rose-200 font-bold line-through ring-1 ring-rose-500/40';
    }
    return 'bg-surface-subtle/50 dark:bg-slate-900/40 border-surface-border dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-60';
  }

  public getOptionLetterClasses(qId: string, optIdx: number): string {
    const qResult = this.getQuestionResult(qId);
    const isSelected = this.selectedAnswers[qId] === optIdx;

    if (!qResult) {
      if (isSelected) {
        return 'bg-primary text-white';
      }
      return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }

    const isCorrectAnswer = qResult.correctAnswer === optIdx;
    if (isCorrectAnswer) {
      return 'bg-emerald-600 text-white';
    }
    if (isSelected && !qResult.isCorrect) {
      return 'bg-rose-600 text-white';
    }
    return 'bg-slate-200/50 dark:bg-slate-800 text-slate-400 dark:text-slate-600';
  }

  public submitQuiz(): void {
    if (!this.activeTopic) return;
    this.isSubmitting = true;
    this.api.submitQuiz(this.activeTopic.id, this.selectedAnswers).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (res.success) {
          this.quizResult.set(res);
        }
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }
}
