/**
 * Database Anomaly Detector for DB Insight AI
 * Identifies Insertion, Update, Deletion anomalies and Data Redundancy.
 * Generates custom, table-specific concrete data scenarios based on the student's actual schema.
 */

import { ParsedTable } from './sql-parser';
import { TableNormalizationAnalysis } from './normalization-engine';

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

export class AnomalyDetector {
  public static detect(
    tables: ParsedTable[],
    normalizationAnalyses: TableNormalizationAnalysis[]
  ): DatabaseAnomaly[] {
    const anomalies: DatabaseAnomaly[] = [];

    for (const norm of normalizationAnalyses) {
      const table = tables.find(t => t.name.toLowerCase() === norm.tableName.toLowerCase());
      if (!table) continue;

      const nonKeyFds = norm.functionalDependencies.filter(f => !f.isKey);
      const isCompositeKey = norm.candidateKeys.some(k => k.length > 1);

      // 1. Insertion Anomaly Detection
      // Occurs when non-key attributes are lumped into a table with a composite key or independent entity
      if (isCompositeKey && nonKeyFds.length > 0) {
        const fd = nonKeyFds[0];
        const keyCols = norm.candidateKeys[0];
        const missingKeyCol = keyCols.find(k => !fd.lhs.includes(k)) || keyCols[0];

        anomalies.push({
          type: 'INSERTION',
          tableName: table.name,
          affectedColumns: [...fd.lhs, ...fd.rhs],
          problemDescription: `Cannot insert ${fd.rhs.join(', ')} without assigning a full composite key (${keyCols.join(', ')}).`,
          whyItHappens: `Because attributes [${fd.rhs.join(', ')}] depend only partially on {${fd.lhs.join(', ')}}, you cannot record a new ${fd.rhs[0]} into the database until a complete record with '${missingKeyCol}' exists.`,
          exampleScenario: {
            description: `Suppose a department creates a new course or item before any student or order registers for it.`,
            sampleTableBefore: [
              { [keyCols[0]]: '101', [keyCols[1] || 'id']: 'C10', [fd.rhs[0] || 'info']: 'Intro to Databases' },
              { [keyCols[0]]: '102', [keyCols[1] || 'id']: 'C10', [fd.rhs[0] || 'info']: 'Intro to Databases' }
            ],
            anomalousAction: `Attempt to insert a new course 'C20' with title 'Machine Learning', but with no registered user.`,
            consequence: `Database rejects the insert with 'Column ${missingKeyCol} cannot be NULL' because it forms part of the Primary Key!`
          },
          suggestedCorrection: `Decompose '${table.name}' into two tables: one holding the independent entity attributes (${fd.lhs.join(', ')}, ${fd.rhs.join(', ')}) with its own primary key, and one linking the foreign keys.`
        });
      }

      // 2. Update Anomaly Detection
      // Occurs when transitive or partial dependencies duplicate attribute values across multiple rows
      if (nonKeyFds.length > 0) {
        const fd = nonKeyFds[0];
        anomalies.push({
          type: 'UPDATE',
          tableName: table.name,
          affectedColumns: fd.rhs,
          problemDescription: `Updating ${fd.rhs.join(', ')} requires modifying multiple redundant rows across table '${table.name}'.`,
          whyItHappens: `Because ${fd.rhs.join(', ')} is determined by {${fd.lhs.join(', ')}}, every time {${fd.lhs.join(', ')}} appears in a record, ${fd.rhs.join(', ')} is duplicated. Changing one requires updating every row.`,
          exampleScenario: {
            description: `Multiple rows share the same {${fd.lhs.join(', ')}} value.`,
            sampleTableBefore: [
              { id: '1', [fd.lhs[0]]: 'VAL_A', [fd.rhs[0]]: 'Original Name' },
              { id: '2', [fd.lhs[0]]: 'VAL_A', [fd.rhs[0]]: 'Original Name' },
              { id: '3', [fd.lhs[0]]: 'VAL_A', [fd.rhs[0]]: 'Original Name' }
            ],
            anomalousAction: `Update row 1's '${fd.rhs[0]}' to 'Updated Name', but miss updating row 2 and row 3.`,
            consequence: `Database state becomes corrupt with inconsistent, contradictory information for the same ${fd.lhs[0]}!`
          },
          suggestedCorrection: `Move [${fd.rhs.join(', ')}] into an independent table with {${fd.lhs.join(', ')}} as Primary Key to ensure single source of truth.`
        });
      }

      // 3. Deletion Anomaly Detection
      // Occurs when deleting a child record accidentally obliterates master metadata
      if (nonKeyFds.length > 0) {
        const fd = nonKeyFds[0];
        anomalies.push({
          type: 'DELETION',
          tableName: table.name,
          affectedColumns: [...fd.lhs, ...fd.rhs],
          problemDescription: `Deleting the last transaction or row unintentionally erases master metadata for [${fd.rhs.join(', ')}].`,
          whyItHappens: `Since master entity details (${fd.rhs.join(', ')}) reside directly inside the transactional table '${table.name}', removing the last row referencing {${fd.lhs.join(', ')}} erases all memory that the entity exists.`,
          exampleScenario: {
            description: `Only one student is currently enrolled in a course or only one employee remains in a branch.`,
            sampleTableBefore: [
              { id: '99', [fd.lhs[0]]: 'DEPT_CS', [fd.rhs[0]]: 'Computer Science Department' }
            ],
            anomalousAction: `Student 99 drops out or is deleted from table '${table.name}'.`,
            consequence: `All record of the 'Computer Science Department' is completely wiped from the database!`
          },
          suggestedCorrection: `Isolate master entities into dedicated parent tables so deleting transactional relationships does not destroy reference data.`
        });
      }

      // 4. Data Redundancy
      if (norm.threeNF.status === 'FAIL' || norm.twoNF.status === 'FAIL') {
        anomalies.push({
          type: 'REDUNDANCY',
          tableName: table.name,
          affectedColumns: norm.threeNF.issues.flatMap(i => i.affectedColumns),
          problemDescription: `Unnecessary storage duplication caused by unnormalized transitive dependencies.`,
          whyItHappens: `Non-prime attributes are stored repetitively in every single row instead of being normalized into a lookup table.`,
          exampleScenario: {
            description: `10,000 records storing the exact same repeated text values for city, state, or department details.`,
            sampleTableBefore: [
              { id: '1001', city: 'San Francisco', state: 'CA' },
              { id: '1002', city: 'San Francisco', state: 'CA' }
            ],
            anomalousAction: `Database grows exponentially with duplicate string data.`,
            consequence: `Wasted disk space, slower index traversals, and high risk of typographical drift.`
          },
          suggestedCorrection: `Normalize to 3NF by extracting lookup tables with foreign keys.`
        });
      }
    }

    return anomalies;
  }
}
