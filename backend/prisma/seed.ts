import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DB Insight AI Database...');

  // 1. Roles
  const roles = ['STUDENT', 'PROFESSOR', 'ADMIN'];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r },
      update: {},
      create: { name: r, description: `${r} role in DB Insight AI` }
    });
  }

  // 2. Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const student = await prisma.user.upsert({
    where: { email: 'student@dbinsight.ai' },
    update: {},
    create: {
      email: 'student@dbinsight.ai',
      passwordHash,
      fullName: 'Alex Rivera',
      role: 'STUDENT'
    }
  });

  const professor = await prisma.user.upsert({
    where: { email: 'prof@dbinsight.ai' },
    update: {},
    create: {
      email: 'prof@dbinsight.ai',
      passwordHash,
      fullName: 'Prof. Katherine Vance',
      role: 'PROFESSOR'
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dbinsight.ai' },
    update: {},
    create: {
      email: 'admin@dbinsight.ai',
      passwordHash,
      fullName: 'System Administrator',
      role: 'ADMIN'
    }
  });

  console.log('✅ Users seeded (student@dbinsight.ai, prof@dbinsight.ai, admin@dbinsight.ai / password123)');

  // 3. Learning Units and Topics
  const unit1 = await prisma.learningUnit.create({
    data: {
      title: 'Unit 1: Foundations of Relational Database Design',
      description: 'Core relational theory, relations, attributes, and candidate keys.',
      orderIndex: 1,
      topics: {
        create: [
          {
            title: 'Relational Model, Tuples, and Candidate Keys',
            orderIndex: 1,
            summary: 'Understanding relations as mathematical sets and identifying minimal superkeys.',
            moduleLink: '/explorer',
            beginnerExplanation: 'Think of a database table like an organized spreadsheet where every single row represents one unique person or object, and every column is a specific attribute like name or age. A Primary Key is like a student ID card: no two students ever share the same ID!',
            advancedExplanation: 'A relation scheme $R(A_1, A_2, \\dots, A_n)$ is a set of attributes. A relational instance $r(R)$ is a subset of the Cartesian product of the domains $\\text{dom}(A_i)$. A Candidate Key is a minimal superkey satisfying both uniqueness and irreducibility.',
            contentMarkdown: `# Foundations of the Relational Model

The relational database model was introduced by E.F. Codd in 1970.

### Key Axioms:
1. **Tuple**: A single row representing an entity instance.
2. **Attribute**: A column representing a domain property.
3. **Superkey**: A set of attributes that uniquely distinguishes tuples.
4. **Candidate Key**: A minimal superkey where no proper subset is a superkey.
5. **Primary Key**: The designated candidate key chosen by the database designer.`,
            quizQuestions: {
              create: [
                {
                  questionText: 'What is the mathematical definition of a Candidate Key?',
                  optionsJson: JSON.stringify([
                    'Any column that contains numerical data',
                    'A minimal superkey with no redundant attributes',
                    'A foreign key that references another table',
                    'An auto-incrementing integer assigned by MySQL'
                  ]),
                  correctAnswer: 1,
                  explanation: 'A candidate key is a minimal superkey: it uniquely identifies every tuple, and removing any attribute destroys uniqueness.',
                  difficulty: 'MEDIUM'
                },
                {
                  questionText: 'Can a table have multiple candidate keys?',
                  optionsJson: JSON.stringify([
                    'No, a table can only have one candidate key',
                    'Yes, any relation can possess multiple candidate keys, from which one is chosen as Primary Key',
                    'Only if the database engine is PostgreSQL',
                    'Only when composite keys are disabled'
                  ]),
                  correctAnswer: 1,
                  explanation: 'Relations frequently possess multiple candidate keys (e.g. SSN and Student_ID). The database architect chooses one as the Primary Key; the remainder become alternate unique keys.',
                  difficulty: 'EASY'
                }
              ]
            }
          },
          {
            title: 'Entity & Referential Integrity Rules',
            orderIndex: 2,
            summary: 'Formal validation of primary key non-nullability and foreign key constraints.',
            moduleLink: '/integrity',
            beginnerExplanation: 'Entity Integrity means your ID number can never be missing or blank. Referential Integrity means you cannot hand in an assignment for a course that does not exist in the school catalog!',
            advancedExplanation: 'Entity Integrity: $\\forall t \\in r(R), t[PK] \\neq \\text{null}$. Referential Integrity: Given $FK \\subseteq R_1$ referencing $PK \\subseteq R_2$, $\\forall t_1 \\in r(R_1), t_1[FK] = \\text{null} \\lor \\exists t_2 \\in r(R_2)$ such that $t_1[FK] = t_2[PK]$.',
            contentMarkdown: `# Integrity Constraints in Modern RDBMS

Integrity constraints guard the database against illegal data states.

### 1. Entity Integrity
No component of a primary key may be NULL. Because primary keys serve to uniquely identify individual tuples, allowing NULL would mean some tuples lack verifiable identity.

### 2. Referential Integrity
Foreign keys must either match an existing primary key value in the referenced relation, or be entirely NULL (if participation is optional).`,
            quizQuestions: {
              create: [
                {
                  questionText: 'Why does Entity Integrity strictly prohibit NULL values in Primary Keys?',
                  optionsJson: JSON.stringify([
                    'Because SQL syntax errors occur in SELECT queries',
                    'Because NULL values lack identity and prevent unique tuple addressing',
                    'Because NULL uses too much hard disk space',
                    'Because foreign keys cannot store integers'
                  ]),
                  correctAnswer: 1,
                  explanation: 'Allowing NULL in a primary key violates entity identity: two rows with NULL cannot be mathematically compared for equality or distinctness.',
                  difficulty: 'EASY'
                }
              ]
            }
          }
        ]
      }
    }
  });

  const unit2 = await prisma.learningUnit.create({
    data: {
      title: 'Unit 2: Normalization (1NF to BCNF)',
      description: 'Systematic elimination of redundancy and update anomalies.',
      orderIndex: 2,
      topics: {
        create: [
          {
            title: 'First Normal Form (1NF): Atomic Attributes',
            orderIndex: 1,
            summary: 'Eliminating multi-valued columns and recurring column groups.',
            moduleLink: '/normalization',
            beginnerExplanation: 'If you put three phone numbers in one cell separated by commas, or create columns called phone1, phone2, phone3, you break 1NF! Each cell must hold exactly one value.',
            advancedExplanation: 'A relation schema $R$ is in 1NF iff the domain of all attributes contains only atomic (indivisible) scalar values, and the value of any attribute in a tuple is a single value from the domain.',
            contentMarkdown: `# First Normal Form (1NF)

### Violations:
1. Comma-separated strings (e.g. \`skills: "Java, Python, SQL"\`)
2. Repeating column sequences (e.g. \`subject_1, subject_2, subject_3\`)
3. Relations without a designated primary key`,
            quizQuestions: {
              create: [
                {
                  questionText: 'Which scenario represents a direct violation of First Normal Form (1NF)?',
                  optionsJson: JSON.stringify([
                    'A table having two foreign keys',
                    'A column `emergency_contacts` containing a comma-separated list of names and numbers',
                    'A table having an auto-incrementing integer ID',
                    'A table with a composite primary key'
                  ]),
                  correctAnswer: 1,
                  explanation: 'Storing comma-separated or multi-valued lists in a single attribute violates atomicity.',
                  difficulty: 'EASY'
                }
              ]
            }
          },
          {
            title: 'Second Normal Form (2NF): Partial Dependencies',
            orderIndex: 2,
            summary: 'Removing partial functional dependencies on composite candidate keys.',
            moduleLink: '/normalization',
            beginnerExplanation: 'If a table has a 2-part key (like Student_ID + Course_ID), any column like Course_Name that only depends on Course_ID must be moved to its own table.',
            advancedExplanation: 'A relation schema $R$ is in 2NF if it is in 1NF and no non-prime attribute $A$ is functionally dependent on a proper subset of any candidate key $K$ of $R$.',
            contentMarkdown: `# Second Normal Form (2NF)

2NF addresses composite keys. If a candidate key is made of single attributes, 2NF is automatically satisfied.`,
            quizQuestions: {
              create: [
                {
                  questionText: 'Under what condition is a relation in 1NF guaranteed to already satisfy 2NF?',
                  optionsJson: JSON.stringify([
                    'When every candidate key consists of a single attribute',
                    'When all column types are VARCHAR',
                    'When no foreign keys are declared',
                    'When all foreign keys use ON DELETE CASCADE'
                  ]),
                  correctAnswer: 0,
                  explanation: 'If every candidate key is a single attribute, no proper subset of a key can exist. Thus, partial key dependencies are impossible.',
                  difficulty: 'MEDIUM'
                }
              ]
            }
          },
          {
            title: 'Third Normal Form (3NF): Transitive Dependencies',
            orderIndex: 3,
            summary: 'Eliminating non-prime attributes determined by other non-prime attributes.',
            moduleLink: '/normalization',
            beginnerExplanation: 'Think of the classic rule: "Every non-key attribute must depend on the key, the whole key, and nothing but the key!" If Zip_Code determines City and State, move City and State into a separate Zip table.',
            advancedExplanation: 'A relation schema $R$ is in 3NF if for every non-trivial functional dependency $X \\rightarrow A$: either $X$ is a superkey of $R$, or $A$ is a prime attribute of $R$.',
            contentMarkdown: `# Third Normal Form (3NF)

3NF eliminates transitive dependencies: where non-key attribute $A \\rightarrow B$ and $B \\rightarrow C$.`,
            quizQuestions: {
              create: [
                {
                  questionText: 'In table `STUDENT(id, name, zip_code, city)`, where `id -> zip_code` and `zip_code -> city`, what is the transitive dependency?',
                  optionsJson: JSON.stringify([
                    'id -> name',
                    'id -> city through zip_code',
                    'city -> id',
                    'name -> zip_code'
                  ]),
                  correctAnswer: 1,
                  explanation: 'Since `id -> zip_code` and `zip_code -> city` (with `zip_code` not being a superkey), `city` transitively depends on `id`.',
                  difficulty: 'MEDIUM'
                }
              ]
            }
          },
          {
            title: 'Boyce-Codd Normal Form (BCNF): Superkey Determinants',
            orderIndex: 4,
            summary: 'Strict requirement that every determinant must be a superkey.',
            moduleLink: '/normalization',
            beginnerExplanation: 'BCNF is a slightly stricter version of 3NF. It says: if column A determines column B, column A MUST be a superkey without exception!',
            advancedExplanation: 'A relation schema $R$ is in BCNF if for every non-trivial functional dependency $X \\rightarrow Y$, $X$ is a superkey of $R$. BCNF removes anomalies arising from overlapping candidate keys.',
            contentMarkdown: `# Boyce-Codd Normal Form (BCNF)

BCNF resolves subtle edge cases where 3NF permits non-superkey determinants when the dependent attribute happens to be prime.`,
            quizQuestions: {
              create: [
                {
                  questionText: 'What is the crucial difference between 3NF and BCNF?',
                  optionsJson: JSON.stringify([
                    '3NF allows $X \\rightarrow A$ if $A$ is a prime attribute; BCNF requires $X$ to be a superkey regardless of whether $A$ is prime',
                    'BCNF only applies to NoSQL databases',
                    '3NF requires composite keys while BCNF forbids them',
                    'BCNF does not require 1NF compliance'
                  ]),
                  correctAnswer: 0,
                  explanation: 'In 3NF, a dependency $X \\rightarrow A$ where $X$ is not a superkey is permitted if $A$ is part of some candidate key. BCNF disallows this exception.',
                  difficulty: 'HARD'
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log('✅ Learning curriculum and quizzes seeded successfully.');

  // 4. Sample Demonstration Project
  const sampleProject = await prisma.project.create({
    data: {
      userId: student.id,
      title: 'University Course Enrollment System',
      description: 'Educational demo schema with intentional 1NF, 2NF, 3NF, and referential integrity violations for student learning.',
      dialect: 'postgresql',
      status: 'ANALYZED'
    }
  });

  const sampleSql = `
CREATE TABLE department (
  dept_id INT PRIMARY KEY,
  dept_name VARCHAR(100) NOT NULL,
  building VARCHAR(100)
);

CREATE TABLE student_enrollment (
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  student_name VARCHAR(150) NOT NULL,
  student_phone_1 VARCHAR(20),
  student_phone_2 VARCHAR(20),
  course_name VARCHAR(150),
  instructor_name VARCHAR(150),
  dept_id INT,
  dept_name VARCHAR(100),
  grade VARCHAR(5),
  PRIMARY KEY (student_id, course_id),
  FOREIGN KEY (dept_id) REFERENCES department(dept_id)
);
`;

  const sampleSchema = await prisma.databaseSchema.create({
    data: {
      projectId: sampleProject.id,
      name: 'Unnormalized Enrollment Schema',
      rawSql: sampleSql,
      tables: {
        create: [
          {
            name: 'department',
            columns: {
              create: [
                { name: 'dept_id', dataType: 'INT', isPrimaryKey: true, isNullable: false, ordinalPos: 0 },
                { name: 'dept_name', dataType: 'VARCHAR(100)', isPrimaryKey: false, isNullable: false, ordinalPos: 1 },
                { name: 'building', dataType: 'VARCHAR(100)', isPrimaryKey: false, isNullable: true, ordinalPos: 2 }
              ]
            }
          },
          {
            name: 'student_enrollment',
            columns: {
              create: [
                { name: 'student_id', dataType: 'INT', isPrimaryKey: true, isNullable: false, ordinalPos: 0 },
                { name: 'course_id', dataType: 'INT', isPrimaryKey: true, isNullable: false, ordinalPos: 1 },
                { name: 'student_name', dataType: 'VARCHAR(150)', isPrimaryKey: false, isNullable: false, ordinalPos: 2 },
                { name: 'student_phone_1', dataType: 'VARCHAR(20)', isPrimaryKey: false, isNullable: true, ordinalPos: 3 },
                { name: 'student_phone_2', dataType: 'VARCHAR(20)', isPrimaryKey: false, isNullable: true, ordinalPos: 4 },
                { name: 'course_name', dataType: 'VARCHAR(150)', isPrimaryKey: false, isNullable: true, ordinalPos: 5 },
                { name: 'instructor_name', dataType: 'VARCHAR(150)', isPrimaryKey: false, isNullable: true, ordinalPos: 6 },
                { name: 'dept_id', dataType: 'INT', isPrimaryKey: false, isForeignKey: true, isNullable: true, ordinalPos: 7 },
                { name: 'dept_name', dataType: 'VARCHAR(100)', isPrimaryKey: false, isNullable: true, ordinalPos: 8 },
                { name: 'grade', dataType: 'VARCHAR(5)', isPrimaryKey: false, isNullable: true, ordinalPos: 9 }
              ]
            }
          }
        ]
      },
      relationships: {
        create: [
          {
            sourceTable: 'student_enrollment',
            sourceColumn: 'dept_id',
            targetTable: 'department',
            targetColumn: 'dept_id',
            cardinality: '1:N',
            isConfirmed: true,
            explanation: 'student_enrollment has foreign key dept_id referencing department.dept_id'
          }
        ]
      }
    }
  });

  // Seed Pre-calculated Analysis Session
  await prisma.analysisSession.create({
    data: {
      projectId: sampleProject.id,
      schemaId: sampleSchema.id,
      normalFormRank: '1NF',
      score: 54.0,
      issues: {
        create: [
          {
            category: 'NORMALIZATION',
            severity: 'HIGH',
            title: 'Repeating Column Group: [student_phone_1, student_phone_2]',
            explanation: 'Columns student_phone_1 and student_phone_2 violate First Normal Form (1NF).',
            tableName: 'student_enrollment',
            columns: 'student_phone_1, student_phone_2',
            whyItMatters: 'Requires altering table schema to add phone numbers; inefficient querying.',
            ruleViolated: '1NF Atomicity'
          },
          {
            category: 'NORMALIZATION',
            severity: 'CRITICAL',
            title: 'Partial Dependency: course_id -> course_name, instructor_name',
            explanation: 'course_name and instructor_name depend only on course_id, not on the entire composite key (student_id, course_id).',
            tableName: 'student_enrollment',
            columns: 'course_name, instructor_name',
            whyItMatters: 'Causes severe update and insertion anomalies.',
            ruleViolated: '2NF Partial Dependency'
          },
          {
            category: 'NORMALIZATION',
            severity: 'HIGH',
            title: 'Transitive Dependency: dept_id -> dept_name',
            explanation: 'dept_name depends transitively on dept_id, which is already stored in the department table.',
            tableName: 'student_enrollment',
            columns: 'dept_name',
            whyItMatters: 'Data redundancy and risk of update inconsistency.',
            ruleViolated: '3NF Transitive Dependency'
          }
        ]
      },
      recommendations: {
        create: [
          {
            title: 'Decompose student_enrollment into Course, Student, and Enrollment',
            description: 'Extract course_name and instructor_name into a dedicated course table, and phone numbers into a student_phone table.',
            beforeSchema: JSON.stringify({ table: 'student_enrollment' }),
            afterSchema: JSON.stringify({ tables: ['student', 'course', 'enrollment', 'student_phone'] }),
            correctedSql: 'CREATE TABLE course (course_id INT PRIMARY KEY, course_name VARCHAR(150), instructor_name VARCHAR(150));',
            status: 'PENDING'
          }
        ]
      }
    }
  });

  console.log('✅ Demonstration Project "University Course Enrollment System" seeded successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
