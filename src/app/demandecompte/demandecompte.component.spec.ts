import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DemandecompteComponent } from './demandecompte.component';

describe('DemandecompteComponent', () => {
  let component: DemandecompteComponent;
  let fixture: ComponentFixture<DemandecompteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemandecompteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DemandecompteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
