import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyseTicketComponent } from './analyse-ticket.component';

describe('AnalyseTicketComponent', () => {
  let component: AnalyseTicketComponent;
  let fixture: ComponentFixture<AnalyseTicketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyseTicketComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnalyseTicketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
