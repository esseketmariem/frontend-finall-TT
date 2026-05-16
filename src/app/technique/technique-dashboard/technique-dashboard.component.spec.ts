import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechniqueDashboardComponent } from './technique-dashboard.component';

describe('TechniqueDashboardComponent', () => {
  let component: TechniqueDashboardComponent;
  let fixture: ComponentFixture<TechniqueDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechniqueDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TechniqueDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
