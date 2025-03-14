import { TestBed } from '@angular/core/testing';
import { AddImageService } from './add-image.service';


describe('AddImageService', () => {
  let service: AddImageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddImageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
