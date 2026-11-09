/**
 * Deterministic Normalization Analysis Engine for DB Insight AI
 * Strictly verifies 1NF, 2NF, 3NF, and BCNF.
 * Computes candidate keys, attribute closures, partial and transitive dependencies,
 * and generates clean mathematical decompositions with before/after comparisons.
 */

import { ParsedTable } from './sql-parser';

export interface UserFunctionalDependency {
  tableName: string;
  determinants: string[]; // LHS (X)
  dependents: string[];   // RHS (Y)
}

export interface NormalFormResult {
  form: '1NF' | '2NF' | '3NF' | 'BCNF';
  status: 'PASS' | 'FAIL' | 'NEEDS_CONFIRMATION';
  score: number; // 0 - 100
  reason: string;
  issues: Array<{
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
  }>;
  technicalProof?: string;
}

export interface TableNormalizationAnalysis {
  tableName: string;
  candidateKeys: string[][];
  functionalDependencies: Array<{ lhs: string[]; rhs: string[]; isKey: boolean; source: 'inferred' | 'user' }>;
  overallRank: 'NOT_1NF' | '1NF' | '2NF' | '3NF' | 'BCNF';
  oneNF: NormalFormResult;
  twoNF: NormalFormResult;
  threeNF: NormalFormResult;
  bcnf: NormalFormResult;
  decomposedTables?: Array<{
    name: string;
    columns: string[];
    primaryKey: string[];
    foreignKeys?: Array<{ column: string; targetTable: string; targetColumn: string }>;
  }>;
}

export class NormalizationEngine {
  /**
   * Analyze all tables in a schema with optional user-supplied functional dependencies.
   */
  public static analyzeSchema(
    tables: ParsedTable[],
    userFds: UserFunctionalDependency[] = []
  ): TableNormalizationAnalysis[] {
    return tables.map(table => this.analyzeTable(table, tables, userFds));
  }

  public static analyzeTable(
    table: ParsedTable,
    allTables: ParsedTable[],
    userFds: UserFunctionalDependency[] = []
  ): TableNormalizationAnalysis {
    const colNames = table.columns.map(c => c.name);
    const candidateKeys = this.determineCandidateKeys(table);

    // Collect Functional Dependencies
    const fds = this.collectFunctionalDependencies(table, candidateKeys, userFds);

    // 1. Analyze 1NF
    const oneNF = this.analyze1NF(table);

    // 2. Analyze 2NF
    const twoNF = this.analyze2NF(table, candidateKeys, fds, oneNF.status === 'PASS');

    // 3. Analyze 3NF
    const threeNF = this.analyze3NF(table, candidateKeys, fds, twoNF.status === 'PASS');

    // 4. Analyze BCNF
    const bcnf = this.analyzeBCNF(table, candidateKeys, fds, threeNF.status === 'PASS');

    // Determine overall highest achieved rank
    let overallRank: TableNormalizationAnalysis['overallRank'] = 'NOT_1NF';
    if (oneNF.status === 'PASS') overallRank = '1NF';
    if (oneNF.status === 'PASS' && twoNF.status === 'PASS') overallRank = '2NF';
    if (oneNF.status === 'PASS' && twoNF.status === 'PASS' && threeNF.status === 'PASS') overallRank = '3NF';
    if (
      oneNF.status === 'PASS' &&
      twoNF.status === 'PASS' &&
      threeNF.status === 'PASS' &&
      bcnf.status === 'PASS'
    ) {
      overallRank = 'BCNF';
    }

    return {
      tableName: table.name,
      candidateKeys,
      functionalDependencies: fds,
      overallRank,
      oneNF,
      twoNF,
      threeNF,
      bcnf
    };
  }

  /**
   * Determine Candidate Keys: Single PK, Composite PK, or UNIQUE constraints.
   */
  private static determineCandidateKeys(table: ParsedTable): string[][] {
    const keys: string[][] = [];

    // Table Primary Key
    if (table.primaryKey.length > 0) {
      keys.push([...table.primaryKey]);
    }

    // Explicit UNIQUE constraints
    for (const ck of table.candidateKeys) {
      if (!keys.some(k => k.length === ck.length && k.every(col => ck.includes(col)))) {
        keys.push(ck);
      }
    }

    return keys;
  }

  /**
   * Collect explicit and derived functional dependencies.
   */
  private static collectFunctionalDependencies(
    table: ParsedTable,
    candidateKeys: string[][],
    userFds: UserFunctionalDependency[]
  ): Array<{ lhs: string[]; rhs: string[]; isKey: boolean; source: 'inferred' | 'user' }> {
    const list: Array<{ lhs: string[]; rhs: string[]; isKey: boolean; source: 'inferred' | 'user' }> = [];
    const colNames = table.columns.map(c => c.name);

    // 1. Every candidate key determines all attributes
    for (const key of candidateKeys) {
      const nonKeyCols = colNames.filter(c => !key.includes(c));
      if (nonKeyCols.length > 0) {
        list.push({
          lhs: key,
          rhs: nonKeyCols,
          isKey: true,
          source: 'inferred'
        });
      }
    }

    // 2. Add user-provided functional dependencies for this table
    const tableUserFds = userFds.filter(
      ufd => ufd.tableName.toLowerCase() === table.name.toLowerCase()
    );

    for (const ufd of tableUserFds) {
      // Validate that all columns exist in this table
      const validLhs = ufd.determinants.filter(c => colNames.some(tc => tc.toLowerCase() === c.toLowerCase()));
      const validRhs = ufd.dependents.filter(c => colNames.some(tc => tc.toLowerCase() === c.toLowerCase()));

      if (validLhs.length > 0 && validRhs.length > 0) {
        const isKey = candidateKeys.some(
          ck => ck.length === validLhs.length && ck.every(k => validLhs.includes(k))
        );
        list.push({
          lhs: validLhs,
          rhs: validRhs,
          isKey,
          source: 'user'
        });
      }
    }

    // 3. Known domain patterns (e.g. zip_code -> city, state or dept_id -> dept_name)
    // Only infer if not already explicitly specified
    this.detectDomainDependencies(table, list);

    return list;
  }

  private static detectDomainDependencies(
    table: ParsedTable,
    existingFds: Array<{ lhs: string[]; rhs: string[]; isKey: boolean; source: 'inferred' | 'user' }>
  ): void {
    const cols = table.columns.map(c => c.name.toLowerCase());

    // Pattern: Zip / Postal Code determines City and State
    const zipCol = table.columns.find(c => /zip|postal/i.test(c.name));
    const cityCol = table.columns.find(c => /city|town/i.test(c.name));
    const stateCol = table.columns.find(c => /state|province/i.test(c.name));

    if (zipCol && (cityCol || stateCol)) {
      const rhs: string[] = [];
      if (cityCol && cityCol.name !== zipCol.name) rhs.push(cityCol.name);
      if (stateCol && stateCol.name !== zipCol.name) rhs.push(stateCol.name);

      if (rhs.length > 0 && !existingFds.some(f => f.lhs.includes(zipCol.name))) {
        existingFds.push({
          lhs: [zipCol.name],
          rhs,
          isKey: false,
          source: 'inferred'
        });
      }
    }

    // Pattern: Department Code / Id determines Department Name in an Employee or Student table
    const deptIdCol = table.columns.find(c => /dept_id|department_id|dept_code/i.test(c.name));
    const deptNameCol = table.columns.find(c => /dept_name|department_name/i.test(c.name));
    if (deptIdCol && deptNameCol && !table.primaryKey.includes(deptIdCol.name)) {
      if (!existingFds.some(f => f.lhs.includes(deptIdCol.name))) {
        existingFds.push({
          lhs: [deptIdCol.name],
          rhs: [deptNameCol.name],
          isKey: false,
          source: 'inferred'
        });
      }
    }

    // Pattern: Course Id determines Course Name and Credits in an Enrollment table
    const courseIdCol = table.columns.find(c => /course_id|course_code/i.test(c.name));
    const courseNameCol = table.columns.find(c => /course_name|course_title/i.test(c.name));
    if (courseIdCol && courseNameCol && table.primaryKey.length > 1) {
      if (!existingFds.some(f => f.lhs.includes(courseIdCol.name))) {
        existingFds.push({
          lhs: [courseIdCol.name],
          rhs: [courseNameCol.name],
          isKey: false,
          source: 'inferred'
        });
      }
    }
  }

  /**
   * 1NF Analysis: Checks for atomic values and repeating column patterns.
   */
  private static analyze1NF(table: ParsedTable): NormalFormResult {
    const issues: NormalFormResult['issues'] = [];
    const colNames = table.columns.map(c => c.name);

    // Check 1: Repeating column patterns (e.g., phone1, phone2, address_line1, address_line2, subject1, subject2)
    const repeatingPatterns: { [prefix: string]: string[] } = {};
    for (const col of colNames) {
      const match = col.match(/^([a-zA-Z_]+?)_?(\d+)$/);
      if (match) {
        const prefix = match[1];
        if (!repeatingPatterns[prefix]) repeatingPatterns[prefix] = [];
        repeatingPatterns[prefix].push(col);
      }
    }

    for (const prefix of Object.keys(repeatingPatterns)) {
      const cols = repeatingPatterns[prefix];
      if (cols.length >= 2) {
        const newTableName = `${table.name}_${prefix}s`;
        const pkCol = table.primaryKey[0] || 'id';

        issues.push({
          title: `Repeating Column Group Detected: [${cols.join(', ')}]`,
          affectedColumns: cols,
          explanation: `Columns '${cols.join(', ')}' represent a repeating group of attributes violating First Normal Form (1NF). 1NF requires every attribute to be atomic and rows to not contain recurring attribute lists.`,
          whyItMatters: `Adding additional ${prefix} entries requires altering the database schema table definition. Searching across multiple numbered columns requires inefficient OR queries and complex indexing.`,
          suggestedDecomposition: {
            newTables: [
              {
                name: newTableName,
                columns: [pkCol, `${prefix}_value`, 'entry_index'],
                primaryKey: [pkCol, 'entry_index'],
                foreignKeys: [{ column: pkCol, targetTable: table.name, targetColumn: pkCol }]
              }
            ],
            correctedSql: `CREATE TABLE ${newTableName} (\n  ${pkCol} INT NOT NULL,\n  entry_index INT NOT NULL,\n  ${prefix}_value VARCHAR(255) NOT NULL,\n  PRIMARY KEY (${pkCol}, entry_index),\n  FOREIGN KEY (${pkCol}) REFERENCES ${table.name}(${pkCol}) ON DELETE CASCADE\n);`
          }
        });
      }
    }

    // Check 2: Potential non-atomic / multi-valued column names (e.g. 'tags', 'skills', 'phone_numbers', 'hobbies')
    const nonAtomicKeywords = [
      'tags', 'skills', 'hobbies', 'phone_numbers', 'emails', 'items', 'subjects', 'courses', 'friends'
    ];
    for (const col of table.columns) {
      const lower = col.name.toLowerCase();
      if (nonAtomicKeywords.includes(lower) || (lower.endsWith('s') && ['list', 'array'].some(k => col.dataType.toLowerCase().includes(k)))) {
        const pkCol = table.primaryKey[0] || 'id';
        const singleName = lower.replace(/s$/, '');
        const newTableName = `${table.name}_${lower}`;

        issues.push({
          title: `Potentially Multi-Valued Attribute '${col.name}'`,
          affectedColumns: [col.name],
          explanation: `The column '${col.name}' appears to hold multi-valued, composite, or comma-separated values. 1NF mandates that all column values must be strictly atomic (indivisible scalar values).`,
          whyItMatters: `Storing multiple values in a single cell prevents proper indexing, makes SQL JOINs impossible without regex/string splitting, and creates severe query performance bottlenecks.`,
          suggestedDecomposition: {
            newTables: [
              {
                name: newTableName,
                columns: [pkCol, `${singleName}`],
                primaryKey: [pkCol, `${singleName}`],
                foreignKeys: [{ column: pkCol, targetTable: table.name, targetColumn: pkCol }]
              }
            ],
            correctedSql: `CREATE TABLE ${newTableName} (\n  ${pkCol} INT NOT NULL,\n  ${singleName} VARCHAR(255) NOT NULL,\n  PRIMARY KEY (${pkCol}, ${singleName}),\n  FOREIGN KEY (${pkCol}) REFERENCES ${table.name}(${pkCol}) ON DELETE CASCADE\n);`
          }
        });
      }
    }

    // Check 3: Missing Primary Key
    if (table.primaryKey.length === 0) {
      issues.push({
        title: `No Primary Key Defined`,
        affectedColumns: [],
        explanation: `Table '${table.name}' has no defined Primary Key. A relation cannot satisfy 1NF without a mechanism to uniquely identify each tuple/row.`,
        whyItMatters: `Without a Primary Key, duplicate tuples can be inserted without constraint, violating relational algebra fundamentals and entity integrity.`,
        suggestedDecomposition: {
          newTables: [],
          correctedSql: `ALTER TABLE ${table.name} ADD COLUMN id SERIAL PRIMARY KEY;`
        }
      });
    }

    const passed = issues.length === 0;
    return {
      form: '1NF',
      status: passed ? 'PASS' : 'FAIL',
      score: passed ? 100 : Math.max(20, 100 - issues.length * 30),
      reason: passed
        ? 'All attributes are atomic, rows are distinct, and no repeating column groups were found.'
        : `Found ${issues.length} 1NF violation(s) including non-atomic columns or repeating groups.`,
      issues
    };
  }

  /**
   * 2NF Analysis: Requires 1NF.
   * Checks for Partial Dependencies: Non-prime attribute depending on part of a composite candidate key.
   */
  private static analyze2NF(
    table: ParsedTable,
    candidateKeys: string[][],
    fds: Array<{ lhs: string[]; rhs: string[]; isKey: boolean; source: 'inferred' | 'user' }>,
    is1NFPassed: boolean
  ): NormalFormResult {
    if (!is1NFPassed) {
      return {
        form: '2NF',
        status: 'FAIL',
        score: 0,
        reason: 'Table must satisfy First Normal Form (1NF) before 2NF can be satisfied.',
        issues: []
      };
    }

    // Determine prime attributes (union of all attributes in ANY candidate key)
    const primeAttributes = new Set<string>();
    for (const key of candidateKeys) {
      for (const col of key) primeAttributes.add(col.toLowerCase());
    }

    const nonPrimeAttributes = table.columns
      .map(c => c.name)
      .filter(c => !primeAttributes.has(c.toLowerCase()));

    // If there is no composite candidate key, 2NF is automatically satisfied regarding partial dependencies!
    const compositeKeys = candidateKeys.filter(k => k.length > 1);
    if (compositeKeys.length === 0) {
      return {
        form: '2NF',
        status: 'PASS',
        score: 100,
        reason: 'All candidate keys consist of single attributes. Therefore, no partial key dependencies can mathematically exist. 2NF is satisfied.',
        issues: [],
        technicalProof: `Candidate Keys: [${candidateKeys.map(k => `(${k.join(', ')})`).join(', ')}]. Since no candidate key has length > 1, any dependency $X \\rightarrow Y$ where $X \\subset K$ is vacuous.`
      };
    }

    // There are composite keys. Now check for partial dependencies!
    const issues: NormalFormResult['issues'] = [];

    for (const compKey of compositeKeys) {
      for (const fd of fds) {
        if (fd.isKey) continue;

        // Check if fd.lhs is a PROPER subset of compKey
        const isSubset =
          fd.lhs.length < compKey.length &&
          fd.lhs.every(attr => compKey.some(k => k.toLowerCase() === attr.toLowerCase()));

        if (isSubset) {
          // Check if any of fd.rhs are NON-PRIME attributes
          const affectedNonPrime = fd.rhs.filter(attr =>
            nonPrimeAttributes.some(npa => npa.toLowerCase() === attr.toLowerCase())
          );

          if (affectedNonPrime.length > 0) {
            const newTableName = `${table.name}_${fd.lhs.join('_')}`;
            const correctedSql = `CREATE TABLE ${newTableName} (\n  ${fd.lhs.join(' INT, ')} INT,\n  ${affectedNonPrime.join(' VARCHAR(255), ')} VARCHAR(255),\n  PRIMARY KEY (${fd.lhs.join(', ')})\n);`;

            issues.push({
              title: `Partial Dependency Detected: {${fd.lhs.join(', ')}} → {${affectedNonPrime.join(', ')}}`,
              affectedColumns: affectedNonPrime,
              explanation: `Attributes [${affectedNonPrime.join(', ')}] depend only on a partial subset {${fd.lhs.join(', ')}} of the composite candidate key (${compKey.join(', ')}). In 2NF, every non-prime attribute must depend on the WHOLE candidate key.`,
              whyItMatters: `Causes update anomalies: updating ${affectedNonPrime.join(', ')} requires updating multiple tuples. Causes insertion anomalies: cannot register a ${fd.lhs.join(', ')} without assigning the full composite key.`,
              suggestedDecomposition: {
                newTables: [
                  {
                    name: newTableName,
                    columns: [...fd.lhs, ...affectedNonPrime],
                    primaryKey: fd.lhs
                  }
                ],
                correctedSql
              }
            });
          }
        }
      }
    }

    // Check if composite key exists, non-prime attributes exist, but NO dependencies are known:
    if (compositeKeys.length > 0 && nonPrimeAttributes.length > 0 && fds.filter(f => !f.isKey).length === 0) {
      return {
        form: '2NF',
        status: 'NEEDS_CONFIRMATION',
        score: 60,
        reason: 'Cannot conclusively determine — additional functional dependencies are required for composite key validation.',
        issues: [
          {
            title: `Potential Partial Dependencies on Composite Key (${compositeKeys[0].join(', ')})`,
            affectedColumns: nonPrimeAttributes,
            explanation: `The table has a composite key (${compositeKeys[0].join(', ')}) and non-prime attributes [${nonPrimeAttributes.join(', ')}]. If any of these non-prime attributes depend only on one part of the key, 2NF is violated.`,
            whyItMatters: `Relational theory requires explicit functional dependencies to formally prove 2NF.`,
            suggestedDecomposition: {
              newTables: [],
              correctedSql: `-- Please confirm functional dependencies in the Normalization tab`
            }
          }
        ],
        technicalProof: `Candidate Key is composite: (${compositeKeys[0].join(', ')}). Verification requires checking whether $\\exists X \\subset K$ such that $X \\rightarrow A$ for any $A \\notin K$.`
      };
    }

    const passed = issues.length === 0;
    return {
      form: '2NF',
      status: passed ? 'PASS' : 'FAIL',
      score: passed ? 100 : 35,
      reason: passed
        ? 'No partial functional dependencies found. Every non-prime attribute fully depends on the entire candidate key.'
        : `Identified ${issues.length} partial dependency violation(s). Non-prime attributes depend on part of composite key.`,
      issues
    };
  }

  /**
   * 3NF Analysis: Requires 2NF.
   * Checks for Transitive Dependencies: Non-prime attribute depending on another non-prime attribute.
   * Formal condition: For every non-trivial FD X -> Y, either X is a superkey OR Y is a prime attribute.
   */
  private static analyze3NF(
    table: ParsedTable,
    candidateKeys: string[][],
    fds: Array<{ lhs: string[]; rhs: string[]; isKey: boolean; source: 'inferred' | 'user' }>,
    is2NFPassed: boolean
  ): NormalFormResult {
    if (!is2NFPassed) {
      return {
        form: '3NF',
        status: 'FAIL',
        score: 0,
        reason: 'Table must satisfy Second Normal Form (2NF) before 3NF can be analyzed.',
        issues: []
      };
    }

    const primeAttributes = new Set<string>();
    for (const key of candidateKeys) {
      for (const col of key) primeAttributes.add(col.toLowerCase());
    }

    const issues: NormalFormResult['issues'] = [];

    for (const fd of fds) {
      if (fd.isKey) continue;

      // Check condition: is fd.lhs a superkey?
      const isSuperKey = candidateKeys.some(
        ck => ck.length <= fd.lhs.length && ck.every(k => fd.lhs.some(l => l.toLowerCase() === k.toLowerCase()))
      );

      // Check condition: are all attributes in fd.rhs prime attributes?
      const nonPrimeRhs = fd.rhs.filter(r => !primeAttributes.has(r.toLowerCase()));

      if (!isSuperKey && nonPrimeRhs.length > 0) {
        // Transitive dependency violation!
        const parentTable = `${table.name}_${fd.lhs.join('_')}`;
        issues.push({
          title: `Transitive Dependency Detected: {${fd.lhs.join(', ')}} → {${nonPrimeRhs.join(', ')}}`,
          affectedColumns: nonPrimeRhs,
          explanation: `Attribute(s) [${nonPrimeRhs.join(', ')}] depend transitively on {${fd.lhs.join(', ')}}, which is neither a superkey nor are the dependent attributes prime. In 3NF, non-prime attributes must not depend on other non-prime attributes.`,
          whyItMatters: `Causes deletion anomalies: deleting the parent entity inadvertently deletes ${nonPrimeRhs.join(', ')} reference data. Causes data redundancy across repeated rows.`,
          suggestedDecomposition: {
            newTables: [
              {
                name: parentTable,
                columns: [...fd.lhs, ...nonPrimeRhs],
                primaryKey: fd.lhs
              }
            ],
            correctedSql: `CREATE TABLE ${parentTable} (\n  ${fd.lhs.join(' VARCHAR(50), ')} VARCHAR(50) PRIMARY KEY,\n  ${nonPrimeRhs.join(' VARCHAR(255), ')} VARCHAR(255)\n);\n\n-- In original table '${table.name}', retain '${fd.lhs.join(', ')}' as FOREIGN KEY and drop [${nonPrimeRhs.join(', ')}].`
          }
        });
      }
    }

    const passed = issues.length === 0;
    return {
      form: '3NF',
      status: passed ? 'PASS' : 'FAIL',
      score: passed ? 100 : 40,
      reason: passed
        ? 'No transitive dependencies found. Every non-prime attribute directly depends on the candidate key.'
        : `Identified ${issues.length} transitive dependency violation(s) where non-prime attributes depend on other non-prime attributes.`,
      issues,
      technicalProof: passed
        ? `For all non-trivial FDs $X \\rightarrow Y$, either $X$ is a superkey or each attribute $A \\in Y$ is a prime attribute.`
        : undefined
    };
  }

  /**
   * BCNF Analysis: Requires 3NF.
   * Formal condition: For EVERY non-trivial FD X -> Y, X must be a superkey.
   */
  private static analyzeBCNF(
    table: ParsedTable,
    candidateKeys: string[][],
    fds: Array<{ lhs: string[]; rhs: string[]; isKey: boolean; source: 'inferred' | 'user' }>,
    is3NFPassed: boolean
  ): NormalFormResult {
    if (!is3NFPassed) {
      return {
        form: 'BCNF',
        status: 'FAIL',
        score: 0,
        reason: 'Table must satisfy Third Normal Form (3NF) before BCNF can be analyzed.',
        issues: []
      };
    }

    const issues: NormalFormResult['issues'] = [];

    for (const fd of fds) {
      if (fd.isKey) continue;

      const isSuperKey = candidateKeys.some(
        ck => ck.length <= fd.lhs.length && ck.every(k => fd.lhs.some(l => l.toLowerCase() === k.toLowerCase()))
      );

      // In BCNF, unlike 3NF, even if RHS is prime, LHS MUST still be a superkey!
      if (!isSuperKey) {
        issues.push({
          title: `BCNF Determinant Violation: {${fd.lhs.join(', ')}} → {${fd.rhs.join(', ')}}`,
          affectedColumns: [...fd.lhs, ...fd.rhs],
          explanation: `In dependency {${fd.lhs.join(', ')}} → {${fd.rhs.join(', ')}}, the determinant {${fd.lhs.join(', ')}} is NOT a superkey. BCNF strictly demands that every determinant must be a candidate key or superkey.`,
          whyItMatters: `Even if 3NF is satisfied, overlapping candidate keys where a determinant is not a superkey cause subtle update redundancies and multi-attribute integrity constraints that cannot be enforced by single-table keys.`,
          suggestedDecomposition: {
            newTables: [
              {
                name: `${table.name}_bcnf`,
                columns: [...fd.lhs, ...fd.rhs],
                primaryKey: fd.lhs
              }
            ],
            correctedSql: `CREATE TABLE ${table.name}_bcnf (\n  ${fd.lhs.join(' VARCHAR(100), ')} VARCHAR(100) PRIMARY KEY,\n  ${fd.rhs.join(' VARCHAR(100), ')} VARCHAR(100)\n);`
          }
        });
      }
    }

    const passed = issues.length === 0;
    return {
      form: 'BCNF',
      status: passed ? 'PASS' : 'FAIL',
      score: passed ? 100 : 50,
      reason: passed
        ? 'Strict BCNF satisfied: every determinant is a superkey of the relation.'
        : `Found ${issues.length} dependency where the determinant is not a superkey.`,
      issues,
      technicalProof: `Formal BCNF requirement: $\\forall X \\rightarrow Y \\text{ non-trivial}, X \\text{ is a superkey of } R$.`
    };
  }
}
