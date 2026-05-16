// src/app/analyse/pipes/analyse-count.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { Ticket } from '../../models/ticket';

@Pipe({
  name: 'analyseCount',
  standalone: true
})
export class AnalyseCountPipe implements PipeTransform {
  transform(tickets: Ticket[] | null | undefined): number {
    return tickets?.length ?? 0;
  }
}