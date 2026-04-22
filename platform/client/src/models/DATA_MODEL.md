# RoboKids Vietnam - Lesson Data Model Reference

This document describes the TypeScript data model for creating lessons, curricula, and assessments.

**File location:** `src/models/lesson.ts`

---

## Type Aliases

```typescript
type AgeGroup = 'beginner' | 'intermediate' | 'advanced';
type LessonCategory = 'movement' | 'sensors' | 'logic' | 'sound' | 'creativity' | 'challenges';
type BlockDifficulty = 'basic' | 'intermediate' | 'advanced';
```

---

## LessonStep

A single instructional step within a lesson. Students complete steps sequentially.

```typescript
interface LessonStep {
  id: string;              // Unique ID, e.g. 'step-1-1'
  order: number;           // 1-based sequence number
  title: string;           // Short title shown in sidebar, e.g. 'Bật đèn robot'
  descriptionVi: string;   // Vietnamese instructions shown to student
  descriptionEn?: string;   // English instructions (optional)
  allowedBlocks: string[]; // Block type IDs available; empty = use lesson-level blocks
  labelVi: string;         // Vietnamese label, e.g. 'Bật đèn'
  labelEn: string;         // English label, e.g. 'Turn on LED'
  hint?: string;           // Hint shown when student clicks hint button
  expectedXml?: string;   // Blockly XML to validate correct solution (future)
}
```

**Rules:**
- `id` must be unique within the lesson (e.g. `step-{lessonNum}-{stepNum}`)
- `order` should be sequential starting at 1
- `allowedBlocks` — when set, restricts which blocks appear for this step. When empty, falls back to the lesson's `availableBlocks`

---

## Lesson

A complete lesson module. Each lesson belongs to one `ageGroup` and `category`.

```typescript
interface Lesson {
  id: string;               // Unique ID, e.g. 'beginner-01'
  slug: string;             // URL-safe identifier, e.g. 'hello-robot'
  title: string;           // Display title (use Vietnamese)
  titleVi: string;          // Vietnamese title
  titleEn: string;          // English title
  descriptionVi: string;    // Short Vietnamese description (shown in curriculum browser)
  descriptionEn: string;    // Short English description
  ageGroup: AgeGroup;       // 'beginner' | 'intermediate' | 'advanced'
  category: LessonCategory; // One of the 6 categories
  difficulty: BlockDifficulty; // 'basic' | 'intermediate' | 'advanced'
  estimatedMinutes: number; // Estimated completion time
  objectives: string[];     // Learning objectives (English)
  objectivesVi: string[];   // Learning objectives (Vietnamese)
  steps: LessonStep[];      // Ordered array of steps
  starterXml?: string;      // Blockly XML to pre-populate workspace
  availableBlocks: string[]; // Block IDs usable in this lesson (toolbox subset)
  nextLessonSlug?: string;  // Slug of next lesson; undefined = last lesson
  tags: string[];           // Search tags, e.g. ['movement', 'basics']
  version: number;          // Content version number
  author: string;           // Content author name
  contentRating: number;    // Completeness rating 1-5
}
```

**Rules:**
- `slug` must be unique across all curricula
- `nextLessonSlug` must match an existing lesson's slug or be undefined
- `starterXml` is optional; if omitted, workspace starts empty

---

## Curriculum

A full age-group curriculum containing multiple lessons.

```typescript
interface Curriculum {
  ageGroup: AgeGroup;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  lessons: Lesson[];
  totalLessons: number;
  totalHours: number;
  minAge: number;   // Minimum age for this curriculum
  maxAge: number;   // Maximum age for this curriculum
}
```

**Age group mapping:**
| ageGroup      | minAge | maxAge |
|---------------|--------|--------|
| beginner      | 6      | 8      |
| intermediate  | 9      | 12     |
| advanced      | 13     | 16     |

---

## AgeGroupBlockConfig

Controls which Blockly blocks are available per age group.

```typescript
interface AgeGroupBlockConfig {
  ageGroup: AgeGroup;
  availableBlocks: string[];          // Block IDs in toolbox
  disabledBlocks: string[];           // Block IDs hidden/disabled
  blockLabelsVi: Record<string, string>; // Custom Vietnamese labels
  showCodePreview: boolean;            // Show Python code preview panel
  maxLoopDepth: number;                // Max nested loop depth (1 for beginner)
  maxBlocks?: number;                  // Max total blocks per program
}
```

---

## StudentLessonProgress

Tracks a student's progress through a lesson (stored in Supabase or localStorage).

```typescript
interface StudentLessonProgress {
  lessonId: string;
  studentId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedSteps: string[];   // Array of completed step IDs
  lastStepId?: string;
  attempts: number;
  completedAt?: string;       // ISO timestamp
  timeSpentSeconds: number;
}
```

---

## LessonPlan

Teacher-facing notes for each lesson.

```typescript
interface LessonPlan {
  lessonId: string;
  teacherNotesVi: string;
  teacherNotesEn: string;
  commonMistakesVi: string[];
  commonMistakesEn: string[];
  extensionsVi: string[];      // Differentiation / extension activities
  extensionsEn: string[];
  materialsVi: string[];       // Materials needed
  materialsEn: string[];
}
```

---

## QuizQuestion

Post-lesson assessment question.

```typescript
interface QuizQuestion {
  id: string;
  lessonId: string;
  order: number;
  type: 'multiple_choice' | 'true_false' | 'open';
  questionVi: string;
  questionEn: string;
  optionsVi?: string[];        // For multiple_choice
  optionsEn?: string[];
  correctAnswer: string | number;
  explanationVi?: string;
  explanationEn?: string;
}
```

---

## QuizAttempt

Records a student's quiz submission.

```typescript
interface QuizAttempt {
  id: string;
  studentId: string;
  lessonId: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, string | number>; // questionId -> answer
  completedAt: string;
}
```

---

## LearningStandard

Maps lessons to Vietnamese national curriculum standards.

```typescript
interface LearningStandard {
  id: string;
  code: string;            // e.g. 'TN&TL-ICT-7.1'
  descriptionVi: string;
  descriptionEn: string;
  lessonSlugs: string[];   // Lessons covering this standard
}
```

---

## Category Reference

| Category    | Vietnamese | Description                        |
|-------------|------------|-------------------------------------|
| movement    | Di chuyển  | Robot movement and navigation       |
| sensors     | Cảm biến   | Sensor reading and responses        |
| logic       | Logic      | Conditional logic and loops         |
| sound       | Âm thanh    | Sound/LED output                   |
| creativity  | Sáng tạo   | Open-ended creative projects        |
| challenges  | Thử thách  | Puzzle/maze challenge lessons      |

---

## Difficulty Reference

| Difficulty    | Meaning                                     |
|---------------|---------------------------------------------|
| basic         | Beginner (beginner age group, or any first lesson) |
| intermediate  | Requires prior knowledge, multi-step        |
| advanced      | Complex logic, nested loops, sensors        |

---

## Block ID Naming Convention

All robot block IDs use the prefix `robot_`:

```
robot_move_forward
robot_move_backward
robot_turn_left
robot_turn_right
robot_wait
robot_led_on
robot_led_off
robot_play_note
robot_read_ultrasonic
robot_line_follower
```

---

## Creating a New Lesson (Checklist)

1. Add the `Lesson` object to the appropriate curriculum file (`beginner-lessons.ts`, etc.)
2. Add `descriptionVi` and `descriptionEn` fields
3. Add `descriptionVi` to each `LessonStep`
4. Set `availableBlocks` — use the `AgeGroupBlockConfig` as reference
5. Set `nextLessonSlug` to link lessons together
6. Add the lesson to the `lessons` array in the curriculum export
7. Update `totalLessons` and `totalHours` in the curriculum
8. Verify all step `id` fields are unique within the lesson
