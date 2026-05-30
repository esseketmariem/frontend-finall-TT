import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemandecompteComponent } from './demandecompte.component';  // ✅ fixed

describe('DemandecompteComponent', () => {
  let component: DemandecompteComponent;                             // ✅ fixed
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