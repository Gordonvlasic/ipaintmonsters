import { Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../services/cart';
import { ArtworksService, Artwork } from '../../services/artworks';
import { Observable, map } from 'rxjs';
import { FormsModule } from '@angular/forms';

interface CartVM {
  items: { id: string; qty: number }[];
}

@Component({
  standalone: true,
  selector: 'app-cart',
  imports: [CommonModule, RouterLink, FormsModule, CurrencyPipe],
  templateUrl: './cart.html'
})
export class CartComponent {
  public cart = inject<CartService>(CartService);
  private api = inject<ArtworksService>(ArtworksService);

  all: Artwork[] = [];

  vm$: Observable<CartVM> = this.cart.items$.pipe(
    map(items => ({ items }))
  );

  constructor() {
    this.api.list().subscribe(x => this.all = x);
  }

  info(id: string) {
    return this.all.find(a => a.id === id);
  }

  total(items: { id: string; qty: number }[]) {
    return items.reduce((s, it) => (this.info(it.id)?.price || 0) * it.qty + s, 0);
  }
}
