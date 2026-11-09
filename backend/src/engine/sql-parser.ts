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
  private static readonly KNOWN_TYPES = new Set([
    'INT', 'INTEGER', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'BIGINT', 'SERIAL', 'BIGSERIAL',
    'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL', 'DOUBLE PRECISION', 'MONEY',
    'CHAR', 'VARCHAR', 'TEXT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT', 'CITEXT', 'CHARACTER',
    'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'TIMESTAMPTZ', 'INTERVAL', 'YEAR',
    'BOOLEAN', 'BOOL', 'BIT',
    'BLOB', 'TINYBLOB', 'MEDIUMBLOB', 'LONGBLOB', 'BYTEA', 'BINARY', 'VARBINARY',
    'JSON', 'JSONB', 'UUID', 'XML', 'ENUM', 'SET', 'INET', 'CIDR', 'MACADDR', 'GEOMETRY', 'POINT'
  ]);

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
          const parsed = this.parseCreateTable(trimmed, stmt.line, dialect, warnings, errors);
          if (parsed) {
            // Check for duplicate table
            const existing = tables.find(t => t.name.toLowerCase() === parsed.name.toLowerCase());
            if (existing) {
              errors.push({
                line: stmt.line,
                message: `Duplicate table definition for '${parsed.name}'. A table with this name already exists in this schema.`
              });
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
      } else if (/^(?:INSERT\s+INTO|SELECT|UPDATE|DELETE|DROP\s+TABLE|CREATE\s+INDEX|CREATE\s+VIEW)/i.test(trimmed)) {
        warnings.push({
          line: stmt.line,
          message: `Non-DDL statement '${trimmed.split(/\s+/)[0].toUpperCase()}' skipped. SQL Validator focuses on table schema definitions (CREATE TABLE, ALTER TABLE).`,
          severity: 'LOW'
        });
      } else {
        errors.push({
          line: stmt.line,
          message: `Syntax error: Unrecognized statement near line ${stmt.line}: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}". Expected CREATE TABLE or ALTER TABLE.`
        });
      }
    }

    // 3. Deduce candidate keys and relationships across tables
    const relationships = this.deduceRelationships(tables, warnings, errors);

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
    warnings: SqlParseResult['warnings'],
    errors: SqlParseResult['errors']
  ): ParsedTable | null {
    // Check balanced parentheses
    const openParens = (stmt.match(/\(/g) || []).length;
    const closeParens = (stmt.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push({
        line: startLine,
        message: `Syntax error in CREATE TABLE: Mismatched parentheses (${openParens} opening '(' vs ${closeParens} closing ')'). Check for unclosed table body or constraint parenthesis.`
      });
      return null;
    }

    // Match CREATE TABLE [IF NOT EXISTS] tablename (body)
    const match = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"'\w]+)\s*\(([\s\S]+)\)(?:\s*[^)]*)?$/i);
    if (!match) {
      if (!/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"'\w]+)/i.test(stmt)) {
        errors.push({
          line: startLine,
          message: `Syntax error in CREATE TABLE: Missing or invalid table name.`
        });
      } else {
        errors.push({
          line: startLine,
          message: `Syntax error in CREATE TABLE: Malformed table body. Ensure column definitions are enclosed in parentheses.`
        });
      }
      return null;
    }

    const rawTableName = match[1];
    const tableName = this.unquote(rawTableName);
    const body = match[2];

    const columns: ParsedColumn[] = [];
    const constraints: ParsedConstraint[] = [];
    const primaryKey: string[] = [];
    const candidateKeys: string[][] = [];
    const foreignKeys: ParsedTable['foreignKeys'] = [];
    let pkDeclarationCount = 0;

    // Split body items by comma, taking care not to split inside parens or quotes
    const items = this.splitBodyItems(body);

    for (const item of items) {
      const trimmed = item.trim();
      if (!trimmed) continue;

      // Check for missing commas between lines: e.g. "col1 INT col2 VARCHAR(50)"
      const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 1) {
        const colDeclarations = lines.filter(l =>
          /^[a-zA-Z_]\w*\s+(?:INT|BIGINT|VARCHAR|TEXT|DECIMAL|NUMERIC|DATE|TIMESTAMP|BOOLEAN|CHAR|FLOAT|DOUBLE|SERIAL|UUID)\b/i.test(l)
        );
        if (colDeclarations.length > 1) {
          errors.push({
            line: startLine,
            message: `Syntax error in table '${tableName}': Missing comma delimiter between column definitions near "${lines[0]}".`
          });
        }
      }

      // Table-level PRIMARY KEY constraint
      if (/^(?:CONSTRAINT\s+[`"'\w]+\s+)?PRIMARY\s+KEY\s*\(([\s\S]+)\)/i.test(trimmed)) {
        pkDeclarationCount++;
        if (pkDeclarationCount > 1) {
          errors.push({
            line: startLine,
            message: `Syntax error in table '${tableName}': Multiple PRIMARY KEY definitions are not permitted. A table can have at most one PRIMARY KEY constraint.`
          });
        }

        const pkMatch = trimmed.match(/^(?:CONSTRAINT\s+([`"'\w]+)\s+)?PRIMARY\s+KEY\s*\(([\s\S]+)\)/i);
        if (pkMatch) {
          const cName = pkMatch[1] ? this.unquote(pkMatch[1]) : `pk_${tableName}`;
          const pkCols = pkMatch[2].split(',').map(c => this.unquote(c.trim())).filter(c => c.length > 0);
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
          const srcCols = fkMatch[2].split(',').map(c => this.unquote(c.trim())).filter(c => c.length > 0);
          const tgtTable = this.unquote(fkMatch[3]);
          const tgtCols = fkMatch[4].split(',').map(c => this.unquote(c.trim())).filter(c => c.length > 0);
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
          const uCols = uMatch[2].split(',').map(c => this.unquote(c.trim())).filter(c => c.length > 0);
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
      const col = this.parseColumnDefinition(trimmed, tableName, warnings, errors);
      if (col) {
        // Check for duplicate column name
        const duplicate = columns.find(c => c.name.toLowerCase() === col.name.toLowerCase());
        if (duplicate) {
          errors.push({
            line: startLine,
            message: `Syntax error in table '${tableName}': Duplicate column name '${col.name}'. Column names within a table must be unique.`
          });
        } else {
          columns.push(col);
        }

        if (col.isPrimaryKey) {
          pkDeclarationCount++;
          if (pkDeclarationCount > 1) {
            errors.push({
              line: startLine,
              message: `Syntax error in table '${tableName}': Multiple PRIMARY KEY definitions found. Column '${col.name}' is declared as PRIMARY KEY, but another PRIMARY KEY is already defined.`
            });
          }
          if (!primaryKey.includes(col.name)) {
            primaryKey.push(col.name);
          }
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
    warnings: SqlParseResult['warnings'],
    errors: SqlParseResult['errors']
  ): ParsedColumn | null {
    const tokens = def.trim().split(/\s+/);
    if (tokens.length < 2) {
      errors.push({
        line: undefined,
        message: `Syntax error in table '${tableName}': Incomplete column definition '${def}'. Expected column name and data type.`
      });
      return null;
    }

    const colName = this.unquote(tokens[0]);
    // Skip MySQL KEY / INDEX keywords if defined at table level
    if (['KEY', 'INDEX', 'FULLTEXT', 'SPATIAL'].includes(colName.toUpperCase())) {
      return null;
    }

    // Determine type (might include length like VARCHAR(255) or DECIMAL(10,2))
    let dataType = tokens[1];
    let tokenIndex = 2;
    if (tokens[1].includes('(') && !tokens[1].includes(')')) {
      while (tokenIndex < tokens.length) {
        dataType += ' ' + tokens[tokenIndex];
        if (tokens[tokenIndex].includes(')')) {
          tokenIndex++;
          break;
        }
        tokenIndex++;
      }
    }

    // Check data type
    const baseType = dataType.replace(/\(.*?\)/g, '').trim().toUpperCase();
    if (!this.KNOWN_TYPES.has(baseType)) {
      warnings.push({
        line: undefined,
        message: `Unrecognized or non-standard SQL data type '${dataType}' for column '${colName}' in table '${tableName}'.`,
        severity: 'MEDIUM'
      });
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

  private static deduceRelationships(
    tables: ParsedTable[],
    warnings: SqlParseResult['warnings'],
    errors: SqlParseResult['errors']
  ) {
    const relationships: SqlParseResult['relationships'] = [];

    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        // Validate local column exists in current table
        const localCol = table.columns.find(c => c.name.toLowerCase() === fk.column.toLowerCase());
        if (!localCol) {
          errors.push({
            line: undefined,
            message: `Semantic error in table '${table.name}': Foreign key references local column '${fk.column}', but column does not exist in '${table.name}'.`
          });
        }

        // Validate target table exists
        const targetTableObj = tables.find(t => t.name.toLowerCase() === fk.targetTable.toLowerCase());
        if (!targetTableObj) {
          warnings.push({
            line: undefined,
            message: `Foreign key in table '${table.name}' references undefined table '${fk.targetTable}'. Referenced table must be declared.`,
            severity: 'HIGH'
          });
          continue;
        }

        // Validate target column exists in target table
        const targetColObj = targetTableObj.columns.find(c => c.name.toLowerCase() === fk.targetColumn.toLowerCase());
        if (!targetColObj) {
          warnings.push({
            line: undefined,
            message: `Foreign key '${fk.column}' in table '${table.name}' references column '${fk.targetColumn}' in table '${fk.targetTable}', but '${fk.targetTable}' has no such column.`,
            severity: 'HIGH'
          });
          continue;
        }

        // Check data type compatibility
        if (localCol && targetColObj) {
          const localBaseType = localCol.dataType.replace(/\(.*?\)/g, '').trim();
          const targetBaseType = targetColObj.dataType.replace(/\(.*?\)/g, '').trim();
          if (localBaseType !== targetBaseType) {
            warnings.push({
              line: undefined,
              message: `Data type mismatch: '${table.name}.${fk.column}' (${localCol.dataType}) references '${fk.targetTable}.${fk.targetColumn}' (${targetColObj.dataType}). Relational keys should share the same data type.`,
              severity: 'MEDIUM'
            });
          }
        }

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
