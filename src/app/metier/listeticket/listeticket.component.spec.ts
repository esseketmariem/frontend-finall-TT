import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListeticketComponent } from './listeticket.component';

describe('ListeticketComponent', () => {
  let component: ListeticketComponent;
  let fixture: ComponentFixture<ListeticketComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListeticketComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListeticketComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
