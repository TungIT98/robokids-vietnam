/**
 * Test script for RoboBuddy AI Tutor Response Quality
 * Tests curriculum-aware responses with sample questions
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment
try {
  const envFile = readFileSync(join(__dirname, '.env'), 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
  console.log('✅ Loaded .env file');
} catch (e) {
  console.log('⚠️  No .env file found, using environment variables');
}

// Import AI services - use require for dynamic path
const { chatWithAI, buildSystemMessage } = await import('./src/services/openai.js');
const { buildCurriculumSystemPrompt, getLessonsForLevel, getAgeGroupKey } = await import('./src/services/curriculum-context.js');

const TEST_QUESTIONS = {
  beginner: [
    {
      age: 7,
      question: 'Làm sao để robot tiến tới?',
      expected: 'Should mention TIẾN TỚI block, simple language, emojis, relate to lesson 2'
    },
    {
      age: 7,
      question: 'Vòng lặp là gì?',
      expected: 'Should explain repeat block simply, use analogy like repeating a song'
    }
  ],
  intermediate: [
    {
      age: 10,
      question: 'Em chưa hiểu vòng lặp trong Blockly',
      expected: 'Should explain loops clearly, connect to lessons, give example'
    },
    {
      age: 10,
      question: 'Chuỗi lệnh hoạt động như thế nào?',
      expected: 'Should explain sequence, relate to lesson 5, give example program'
    }
  ],
  advanced: [
    {
      age: 14,
      question: 'Cảm biến khoảng cách hoạt động thế nào?',
      expected: 'Should explain ultrasonic sensor technically, mention physics'
    },
    {
      age: 14,
      question: 'Làm sao debug code robot hiệu quả?',
      expected: 'Should provide structured debugging approach'
    }
  ]
};

async function testQuestion(age, question, expected) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Age: ${age} | Question: ${question}`);
  console.log(`Expected: ${expected}`);
  console.log('-'.repeat(60));

  try {
    const messages = [
      buildSystemMessage(age),
      { role: 'user', content: question }
    ];

    const result = await chatWithAI(messages, { maxTokens: 500 });
    const response = result.content || result.message?.content || 'No response';

    console.log(`\nResponse:\n${response}`);
    console.log(`\nProvider: ${result.provider || 'unknown'}`);
    console.log(`Model: ${result.model || 'unknown'}`);
    console.log(`✅ SUCCESS`);
    return true;
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testCurriculumContext() {
  console.log('\n📚 Testing Curriculum Context Builder');
  console.log('='.repeat(60));

  const levels = ['beginner', 'intermediate', 'advanced'];

  for (const level of levels) {
    console.log(`\n${level.toUpperCase()}:`);
    const lessons = getLessonsForLevel(level);
    lessons.slice(0, 3).forEach(l => {
      console.log(`  - Bài ${l.number}: ${l.title}`);
    });
    if (lessons.length > 3) {
      console.log(`  ... and ${lessons.length - 3} more lessons`);
    }
  }
}

async function testCurriculumPrompt() {
  console.log('\n🎯 Testing Curriculum-Aware System Prompt');
  console.log('='.repeat(60));

  const ages = [7, 10, 14];

  for (const age of ages) {
    const level = getAgeGroupKey(age);
    const prompt = buildCurriculumSystemPrompt(age, 5); // Test with lesson 5

    console.log(`\nAge ${age} (${level}) - Lesson 5 context:`);
    console.log(prompt.substring(0, 200) + '...');
  }
}

async function runTests() {
  console.log('🧪 RoboBuddy AI Tutor - Response Quality Test Suite');
  console.log('='.repeat(60));

  // Test curriculum context builder
  await testCurriculumContext();

  // Test curriculum-aware prompts
  await testCurriculumPrompt();

  // Test sample questions per age group
  console.log('\n\n🤖 Testing Sample Questions');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const [level, questions] of Object.entries(TEST_QUESTIONS)) {
    console.log(`\n\n${level.toUpperCase()} (Age ${questions[0].age}):`);
    console.log('-'.repeat(40));

    for (const { age, question, expected } of questions) {
      const success = await testQuestion(age, question, expected);
      if (success) passed++; else failed++;
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('\n\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));
}

runTests().catch(console.error);
