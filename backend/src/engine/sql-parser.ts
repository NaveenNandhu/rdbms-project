/**
 * SQL Parser & AST Inspector for DB Insight AI
 * Supports MySQL, PostgreSQL, and SQLite dialects.
 * Robustly parses CREATE TABLE, ALTER TABLE, column definitions, constraints,
 * and extracts deterministic relational structure and syntax warnings.
 */

export interface ParsedColumn {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isNullable: boolean;
  isUnique: boolean;
  defaultValue?: string;
  checkExpr?: string;
  references?: {
    table: string;
    column: string;
    onDelete?: string;
    onUpdate?: string;
  };
}

export interface ParsedConstraint {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  columns: string[];
  targetTable?: string;
  targetColumns?: string[];
  definition: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface ParsedTable {
  name: string;
  columns: ParsedColumn[];
  constraints: ParsedConstraint[];
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

export interface SqlParseResult {
  tables: ParsedTable[];
  relationships: Array<{
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
    cardinality: '1:1' | '1:N' | 'M:N';
    explanation: string;
  }>;
  warnings: Array<{
    line?: number;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  errors: Array<{
    line?: number;
    message: string;
  }>;
  dialect: 'postgresql' | 'mysql' | 'sqlite';
}

export class SqlParser {
  /**
   * Parse SQL text into structured tables, relationships, and constraint objects.
   */
  public static parse(sql: string, dialect: 'postgresql' | 'mysql' | 'sqlite' = 'postgresql'): SqlParseResult {
    const warnings: SqlParseResult['warnings'] = [];
    const errors: SqlParseResult['errors'] = [];
    const tables: ParsedTable[] = [];

    // 1. Strip comments while preserving line breaks for accurate error reporting
    const cleanSql = this.cleanComments(sql);

    // 2. Split statements cleanly
    const statements = this.splitStatements(cleanSql);

    for (const stmt of statements) {
      const trimmed = stmt.text.trim();
      if (!trimmed) continue;

      if (/^CREATE\s+TABLE/i.test(trimmed)) {
        try {
          const parsed = this.parseCreateTable(trimmed, stmt.line, dialect, warnings);
          if (parsed) {
            // Check for duplicate table
            const existing = tables.find(t => t.name.toLowerCase() === parsed.name.toLowerCase());
            if (existing) {
              warnings.push({
                line: stmt.line,
                message: `Duplicate table definition for '${parsed.name}'. Previous definition overwritten.`,
                severity: 'MEDIUM'
              });
              const idx = tables.indexOf(existing);
              tables[idx] = parsed;
            } else {
              tables.push(parsed);
            }
          }
        } catch (err: any) {
          errors.push({
            line: stmt.line,
            message: `Failed to parse CREATE TABLE: ${err.message}`
          });
        }
      } else if (/^ALTER\s+TABLE/i.test(trimmed)) {
        this.parseAlterTable(trimmed, stmt.line, tables, warnings, errors);
      }
    }

    // 3. Deduce candidate keys and relationships across tables
    const relationships = this.deduceRelationships(tables);

    return {
      tables,
      relationships,
      warnings,
      errors,
      dialect
    };
  }

  private static cleanComments(sql: string): string {
    // Replace single line comments -- ... and /* ... */ with whitespace to preserve line counts
    return sql
      .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
      .replace(/--.*$/gm, match => match.replace(/[^\n]/g, ' '));
  }

  private static splitStatements(sql: string): Array<{ text: string; line: number }> {
    const stmts: Array<{ text: string; line: number }> = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let parenDepth = 0;
    let startLine = 1;
    let currentLine = 1;

    for (let i = 0; i < sql.length; i++) {
      const char = sql[i];
      if (char === '\n') currentLine++;

      if (inQuote) {
        current += char;
        if (char === quoteChar && sql[i - 1] !== '\\') {
          inQuote = false;
        }
        continue;
      }

      if (char === "'" || char === '"' || char === '`') {
        inQuote = true;
        quoteChar = char;
        current += char;
        continue;
      }

      if (char === '(') parenDepth++;
      if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

      if (char === ';' && parenDepth === 0) {
        if (current.trim()) {
          stmts.push({ text: current.trim(), line: startLine });
        }
        current = '';
        startLine = currentLine;
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      stmts.push({ text: current.trim(), line: startLine });
    }

    return stmts;
  }

  private static parseCreateTable(
    stmt: string,
    startLine: number,
    dialect: string,
    warnings: SqlParseResult['warnings']
  ): ParsedTable | null {
    // Match CREATE TABLE [IF NOT EXISTS] tablename (body)
    const match = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"'\w]+)\s*\(([\s\S]+)\)/i);
    if (!match) return null;

    const rawTableName = match[1];
    const tableName = this.unquote(rawTableName);
    const body = match[2];

    const columns: ParsedColumn[] = [];
    const constraints: ParsedConstraint[] = [];
    const primaryKey: string[] = [];
    const candidateKeys: string[][] = [];
    const foreignKeys: ParsedTable['foreignKeys'] = [];

    // Split body items by comma, taking care not to split inside parens or quotes
    const items = this.splitBodyItems(body);

    for (const item of items) {
      const trimmed = item.trim();
      if (!trimmed) continue;

      // Table-level PRIMARY KEY constraint
      if (/^(?:CONSTRAINT\s+[`"'\w]+\s+)?PRIMARY\s+KEY\s*\(([\s\S]+)\)/i.test(trimmed)) {
        const pkMatch = trimmed.match(/^(?:CONSTRAINT\s+([`"'\w]+)\s+)?PRIMARY\s+KEY\s*\(([\s\S]+)\)/i);
        if (pkMatch) {
          const cName = pkMatch[1] ? this.unquote(pkMatch[1]) : `pk_${tableName}`;
          const pkCols = pkMatch[2].split(',').map(c => this.unquote(c.trim()));
          for (const pkCol of pkCols) {
            if (!primaryKey.includes(pkCol)) primaryKey.push(pkCol);
            const colObj = columns.find(c => c.name.toLowerCase() === pkCol.toLowerCase());
            if (colObj) {
              colObj.isPrimaryKey = true;
              colObj.isNullable = false;
            }
          }
          constraints.push({
            name: cName,
            type: 'PRIMARY KEY',
            columns: pkCols,
            definition: trimmed
          });
        }
        continue;
      }

      // Table-level FOREIGN KEY constraint
      if (/^(?:CONSTRAINT\s+[`"'\w]+\s+)?FOREIGN\s+KEY\s*\(([\s\S]+?)\)\s*REFERENCES\s+([`"'\w]+)\s*\(([\s\S]+?)\)/i.test(trimmed)) {
        const fkMatch = trimmed.match(
          /^(?:CONSTRAINT\s+([`"'\w]+)\s+)?FOREIGN\s+KEY\s*\(([\s\S]+?)\)\s*REFERENCES\s+([`"'\w]+)\s*\(([\s\S]+?)\)([\s\S]*)/i
        );
        if (fkMatch) {
          const cName = fkMatch[1] ? this.unquote(fkMatch[1]) : `fk_${tableName}_${Date.now()}`;
          const srcCols = fkMatch[2].split(',').map(c => this.unquote(c.trim()));
          const tgtTable = this.unquote(fkMatch[3]);
          const tgtCols = fkMatch[4].split(',').map(c => this.unquote(c.trim()));
          const rest = fkMatch[5] || '';

          const onDelete = (rest.match(/ON\s+DELETE\s+(CASCADE|RESTRICT|SET\s+NULL|NO\s+ACTION)/i) || [])[1];
          const onUpdate = (rest.match(/ON\s+UPDATE\s+(CASCADE|RESTRICT|SET\s+NULL|NO\s+ACTION)/i) || [])[1];

          srcCols.forEach((srcCol, idx) => {
            foreignKeys.push({
              column: srcCol,
              targetTable: tgtTable,
              targetColumn: tgtCols[idx] || tgtCols[0],
              onDelete,
              onUpdate
            });
            const colObj = columns.find(c => c.name.toLowerCase() === srcCol.toLowerCase());
            if (colObj) colObj.isForeignKey = true;
          });

          constraints.push({
            name: cName,
            type: 'FOREIGN KEY',
            columns: srcCols,
            targetTable: tgtTable,
            targetColumns: tgtCols,
            definition: trimmed,
            onDelete,
            onUpdate
          });
        }
        continue;
      }

      // Table-level UNIQUE constraint
      if (/^(?:CONSTRAINT\s+[`"'\w]+\s+)?UNIQUE\s*(?:KEY|INDEX)?\s*\(([\s\S]+)\)/i.test(trimmed)) {
        const uMatch = trimmed.match(/^(?:CONSTRAINT\s+([`"'\w]+)\s+)?UNIQUE\s*(?:KEY|INDEX)?\s*\(([\s\S]+)\)/i);
        if (uMatch) {
          const cName = uMatch[1] ? this.unquote(uMatch[1]) : `uq_${tableName}`;
          const uCols = uMatch[2].split(',').map(c => this.unquote(c.trim()));
          candidateKeys.push(uCols);
          if (uCols.length === 1) {
            const colObj = columns.find(c => c.name.toLowerCase() === uCols[0].toLowerCase());
            if (colObj) colObj.isUnique = true;
          }
          constraints.push({
            name: cName,
            type: 'UNIQUE',
            columns: uCols,
            definition: trimmed
          });
        }
        continue;
      }

      // Table-level CHECK constraint
      if (/^(?:CONSTRAINT\s+[`"'\w]+\s+)?CHECK\s*\(([\s\S]+)\)/i.test(trimmed)) {
        const chkMatch = trimmed.match(/^(?:CONSTRAINT\s+([`"'\w]+)\s+)?CHECK\s*\(([\s\S]+)\)/i);
        if (chkMatch) {
          constraints.push({
            name: chkMatch[1] ? this.unquote(chkMatch[1]) : `chk_${tableName}`,
            type: 'CHECK',
            columns: [],
            definition: trimmed
          });
        }
        continue;
      }

      // Otherwise parse as column definition
      const col = this.parseColumnDefinition(trimmed, tableName, warnings);
      if (col) {
        columns.push(col);
        if (col.isPrimaryKey && !primaryKey.includes(col.name)) {
          primaryKey.push(col.name);
        }
        if (col.isUnique) {
          candidateKeys.push([col.name]);
        }
        if (col.references) {
          foreignKeys.push({
            column: col.name,
            targetTable: col.references.table,
            targetColumn: col.references.column,
            onDelete: col.references.onDelete,
            onUpdate: col.references.onUpdate
          });
        }
      }
    }

    if (primaryKey.length > 0 && !candidateKeys.some(ck => ck.length === primaryKey.length && ck.every(k => primaryKey.includes(k)))) {
      candidateKeys.unshift([...primaryKey]);
    }

    if (primaryKey.length === 0) {
      warnings.push({
        line: startLine,
        message: `Table '${tableName}' does not define a PRIMARY KEY constraint. Entity integrity may be compromised.`,
        severity: 'HIGH'
      });
    }

    return {
      name: tableName,
      columns,
      constraints,
      primaryKey,
      candidateKeys,
      foreignKeys
    };
  }

  private static parseColumnDefinition(
    def: string,
    tableName: string,
    warnings: SqlParseResult['warnings']
  ): ParsedColumn | null {
    // E.g. "student_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY"
    // E.g. "email VARCHAR(255) UNIQUE NOT NULL"
    // E.g. "course_id INT REFERENCES courses(id) ON DELETE CASCADE"
    const tokens = def.trim().split(/\s+/);
    if (tokens.length < 2) return null;

    const colName = this.unquote(tokens[0]);
    // Skip MySQL KEY / INDEX keywords if defined at table level
    if (['KEY', 'INDEX', 'FULLTEXT', 'SPATIAL'].includes(colName.toUpperCase())) {
      return null;
    }

    // Determine type (might include length like VARCHAR(255) or DECIMAL(10,2))
    let dataType = tokens[1];
    let tokenIndex = 2;
    if (tokens[1].includes('(') && !tokens[1].includes(')')) {
      // Re-join parentheses tokens if split by space
      while (tokenIndex < tokens.length) {
        dataType += ' ' + tokens[tokenIndex];
        if (tokens[tokenIndex].includes(')')) {
          tokenIndex++;
          break;
        }
        tokenIndex++;
      }
    }

    const rest = tokens.slice(tokenIndex).join(' ');

    const isPrimaryKey = /PRIMARY\s+KEY/i.test(rest);
    const isNullable = !/NOT\s+NULL/i.test(rest) && !isPrimaryKey;
    const isUnique = /UNIQUE/i.test(rest);

    // Default value
    const defMatch = rest.match(/DEFAULT\s+([^,\s]+)/i);
    const defaultValue = defMatch ? defMatch[1] : undefined;

    // Check expression
    const chkMatch = rest.match(/CHECK\s*\(([^)]+)\)/i);
    const checkExpr = chkMatch ? chkMatch[1] : undefined;

    // Inline REFERENCES
    let references: ParsedColumn['references'] = undefined;
    const refMatch = rest.match(/REFERENCES\s+([`"'\w]+)\s*\(([`"'\w]+)\)([\s\S]*)/i);
    if (refMatch) {
      const tgtTable = this.unquote(refMatch[1]);
      const tgtCol = this.unquote(refMatch[2]);
      const refRest = refMatch[3] || '';
      const onDelete = (refRest.match(/ON\s+DELETE\s+(CASCADE|RESTRICT|SET\s+NULL|NO\s+ACTION)/i) || [])[1];
      const onUpdate = (refRest.match(/ON\s+UPDATE\s+(CASCADE|RESTRICT|SET\s+NULL|NO\s+ACTION)/i) || [])[1];

      references = {
        table: tgtTable,
        column: tgtCol,
        onDelete,
        onUpdate
      };
    }

    return {
      name: colName,
      dataType: dataType.toUpperCase(),
      isPrimaryKey,
      isForeignKey: !!references,
      isNullable,
      isUnique,
      defaultValue,
      checkExpr,
      references
    };
  }

  private static parseAlterTable(
    stmt: string,
    line: number,
    tables: ParsedTable[],
    warnings: SqlParseResult['warnings'],
    errors: SqlParseResult['errors']
  ): void {
    const match = stmt.match(/ALTER\s+TABLE\s+([`"'\w]+)\s+ADD\s+(?:CONSTRAINT\s+([`"'\w]+)\s+)?FOREIGN\s+KEY\s*\(([\s\S]+?)\)\s*REFERENCES\s+([`"'\w]+)\s*\(([\s\S]+?)\)([\s\S]*)/i);
    if (!match) return;

    const tableName = this.unquote(match[1]);
    const constraintName = match[2] ? this.unquote(match[2]) : `fk_${tableName}_alter`;
    const srcCols = match[3].split(',').map(c => this.unquote(c.trim()));
    const tgtTable = this.unquote(match[4]);
    const tgtCols = match[5].split(',').map(c => this.unquote(c.trim()));
    const rest = match[6] || '';

    const onDelete = (rest.match(/ON\s+DELETE\s+(CASCADE|RESTRICT|SET\s+NULL|NO\s+ACTION)/i) || [])[1];
    const onUpdate = (rest.match(/ON\s+UPDATE\s+(CASCADE|RESTRICT|SET\s+NULL|NO\s+ACTION)/i) || [])[1];

    const table = tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
    if (!table) {
      warnings.push({
        line,
        message: `ALTER TABLE specifies unknown table '${tableName}'.`,
        severity: 'HIGH'
      });
      return;
    }

    srcCols.forEach((srcCol, idx) => {
      table.foreignKeys.push({
        column: srcCol,
        targetTable: tgtTable,
        targetColumn: tgtCols[idx] || tgtCols[0],
        onDelete,
        onUpdate
      });
      const colObj = table.columns.find(c => c.name.toLowerCase() === srcCol.toLowerCase());
      if (colObj) colObj.isForeignKey = true;
    });

    table.constraints.push({
      name: constraintName,
      type: 'FOREIGN KEY',
      columns: srcCols,
      targetTable: tgtTable,
      targetColumns: tgtCols,
      definition: stmt,
      onDelete,
      onUpdate
    });
  }

  private static splitBodyItems(body: string): string[] {
    const items: string[] = [];
    let current = '';
    let parenDepth = 0;
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      if (inQuote) {
        current += char;
        if (char === quoteChar && body[i - 1] !== '\\') inQuote = false;
        continue;
      }

      if (char === "'" || char === '"' || char === '`') {
        inQuote = true;
        quoteChar = char;
        current += char;
        continue;
      }

      if (char === '(') parenDepth++;
      if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

      if (char === ',' && parenDepth === 0) {
        if (current.trim()) items.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) items.push(current.trim());
    return items;
  }

  private static deduceRelationships(tables: ParsedTable[]) {
    const relationships: SqlParseResult['relationships'] = [];

    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        const targetTableObj = tables.find(t => t.name.toLowerCase() === fk.targetTable.toLowerCase());

        // Check if source column is unique or primary key
        const isFkUnique = table.candidateKeys.some(ck => ck.length === 1 && ck[0].toLowerCase() === fk.column.toLowerCase());
        const isFkPrimaryKey = table.primaryKey.length === 1 && table.primaryKey[0].toLowerCase() === fk.column.toLowerCase();

        // Check if this table is a junction/bridge table (e.g. 2 FKs making up composite PK)
        const isJunction =
          table.foreignKeys.length >= 2 &&
          table.columns.length <= 4 &&
          table.primaryKey.length >= 2;

        let cardinality: '1:1' | '1:N' | 'M:N' = '1:N';
        let explanation = `Foreign key '${fk.column}' in '${table.name}' references '${fk.targetTable}.${fk.targetColumn}'. Each record in '${table.name}' links to one record in '${fk.targetTable}'.`;

        if (isFkUnique || isFkPrimaryKey) {
          cardinality = '1:1';
          explanation = `Foreign key '${fk.column}' in '${table.name}' has a UNIQUE constraint or is the PRIMARY KEY, establishing a strict One-to-One (1:1) relationship with '${fk.targetTable}'.`;
        } else if (isJunction) {
          cardinality = 'M:N';
          explanation = `'${table.name}' acts as a junction/associative bridge table connecting '${fk.targetTable}' to another entity in a Many-to-Many (M:N) relationship.`;
        }

        relationships.push({
          sourceTable: table.name,
          sourceColumn: fk.column,
          targetTable: fk.targetTable,
          targetColumn: fk.targetColumn,
          cardinality,
          explanation
        });
      }
    }

    return relationships;
  }

  public static unquote(str: string): string {
    return str.replace(/^[`"']+|[`"']+$/g, '').trim();
  }
}
