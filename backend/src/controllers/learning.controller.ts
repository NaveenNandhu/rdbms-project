import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../services/prisma.service';

export class LearningController {
  /**
   * Get all learning units with topics and quiz questions.
   * Auto-seeds default curriculum if the database is newly initialized.
   */
  public static async getCurriculum(req: Request, res: Response): Promise<void> {
    try {
      let units = await prisma.learningUnit.findMany({
        orderBy: { orderIndex: 'asc' },
        include: {
          topics: {
            orderBy: { orderIndex: 'asc' },
            include: {
              quizQuestions: true
            }
          }
        }
      });

      if (units.length === 0) {
        await LearningController.seedDefaultCurriculum();
        units = await prisma.learningUnit.findMany({
          orderBy: { orderIndex: 'asc' },
          include: {
            topics: {
              orderBy: { orderIndex: 'asc' },
              include: {
                quizQuestions: true
              }
            }
          }
        });
      }

      res.json({ success: true, units });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get topic details by id.
   */
  public static async getTopic(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const topic = await prisma.learningTopic.findUnique({
        where: { id },
        include: {
          quizQuestions: true,
          unit: true
        }
      });

      if (!topic) {
        res.status(404).json({ error: 'Topic not found' });
        return;
      }

      res.json({ success: true, topic });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Submit quiz attempt.
   */
  public static async submitQuiz(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { topicId, answers } = req.body; // answers: { questionId: selectedIndex }
      if (!topicId || !answers) {
        res.status(400).json({ error: 'topicId and answers are required.' });
        return;
      }

      const questions = await prisma.quizQuestion.findMany({ where: { topicId } });
      let correctCount = 0;
      const results: any[] = [];

      for (const q of questions) {
        const rawSelected = answers[q.id];
        const selected = rawSelected !== undefined && rawSelected !== null ? Number(rawSelected) : -1;
        const isCorrect = selected === q.correctAnswer;
        if (isCorrect) correctCount++;
        results.push({
          questionId: q.id,
          questionText: q.questionText,
          selected,
          correctAnswer: q.correctAnswer,
          isCorrect,
          explanation: q.explanation
        });
      }

      const totalQuestions = Math.max(1, questions.length);
      const score = Math.round((correctCount / totalQuestions) * 100);
      let attemptId: string | null = null;

      if (userId && !userId.startsWith('usr_')) {
        try {
          const attempt = await prisma.quizAttempt.create({
            data: {
              userId,
              score,
              total: questions.length,
              answers: JSON.stringify(answers)
            }
          });
          attemptId = attempt.id;
        } catch {
          // Ignore attempt recording errors for mock/demo accounts
        }
      }

      res.json({
        success: true,
        score,
        correctCount,
        totalQuestions: questions.length,
        results,
        attemptId
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Professor / Admin: Create or edit learning unit.
   */
  public static async upsertUnit(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, title, description, orderIndex = 0 } = req.body;

      if (!title) {
        res.status(400).json({ error: 'Unit title is required' });
        return;
      }

      if (id) {
        const unit = await prisma.learningUnit.update({
          where: { id },
          data: { title, description, orderIndex }
        });
        res.json({ success: true, unit });
      } else {
        const unit = await prisma.learningUnit.create({
          data: { title, description, orderIndex }
        });
        res.status(201).json({ success: true, unit });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Professor / Admin: Create or edit topic.
   */
  public static async upsertTopic(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id, unitId, title, summary, contentMarkdown, beginnerExplanation, advancedExplanation, moduleLink, orderIndex = 0 } = req.body;

      if (!unitId || !title) {
        res.status(400).json({ error: 'unitId and title are required' });
        return;
      }

      if (id) {
        const topic = await prisma.learningTopic.update({
          where: { id },
          data: { title, summary, contentMarkdown, beginnerExplanation, advancedExplanation, moduleLink, orderIndex }
        });
        res.json({ success: true, topic });
      } else {
        const topic = await prisma.learningTopic.create({
          data: { unitId, title, summary: summary || '', contentMarkdown: contentMarkdown || '', beginnerExplanation, advancedExplanation, moduleLink, orderIndex }
        });
        res.status(201).json({ success: true, topic });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Auto-seed default curriculum units, topics, and interactive quizzes.
   */
  public static async seedDefaultCurriculum(): Promise<void> {
    try {
      // Unit 1
      await prisma.learningUnit.create({
        data: {
          title: 'Unit 1: Foundations of Relational Database Design',
          description: 'Core relational theory, relations, attributes, superkeys, and candidate keys.',
          orderIndex: 1,
          topics: {
            create: [
              {
                title: 'Relational Model, Tuples, and Candidate Keys',
                orderIndex: 1,
                summary: 'Understanding relations as mathematical sets and identifying minimal superkeys.',
                moduleLink: '/explorer',
                beginnerExplanation: 'Think of a database table like an organized spreadsheet where every single row represents one unique person or object, and every column is a specific attribute like name or age. A Primary Key is like a student ID card: no two students ever share the same ID!',
                advancedExplanation: 'A relation scheme R(A1, A2, ..., An) is a set of attributes. A relational instance r(R) is a subset of the Cartesian product of the domains. A Candidate Key is a minimal superkey satisfying both uniqueness and irreducibility.',
                contentMarkdown: `# Foundations of the Relational Model\n\nThe relational database model was introduced by E.F. Codd in 1970.\n\n### Key Axioms:\n1. **Tuple**: A single row representing an entity instance.\n2. **Attribute**: A column representing a domain property.\n3. **Superkey**: A set of attributes that uniquely distinguishes tuples.\n4. **Candidate Key**: A minimal superkey where no proper subset is a superkey.\n5. **Primary Key**: The designated candidate key chosen by the database designer.`,
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
                      explanation: 'Relations frequently possess multiple candidate keys (e.g. SSN and Student_ID). The designer selects one as the Primary Key.',
                      difficulty: 'EASY'
                    }
                  ]
                }
              },
              {
                title: 'Entity & Referential Integrity Rules',
                orderIndex: 2,
                summary: 'Formal validation of primary key non-nullability and foreign key constraints.',
                moduleLink: '/normalization',
                beginnerExplanation: 'Entity Integrity means your ID number can never be missing or blank. Referential Integrity means you cannot hand in an assignment for a course that does not exist in the school catalog!',
                advancedExplanation: 'Entity Integrity: for all tuples t in r(R), t[PK] != null. Referential Integrity: Foreign keys must either match an existing primary key in the referenced relation, or be entirely null.',
                contentMarkdown: `# Integrity Constraints in Modern RDBMS\n\n### 1. Entity Integrity\nNo component of a primary key may be NULL.\n\n### 2. Referential Integrity\nForeign keys must match an existing primary key or be NULL.`,
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

      // Unit 2
      await prisma.learningUnit.create({
        data: {
          title: 'Unit 2: Normalization (1NF to BCNF)',
          description: 'Systematic elimination of redundancy, partial dependencies, and update anomalies.',
          orderIndex: 2,
          topics: {
            create: [
              {
                title: 'First Normal Form (1NF): Atomic Attributes',
                orderIndex: 1,
                summary: 'Eliminating multi-valued columns and recurring column groups.',
                moduleLink: '/normalization',
                beginnerExplanation: 'If you put three phone numbers in one cell separated by commas, or create columns called phone1, phone2, phone3, you break 1NF! Each cell must hold exactly one value.',
                advancedExplanation: 'A relation schema R is in 1NF iff the domain of all attributes contains only atomic scalar values, and each attribute value is a single value from the domain.',
                contentMarkdown: `# First Normal Form (1NF)\n\n### Violations:\n1. Comma-separated strings\n2. Repeating column sequences\n3. Relations without a designated primary key`,
                quizQuestions: {
                  create: [
                    {
                      questionText: 'Which scenario represents a direct violation of First Normal Form (1NF)?',
                      optionsJson: JSON.stringify([
                        'A table having two foreign keys',
                        'A column emergency_contacts containing a comma-separated list of names and numbers',
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
                advancedExplanation: 'A relation schema R is in 2NF if it is in 1NF and no non-prime attribute A is functionally dependent on a proper subset of any candidate key K of R.',
                contentMarkdown: `# Second Normal Form (2NF)\n\n2NF addresses composite keys. If a candidate key is made of single attributes, 2NF is automatically satisfied.`,
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
                advancedExplanation: 'A relation schema R is in 3NF if for every non-trivial functional dependency X -> A: either X is a superkey of R, or A is a prime attribute of R.',
                contentMarkdown: `# Third Normal Form (3NF)\n\n3NF eliminates transitive dependencies: where non-key attribute A -> B and B -> C.`,
                quizQuestions: {
                  create: [
                    {
                      questionText: 'In table STUDENT(id, name, zip_code, city), where id -> zip_code and zip_code -> city, what is the transitive dependency?',
                      optionsJson: JSON.stringify([
                        'id -> name',
                        'id -> city through zip_code',
                        'city -> id',
                        'name -> zip_code'
                      ]),
                      correctAnswer: 1,
                      explanation: 'Since id -> zip_code and zip_code -> city, city transitively depends on id.',
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
                advancedExplanation: 'A relation schema R is in BCNF if for every non-trivial functional dependency X -> Y, X is a superkey of R.',
                contentMarkdown: `# Boyce-Codd Normal Form (BCNF)\n\nBCNF resolves subtle edge cases where 3NF permits non-superkey determinants when the dependent attribute happens to be prime.`,
                quizQuestions: {
                  create: [
                    {
                      questionText: 'What is the crucial difference between 3NF and BCNF?',
                      optionsJson: JSON.stringify([
                        '3NF allows X -> A if A is a prime attribute; BCNF requires X to be a superkey regardless of whether A is prime',
                        'BCNF only applies to NoSQL databases',
                        '3NF requires composite keys while BCNF forbids them',
                        'BCNF does not require 1NF compliance'
                      ]),
                      correctAnswer: 0,
                      explanation: 'In 3NF, a dependency X -> A where X is not a superkey is permitted if A is part of some candidate key. BCNF disallows this exception.',
                      difficulty: 'HARD'
                    }
                  ]
                }
              }
            ]
          }
        }
      });
    } catch (e) {
      console.error('Failed to auto-seed curriculum:', e);
    }
  }
}
