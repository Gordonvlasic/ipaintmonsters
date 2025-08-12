import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../services/cart';
import { ArtworksService, Artwork } from '../../services/artworks';

interface CartItemDisplay {
  id: string;
  qty: number;
  name: string;
  price: number;
  image: string;
}

@Component({
  standalone: true,
  selector: 'app-checkout',
  imports: [CommonModule, FormsModule],
  templateUrl: './checkout.html'
})
export class CheckoutComponent {
  name = '';
  email = '';
  phone = '';
  note = '';
  loading = false;
  success = false;
  error = '';
  cartItems: CartItemDisplay[] = [];
  total = 0;

  private cart = inject(CartService);
  private api = inject(ArtworksService);

  constructor() {
    // Load artworks once
    this.api.list().subscribe(allArtworks => {
      // Subscribe to cart changes
      this.cart.items$.subscribe(items => {
        this.cartItems = items.map(it => {
          const art = allArtworks.find(a => a.id === it.id);
          return {
            id: it.id,
            qty: it.qty,
            name: art?.title || 'Untitled',
            price: art?.price || 0,
            image: art?.images?.cover || '/images/placeholder.png'
          };
        });
        this.total = this.cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
      });
    });
  }

  submit() {
    if (!this.cartItems.length) return;

    this.loading = true;
    const buyer = {
      name: this.name,
      email: this.email,
      phone: this.phone,
      note: this.note
    };

    // Only send id and qty for checkout
    const minimalCart = this.cartItems.map(({ id, qty }) => ({ id, qty }));

    this.api.checkoutEmail({ cart: minimalCart, buyer }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.cart.clear();
      },
      error: () => {
        this.loading = false;
        this.error = 'Failed to send. Try again.';
      }
    });
  }
}
