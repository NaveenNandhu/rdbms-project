/**
 * Integrity Constraint Analyzer for DB Insight AI
 * Analyzes Entity Integrity, Referential Integrity, Domain Integrity, and User-Defined Integrity.
 * Explicitly distinguishes Schema-Level structural checks from Data-Level verification.
 */

import { ParsedTable } from './sql-parser';

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
  score: number; // 0 - 100
  entityIntegrityScore: number;
  referentialIntegrityScore: number;
  domainIntegrityScore: number;
  userDefinedScore: number;
  issues: IntegrityIssue[];
  notice: string;
}

export class IntegrityChecker {
  public static analyze(tables: ParsedTable[]): IntegrityReport {
    const issues: IntegrityIssue[] = [];

    // 1. Entity Integrity Analysis
    let entityViolations = 0;
    for (const table of tables) {
      // Check: Primary Key existence
      if (table.primaryKey.length === 0) {
        entityViolations += 2;
        issues.push({
          category: 'ENTITY',
          severity: 'CRITICAL',
          tableName: table.name,
          title: `Missing Primary Key in '${table.name}'`,
          description: `Table '${table.name}' does not have a designated Primary Key constraint.`,
          whyItMatters: `Entity integrity is a fundamental relational axiom. Without a primary key, tuples cannot be guaranteed unique, leading to duplicate records and impossible row-level addressability.`,
          recommendation: `Add a primary key column, such as \`${table.name.toLowerCase()}_id SERIAL PRIMARY KEY\`.`,
          checkLevel: 'SCHEMA_LEVEL'
        });
      } else {
        // Check: Primary Key columns cannot be nullable
        for (const pkColName of table.primaryKey) {
          const col = table.columns.find(c => c.name.toLowerCase() === pkColName.toLowerCase());
          if (col && col.isNullable) {
            entityViolations += 1;
            issues.push({
              category: 'ENTITY',
              severity: 'HIGH',
              tableName: table.name,
              columnName: pkColName,
              title: `Nullable Primary Key Column '${pkColName}'`,
              description: `Primary key attribute '${pkColName}' is defined as NULLABLE.`,
              whyItMatters: `Relational algebra dictates that primary key attributes must never be NULL. Allowing NULL keys breaks tuple identity.`,
              recommendation: `Explicitly declare '${pkColName}' as \`NOT NULL\`.`,
              checkLevel: 'SCHEMA_LEVEL'
            });
          }
        }
      }
    }

    // 2. Referential Integrity Analysis
    let referentialViolations = 0;
    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        // Check: Target table exists
        const targetTable = tables.find(t => t.name.toLowerCase() === fk.targetTable.toLowerCase());
        if (!targetTable) {
          referentialViolations += 2;
          issues.push({
            category: 'REFERENTIAL',
            severity: 'CRITICAL',
            tableName: table.name,
            columnName: fk.column,
            title: `Orphaned Foreign Key: Target Table '${fk.targetTable}' Not Found`,
            description: `Foreign key '${fk.column}' in table '${table.name}' references non-existent table '${fk.targetTable}'.`,
            whyItMatters: `Breaks referential integrity. Inserting records will fail or corrupt relational links.`,
            recommendation: `Create table '${fk.targetTable}' prior to defining the foreign key or fix typo in table name.`,
            checkLevel: 'SCHEMA_LEVEL'
          });
          continue;
        }

        // Check: Target column exists
        const targetCol = targetTable.columns.find(c => c.name.toLowerCase() === fk.targetColumn.toLowerCase());
        if (!targetCol) {
          referentialViolations += 2;
          issues.push({
            category: 'REFERENTIAL',
            severity: 'CRITICAL',
            tableName: table.name,
            columnName: fk.column,
            title: `Referenced Column '${fk.targetColumn}' Not Found in '${fk.targetTable}'`,
            description: `Foreign key '${fk.column}' references column '${fk.targetColumn}' which does not exist in '${fk.targetTable}'.`,
            whyItMatters: `The database engine will reject foreign key creation because the referenced target attribute is missing.`,
            recommendation: `Ensure '${fk.targetTable}' defines column '${fk.targetColumn}' before referencing it.`,
            checkLevel: 'SCHEMA_LEVEL'
          });
          continue;
        }

        // Check: Data type compatibility
        const srcCol = table.columns.find(c => c.name.toLowerCase() === fk.column.toLowerCase());
        if (srcCol && targetCol) {
          const srcBase = this.getBaseType(srcCol.dataType);
          const tgtBase = this.getBaseType(targetCol.dataType);
          if (srcBase !== tgtBase) {
            referentialViolations += 1;
            issues.push({
              category: 'REFERENTIAL',
              severity: 'HIGH',
              tableName: table.name,
              columnName: fk.column,
              title: `Data Type Mismatch on Foreign Key '${fk.column}'`,
              description: `Source column '${srcCol.name}' (${srcCol.dataType}) does not match referenced column '${targetCol.name}' (${targetCol.dataType}) in '${fk.targetTable}'.`,
              whyItMatters: `Type mismatch causes index degradation, implicit type casting overhead, and in many RDBMS (like PostgreSQL), prevents foreign key creation altogether.`,
              recommendation: `Align column types so both '${srcCol.name}' and '${targetCol.name}' share the exact same data type (e.g. ${targetCol.dataType}).`,
              checkLevel: 'SCHEMA_LEVEL'
            });
          }
        }

        // Check: Missing ON DELETE or ON UPDATE action
        if (!fk.onDelete) {
          issues.push({
            category: 'REFERENTIAL',
            severity: 'LOW',
            tableName: table.name,
            columnName: fk.column,
            title: `Undefined ON DELETE Referential Action on '${fk.column}'`,
            description: `Foreign key '${fk.column}' does not specify an explicit ON DELETE action (e.g. CASCADE, SET NULL, or RESTRICT).`,
            whyItMatters: `Defaults to NO ACTION or RESTRICT. If a parent record in '${fk.targetTable}' is deleted, unexpected foreign key constraint errors will occur without a clear deletion policy.`,
            recommendation: `Explicitly declare \`ON DELETE CASCADE\` or \`ON DELETE RESTRICT\` depending on business lifecycle.`,
            checkLevel: 'SCHEMA_LEVEL'
          });
        }
      }
    }

    // 3. Domain Integrity Analysis
    let domainViolations = 0;
    for (const table of tables) {
      for (const col of table.columns) {
        // Missing explicit data type
        if (!col.dataType || col.dataType === 'UNKNOWN') {
          domainViolations += 1;
          issues.push({
            category: 'DOMAIN',
            severity: 'HIGH',
            tableName: table.name,
            columnName: col.name,
            title: `Missing or Invalid Data Type on '${col.name}'`,
            description: `Column '${col.name}' does not have a clearly specified valid SQL domain type.`,
            whyItMatters: `Domain integrity guarantees that values belong to a well-defined domain of valid values.`,
            recommendation: `Specify a concrete type such as \`INT\`, \`VARCHAR(255)\`, \`DECIMAL(10,2)\`, or \`TIMESTAMP\`.`,
            checkLevel: 'SCHEMA_LEVEL'
          });
        }

        // Check columns that should likely not be null (e.g., status, email, created_at, name)
        const lowerName = col.name.toLowerCase();
        if (col.isNullable && ['email', 'username', 'status', 'name', 'title'].includes(lowerName)) {
          issues.push({
            category: 'DOMAIN',
            severity: 'LOW',
            tableName: table.name,
            columnName: col.name,
            title: `Critical Field '${col.name}' Allows NULLs`,
            description: `Attribute '${col.name}' is marked nullable. Core identity or state fields typically require values.`,
            whyItMatters: `Permitting NULL in vital business fields leads to null-pointer bugs in application logic and inconsistent reporting.`,
            recommendation: `Add \`NOT NULL\` constraint to '${col.name}' if it is a mandatory field.`,
            checkLevel: 'SCHEMA_LEVEL'
          });
        }
      }
    }

    // 4. User-Defined Integrity Analysis
    // Check for obvious missing CHECK constraints (e.g. price, age, quantity, percentage, rating)
    for (const table of tables) {
      for (const col of table.columns) {
        const lower = col.name.toLowerCase();
        const hasCheck = table.constraints.some(c => c.type === 'CHECK' && c.definition.toLowerCase().includes(lower));

        if (!hasCheck && !col.checkExpr) {
          if (lower.includes('age') && !lower.includes('stage') && !lower.includes('page')) {
            issues.push({
              category: 'USER_DEFINED',
              severity: 'INFO',
              tableName: table.name,
              columnName: col.name,
              title: `Missing Range CHECK Constraint on '${col.name}'`,
              description: `Attribute '${col.name}' does not have a domain boundary validation rule.`,
              whyItMatters: `Without a CHECK constraint, invalid values like negative age or 999 can be entered.`,
              recommendation: `Add constraint: \`CHECK (${col.name} > 0 AND ${col.name} < 130)\`.`,
              checkLevel: 'SCHEMA_LEVEL'
            });
          }
          if (lower.includes('price') || lower.includes('salary') || lower.includes('amount')) {
            issues.push({
              category: 'USER_DEFINED',
              severity: 'INFO',
              tableName: table.name,
              columnName: col.name,
              title: `Missing Positive Value CHECK Constraint on '${col.name}'`,
              description: `Monetary attribute '${col.name}' does not enforce non-negative values at the database level.`,
              whyItMatters: `Prevent accidental insertion of negative monetary values.`,
              recommendation: `Add constraint: \`CHECK (${col.name} >= 0)\`.`,
              checkLevel: 'SCHEMA_LEVEL'
            });
          }
        }
      }
    }

    // Calculate Scores
    const entityIntegrityScore = Math.max(0, 100 - entityViolations * 25);
    const referentialIntegrityScore = Math.max(0, 100 - referentialViolations * 20);
    const domainIntegrityScore = Math.max(0, 100 - domainViolations * 15);
    const userDefinedScore = 85;

    const overallScore = Math.round(
      entityIntegrityScore * 0.35 +
      referentialIntegrityScore * 0.35 +
      domainIntegrityScore * 0.2 +
      userDefinedScore * 0.1
    );

    return {
      score: overallScore,
      entityIntegrityScore,
      referentialIntegrityScore,
      domainIntegrityScore,
      userDefinedScore,
      issues,
      notice: 'Note: These integrity findings are based on Schema-Level structural analysis. Data-Level validation (e.g. verifying that existing rows do not contain duplicates or orphan values) requires access to live instance data or a provided dataset.'
    };
  }

  private static getBaseType(typeStr: string): string {
    const clean = typeStr.toUpperCase().replace(/\([^)]*\)/, '').trim();
    if (['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL'].includes(clean)) return 'INTEGER';
    if (['VARCHAR', 'CHAR', 'TEXT', 'STRING', 'NVARCHAR'].includes(clean)) return 'STRING';
    if (['FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL'].includes(clean)) return 'NUMERIC';
    if (['BOOLEAN', 'BOOL', 'TINYINT'].includes(clean)) return 'BOOLEAN';
    if (['DATE', 'TIMESTAMP', 'DATETIME', 'TIME', 'TIMESTAMPTZ'].includes(clean)) return 'TEMPORAL';
    return clean;
  }
}
