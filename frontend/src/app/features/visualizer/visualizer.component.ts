import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProjectStateService } from '../../core/services/project-state.service';
import cytoscape from 'cytoscape';

@Component({
  selector: 'app-visualizer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="h-full flex flex-col space-y-4 fade-in">
      <!-- Top Visualization Control Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-surface-border shadow-soft flex-shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-xl bg-blue-100 text-primary-600 flex items-center justify-center font-bold">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <h1 class="text-base font-bold text-content-main">Database Visualization Center</h1>
            <p class="text-xs text-content-muted">
              Displaying: <strong class="text-primary-700">{{ state.activeProject()?.title || 'Active Schema' }}</strong>
              <span class="text-gray-400 mx-1.5">•</span>
              <span>{{ state.activeAnalysis()?.tables?.length || 0 }} tables</span>
            </p>
          </div>
        </div>

        <!-- View Tabs -->
        <div class="flex items-center bg-surface-subtle p-1 rounded-xl border border-surface-border text-xs">
          <button
            (click)="switchTab('er')"
            class="px-3 py-1.5 rounded-lg font-medium transition-all"
            [ngClass]="activeView === 'er' ? 'bg-white shadow-soft text-primary font-semibold' : 'text-content-muted hover:text-content-main'"
          >
            ER Diagram (Cytoscape)
          </button>
          <button
            (click)="switchTab('relational')"
            class="px-3 py-1.5 rounded-lg font-medium transition-all"
            [ngClass]="activeView === 'relational' ? 'bg-white shadow-soft text-primary font-semibold' : 'text-content-muted hover:text-content-main'"
          >
            Relational Schema Map
          </button>
          <button
            (click)="switchTab('flow')"
            class="px-3 py-1.5 rounded-lg font-medium transition-all"
            [ngClass]="activeView === 'flow' ? 'bg-white shadow-soft text-primary font-semibold' : 'text-content-muted hover:text-content-main'"
          >
            Normalization Flow
          </button>
          <button
            (click)="switchTab('diff')"
            class="px-3 py-1.5 rounded-lg font-medium transition-all"
            [ngClass]="activeView === 'diff' ? 'bg-white shadow-soft text-primary font-semibold' : 'text-content-muted hover:text-content-main'"
          >
            Before & After Comparison
          </button>
        </div>

        <!-- Canvas Controls -->
        <div class="flex items-center space-x-2">
          <button
            (click)="zoomIn()"
            class="p-2 border border-surface-border hover:bg-surface-hover rounded-lg text-content-main"
            title="Zoom In"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          </button>

          <button
            (click)="zoomOut()"
            class="p-2 border border-surface-border hover:bg-surface-hover rounded-lg text-content-main"
            title="Zoom Out"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
          </button>

          <button
            (click)="fitToScreen()"
            class="p-2 border border-surface-border hover:bg-surface-hover rounded-lg text-content-main"
            title="Fit to Screen"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
          </button>

          <button
            (click)="exportDiagramPng()"
            class="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover text-content-main font-semibold text-xs border border-surface-border flex items-center gap-1.5"
          >
            <svg class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Export PNG</span>
          </button>
        </div>
      </div>

      <!-- Diagram Architecture & Metrics Summary Banner -->
      <div class="bg-white rounded-2xl border border-surface-border shadow-soft p-4 space-y-3 flex-shrink-0">
        <!-- Top row: Metric badges -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2.5">
            <!-- Entities / Tables Badge -->
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs">
              <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span class="text-content-muted">Base Entities:</span>
              <strong class="text-blue-950 font-bold">{{ getEntitiesCount() }} Tables</strong>
            </div>

            <!-- Relationships Badge -->
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs">
              <span class="text-blue-600 font-bold">🔗</span>
              <span class="text-content-muted">Relationships:</span>
              <strong class="text-blue-950 font-bold">{{ getRelationshipsCount() }} Connections</strong>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">
                {{ getCardinalityLabel() }}
              </span>
            </div>

            <!-- Constraints Badge -->
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <span class="text-emerald-600 font-bold">🛡️</span>
              <span class="text-content-muted">Integrity Constraints:</span>
              <strong class="text-emerald-950 font-bold">{{ getTotalConstraintsCount() }} Constraints</strong>
              <span class="text-[10px] text-emerald-800">
                ({{ getPrimaryKeysCount() }} PK, {{ getForeignKeysCount() }} FK)
              </span>
            </div>
          </div>

          <!-- Quick insight toggle button -->
          <button
            (click)="showArchitectureDetails = !showArchitectureDetails"
            class="text-xs text-primary font-semibold hover:underline flex items-center gap-1.5"
          >
            <span>{{ showArchitectureDetails ? 'Hide' : 'View' }} Architectural Intelligence</span>
            <span class="text-[10px] transform transition-transform" [class.rotate-180]="showArchitectureDetails">▼</span>
          </button>
        </div>

        <!-- Architectural Mapping Explanation (Clean ER to Relational explanation) -->
        <div *ngIf="showArchitectureDetails" class="p-3.5 bg-gradient-to-r from-blue-50/70 to-blue-50/70 rounded-xl border border-blue-100 text-xs text-content-main space-y-2">
          <div class="flex items-center gap-2 font-bold text-blue-950">
            <svg class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>RDBMS Architectural Intelligence & ER Normalization</span>
          </div>
          <p class="text-content-muted leading-relaxed">
            {{ getDesignExplanation() }}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
            <div class="p-2.5 bg-white rounded-lg border border-surface-border">
              <strong class="text-content-main block font-semibold mb-0.5">1:N Relationships (e.g. Teaches)</strong>
              <span class="text-content-muted">Mapped directly as foreign keys in child entities. Prevents bloated, redundant junction tables!</span>
            </div>
            <div class="p-2.5 bg-white rounded-lg border border-surface-border">
              <strong class="text-content-main block font-semibold mb-0.5">M:N Relationships (e.g. Takes / TAs)</strong>
              <span class="text-content-muted">Associative connections between Students and Courses with candidate key enforcement.</span>
            </div>
            <div class="p-2.5 bg-white rounded-lg border border-surface-border">
              <strong class="text-content-main block font-semibold mb-0.5">Primary & Foreign Key Constraints</strong>
              <span class="text-content-muted">Underlined diagram attributes strictly identified and enforced with referential integrity.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Workspace (Visual Canvas + Info Drawer) -->
      <div class="flex-1 min-h-[500px] flex gap-4 relative overflow-hidden">
        <!-- Canvas Container -->
        <div class="flex-1 bg-white rounded-2xl border border-surface-border shadow-soft relative overflow-hidden">
          <!-- 1. Cytoscape ER Canvas (Always mounted, toggled via hidden class so DOM isn't torn down) -->
          <div [class.hidden]="activeView !== 'er'" class="w-full h-full relative">
            <div #cyContainer class="w-full h-full bg-[#FAFAFA]"></div>

            <!-- Floating Legend -->
            <div class="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-surface-border shadow-soft text-[11px] space-y-1.5 z-10 pointer-events-none">
              <div class="font-bold text-content-main text-xs uppercase tracking-wider mb-1">ER Diagram Notation</div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded bg-[#1D4ED8]"></span>
                <span class="text-content-muted">Primary Table Node</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-0.5 bg-[#2563EB]"></span>
                <span class="text-content-muted">Foreign Key Relationship (1:N)</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-0.5 border-t-2 border-dashed border-[#2563EB]"></span>
                <span class="text-content-muted">Junction / Many-to-Many (M:N)</span>
              </div>
            </div>
          </div>

          <!-- 2. Relational Schema Linked Map -->
          <div *ngIf="activeView === 'relational'" class="w-full h-full overflow-y-auto p-6 space-y-6">
            <h2 class="text-base font-bold text-content-main">Relational Table Schemas</h2>
            <div *ngIf="state.activeAnalysis() as a" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div *ngFor="let t of a.tables" class="border border-surface-border rounded-xl p-4 bg-surface-subtle">
                <div class="font-bold text-sm text-content-main flex items-center justify-between pb-2 border-b border-surface-border">
                  <span>{{ t.name }}</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-primary-50 text-primary font-semibold">PK: {{ t.primaryKey.join(', ') || 'None' }}</span>
                </div>
                <div class="mt-3 space-y-1 text-xs">
                  <div *ngFor="let c of t.columns" class="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                    <span class="font-mono flex items-center gap-1.5" [class.text-primary-700]="c.isPrimaryKey" [class.font-bold]="c.isPrimaryKey">
                      <span>{{ c.isPrimaryKey ? '🔑' : c.isForeignKey ? '🔗' : '•' }}</span>
                      <span>{{ c.name }}</span>
                    </span>
                    <span class="text-content-muted text-[11px]">{{ c.dataType }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Normalization Pipeline Flow -->
          <div *ngIf="activeView === 'flow'" class="w-full h-full overflow-y-auto p-6 space-y-6">
            <h2 class="text-base font-bold text-content-main">Formal Normalization Pipeline</h2>
            <div *ngIf="state.activeAnalysis() as a" class="space-y-6">
              <div *ngFor="let n of a.normalization" class="p-5 border border-surface-border rounded-xl bg-surface-subtle space-y-4">
                <div class="flex items-center justify-between">
                  <div class="font-bold text-sm text-content-main">Table: {{ n.tableName }}</div>
                  <span class="px-2.5 py-1 rounded-md text-xs font-bold" [ngClass]="{
                    'bg-emerald-100 text-emerald-800': n.overallRank === '3NF' || n.overallRank === 'BCNF',
                    'bg-amber-100 text-amber-800': n.overallRank === '2NF',
                    'bg-red-100 text-red-800': n.overallRank === '1NF' || n.overallRank === 'NOT_1NF'
                  }">Current Level: {{ n.overallRank }}</span>
                </div>

                <!-- 4 Step Flow Bar -->
                <div class="grid grid-cols-4 gap-2 text-center text-xs">
                  <div class="p-3 rounded-lg border font-semibold" [ngClass]="n.oneNF.status === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'">
                    <div>1NF: {{ n.oneNF.status }}</div>
                    <div class="text-[10px] font-normal text-content-muted mt-1">Atomic Values</div>
                  </div>
                  <div class="p-3 rounded-lg border font-semibold" [ngClass]="n.twoNF.status === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'">
                    <div>2NF: {{ n.twoNF.status }}</div>
                    <div class="text-[10px] font-normal text-content-muted mt-1">No Partial Key Deps</div>
                  </div>
                  <div class="p-3 rounded-lg border font-semibold" [ngClass]="n.threeNF.status === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'">
                    <div>3NF: {{ n.threeNF.status }}</div>
                    <div class="text-[10px] font-normal text-content-muted mt-1">No Transitive Deps</div>
                  </div>
                  <div class="p-3 rounded-lg border font-semibold" [ngClass]="n.bcnf.status === 'PASS' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-amber-50 border-amber-300 text-amber-800'">
                    <div>BCNF: {{ n.bcnf.status }}</div>
                    <div class="text-[10px] font-normal text-content-muted mt-1">Superkey Determinants</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Before & After Schema Comparison Diff -->
          <div *ngIf="activeView === 'diff'" class="w-full h-full overflow-y-auto p-6 space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-base font-bold text-content-main">Before vs Corrected Schema Comparison</h2>
                <p class="text-xs text-content-muted">Side-by-side structural diff showing resolved anomalies and decomposed lookup tables.</p>
              </div>
            </div>

            <div *ngIf="state.activeAnalysis() as a" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Left: Original -->
              <div class="border border-red-200 bg-red-50/20 rounded-xl p-4 space-y-3">
                <div class="text-xs font-bold text-red-700 flex items-center justify-between pb-2 border-b border-red-200">
                  <span>❌ Original Unnormalized Structure</span>
                  <span>Rank: {{ a.overallSchemaRank }}</span>
                </div>
                <div *ngFor="let t of a.tables" class="text-xs bg-white p-3 rounded-lg border border-red-100 space-y-1">
                  <div class="font-bold text-content-main">{{ t.name }}</div>
                  <div class="text-[11px] text-content-muted font-mono">
                    {{ t.columns.map(colToString).join(', ') }}
                  </div>
                </div>
              </div>

              <!-- Right: Proposed Normalized -->
              <div class="border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 space-y-3">
                <div class="text-xs font-bold text-emerald-700 flex items-center justify-between pb-2 border-b border-emerald-200">
                  <span>✅ Corrected & Normalized Structure</span>
                  <span>Rank: BCNF (Target)</span>
                </div>
                <div class="text-xs bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
                  <div class="font-semibold text-content-main">Auto-Generated Corrected SQL:</div>
                  <pre class="bg-gray-900 text-emerald-300 p-3 rounded text-[11px] overflow-x-auto max-h-60 font-mono"><code>{{ a.recommendations.correctedFullSql }}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side Drawer: Selected Table Details -->
        <div class="w-80 bg-white rounded-2xl border border-surface-border shadow-soft p-5 flex flex-col justify-between hidden lg:flex flex-shrink-0">
          <div class="space-y-4 overflow-y-auto">
            <div class="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <div class="text-[10px] uppercase font-bold text-content-muted">Selected Entity</div>
                <div class="font-bold text-base text-content-main">{{ selectedTable()?.name || 'Select a table' }}</div>
              </div>
              <span class="text-xs px-2 py-0.5 rounded font-bold bg-primary-100 text-primary-700">
                {{ selectedTable()?.columns?.length || 0 }} cols
              </span>
            </div>

            <!-- Table Columns List -->
            <div *ngIf="selectedTable() as st" class="space-y-3">
              <div class="text-xs font-semibold text-content-muted uppercase">Attributes & Keys</div>
              <div class="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                <div
                  *ngFor="let col of st.columns"
                  class="p-2 rounded-lg bg-surface-subtle border border-surface-border text-xs flex items-center justify-between"
                >
                  <div>
                    <span class="font-semibold text-content-main">{{ col.name }}</span>
                    <span *ngIf="col.isPrimaryKey" class="ml-1 text-[9px] font-bold text-primary bg-primary-50 px-1 py-0.5 rounded">PK</span>
                    <span *ngIf="col.isForeignKey" class="ml-1 text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded">FK</span>
                  </div>
                  <span class="text-[11px] text-content-muted">{{ col.dataType }}</span>
                </div>
              </div>

              <!-- Foreign Keys Section -->
              <div *ngIf="st.foreignKeys && st.foreignKeys.length > 0" class="pt-2 border-t border-surface-border space-y-1.5">
                <div class="text-xs font-semibold text-content-muted uppercase">Outbound References</div>
                <div *ngFor="let fk of st.foreignKeys" class="text-xs p-2 rounded bg-blue-50/60 border border-blue-100 text-blue-900">
                  {{ fk.column }} ──> {{ fk.targetTable }}({{ fk.targetColumn }})
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action in Drawer -->
          <div class="pt-4 border-t border-surface-border space-y-2">
            <button
              routerLink="/normalization"
              class="w-full py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors"
            >
              Analyze Normalization →
            </button>
            <button
              routerLink="/tutor"
              class="w-full py-2 rounded-xl bg-surface-subtle border border-surface-border text-content-main text-xs font-medium hover:bg-surface-hover transition-colors"
            >
              Ask AI Tutor About This Table
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class VisualizerComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cyContainer') cyContainerRef!: ElementRef;

  public state = inject(ProjectStateService);
  public activeView: 'er' | 'relational' | 'flow' | 'diff' = 'er';
  public cyInstance: cytoscape.Core | null = null;
  public selectedTable = signal<any | null>(null);

  constructor() {
    // Reactively re-initialize Cytoscape whenever a new analysis is loaded
    effect(() => {
      const analysis = this.state.activeAnalysis();
      if (analysis) {
        if (analysis.tables.length > 0) {
          this.selectedTable.set(analysis.tables[0]);
        }
        setTimeout(() => {
          this.initCytoscape();
        }, 50);
      }
    });
  }

  ngOnInit(): void {
    const analysis = this.state.activeAnalysis();
    if (analysis && analysis.tables.length > 0) {
      this.selectedTable.set(analysis.tables[0]);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCytoscape();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.cyInstance) {
      this.cyInstance.destroy();
      this.cyInstance = null;
    }
  }

  public switchTab(view: 'er' | 'relational' | 'flow' | 'diff') {
    this.activeView = view;
    if (view === 'er') {
      setTimeout(() => {
        this.cyInstance?.resize();
        this.cyInstance?.fit(undefined, 40);
      }, 50);
    }
  }

  private initCytoscape() {
    if (!this.cyContainerRef?.nativeElement) return;

    const analysis = this.state.activeAnalysis();
    if (!analysis) return;

    if (this.cyInstance) {
      try {
        this.cyInstance.destroy();
      } catch (err) {}
      this.cyInstance = null;
    }

    const elements: cytoscape.ElementDefinition[] = [];

    // Add nodes for each table in current analysis
    analysis.tables.forEach((table) => {
      elements.push({
        data: {
          id: table.name,
          label: `${table.name}\n(${table.columns.length} cols)`,
          tableObj: table
        }
      });
    });

    // Add edges for each relationship in current analysis
    analysis.relationships.relationships.forEach((rel) => {
      elements.push({
        data: {
          id: rel.id,
          source: rel.sourceTable,
          target: rel.targetTable,
          label: rel.cardinality,
          cardinality: rel.cardinality
        }
      });
    });

    try {
      this.cyInstance = cytoscape({
        container: this.cyContainerRef.nativeElement,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#FFFFFF',
              'border-color': '#2563EB',
              'border-width': 3,
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'font-family': 'Inter, sans-serif',
              'font-size': '13px',
              'font-weight': 'bold',
              'color': '#1E293B',
              'width': 150,
              'height': 75,
              'shape': 'round-rectangle'
            } as any
          },
          {
            selector: 'node:selected',
            style: {
              'border-color': '#1D4ED8',
              'border-width': 4,
              'background-color': '#EFF6FF'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2.5,
              'line-color': '#2563EB',
              'target-arrow-color': '#2563EB',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '11px',
              'font-weight': 'bold',
              'color': '#1D4ED8',
              'text-background-color': '#FFFFFF',
              'text-background-opacity': 0.9,
              'text-background-padding': '3px',
              'text-background-shape': 'roundrectangle'
            }
          }
        ],
        layout: {
          name: 'cose',
          animate: true,
          padding: 50,
          nodeRepulsion: () => 450000,
          idealEdgeLength: () => 140
        }
      });

      this.cyInstance.on('tap', 'node', (evt) => {
        const node = evt.target;
        const tableObj = node.data('tableObj');
        this.selectedTable.set(tableObj);
        this.state.selectedTableName.set(tableObj.name);
      });

      setTimeout(() => {
        this.cyInstance?.fit(undefined, 40);
      }, 150);
    } catch (e) {
      console.error('Cytoscape init error:', e);
    }
  }

  public zoomIn() {
    this.cyInstance?.zoom(this.cyInstance.zoom() * 1.25);
  }

  public zoomOut() {
    this.cyInstance?.zoom(this.cyInstance.zoom() * 0.8);
  }

  public fitToScreen() {
    this.cyInstance?.fit(undefined, 40);
  }

  public exportDiagramPng() {
    if (!this.cyInstance) return;
    const png64 = this.cyInstance.png({ full: true, scale: 2 });
    const a = document.createElement('a');
    a.href = png64;
    a.download = `ER_Diagram_${Date.now()}.png`;
    a.click();
  }

  public showArchitectureDetails: boolean = false;

  public getEntitiesCount(): number {
    return this.state.activeAnalysis()?.tables?.length || 0;
  }

  public getRelationshipsCount(): number {
    return this.state.activeAnalysis()?.relationships?.relationships?.length || 0;
  }

  public getPrimaryKeysCount(): number {
    const analysis = this.state.activeAnalysis();
    if (!analysis) return 0;
    return analysis.tables.reduce((acc, t) => acc + (t.primaryKey ? t.primaryKey.length : 0), 0);
  }

  public getForeignKeysCount(): number {
    const analysis = this.state.activeAnalysis();
    if (!analysis) return 0;
    return analysis.tables.reduce((acc, t) => acc + (t.foreignKeys ? t.foreignKeys.length : 0), 0);
  }

  public getTotalConstraintsCount(): number {
    const analysis = this.state.activeAnalysis();
    if (!analysis) return 0;
    let total = this.getPrimaryKeysCount() + this.getForeignKeysCount();
    for (const t of analysis.tables) {
      for (const c of t.columns) {
        if (!c.isNullable) total++;
        if (c.isUnique) total++;
      }
    }
    return total;
  }

  public getCardinalityLabel(): string {
    const analysis = this.state.activeAnalysis();
    const rels = analysis?.relationships?.relationships || [];
    const oneToMany = rels.filter(r => r.cardinality === '1:N').length;
    const manyToMany = rels.filter(r => r.cardinality === 'M:N').length;
    const oneToOne = rels.filter(r => r.cardinality === '1:1').length;
    const parts = [];
    if (oneToMany > 0) parts.push(`${oneToMany}× (1:N)`);
    if (manyToMany > 0) parts.push(`${manyToMany}× (M:N)`);
    if (oneToOne > 0) parts.push(`${oneToOne}× (1:1)`);
    return parts.length > 0 ? parts.join(', ') : 'All Validated';
  }

  public getDesignExplanation(): string {
    const metrics = this.state.activeAnalysis()?.metrics;
    if (metrics?.designExplanation) {
      return metrics.designExplanation;
    }
    const count = this.getEntitiesCount();
    return `${count} base entities detected. In accordance with proper ER-to-Relational mapping rules, 1:N relationships (such as 'Teaches') are modeled as foreign keys inside child entities rather than creating redundant junction tables.`;
  }

  public colToString(col: any): string {
    return `${col.name} ${col.dataType}${col.isPrimaryKey ? ' [PK]' : ''}`;
  }
}
