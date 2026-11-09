/**
 * Auto-Correction and Recommendation Engine for DB Insight AI
 * Aggregates findings from Normalization, Integrity, Anomaly, and Relationship analyzers.
 * Produces severity-ranked recommendations, before-and-after relational schemas,
 * and traceable, production-grade Corrected SQL scripts.
 */

import { ParsedTable } from './sql-parser';
import { TableNormalizationAnalysis } from './normalization-engine';
import { IntegrityReport } from './integrity-checker';
import { DatabaseAnomaly } from './anomaly-detector';
import { RelationshipAnalysisReport } from './relationship-analyzer';

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

export class RecommendationEngine {
  public static generate(
    originalTables: ParsedTable[],
    normalization: TableNormalizationAnalysis[],
    integrity: IntegrityReport,
    anomalies: DatabaseAnomaly[],
    relationships: RelationshipAnalysisReport
  ): RecommendationEngineResult {
    const recommendations: RecommendationItem[] = [];
    const changeSummary: string[] = [];

    // 1. Process Normalization Issues
    for (const norm of normalization) {
      const origTable = originalTables.find(t => t.name.toLowerCase() === norm.tableName.toLowerCase());
      if (!origTable) continue;

      // 1NF issues
      for (const issue of norm.oneNF.issues) {
        recommendations.push({
          id: `norm_1nf_${norm.tableName}_${Date.now()}_${Math.random()}`,
          category: 'NORMALIZATION',
          severity: 'HIGH',
          title: issue.title,
          tableName: norm.tableName,
          affectedColumns: issue.affectedColumns,
          explanation: issue.explanation,
          whyItMatters: issue.whyItMatters,
          suggestedSolution: 'Decompose repeating or multi-valued attributes into a dedicated related child table with foreign key.',
          beforeSchema: {
            table: norm.tableName,
            columns: origTable.columns.map(c => ({
              name: c.name,
              type: c.dataType,
              key: c.isPrimaryKey ? 'PK' : c.isForeignKey ? 'FK' : undefined
            }))
          },
          afterSchema: {
            tables: issue.suggestedDecomposition.newTables.map(t => ({
              name: t.name,
              columns: t.columns.map(c => ({
                name: c,
                type: 'VARCHAR(255)',
                key: t.primaryKey.includes(c) ? 'PK' : undefined
              }))
            }))
          },
          correctedSqlSnippet: issue.suggestedDecomposition.correctedSql,
          ruleJustification: 'First Normal Form (1NF) - Atomic attribute domains and avoidance of repeating groups.'
        });
        changeSummary.push(`Normalized ${norm.tableName} to 1NF: extracted repeating attributes into child relations.`);
      }

      // 2NF issues
      for (const issue of norm.twoNF.issues) {
        recommendations.push({
          id: `norm_2nf_${norm.tableName}_${Date.now()}_${Math.random()}`,
          category: 'NORMALIZATION',
          severity: 'HIGH',
          title: issue.title,
          tableName: norm.tableName,
          affectedColumns: issue.affectedColumns,
          explanation: issue.explanation,
          whyItMatters: issue.whyItMatters,
          suggestedSolution: 'Extract non-prime attributes with partial dependencies into a new entity whose primary key is the partial determinant.',
          beforeSchema: {
            table: norm.tableName,
            columns: origTable.columns.map(c => ({
              name: c.name,
              type: c.dataType,
              key: c.isPrimaryKey ? 'PK' : c.isForeignKey ? 'FK' : undefined
            }))
          },
          afterSchema: {
            tables: issue.suggestedDecomposition.newTables.map(t => ({
              name: t.name,
              columns: t.columns.map(c => ({
                name: c,
                type: 'VARCHAR(255)',
                key: t.primaryKey.includes(c) ? 'PK' : undefined
              }))
            }))
          },
          correctedSqlSnippet: issue.suggestedDecomposition.correctedSql,
          ruleJustification: 'Second Normal Form (2NF) - Elimination of partial functional dependencies on composite keys.'
        });
        changeSummary.push(`Normalized ${norm.tableName} to 2NF: eliminated partial key dependencies.`);
      }

      // 3NF issues
      for (const issue of norm.threeNF.issues) {
        recommendations.push({
          id: `norm_3nf_${norm.tableName}_${Date.now()}_${Math.random()}`,
          category: 'NORMALIZATION',
          severity: 'HIGH',
          title: issue.title,
          tableName: norm.tableName,
          affectedColumns: issue.affectedColumns,
          explanation: issue.explanation,
          whyItMatters: issue.whyItMatters,
          suggestedSolution: 'Move transitive attributes into a lookup table; preserve determinant in source table as foreign key.',
          beforeSchema: {
            table: norm.tableName,
            columns: origTable.columns.map(c => ({
              name: c.name,
              type: c.dataType,
              key: c.isPrimaryKey ? 'PK' : c.isForeignKey ? 'FK' : undefined
            }))
          },
          afterSchema: {
            tables: issue.suggestedDecomposition.newTables.map(t => ({
              name: t.name,
              columns: t.columns.map(c => ({
                name: c,
                type: 'VARCHAR(255)',
                key: t.primaryKey.includes(c) ? 'PK' : undefined
              }))
            }))
          },
          correctedSqlSnippet: issue.suggestedDecomposition.correctedSql,
          ruleJustification: 'Third Normal Form (3NF) - Elimination of transitive dependencies between non-prime attributes.'
        });
        changeSummary.push(`Normalized ${norm.tableName} to 3NF: extracted transitive lookup table.`);
      }
    }

    // 2. Process Integrity Issues
    for (const issue of integrity.issues) {
      const origTable = originalTables.find(t => t.name.toLowerCase() === issue.tableName.toLowerCase());
      recommendations.push({
        id: `integ_${issue.category}_${issue.tableName}_${Date.now()}_${Math.random()}`,
        category: 'INTEGRITY',
        severity: issue.severity,
        title: issue.title,
        tableName: issue.tableName,
        affectedColumns: issue.columnName ? [issue.columnName] : [],
        explanation: issue.description,
        whyItMatters: issue.whyItMatters,
        suggestedSolution: issue.recommendation,
        beforeSchema: {
          table: issue.tableName,
          columns: origTable ? origTable.columns.map(c => ({ name: c.name, type: c.dataType })) : []
        },
        afterSchema: {
          tables: [
            {
              name: issue.tableName,
              columns: origTable ? origTable.columns.map(c => ({ name: c.name, type: c.dataType })) : []
            }
          ]
        },
        correctedSqlSnippet: `-- Suggested fix for ${issue.tableName}:\n-- ${issue.recommendation}`,
        ruleJustification: `Relational ${issue.category} Integrity - Structural schema consistency rule.`
      });
      changeSummary.push(`Enforced ${issue.category} integrity in ${issue.tableName}: ${issue.title}`);
    }

    // 3. Process Missing FK Suggestions
    for (const mfk of relationships.missingForeignKeySuggestions) {
      recommendations.push({
        id: `rel_missing_fk_${mfk.tableA}_${mfk.columnA}`,
        category: 'RELATIONSHIP',
        severity: 'MEDIUM',
        title: `Add Missing Foreign Key: ${mfk.tableA}.${mfk.columnA} → ${mfk.tableB}.${mfk.columnB}`,
        tableName: mfk.tableA,
        affectedColumns: [mfk.columnA],
        explanation: mfk.reason,
        whyItMatters: 'Without a foreign key constraint, the DBMS cannot enforce referential consistency, allowing orphan records.',
        suggestedSolution: `Add an explicit FOREIGN KEY constraint from ${mfk.tableA}(${mfk.columnA}) referencing ${mfk.tableB}(${mfk.columnB}).`,
        beforeSchema: { table: mfk.tableA, columns: [] },
        afterSchema: { tables: [] },
        correctedSqlSnippet: `ALTER TABLE ${mfk.tableA}\n  ADD CONSTRAINT fk_${mfk.tableA}_${mfk.columnA}\n  FOREIGN KEY (${mfk.columnA}) REFERENCES ${mfk.tableB}(${mfk.columnB})\n  ON DELETE RESTRICT ON UPDATE CASCADE;`,
        ruleJustification: 'Referential Integrity - Explicit foreign key constraints guarantee valid references.'
      });
      changeSummary.push(`Declared foreign key: ${mfk.tableA}.${mfk.columnA} -> ${mfk.tableB}.${mfk.columnB}`);
    }

    // Deduce Overall Score & Letter Grade
    const criticalCount = recommendations.filter(r => r.severity === 'CRITICAL').length;
    const highCount = recommendations.filter(r => r.severity === 'HIGH').length;
    const mediumCount = recommendations.filter(r => r.severity === 'MEDIUM').length;

    let score = 100 - (criticalCount * 25 + highCount * 12 + mediumCount * 5);
    score = Math.max(10, Math.min(100, score));

    let grade: RecommendationEngineResult['grade'] = 'A';
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 45) grade = 'D';
    else grade = 'F';

    // Generate Complete Corrected SQL
    const correctedFullSql = this.buildCorrectedSql(originalTables, recommendations);

    return {
      overallDesignScore: score,
      grade,
      recommendations,
      correctedFullSql,
      changeSummary: Array.from(new Set(changeSummary))
    };
  }

  private static buildCorrectedSql(
    tables: ParsedTable[],
    recommendations: RecommendationItem[]
  ): string {
    const lines: string[] = [
      '-- =========================================================',
      '-- DB Insight AI - Corrected & Normalized Database Schema',
      '-- Generated automatically with full referential integrity',
      '-- =========================================================\n'
    ];

    for (const table of tables) {
      lines.push(`-- Table: ${table.name}`);
      lines.push(`CREATE TABLE ${table.name} (`);

      const colDefs: string[] = [];
      const pk = table.primaryKey.length > 0 ? table.primaryKey : ['id'];

      // If missing PK, add id
      if (table.primaryKey.length === 0) {
        colDefs.push('  id SERIAL PRIMARY KEY');
      }

      for (const col of table.columns) {
        let def = `  ${col.name} ${col.dataType || 'VARCHAR(255)'}`;
        if (!col.isNullable || pk.includes(col.name)) def += ' NOT NULL';
        if (col.isUnique && pk.length === 1 && pk[0] !== col.name) def += ' UNIQUE';
        if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
        colDefs.push(def);
      }

      if (table.primaryKey.length > 0) {
        colDefs.push(`  PRIMARY KEY (${table.primaryKey.join(', ')})`);
      }

      for (const fk of table.foreignKeys) {
        colDefs.push(
          `  FOREIGN KEY (${fk.column}) REFERENCES ${fk.targetTable}(${fk.targetColumn}) ON DELETE CASCADE ON UPDATE CASCADE`
        );
      }

      lines.push(colDefs.join(',\n'));
      lines.push(');\n');
    }

    // Append decompositions
    lines.push('-- Decomposed & Lookup Relations:');
    for (const rec of recommendations) {
      if (rec.correctedSqlSnippet && rec.correctedSqlSnippet.startsWith('CREATE TABLE')) {
        lines.push(rec.correctedSqlSnippet);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}
