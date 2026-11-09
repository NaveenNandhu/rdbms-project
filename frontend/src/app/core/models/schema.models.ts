export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMIN';
}

export interface ParsedColumn {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
  checkExpr?: string;
  confidence?: number;
  isUncertain?: boolean;
}

export interface ParsedTable {
  name: string;
  columns: ParsedColumn[];
  primaryKey: string[];
  candidateKeys: string[][];
  foreignKeys: Array<{
    column: string;
    targetTable: string;
    targetColumn: string;
    onDelete?: string;
    onUpdate?: string;
  }>;
}

export interface NormalFormIssue {
  title: string;
  affectedColumns: string[];
  explanation: string;
  whyItMatters: string;
  suggestedDecomposition: {
    newTables: Array<{
      name: string;
      columns: string[];
      primaryKey: string[];
      foreignKeys?: Array<{ column: string; targetTable: string; targetColumn: string }>;
    }>;
    correctedSql: string;
  };
}

export interface NormalFormResult {
  form: '1NF' | '2NF' | '3NF' | 'BCNF';
  status: 'PASS' | 'FAIL' | 'NEEDS_CONFIRMATION';
  score: number;
  reason: string;
  issues: NormalFormIssue[];
  technicalProof?: string;
}

export interface TableNormalizationAnalysis {
  tableName: string;
  candidateKeys: string[][];
  functionalDependencies: Array<{
    lhs: string[];
    rhs: string[];
    isKey: boolean;
    source: 'inferred' | 'user';
  }>;
  overallRank: 'NOT_1NF' | '1NF' | '2NF' | '3NF' | 'BCNF';
  oneNF: NormalFormResult;
  twoNF: NormalFormResult;
  threeNF: NormalFormResult;
  bcnf: NormalFormResult;
}

export interface IntegrityIssue {
  category: 'ENTITY' | 'REFERENTIAL' | 'DOMAIN' | 'USER_DEFINED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  tableName: string;
  columnName?: string;
  title: string;
  description: string;
  whyItMatters: string;
  recommendation: string;
  checkLevel: 'SCHEMA_LEVEL' | 'DATA_LEVEL';
}

export interface IntegrityReport {
  score: number;
  entityIntegrityScore: number;
  referentialIntegrityScore: number;
  domainIntegrityScore: number;
  userDefinedScore: number;
  issues: IntegrityIssue[];
  notice: string;
}

export interface DatabaseAnomaly {
  type: 'INSERTION' | 'UPDATE' | 'DELETION' | 'REDUNDANCY' | 'DECOMPOSITION';
  tableName: string;
  affectedColumns: string[];
  problemDescription: string;
  whyItHappens: string;
  exampleScenario: {
    description: string;
    sampleTableBefore: Array<Record<string, any>>;
    anomalousAction: string;
    consequence: string;
  };
  suggestedCorrection: string;
}

export interface AnalyzedRelationship {
  id: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  cardinality: '1:1' | '1:N' | 'M:N';
  relationshipType: 'IDENTIFYING' | 'NON_IDENTIFYING' | 'JUNCTION' | 'SELF_REFERENCING';
  sourceParticipation: 'MANDATORY' | 'OPTIONAL';
  targetParticipation: 'MANDATORY' | 'OPTIONAL';
  isConfirmed: boolean;
  confidence: number;
  explanation: string;
  reasoning: string[];
}

export interface RelationshipAnalysisReport {
  relationships: AnalyzedRelationship[];
  unrelatedTables: string[];
  missingForeignKeySuggestions: Array<{
    tableA: string;
    columnA: string;
    tableB: string;
    columnB: string;
    reason: string;
  }>;
}

export interface RecommendationItem {
  id: string;
  category: 'NORMALIZATION' | 'INTEGRITY' | 'ANOMALY' | 'RELATIONSHIP';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  tableName: string;
  affectedColumns: string[];
  explanation: string;
  whyItMatters: string;
  suggestedSolution: string;
  beforeSchema: {
    table: string;
    columns: Array<{ name: string; type: string; key?: string }>;
  };
  afterSchema: {
    tables: Array<{
      name: string;
      columns: Array<{ name: string; type: string; key?: string }>;
    }>;
  };
  correctedSqlSnippet: string;
  ruleJustification: string;
}

export interface RecommendationEngineResult {
  overallDesignScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  recommendations: RecommendationItem[];
  correctedFullSql: string;
  changeSummary: string[];
}

export interface DiagramMetrics {
  totalEntities: number;
  totalRelationships: number;
  totalAttributes: number;
  totalConstraints: number;
  primaryKeyCount: number;
  foreignKeyCount: number;
  notNullCount: number;
  uniqueCount: number;
  checkConstraintCount: number;
  cardinalityBreakdown: {
    oneToOne: number;
    oneToMany: number;
    manyToMany: number;
  };
  designExplanation: string;
}

export interface AnalysisPayload {
  sessionId?: string;
  overallSchemaRank: string;
  tables: ParsedTable[];
  normalization: TableNormalizationAnalysis[];
  integrity: IntegrityReport;
  anomalies: DatabaseAnomaly[];
  relationships: RelationshipAnalysisReport;
  recommendations: RecommendationEngineResult;
  metrics?: DiagramMetrics;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  dialect: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  tableCount?: number;
  latestScore?: number | null;
  latestRank?: string | null;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  optionsJson: string;
  correctAnswer: number;
  explanation: string;
  difficulty: string;
}

export interface LearningTopic {
  id: string;
  title: string;
  orderIndex: number;
  summary: string;
  contentMarkdown: string;
  beginnerExplanation?: string;
  advancedExplanation?: string;
  moduleLink?: string;
  quizQuestions?: QuizQuestion[];
}

export interface LearningUnit {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  topics: LearningTopic[];
}
