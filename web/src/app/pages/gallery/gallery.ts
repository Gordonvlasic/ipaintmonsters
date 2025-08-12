import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, startWith } from 'rxjs/operators';
import { combineLatest, of } from 'rxjs';
import { ArtworksService, Artwork } from '../../services/artworks';
import { CartService } from '../../services/cart';

@Component({
  standalone: true,
  selector: 'app-gallery',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './gallery.html'
})
export class GalleryComponent implements OnInit {
  private api = inject(ArtworksService);
  public cart = inject(CartService);

  items: Artwork[] = [];
  allStyles: string[] = [];
  loading = true;

  // Controls
  searchCtrl = new FormControl('');
  styleCtrl = new FormControl('');
  priceCtrl = new FormControl<number | null>(null);

  // Slider config
  priceMax = 5000;
  priceStep = 50;
  currencyHint = 'USD';

  ngOnInit() {
    // Get all styles initially
    this.api.list().subscribe(items => {
      this.allStyles = Array.from(new Set(items.flatMap(i => i.style))).sort();
    });

    // Combine filter observables for live updates
    combineLatest([
      this.searchCtrl.valueChanges.pipe(startWith(this.searchCtrl.value)),
      this.styleCtrl.valueChanges.pipe(startWith(this.styleCtrl.value)),
      this.priceCtrl.valueChanges.pipe(startWith(this.priceCtrl.value))
    ])
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap(([q, style, maxPrice]) => {
          this.loading = true;
          const params: any = {};
          if (q) params.q = q;
          if (style) params.style = style;
          if (maxPrice) params.maxPrice = maxPrice;
          return this.api.list(params);
        })
      )
      .subscribe(items => {
        this.items = items;
        this.loading = false;
      });
  }

  clearFilters() {
    this.searchCtrl.setValue('');
    this.styleCtrl.setValue('');
    this.priceCtrl.setValue(null);
  }

  trackByStr(_: number, str: string) {
    return str;
  }
}
