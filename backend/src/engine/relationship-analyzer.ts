/**
 * Relationship and Cardinality Analyzer for DB Insight AI
 * Identifies 1:1, 1:N, M:N, junction tables, and participation rules.
 * Strictly avoids guessing from column names alone; relies on keys and constraints.
 */

import { ParsedTable } from './sql-parser';

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

export class RelationshipAnalyzer {
  public static analyze(tables: ParsedTable[]): RelationshipAnalysisReport {
    const relationships: AnalyzedRelationship[] = [];
    const tablesWithRelations = new Set<string>();
    const missingFkSuggestions: RelationshipAnalysisReport['missingForeignKeySuggestions'] = [];

    // 1. Process explicit Foreign Keys
    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        tablesWithRelations.add(table.name.toLowerCase());
        tablesWithRelations.add(fk.targetTable.toLowerCase());

        const targetTable = tables.find(t => t.name.toLowerCase() === fk.targetTable.toLowerCase());

        // Check if FK column is part of Primary Key (Identifying relationship)
        const isPrimaryKey = table.primaryKey.some(pk => pk.toLowerCase() === fk.column.toLowerCase());

        // Check if FK column has a UNIQUE constraint (1:1 relationship)
        const isUnique = table.candidateKeys.some(
          ck => ck.length === 1 && ck[0].toLowerCase() === fk.column.toLowerCase()
        );

        // Check nullability (Participation)
        const srcCol = table.columns.find(c => c.name.toLowerCase() === fk.column.toLowerCase());
        const isMandatory = srcCol ? !srcCol.isNullable : false;

        // Check if this table is a Junction Table (M:N)
        const isJunction =
          table.foreignKeys.length >= 2 &&
          table.columns.length <= 4 &&
          table.primaryKey.length >= 2;

        let cardinality: '1:1' | '1:N' | 'M:N' = '1:N';
        let relationshipType: AnalyzedRelationship['relationshipType'] = isPrimaryKey
          ? 'IDENTIFYING'
          : 'NON_IDENTIFYING';
        const reasoning: string[] = [];

        if (table.name.toLowerCase() === fk.targetTable.toLowerCase()) {
          relationshipType = 'SELF_REFERENCING';
          reasoning.push(`Self-referencing relationship: '${table.name}' references itself via column '${fk.column}'.`);
        }

        if (isJunction) {
          cardinality = 'M:N';
          relationshipType = 'JUNCTION';
          reasoning.push(
            `Table '${table.name}' acts as a junction/associative bridge table with composite keys. This represents an indirect Many-to-Many (M:N) relationship.`
          );
        } else if (isUnique || (isPrimaryKey && table.primaryKey.length === 1)) {
          cardinality = '1:1';
          reasoning.push(
            `Column '${fk.column}' is defined with a UNIQUE constraint or is a single-column Primary Key, strictly constraining cardinality to One-to-One (1:1).`
          );
        } else {
          cardinality = '1:N';
          reasoning.push(
            `Foreign key '${fk.column}' can repeat across rows in '${table.name}' referencing the primary key in '${fk.targetTable}'. Cardinality is One-to-Many (1:N).`
          );
        }

        relationships.push({
          id: `${table.name}_${fk.column}_${fk.targetTable}_${fk.targetColumn}`,
          sourceTable: table.name,
          sourceColumn: fk.column,
          targetTable: fk.targetTable,
          targetColumn: fk.targetColumn,
          cardinality,
          relationshipType,
          sourceParticipation: isMandatory ? 'MANDATORY' : 'OPTIONAL',
          targetParticipation: 'OPTIONAL',
          isConfirmed: true,
          confidence: 1.0,
          explanation: reasoning.join(' '),
          reasoning
        });
      }
    }

    // 2. Identify potential Missing Foreign Keys (columns sharing names like `customer_id` but missing FK constraint)
    for (const tableA of tables) {
      for (const colA of tableA.columns) {
        if (colA.isForeignKey) continue;

        // Check for common naming patterns ending in _id, _code, _num
        const lowerName = colA.name.toLowerCase();
        if (lowerName.endsWith('_id') || lowerName.endsWith('_code')) {
          const entityStem = lowerName.replace(/(_id|_code)$/, '');

          for (const tableB of tables) {
            if (tableA.name.toLowerCase() === tableB.name.toLowerCase()) continue;

            const targetTableLower = tableB.name.toLowerCase();
            const targetStem = targetTableLower.replace(/s$/, ''); // unpluralize basic

            if (entityStem === targetStem || entityStem === targetTableLower) {
              const targetPkCol = tableB.primaryKey[0];
              if (targetPkCol) {
                missingFkSuggestions.push({
                  tableA: tableA.name,
                  columnA: colA.name,
                  tableB: tableB.name,
                  columnB: targetPkCol,
                  reason: `Column '${colA.name}' in '${tableA.name}' matches the primary key name/pattern of table '${tableB.name}' (${targetPkCol}), but has no FOREIGN KEY constraint declared.`
                });
              }
            }
          }
        }
      }
    }

    // 3. Find Unrelated Tables (isolated islands in the database schema)
    const unrelatedTables = tables
      .map(t => t.name)
      .filter(name => !tablesWithRelations.has(name.toLowerCase()));

    return {
      relationships,
      unrelatedTables,
      missingForeignKeySuggestions: missingFkSuggestions
    };
  }
}
