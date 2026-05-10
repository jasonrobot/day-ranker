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
      const comment = line.substring(secondComma + 1);

      const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) continue;

      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const day = parseInt(dateMatch[3], 10);

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

      if (monthIdx < 0 || monthIdx > 11) continue;
      if (dayIdx < 0 || dayIdx >= state!.months[monthIdx].days.length) continue;

      state!.months[monthIdx].days[dayIdx] = { score: score as Score, comment };
    }

    if (detectedYear === null || state === null) return null;
    return { year: detectedYear, state };
  }

  private buildEmptyYearState(year: number): YearState {
    return {
      months: Array.from({ length: 12 }, (_, monthIdx) => ({
        days: Array.from(
          { length: new Date(year, monthIdx + 1, 0).getDate() },
          () => ({ score: 0 as Score, comment: '' })
        ),
      })),
    };
  }
}
