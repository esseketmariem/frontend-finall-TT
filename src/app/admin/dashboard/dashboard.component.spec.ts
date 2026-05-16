// src/app/analyse/analyse-dashboard/analyse-dashboard.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AnalyseDashboardComponent } from './analyse-dashboard.component';
import { TicketService } from '../../services/ticket.service';
import { of } from 'rxjs';

describe('AnalyseDashboardComponent', () => {
  let component: AnalyseDashboardComponent;
  let fixture: ComponentFixture<AnalyseDashboardComponent>;
  let ticketService: jasmine.SpyObj<TicketService>;

  beforeEach(async () => {
    const ticketServiceSpy = jasmine.createSpyObj('TicketService', [
      'getAllTickets',
      'analyzeTicket',
      'getTicketProgress'
    ]);

    await TestBed.configureTestingModule({
      imports: [
        AnalyseDashboardComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        { provide: TicketService, useValue: ticketServiceSpy }
      ]
    })
    .compileComponents();

    ticketService = TestBed.inject(TicketService) as jasmine.SpyObj<TicketService>;
    ticketService.getAllTickets.and.returnValue(of([]));

    fixture = TestBed.createComponent(AnalyseDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});