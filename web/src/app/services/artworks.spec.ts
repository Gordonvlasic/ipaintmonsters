import { TestBed } from '@angular/core/testing';

import { Artworks } from './artworks';

describe('Artworks', () => {
  let service: Artworks;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Artworks);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
