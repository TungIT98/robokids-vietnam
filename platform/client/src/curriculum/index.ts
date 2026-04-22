/**
 * Curriculum index - exports all age-group curricula
 */

import { Curriculum } from '../models/lesson';
import { beginnerCurriculum } from './beginner-lessons';
import { intermediateCurriculum } from './intermediate-lessons';
import { advancedCurriculum } from './advanced-lessons';

export { beginnerCurriculum } from './beginner-lessons';
export { intermediateCurriculum } from './intermediate-lessons';
export { advancedCurriculum } from './advanced-lessons';

export const allCurricula: Curriculum[] = [
  beginnerCurriculum,
  intermediateCurriculum,
  advancedCurriculum,
];

export function getCurriculumByAgeGroup(ageGroup: string): Curriculum | undefined {
  return allCurricula.find(c => c.ageGroup === ageGroup);
}

export function getLessonBySlug(slug: string) {
  for (const curriculum of allCurricula) {
    const lesson = curriculum.lessons.find(l => l.slug === slug);
    if (lesson) return lesson;
  }
  return undefined;
}
