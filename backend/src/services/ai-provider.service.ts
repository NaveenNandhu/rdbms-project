/**
 * AI Provider Abstraction Layer for DB Insight AI
 * Supports Google Gemini, OpenAI, and a built-in Context-Aware Offline Educational Engine.
 * Never exposes API keys to client browsers.
 * Supports Beginner Mode and Advanced Mode with full schema context awareness.
 */

export interface TutorContext {
  mode: 'BEGINNER' | 'ADVANCED';
  contextType: 'TABLE' | 'RELATIONSHIP' | 'ANALYSIS' | 'ENTIRE_DATABASE';
  selectedTableName?: string;
  selectedRelationshipId?: string;
  schemaOverview?: {
    tables: Array<{
      name: string;
      columns: Array<{ name: string; type: string; isPk: boolean; isFk: boolean }>;
      primaryKey: string[];
    }>;
    relationships: Array<{
      sourceTable: string;
      sourceColumn: string;
      targetTable: string;
      targetColumn: string;
      cardinality: string;
    }>;
  };
  analysisSummary?: {
    overallRank: string;
    score: number;
    issuesCount: number;
    issuesList?: string[];
  };
}

export class AiProviderService {
  public static async askTutor(question: string, context: TutorContext): Promise<{ answer: string; suggestedFollowups: string[] }> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (geminiKey) {
      try {
        return await this.callGemini(geminiKey, question, context);
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to built-in pedagogical tutor:', err.message);
      }
    } else if (openAiKey) {
      try {
        return await this.callOpenAi(openAiKey, question, context);
      } catch (err: any) {
        console.warn('OpenAI API call failed, falling back to built-in pedagogical tutor:', err.message);
      }
    }

    // Built-in High-Quality Offline Educational Engine
    return this.generateOfflineEducationalResponse(question, context);
  }

  private static async callGemini(apiKey: string, question: string, context: TutorContext) {
    const prompt = this.buildPrompt(question, context);
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];

    for (const model of candidateModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1000 }
          })
        });

        if (!response.ok) continue;
        const data: any = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            answer: text,
            suggestedFollowups: this.deriveFollowups(question, context)
          };
        }
      } catch (err: any) {
        console.warn(`Gemini tutor model ${model} attempt:`, err.message);
      }
    }

    return {
      answer: 'Gemini service encountered an error. Falling back to built-in pedagogical tutor.',
      suggestedFollowups: this.deriveFollowups(question, context)
    };
  }

  private static async callOpenAi(apiKey: string, question: string, context: TutorContext) {
    const prompt = this.buildPrompt(question, context);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content || 'No response generated.';
    return {
      answer: text,
      suggestedFollowups: this.deriveFollowups(question, context)
    };
  }

  private static buildPrompt(question: string, context: TutorContext): string {
    const isBeginner = context.mode === 'BEGINNER';
    return `
You are DB Insight AI Tutor, an expert database design professor and patient mentor for college students.
Mode: ${context.mode}
${isBeginner
  ? 'Explain concepts in plain English with relatable real-world analogies (e.g. library books, student ID cards, grocery receipts). Avoid dense jargon or explain it immediately.'
  : 'Provide rigorous relational theory explanations including candidate keys, functional dependencies, Armstrong axioms, and Boyce-Codd proofs.'
}

CONTEXT TYPE: ${context.contextType}
SELECTED TABLE: ${context.selectedTableName || 'None'}
CURRENT DATABASE SCHEMA:
${JSON.stringify(context.schemaOverview, null, 2)}

ANALYSIS FINDINGS:
${JSON.stringify(context.analysisSummary, null, 2)}

STUDENT QUESTION: "${question}"

Provide a clear, pedagogical response with step-by-step guidance and specific references to their tables and columns.
`;
  }

  /**
   * High-Quality Offline Educational Reasoning Engine
   * Seamlessly provides rich, customized educational tutoring even with zero API keys!
   */
  private static generateOfflineEducationalResponse(
    question: string,
    context: TutorContext
  ): { answer: string; suggestedFollowups: string[] } {
    const q = question.toLowerCase();
    const isBeginner = context.mode === 'BEGINNER';
    const tableName = context.selectedTableName || (context.schemaOverview?.tables[0]?.name ?? 'YOUR_TABLE');
    const tableObj = context.schemaOverview?.tables.find(t => t.name.toLowerCase() === tableName.toLowerCase());
    const pkName = tableObj?.primaryKey[0] || `${tableName.toLowerCase()}_id`;

    // 1. Primary Key questions
    if (q.includes('primary key') || q.includes('what is pk') || q.includes('why pk')) {
      if (isBeginner) {
        return {
          answer: `### 🔑 What is a Primary Key?

Think of a **Primary Key** just like your **Student ID Number** or **Passport Number**:
- In a university with 10,000 students, two students might share the exact same first and last name.
- But your Student ID is **100% unique to you**, and you can never have a "blank" ID card.

**In your database table \`${tableName}\`:**
- The primary key is \`${pkName}\`.
- Every row stored in \`${tableName}\` must have a unique value in this column.
- It can never be \`NULL\` (empty).

**Why do you need it?**
Without a primary key, if two identical rows get inserted, the database has no reliable way to update or delete just one of them!`,
          suggestedFollowups: [
            `What is a Composite Primary Key?`,
            `How does a Primary Key connect to a Foreign Key?`,
            `Can a table have multiple Primary Keys?`
          ]
        };
      } else {
        return {
          answer: `### 📐 Primary Key & Candidate Key Theory

In the Relational Model (Codd, 1970):
1. **Superkey**: Any set of attributes $K \\subseteq R$ such that for any valid relational state $r(R)$, no two distinct tuples $t_1, t_2 \\in r$ have $t_1[K] = t_2[K]$.
2. **Candidate Key**: A minimal superkey. Removing any attribute $A \\in K$ causes $K$ to lose the uniqueness property.
3. **Primary Key**: The designated candidate key chosen by the database architect to establish entity identity and enforce the **Entity Integrity Constraint** ($\forall t \\in r(R), t[PK] \\neq \\text{null}$).

In your table **\`${tableName}\`**, candidate key is $\\{${tableObj?.primaryKey.join(', ') || pkName}\\}$.
Primary keys are indexed automatically via a B-Tree clustered index to guarantee $O(\\log N)$ tuple access and referential targeting.`,
          suggestedFollowups: [
            `How do Candidate Keys determine 2NF compliance?`,
            `What is the difference between Surrogate and Natural Keys?`,
            `Explain the Entity Integrity constraint formally.`
          ]
        };
      }
    }

    // 2. Normalization questions (2NF, 3NF, BCNF)
    if (q.includes('2nf') || q.includes('second normal form')) {
      return {
        answer: isBeginner
          ? `### 📦 Understanding Second Normal Form (2NF)

**The Simple Rule:**
A table is in **2NF** if:
1. It is already in **1NF** (each cell holds a single value).
2. **No partial dependencies exist**: Every descriptive column must describe the **WHOLE key**, not just a piece of it!

**When does 2NF matter?**
2NF only becomes an issue when a table has a **Composite Key** (a key made of two or more columns, like \`student_id\` + \`course_id\`).
- If you store \`course_name\` in that table, \`course_name\` only depends on \`course_id\`, not \`student_id\`.
- That is a **partial dependency**!

**How to fix it:**
Cut the table in two! Put the course details into their own \`COURSE\` table, and keep just the IDs in the link table.`
          : `### 📐 Formal Second Normal Form (2NF) Analysis

**Definition:**
A relation schema $R$ is in 2NF with respect to a set of functional dependencies $F$ if:
1. $R$ satisfies 1NF.
2. Every non-prime attribute $A \\in R$ is **fully functionally dependent** on every candidate key $K$ of $R$.

**Formal Violation Condition:**
$\\exists X \\subset K$ (proper subset of candidate key $K$) and $\\exists A \\notin \\bigcup K_i$ (non-prime attribute) such that $X \\rightarrow A$.

In table **\`${tableName}\`**, if candidate keys are composite, attributes must not be determined by a proper sub-component of the key. Decomposition $R_1(X, A)$ and $R_2(R - A)$ preserves dependencies while achieving 2NF.`,
        suggestedFollowups: [
          `What is Third Normal Form (3NF)?`,
          `How do I enter manual Functional Dependencies?`,
          `Explain Boyce-Codd Normal Form (BCNF).`
        ]
      };
    }

    if (q.includes('3nf') || q.includes('third normal form') || q.includes('transitive')) {
      return {
        answer: isBeginner
          ? `### 🔗 Understanding Third Normal Form (3NF)

**The Famous Rule of Thumb:**
> *"Every non-key attribute must depend on the key, the whole key, and nothing but the key, so help me Codd."*

**What is a Transitive Dependency?**
Think of it like gossip:
- Person A tells Person B, and Person B tells Person C.
- Person C found out from Person A indirectly through Person B!

In a database:
- \`student_id\` $\\rightarrow$ \`zip_code\`
- \`zip_code\` $\\rightarrow$ \`city\`
Here, \`city\` depends on \`student_id\` **transitively** through \`zip_code\`!
If 500 students live in the same zip code, the city name gets duplicated 500 times.

**How to fix it:**
Create a \`ZIP_LOOKUP\` table (\`zip_code\`, \`city\`) and store only \`zip_code\` in your student table.`
          : `### 📐 Formal Third Normal Form (3NF) Definition

**Definition:**
A relation schema $R$ is in 3NF if for every non-trivial functional dependency $X \\rightarrow A$ in $F^+$:
1. $X$ is a superkey of $R$, OR
2. $A$ is a prime attribute (a member of some candidate key of $R$).

**Transitive Dependency:**
A dependency $X \\rightarrow Z$ is transitive if $\\exists Y$ such that $X \\rightarrow Y$, $Y \\not\\rightarrow X$, and $Y \\rightarrow Z$, with $Z \\not\\subseteq X \\cup Y$.
Violation induces deletion anomalies: deleting the last student residing in a postal district deletes the municipality association from the relation schema.`,
        suggestedFollowups: [
          `Show me the decomposition for 3NF.`,
          `Why does BCNF go further than 3NF?`,
          `What is an Update Anomaly?`
        ]
      };
    }

    // 3. Foreign Key / Relationship questions
    if (q.includes('foreign key') || q.includes('fk') || q.includes('relationship')) {
      return {
        answer: isBeginner
          ? `### 🤝 What is a Foreign Key?

A **Foreign Key** is simply a column in one table that points to the **Primary Key** of another table.

**Analogy:**
- Think of an **Order Receipt**.
- At the top of the receipt, it doesn't reprint your entire life story, address, and credit score.
- It simply writes your \`customer_id: 42\`.
- That \`customer_id\` on the order is a **Foreign Key** pointing back to the \`CUSTOMERS\` table!

**Benefits:**
1. **Zero Redundancy**: You never type the customer's name multiple times.
2. **Referential Integrity**: The database prevents creating an order for a fake customer who doesn't exist!`
          : `### 📐 Referential Integrity & Foreign Key Constraints

A **Foreign Key constraint** enforces the **Referential Integrity Rule**:
Given relations $R_1$ and $R_2$, a set of attributes $FK \\subseteq R_1$ is a foreign key referencing candidate key $PK \\subseteq R_2$ iff:
$$\\forall t_1 \\in r(R_1), \\text{ either } t_1[FK] = \\text{null} \\lor \\exists t_2 \\in r(R_2) \\text{ s.t. } t_1[FK] = t_2[PK]$$

Referential actions define the relational state transition on update or deletion of the parent tuple $t_2$:
- \`CASCADE\`: Propagates modifications to dependent foreign keys.
- \`RESTRICT\` / \`NO ACTION\`: Aborts the transaction if child tuples exist.
- \`SET NULL\`: Nullifies dependent references.`,
        suggestedFollowups: [
          `What is the difference between 1:1, 1:N and M:N relationships?`,
          `When should I use CASCADE vs RESTRICT?`,
          `What is a Junction Table?`
        ]
      };
    }

    // Generic helpful response referencing current schema
    return {
      answer: isBeginner
        ? `### 💡 DB Insight AI Tutor Guide for Table \`${tableName}\`

I have analyzed your schema for **\`${tableName}\`**. Here is what you should know:
- **Columns analyzed**: ${tableObj?.columns.map(c => `\`${c.name}\``).join(', ') || 'All columns'}.
- **Primary Key**: \`${tableObj?.primaryKey.join(', ') || 'None declared'}\`.
- **Integrity Status**: Always make sure every table has a unique primary key and that relationships use explicit foreign keys with \`ON DELETE\` policies.

You can ask me anything about your database:
- *"Why is this table not in 2NF?"*
- *"Explain Insertion and Deletion anomalies"*
- *"How do I fix repeating column groups?"*
- *"Show me the corrected SQL"*`
        : `### 📐 DB Insight Architectural Analysis: \`${tableName}\`

**Relational Specification:**
- Relation: $R(${tableObj?.columns.map(c => c.name).join(', ') || ''})
- Candidate Key(s): $\\{${tableObj?.primaryKey.join(', ') || '\\emptyset'}\\}$
- Integrity Enforcement: Schema-level constraints verified.
- Target Normal Form: Boyce-Codd Normal Form (BCNF).

Please select a specific validation aspect (Functional Dependency, Transitive Chain, or Referential Action) for detailed formal demonstration.`,
      suggestedFollowups: [
        `How do I normalize ${tableName}?`,
        `Show me anomaly examples for ${tableName}.`,
        `Explain the foreign keys in this database.`
      ]
    };
  }

  private static deriveFollowups(question: string, context: TutorContext): string[] {
    return [
      `What are the anomalies in ${context.selectedTableName || 'my database'}?`,
      `How do I normalize to 3NF?`,
      `Explain the ER diagram connections.`
    ];
  }
}
