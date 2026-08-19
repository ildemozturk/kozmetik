import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AdminProducts } from './admin-products';

describe('AdminProducts', () => {
  let component: AdminProducts;
  let fixture: ComponentFixture<AdminProducts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProducts, HttpClientTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminProducts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});