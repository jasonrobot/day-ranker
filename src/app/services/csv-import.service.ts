import { Injectable } from '@angular/core';
import { Score, YearState } from '../models/app.model';

@Injectable({ providedIn: 'root' })
export class CsvImportService {
  parse(csvText: string): { year: number; state: YearState } | null {
    const lines = csvText.split('\n').filter(l => l.trim() !== '');
    let detectedYear: number | null = null;
    let state: YearState | null = null;

    for (const line of lines) {
      const firstComma = line.indexOf(',');
      if (firstComma === -1) continue;
      const secondComma = line.indexOf(',', firstComma + 1);
      if (secondComma === -1) continue;

      const datePart = line.substring(0, firstComma);
      const scorePart = line.substring(firstComma + 1, secondComma);
      let comment = line.substring(secondComma + 1);

      if (comment.startsWith('"') && comment.endsWith('"')) {
        comment = comment.slice(1, -1);
      }

      const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) continue;

      const yearStr = dateMatch[1];
      const monthStr = dateMatch[2];
      const dayStr = dateMatch[3];
      if (!yearStr || !monthStr || !dayStr) continue;

      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      if (detectedYear === null) {
        detectedYear = year;
        state = this.buildEmptyYearState(year);
      } else if (year !== detectedYear) {
        continue;
      }

      const score = parseInt(scorePart, 10);
      if (isNaN(score) || score < -3 || score > 3) continue;

      const monthIdx = month - 1;
      const dayIdx = day - 1;

      if (!state) continue;
      if (monthIdx < 0 || monthIdx > 11) continue;
      const monthState = state.months[monthIdx];
      if (!monthState) continue;
      if (dayIdx < 0 || dayIdx >= monthState.days.length) continue;

      monthState.days[dayIdx] = { score: score as Score, comment };
    }

    if (detectedYear === null || state === null) return null;
    return { year: detectedYear, state };
  }

  private buildEmptyYearState(year: number): YearState {
    return {
      months: Array.from({ length: 12 }, (_, monthIdx) => ({
        days: Array.from(
          { length: new Date(year, monthIdx + 1, 0).getDate() },
          () => ({ score: null, comment: '' })
        ),
      })),
    };
  }
}
